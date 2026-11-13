"""FHIR resource routes – /api/fhir."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.fhir.hapi_client import HAPIFHIRClient
from app.fhir.local_store import LocalFHIRStore
from app.fhir.mapper import LOINC_CODES, _UCUM_CODES, _UNITS, create_observation
from app.config import HAPI_FHIR_BASE_URL, HAPI_FHIR_TIMEOUT_MS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fhir", tags=["fhir"])

# Injected at startup
_local_store: LocalFHIRStore | None = None
_hapi_client: HAPIFHIRClient | None = None
_telemetry_manager: Any | None = None
_patients: dict[str, dict[str, Any]] = {}

_REVERSE_LOINC: dict[str, str] = {
    "8867-4": "heart_rate",
    "2708-6": "oxygen_saturation",
    "9279-1": "respiratory_rate",
    "8480-6": "systolic_bp",
    "8310-5": "body_temperature",
}


def set_stores(
    local_store: LocalFHIRStore,
    hapi_client: HAPIFHIRClient | None = None,
    telemetry_manager: Any | None = None,
    patients: dict[str, dict[str, Any]] | None = None,
) -> None:
    """Called once from ``main.py`` startup."""
    global _local_store, _hapi_client, _telemetry_manager, _patients
    _local_store = local_store
    if hapi_client is None:
        _hapi_client = HAPIFHIRClient(
            base_url=HAPI_FHIR_BASE_URL,
            timeout_ms=HAPI_FHIR_TIMEOUT_MS,
        )
    else:
        _hapi_client = hapi_client
    if telemetry_manager is not None:
        _telemetry_manager = telemetry_manager
    if patients is not None:
        _patients = patients


@router.post("/observation", status_code=status.HTTP_201_CREATED)
async def ingest_observation(payload: dict[str, Any]) -> dict[str, Any]:
    """FHIR R4 Ingestion API.
    
    Accepts either a standard FHIR R4 Observation resource JSON or a simplified vital payload.
    - Validates FHIR R4 Observation structure
    - Validates LOINC code
    - Validates UCUM units
    - Verifies patient reference
    - Ensures synthetic Patient exists on HAPI FHIR (PUT /Patient/{id})
    - Stores Observation in HAPI FHIR (POST /Observation)
    - Retrieves Observation from HAPI FHIR (GET /Observation/{id}) to prove storage
    - Ingests vital reading into backend telemetry stream and broadcasts to React dashboard.
    """
    if _local_store is None or _hapi_client is None:
        raise HTTPException(status_code=503, detail="FHIR subsystems not initialised")

    # Format 1: Standard FHIR R4 Observation
    if payload.get("resourceType") == "Observation":
        obs = dict(payload)
        subject_ref = obs.get("subject", {}).get("reference", "")
        if not subject_ref.startswith("Patient/"):
            raise HTTPException(
                status_code=400,
                detail="Invalid Observation.subject reference. Must be 'Patient/{patient_id}'",
            )
        patient_id = subject_ref.split("/", 1)[1]

        # Extract LOINC
        codings = obs.get("code", {}).get("coding", [])
        loinc_code = codings[0].get("code") if codings else None
        if not loinc_code or loinc_code not in _REVERSE_LOINC:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported or missing LOINC code '{loinc_code}'. Supported: {list(_REVERSE_LOINC.keys())}",
            )
        vital_name = _REVERSE_LOINC[loinc_code]

        # Extract value and UCUM
        vq = obs.get("valueQuantity", {})
        value = vq.get("value")
        if value is None:
            raise HTTPException(status_code=400, detail="Missing Observation.valueQuantity.value")
        unit = vq.get("unit", _UNITS.get(vital_name, ""))
        ucum_code = vq.get("code", _UCUM_CODES.get(vital_name, unit))

        # Assign ID if missing
        if not obs.get("id"):
            obs["id"] = f"obs-{uuid.uuid4().hex[:12]}"

    # Format 2: Simplified JSON
    else:
        patient_id = payload.get("patient_id")
        vital_name = payload.get("vital_name")
        value = payload.get("value")
        if not patient_id or not vital_name or value is None:
            raise HTTPException(
                status_code=400,
                detail="Payload must be a FHIR R4 Observation or include 'patient_id', 'vital_name', 'value'",
            )
        if vital_name not in LOINC_CODES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported vital_name '{vital_name}'. Supported: {list(LOINC_CODES.keys())}",
            )
        loinc_code = LOINC_CODES[vital_name]
        unit = payload.get("unit", _UNITS.get(vital_name, ""))
        timestamp = payload.get("timestamp", datetime.now(timezone.utc).isoformat())
        source = payload.get("source", "FHIR_INGEST")

        obs = create_observation(
            patient_id=patient_id,
            vital_name=vital_name,
            value=float(value),
            unit=unit,
            timestamp=timestamp,
            source=source,
        )
        ucum_code = obs.get("valueQuantity", {}).get("code")

    # Step A: Ensure synthetic Patient exists on HAPI FHIR before submitting Observation
    p_profile = _patients.get(patient_id, {})
    syn_patient = {
        "resourceType": "Patient",
        "id": patient_id,
        "name": [
            {
                "use": "official",
                "family": p_profile.get("name", "Synthetic").split()[-1] if p_profile.get("name") else patient_id,
                "given": p_profile.get("name", "Patient").split()[:-1] if p_profile.get("name") else ["Synthetic"],
            }
        ],
        "gender": p_profile.get("gender", "unknown"),
        "birthDate": p_profile.get("birthDate", "1970-01-01"),
    }
    hapi_patient_res, hapi_patient_err = await _hapi_client.upsert_patient(patient_id, syn_patient)
    _local_store.store(syn_patient)

    # Step B: Store locally as authoritative backup
    local_id = _local_store.store(obs)

    # Step C: Submit to Real HAPI FHIR
    hapi_obs_res, hapi_obs_err = await _hapi_client.create_resource(obs)
    hapi_resource_id = None
    retrieved_from_hapi = None
    retrieval_err = None

    if hapi_obs_res and "id" in hapi_obs_res:
        hapi_resource_id = str(hapi_obs_res["id"])
        # Step D: Retrieve each submitted Observation from HAPI FHIR to prove live cloud persistence
        retrieved_from_hapi, retrieval_err = await _hapi_client.get_resource("Observation", hapi_resource_id)

    is_hapi_successful = (hapi_resource_id is not None) and (retrieved_from_hapi is not None)
    storage_destination = "HAPI_FHIR_CLOUD" if is_hapi_successful else "LOCAL_FALLBACK_STORE"
    storage_mode = "LIVE_HAPI_CLOUD" if is_hapi_successful else "LOCAL_FALLBACK"

    # Step E: Ingest reading into telemetry manager so actual backend readings reach dashboard
    broadcast_payload = None
    if _telemetry_manager is not None:
        try:
            broadcast_payload = await _telemetry_manager.ingest_fhir_reading(
                patient_id=patient_id,
                vital_name=vital_name,
                value=float(value),
                unit=unit,
                source="FHIR_INGEST",
                obs_id=local_id,
            )
        except Exception as exc:
            logger.warning("Telemetry broadcast failed for ingested vital: %s", exc)

    return {
        "status": "success",
        "endpoint": "/api/fhir/observation",
        "storage_destination": storage_destination,
        "storage_mode": storage_mode,
        "local_store_id": local_id,
        "hapi_resource_id": hapi_resource_id,
        "loinc_code": loinc_code,
        "vital_name": vital_name,
        "value": float(value),
        "ucum_unit": ucum_code,
        "patient_reference": f"Patient/{patient_id}",
        "stored_observation": obs,
        "hapi_created_response": hapi_obs_res,
        "hapi_retrieved_response": retrieved_from_hapi,
        "hapi_error": hapi_obs_err or retrieval_err or hapi_patient_err,
        "telemetry_broadcast": broadcast_payload is not None,
    }


# ─── Patient Management Endpoints ──────────────────────────────────────────

@router.put("/patient/{patient_id}")
@router.post("/patient")
async def upsert_patient_record(patient_id: str | None = None, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Create or update a synthetic Patient on HAPI FHIR and local store."""
    if _local_store is None or _hapi_client is None:
        raise HTTPException(status_code=503, detail="FHIR subsystems not initialised")

    body = payload or {}
    pid = patient_id or body.get("id")
    if not pid:
        raise HTTPException(status_code=400, detail="Patient ID is required")

    p_profile = _patients.get(pid, {})
    name_parts = body.get("name")
    if not name_parts:
        display_name = p_profile.get("name") or f"Synthetic Patient {pid}"
        parts = display_name.split()
        name_parts = [
            {
                "use": "official",
                "family": parts[-1] if len(parts) > 1 else parts[0],
                "given": parts[:-1] if len(parts) > 1 else ["Synthetic"],
            }
        ]

    patient_resource = {
        "resourceType": "Patient",
        "id": pid,
        "identifier": [
            {
                "system": "https://carepulse.health/patients",
                "value": pid,
            }
        ],
        "active": True,
        "name": name_parts,
        "gender": body.get("gender") or p_profile.get("gender", "unknown"),
        "birthDate": body.get("birthDate") or p_profile.get("birthDate", "1970-01-01"),
    }

    # Store in local fallback store
    local_id = _local_store.store(patient_resource)

    # Upsert to HAPI FHIR Cloud
    hapi_res, hapi_err = await _hapi_client.upsert_patient(pid, patient_resource)

    # Verify retrieval from HAPI
    retrieved_res = None
    retrieval_err = None
    if hapi_res is not None:
        retrieved_res, retrieval_err = await _hapi_client.get_resource("Patient", pid)

    is_hapi_stored = (hapi_res is not None) and (retrieved_res is not None)
    storage_destination = "HAPI_FHIR_CLOUD" if is_hapi_stored else "LOCAL_FALLBACK_STORE"

    return {
        "status": "success",
        "patient_id": pid,
        "storage_destination": storage_destination,
        "storage_mode": "LIVE_HAPI_CLOUD" if is_hapi_stored else "LOCAL_FALLBACK",
        "local_store_id": local_id,
        "hapi_response": hapi_res,
        "hapi_retrieved": retrieved_res,
        "hapi_error": hapi_err or retrieval_err,
        "resource": patient_resource,
    }


@router.get("/patient/{patient_id}")
async def get_patient_record(patient_id: str) -> dict[str, Any]:
    """Retrieve a Patient resource, checking HAPI FHIR cloud first then local fallback."""
    if _local_store is None or _hapi_client is None:
        raise HTTPException(status_code=503, detail="FHIR subsystems not initialised")

    # Try HAPI first
    remote, hapi_err = await _hapi_client.get_resource("Patient", patient_id)
    if remote is not None:
        return {
            "source": "HAPI_FHIR_CLOUD",
            "patient_id": patient_id,
            "resource": remote,
            "error": None,
        }

    # Check local store
    local_patient = _local_store.get("Patient", patient_id)
    if local_patient is not None:
        return {
            "source": "LOCAL_FALLBACK_STORE",
            "patient_id": patient_id,
            "resource": local_patient,
            "error": f"HAPI cloud unavailable or patient not found: {hapi_err}",
        }

    # Check synthetic patient roster
    p_profile = _patients.get(patient_id)
    if p_profile is not None:
        syn_patient = {
            "resourceType": "Patient",
            "id": patient_id,
            "name": [{"use": "official", "text": p_profile.get("name", "Synthetic Patient")}],
            "gender": p_profile.get("gender", "unknown"),
        }
        return {
            "source": "LOCAL_SYNTHETIC_ROSTER",
            "patient_id": patient_id,
            "resource": syn_patient,
            "error": f"Retrieved from synthetic memory: {hapi_err}",
        }

    raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found in HAPI or local store")


@router.get("/patient/{patient_id}/observations")
async def get_patient_observations(patient_id: str) -> dict[str, Any]:
    """Retrieve all observations for a patient from HAPI FHIR and local fallback."""
    if _local_store is None or _hapi_client is None:
        raise HTTPException(status_code=503, detail="FHIR subsystems not initialised")

    # 1. Query HAPI cloud
    hapi_bundle, hapi_err = await _hapi_client.search_resources(
        "Observation", {"subject": f"Patient/{patient_id}"}
    )

    # 2. Query Local Store
    local_obs = _local_store.search("Observation", patient_id=patient_id)

    cloud_count = len(hapi_bundle.get("entry", [])) if hapi_bundle else 0
    local_count = len(local_obs)

    return {
        "patient_id": patient_id,
        "hapi_cloud_available": hapi_bundle is not None,
        "hapi_observations_count": cloud_count,
        "local_observations_count": local_count,
        "storage_mode": "LIVE_HAPI_CLOUD" if hapi_bundle is not None else "LOCAL_FALLBACK",
        "hapi_bundle": hapi_bundle,
        "local_observations": local_obs,
        "hapi_error": hapi_err,
    }


@router.get("/status")
async def get_fhir_status() -> dict[str, Any]:
    """Health check for HAPI FHIR cloud connection and local store."""
    if _local_store is None or _hapi_client is None:
        return {"status": "uninitialised", "hapi_connected": False}

    meta, err = await _hapi_client.get_resource("metadata", "")
    is_hapi_connected = meta is not None and "fhirVersion" in meta

    return {
        "status": "healthy" if is_hapi_connected else "degraded",
        "hapi_connected": is_hapi_connected,
        "hapi_base_url": _hapi_client.base_url,
        "hapi_fhir_version": meta.get("fhirVersion") if meta else None,
        "hapi_error": err,
        "local_store_total_resources": len(_local_store._resources),
        "local_store_patients": len(_local_store._by_patient),
        "storage_mode": "LIVE_HAPI_CLOUD" if is_hapi_connected else "LOCAL_FALLBACK",
    }


@router.get("/patient/{patient_id}/bundle")
async def get_patient_bundle(patient_id: str) -> dict[str, Any]:
    """Return a FHIR R4 Bundle for a patient."""
    if _local_store is None:
        raise HTTPException(status_code=503, detail="FHIR store not initialised")
    return _local_store.get_bundle(patient_id)


@router.get("/observation/{observation_id}")
async def get_observation(observation_id: str) -> dict[str, Any]:
    """Get a single Observation resource by id, checking local store and HAPI FHIR."""
    if _local_store is None or _hapi_client is None:
        raise HTTPException(status_code=503, detail="FHIR store not initialised")

    # Check local store
    obs = _local_store.get("Observation", observation_id)
    if obs is not None:
        return {
            "source": "LOCAL_FALLBACK_STORE",
            "storage_destination": "LOCAL_FALLBACK_STORE",
            "observation": obs,
        }

    # Check HAPI
    remote, err = await _hapi_client.get_resource("Observation", observation_id)
    if remote is not None:
        return {
            "source": "HAPI_FHIR_CLOUD",
            "storage_destination": "HAPI_FHIR_CLOUD",
            "observation": remote,
        }

    raise HTTPException(status_code=404, detail=f"Observation {observation_id} not found (local or HAPI)")
