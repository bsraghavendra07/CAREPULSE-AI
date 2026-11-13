"""Patient profile routes – /api/patients."""

from __future__ import annotations

from typing import Any
from pathlib import Path
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from app.core.news2 import calculate_news2, evaluate_hypercapnic_failure
from app.simulation.synthea_generator import SyntheaGenerator, load_all_synthea_patients
from app.core.patient_risk_engine import calculate_patient_risk

router = APIRouter(prefix="/api/patients", tags=["patients"])

# Populated at startup by main.py
_patients: dict[str, dict[str, Any]] = {}
_manager: Any = None


def set_patients(patients: dict[str, dict[str, Any]]) -> None:
    """Called once from ``main.py`` startup to inject patient data."""
    global _patients
    _patients = patients


def set_telemetry_manager(manager: Any) -> None:
    """Inject telemetry manager reference to query real-time scores and baseline."""
    global _manager
    _manager = manager


class GeneratePatientsRequest(BaseModel):
    count: int = 5


@router.post("/generate")
async def generate_synthea_patients(body: GeneratePatientsRequest) -> dict[str, Any]:
    """Generate dynamic synthetic patients using Synthea FHIR R4 generation engine."""
    count = max(1, min(100, int(body.count)))
    synthea_dir = Path(__file__).resolve().parent.parent / "data" / "synthea"
    generator = SyntheaGenerator(output_dir=synthea_dir)
    bundles = generator.generate_and_save_batch(count)

    # Parse and update active patients dictionary
    updated = load_all_synthea_patients(synthea_dir)
    set_patients(updated)

    if _manager is not None:
        _manager.init_engines(updated)
        for b in bundles:
            try:
                _manager.fhir_store.store(b)
            except Exception:
                pass

    return {
        "status": "success",
        "count": len(updated),
        "patients": list(updated.values()),
        "message": f"Successfully generated {len(updated)} synthetic patient profiles from Synthea FHIR R4 bundles.",
    }


class EvaluateRiskRequest(BaseModel):
    patient_id: str
    vitals: dict[str, Any]


@router.post("/evaluate-risk")
async def evaluate_risk_endpoint(body: EvaluateRiskRequest) -> dict[str, Any]:
    """Evaluate transparent, explainable decision-support risk score."""
    patient = _patients.get(body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {body.patient_id} not found")
    history = list(_manager.history.get(body.patient_id, [])) if _manager else []
    return calculate_patient_risk(patient, body.vitals, history)


@router.get("/")
async def list_patients() -> list[dict[str, Any]]:
    """Return all 5 patient profiles."""
    return list(_patients.values())


@router.get("/{patient_id}")
async def get_patient(patient_id: str) -> dict[str, Any]:
    """Return a single patient's detail."""
    patient = _patients.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


@router.get("/{patient_id}/news2")
async def get_patient_news2(patient_id: str) -> dict[str, Any]:
    """Return the official NEWS2 score, components, rolling baseline, and personalization context.
    
    Adheres strictly to HealthTech PS-03 Requirement 3.4:
    - NEWS2 aggregate and individual component scores
    - Personalization Rule 1: SpO2 Scale 2 (88-92%) if hypercapnic respiratory failure documented
    - Personalization Rule 2: Individual rolling historical baseline and gradual deterioration trend
    - Explanatory signals distinguishing NEWS2 score from personalized rolling baseline alerts
    """
    patient = _patients.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    # Check hypercapnic respiratory failure via dynamic evaluation
    is_scale2, target_spo2, scale2_reason = evaluate_hypercapnic_failure(patient)

    # Check for live telemetry tick
    latest_tick = None
    if _manager is not None and patient_id in _manager.history and len(_manager.history[patient_id]) > 0:
        latest_tick = _manager.history[patient_id][-1]

    if latest_tick:
        news2_data = latest_tick.get("news2", {})
        pers_data = latest_tick.get("personalized", {})
        vitals_data = latest_tick.get("vitals", {})

        total_score = news2_data.get("total_score", 0)
        risk_level = news2_data.get("risk_level", "LOW")
        triage_tier = news2_data.get("triage_tier", "ROUTINE")
        components = news2_data.get("components") or news2_data.get("sub_scores", {})
        contributors = news2_data.get("primary_contributors", [])
        clinical_action = news2_data.get("clinical_action", "Routine ward monitoring")

        baseline_summary = pers_data.get("baseline", {})
        trends = pers_data.get("trends", {})
        gradual_alert = pers_data.get("gradual_deterioration", {})
    else:
        # Fallback to patient baseline values if stream not yet initiated
        base_vitals = patient.get("baseline", {})
        news2_res = calculate_news2(
            base_vitals,
            scale2_prescribed=is_scale2,
            supplemental_oxygen=False,
        )
        total_score = news2_res.total_score
        risk_level = news2_res.risk_level.value
        triage_tier = news2_res.triage_tier
        components = news2_res.components
        contributors = news2_res.primary_contributors
        clinical_action = news2_res.clinical_action
        baseline_summary = base_vitals
        trends = {}
        gradual_alert = {"detected": False, "alert_message": ""}

    return {
        "patient_id": patient_id,
        "patient_name": patient.get("name"),
        "condition": patient.get("condition"),
        "news2_score": total_score,
        "risk_level": risk_level,
        "triage_tier": triage_tier,
        "spo2_scale": 2 if is_scale2 else 1,
        "spo2_target": target_spo2,
        "components": {
            "respiratory_rate": components.get("respiratory_rate", components.get("rr", 0)),
            "spo2": components.get("spo2", 0),
            "systolic_bp": components.get("systolic_bp", components.get("sbp", 0)),
            "heart_rate": components.get("heart_rate", components.get("hr", 0)),
            "temperature": components.get("temperature", components.get("temp", 0)),
            "consciousness": components.get("consciousness", components.get("acvpu", 0)),
            "supplemental_oxygen": components.get("supplemental_oxygen", 0),
        },
        "baseline": baseline_summary,
        "trends": trends,
        "personalization": {
            "hypercapnic_respiratory_failure": is_scale2,
            "scale_used": "SCALE_2" if is_scale2 else "SCALE_1",
            "spo2_target_range": target_spo2,
            "scale_selection_reason": scale2_reason,
            "rolling_baseline_enabled": True,
            "gradual_deterioration_detected": gradual_alert.get("detected", False),
        },
        "alert_explanation": {
            "primary_contributors": contributors,
            "clinical_action": clinical_action,
            "gradual_deterioration_note": gradual_alert.get("alert_message", ""),
            "distinction_disclaimer": (
                "Personalization layer: rolling baseline trend alerts monitor gradual deterioration "
                "and are distinct from the NEWS2 score."
            ),
        },
    }


@router.get("/{patient_id}/signal-quality")
async def get_patient_signal_quality(patient_id: str) -> dict[str, Any]:
    """Return the real-time signal reliability, artifact detection, and alert suppression status.

    Adheres to Vital-Sign Reliability and Sensor Artifact Detection Layer:
    - Per-vital reliability states: VALID, SUSPECT, ARTIFACT, PROBE_REMOVED, FLATLINE, MISSING
    - Identifies probe removals and suppresses false clinical alerts
    - Multi-vital cross-check ensuring true physiological deterioration is never suppressed
    - Full auditability preserving raw measurements and quality reasons
    """
    patient = _patients.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    latest_tick = None
    if _manager is not None and patient_id in _manager.history and len(_manager.history[patient_id]) > 0:
        latest_tick = _manager.history[patient_id][-1]

    if latest_tick and "signal_quality" in latest_tick:
        sq = latest_tick["signal_quality"]
        return {
            "patient_id": patient_id,
            "patient_name": patient.get("name"),
            "sqi_score": sq.get("sqi", 1.0),
            "overall_status": sq.get("status", "HIGH"),
            "artifact_detected": sq.get("artifact_detected", False),
            "probe_removed": sq.get("probe_removed", False),
            "clinical_alert_suppressed": sq.get("clinical_alert_suppressed", False),
            "suppression_reason": sq.get("suppression_reason"),
            "sensor_alert": sq.get("sensor_alert"),
            "is_genuine_deterioration": sq.get("is_genuine_deterioration", False),
            "genuine_deterioration_note": sq.get("genuine_deterioration_note"),
            "signals": sq.get("signals", {}),
            "note": sq.get("note", "All biological telemetry channels nominal and reliable."),
            "clinical_decision_support_disclaimer": (
                "Prototype clinical decision-support system — synthetic/simulated telemetry only. "
                "Signal quality assessment indicates measurement reliability and does NOT replace clinical judgment."
            ),
        }

    # Fallback default if stream not yet initiated
    return {
        "patient_id": patient_id,
        "patient_name": patient.get("name"),
        "sqi_score": 1.0,
        "overall_status": "HIGH",
        "artifact_detected": False,
        "probe_removed": False,
        "clinical_alert_suppressed": False,
        "suppression_reason": None,
        "sensor_alert": None,
        "is_genuine_deterioration": False,
        "signals": {
            "spo2": {"status": "VALID", "reliable": True, "reason": None},
            "heart_rate": {"status": "VALID", "reliable": True, "reason": None},
            "respiratory_rate": {"status": "VALID", "reliable": True, "reason": None},
            "temperature": {"status": "VALID", "reliable": True, "reason": None},
            "systolic_bp": {"status": "VALID", "reliable": True, "reason": None},
        },
        "note": "Awaiting initial telemetry stream.",
        "clinical_decision_support_disclaimer": (
            "Prototype clinical decision-support system — synthetic/simulated telemetry only."
        ),
    }
