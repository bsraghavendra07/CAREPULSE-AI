"""
CarePulse AI - Main FastAPI Application
Provides:
- FHIR R4 Ingestion & Search APIs (/fhir/*)
- Telemetry Ingestion & Real-Time Intelligence Pipeline (/api/vitals/ingest)
- Virtual Wearable Simulator & PhysioNet BIDMC Dataset Replay Controls
- Recovery DNA Patient Profiling & Explainable Alert Cards
- WebSocket Live Feed for Clinician Dashboard (/ws/telemetry)
- Empirical Benchmark Runner (/api/benchmark)
- Patient Symptom Check-in (/api/patient/{id}/symptom-checkin)
"""

import asyncio
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.fhir.models import (
    LOINC_HEART_RATE,
    LOINC_SPO2,
    LOINC_RESPIRATORY_RATE,
    LOINC_BODY_TEMPERATURE,
    LOINC_DEFINITIONS,
    create_fhir_observation,
    VitalSignsIngestPayload
)
from backend.fhir.store import fhir_store
from backend.engine.news2 import calculate_news2
from backend.engine.sensor_truth import sensor_truth_engine
from backend.engine.recovery_dna import recovery_dna_registry
from backend.engine.radar import early_deterioration_radar
from backend.engine.explainability import build_explainable_alert_card
from backend.data.synthea_profiles import SYNTHEA_PATIENT_DEFINITIONS
from backend.data.simulator import virtual_wearable_simulator
from backend.data.bidmc_replay import bidmc_replay_engine
from backend.scenarios.benchmark import run_comprehensive_benchmark

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("carepulse.main")

app = FastAPI(
    title="CarePulse AI - Intelligent Personalized Post-Discharge Deterioration Monitor",
    version="1.0.0",
    description="MINEARENA 1.0 - Team #1CodeRangers - Problem PS-03 Implementation"
)

# Enable CORS for frontend Vite dev server and production build
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State tracking
recent_alerts: List[Dict[str, Any]] = []
last_patient_vitals: Dict[str, Dict[str, Any]] = {}
active_connections: List[WebSocket] = []

# Symptom check-ins
patient_symptoms: Dict[str, Dict[str, Any]] = {}


# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active:
            self.active.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active)}")

    async def broadcast(self, message: Dict[str, Any]):
        dead = []
        for connection in self.active:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                dead.append(connection)
        for d in dead:
            if d in self.active:
                self.active.remove(d)

ws_manager = ConnectionManager()


# Core Processing Pipeline
def process_telemetry_reading(
    patient_id: str,
    heart_rate: Optional[float],
    spo2: Optional[float],
    respiratory_rate: Optional[float],
    body_temperature: Optional[float],
    supplemental_oxygen: bool = False,
    source_tag: str = "WEARABLE"
) -> Dict[str, Any]:
    """
    Core Intelligence Pipeline:
    1. FHIR Observations Generation & Storage
    2. Sensor Truth Engine Verification
    3. Patient Recovery DNA Evaluation (Scale 1 vs Scale 2, Rolling Baseline)
    4. NEWS2 Calculation
    5. Early Deterioration Radar Trajectory Analysis
    6. Explainable Alert Card Synthesis
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Store FHIR R4 Observations
    obs_list = []
    if heart_rate is not None:
        obs_hr = create_fhir_observation(patient_id, LOINC_HEART_RATE, heart_rate, now_iso)
        fhir_store.save_observation(obs_hr)
        obs_list.append(obs_hr)
    if spo2 is not None:
        obs_spo2 = create_fhir_observation(patient_id, LOINC_SPO2, spo2, now_iso)
        fhir_store.save_observation(obs_spo2)
        obs_list.append(obs_spo2)
    if respiratory_rate is not None:
        obs_rr = create_fhir_observation(patient_id, LOINC_RESPIRATORY_RATE, respiratory_rate, now_iso)
        fhir_store.save_observation(obs_rr)
        obs_list.append(obs_rr)
    if body_temperature is not None:
        obs_temp = create_fhir_observation(patient_id, LOINC_BODY_TEMPERATURE, body_temperature, now_iso)
        fhir_store.save_observation(obs_temp)
        obs_list.append(obs_temp)

    current_vitals = {
        "heart_rate": heart_rate,
        "spo2": spo2,
        "respiratory_rate": respiratory_rate,
        "body_temperature": body_temperature,
        "timestamp": now_iso
    }
    prev_vitals = last_patient_vitals.get(patient_id)

    # 2. Sensor Truth Engine
    sensor_verdict = sensor_truth_engine.inspect_reading(
        patient_id, heart_rate, spo2, respiratory_rate, body_temperature
    )

    # Retrieve Patient Profile
    dna_profile = recovery_dna_registry.get(patient_id)
    if not dna_profile:
        # Create default fallback profile
        from backend.engine.recovery_dna import RecoveryDNAProfile
        dna_profile = RecoveryDNAProfile(patient_id, f"Patient {patient_id}", 60, "unknown", [], [])
        recovery_dna_registry.register(dna_profile)

    patient_dict = dna_profile.to_dict()

    # 3. Personalized Recovery DNA
    use_scale_2 = dna_profile.has_hypercapnic_failure
    personalized_eval = dna_profile.evaluate_personalized_deviation(
        heart_rate, spo2, respiratory_rate, body_temperature
    )

    # If sensor verified reading is valid, update rolling baseline
    if sensor_verdict["is_valid"]:
        dna_profile.update_rolling_baseline(current_vitals)

    # 4. NEWS2 Calculation
    # Factor in check-in symptoms if reported
    symptoms = patient_symptoms.get(patient_id, {})
    news2_result = calculate_news2(
        respiratory_rate=respiratory_rate,
        spo2=spo2,
        heart_rate=heart_rate,
        temperature=body_temperature,
        supplemental_oxygen=supplemental_oxygen,
        use_scale_2=use_scale_2
    )

    # If patient reported severe breathlessness in daily check-in, amplify clinical review
    if symptoms.get("breathlessness") == "severe" and news2_result["tier"] == "WATCH":
        news2_result["tier"] = "REVIEW"
        news2_result["clinical_risk"] = "Amplify Review (Patient Reported Severe Dyspnea)"

    # 5. Early Deterioration Radar
    radar_result = early_deterioration_radar.analyze_trajectory(
        patient_id, heart_rate, spo2, respiratory_rate, body_temperature, now_iso
    )

    # 6. Synthesize Explainable Alert Card
    alert_card = build_explainable_alert_card(
        patient_profile=patient_dict,
        current_vitals=current_vitals,
        previous_vitals=prev_vitals,
        news2_result=news2_result,
        sensor_verdict=sensor_verdict,
        radar_result=radar_result,
        personalized_result=personalized_eval
    )

    # Cache recent alert & vital
    last_patient_vitals[patient_id] = current_vitals
    recent_alerts.insert(0, alert_card)
    if len(recent_alerts) > 50:
        recent_alerts.pop()

    # If high priority alert, store as FHIR Flag
    if alert_card["tier"] in ["REVIEW", "URGENT", "SENSOR_WARNING"]:
        fhir_flag = {
            "resourceType": "Flag",
            "status": "active",
            "code": {"text": alert_card["reason"]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "period": {"start": now_iso}
        }
        fhir_store.save_flag(fhir_flag)

    return {
        "status": "PROCESSED",
        "patient_id": patient_id,
        "vitals": current_vitals,
        "sensor_verdict": sensor_verdict,
        "news2": news2_result,
        "radar": radar_result,
        "personalized": personalized_eval,
        "alert_card": alert_card,
        "fhir_observations_saved": len(obs_list),
        "source": source_tag
    }


# =====================================================================
# FHIR R4 Standard Ingestion & Search Endpoints
# =====================================================================

@app.post("/fhir/Observation")
async def ingest_fhir_observation(obs: Dict[str, Any]):
    """Ingests a standard FHIR R4 Vital Signs Observation."""
    if obs.get("resourceType") != "Observation":
        raise HTTPException(status_code=400, detail="Expected resourceType 'Observation'")
    
    # Extract subject
    subj_ref = obs.get("subject", {}).get("reference", "")
    patient_id = subj_ref.replace("Patient/", "").strip() if subj_ref else "P-001"
    
    # Identify LOINC code
    codings = obs.get("code", {}).get("coding", [])
    loinc_code = next((c.get("code") for c in codings if c.get("system") == "http://loinc.org"), None)
    if not loinc_code:
        loinc_code = codings[0].get("code") if codings else None

    if not loinc_code:
        raise HTTPException(status_code=400, detail="Missing LOINC code in code.coding")

    val_quantity = obs.get("valueQuantity", {})
    val = val_quantity.get("value")

    # Map to vital sign channel
    from backend.fhir.models import LOINC_SPO2_ALT
    hr, spo2, rr, temp = None, None, None, None
    if loinc_code == LOINC_HEART_RATE:
        hr = float(val) if val is not None else None
    elif loinc_code in (LOINC_SPO2, LOINC_SPO2_ALT):
        spo2 = float(val) if val is not None else None
    elif loinc_code == LOINC_RESPIRATORY_RATE:
        rr = float(val) if val is not None else None
    elif loinc_code == LOINC_BODY_TEMPERATURE:
        temp = float(val) if val is not None else None

    fhir_store.save_observation(obs, sync_hapi=True)
    
    # Process through pipeline
    result = process_telemetry_reading(patient_id, hr, spo2, rr, temp, source_tag="FHIR_R4_REST")
    await ws_manager.broadcast({"type": "VITAL_UPDATE", "data": result})
    return {"status": "SUCCESS", "observation_id": obs.get("id"), "processed": result}


@app.get("/fhir/Observation/{obs_id}")
def get_single_fhir_observation(obs_id: str):
    """Retrieves a single FHIR R4 Observation by ID."""
    obs = fhir_store.get_observation_by_id(obs_id)
    if not obs:
        raise HTTPException(status_code=404, detail=f"Observation {obs_id} not found")
    return obs


@app.get("/fhir/Observation")
def search_fhir_observations(
    subject: Optional[str] = Query(None, description="e.g. Patient/P-001"),
    code: Optional[str] = Query(None, description="LOINC code, e.g. 2708-6 or 8867-4"),
    _limit: int = 50
):
    """FHIR R4 search endpoint for Observations."""
    patient_id = subject.replace("Patient/", "") if subject else "P-001"
    results = fhir_store.get_observations_for_patient(patient_id, loinc_code=code, limit=_limit)
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(results),
        "entry": [{"resource": r} for r in results]
    }


@app.post("/fhir/Bundle")
async def ingest_fhir_bundle(bundle: Dict[str, Any]):
    """Ingests a FHIR R4 Bundle containing Vital Signs Observations."""
    entries = bundle.get("entry", [])
    processed_count = 0
    from backend.fhir.models import LOINC_SPO2_ALT
    
    patient_vitals_agg: Dict[str, Dict[str, Any]] = {}
    
    for entry in entries:
        res = entry.get("resource", {})
        if res.get("resourceType") == "Observation":
            fhir_store.save_observation(res, sync_hapi=True)
            processed_count += 1
            
            subj_ref = res.get("subject", {}).get("reference", "Patient/P-001")
            p_id = subj_ref.replace("Patient/", "").strip()
            if p_id not in patient_vitals_agg:
                patient_vitals_agg[p_id] = {"hr": None, "spo2": None, "rr": None, "temp": None}
                
            codings = res.get("code", {}).get("coding", [])
            code = codings[0].get("code") if codings else None
            val = res.get("valueQuantity", {}).get("value")
            if val is not None:
                val = float(val)
                if code == LOINC_HEART_RATE:
                    patient_vitals_agg[p_id]["hr"] = val
                elif code in (LOINC_SPO2, LOINC_SPO2_ALT):
                    patient_vitals_agg[p_id]["spo2"] = val
                elif code == LOINC_RESPIRATORY_RATE:
                    patient_vitals_agg[p_id]["rr"] = val
                elif code == LOINC_BODY_TEMPERATURE:
                    patient_vitals_agg[p_id]["temp"] = val

    # Execute pipeline updates for affected patients
    last_result = None
    for p_id, v in patient_vitals_agg.items():
        last_result = process_telemetry_reading(
            p_id, v["hr"], v["spo2"], v["rr"], v["temp"], source_tag="FHIR_R4_BUNDLE"
        )
        await ws_manager.broadcast({"type": "VITAL_UPDATE", "data": last_result})

    return {
        "status": "SUCCESS", 
        "observations_ingested": processed_count,
        "patients_updated": list(patient_vitals_agg.keys()),
        "latest_eval": last_result
    }


@app.get("/fhir/metadata")
def get_fhir_capability_statement():
    """FHIR R4 CapabilityStatement identifying HAPI and HL7 R4 compliance."""
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": datetime.now(timezone.utc).isoformat(),
        "publisher": "CarePulse AI - Team #1CodeRangers",
        "kind": "instance",
        "software": {
            "name": "CarePulse AI FHIR R4 Engine & HAPI Bridge",
            "version": "1.0.0"
        },
        "fhirVersion": "4.0.1",
        "format": ["application/fhir+json", "application/json"],
        "rest": [
            {
                "mode": "server",
                "resource": [
                    {
                        "type": "Observation",
                        "profile": "http://hl7.org/fhir/StructureDefinition/vitalsigns",
                        "interaction": [{"code": "read"}, {"code": "search-type"}, {"code": "create"}],
                        "searchParam": [{"name": "subject", "type": "reference"}, {"name": "code", "type": "token"}]
                    },
                    {
                        "type": "Patient",
                        "profile": "http://hl7.org/fhir/StructureDefinition/Patient",
                        "interaction": [{"code": "read"}, {"code": "search-type"}]
                    }
                ]
            }
        ]
    }


@app.get("/api/fhir/status")
def get_fhir_service_status():
    """Returns comprehensive statistics on stored FHIR observations and HAPI server sync."""
    return fhir_store.get_stats()


@app.post("/api/fhir/test-sample")
async def inject_sample_fhir_observation(body: Dict[str, Any] = Body(...)):
    """
    Helper to test FHIR R4 ingestion directly from the UI or test runners:
    body: { patient_id: "P-001", vital_type: "HEART_RATE"|"SPO2"|"RESPIRATORY_RATE"|"TEMPERATURE", value: float }
    """
    patient_id = body.get("patient_id", "P-003")
    vital_type = body.get("vital_type", "SPO2").upper()
    val = float(body.get("value", 95.0))
    
    loinc_map = {
        "HEART_RATE": LOINC_HEART_RATE,
        "SPO2": LOINC_SPO2,
        "RESPIRATORY_RATE": LOINC_RESPIRATORY_RATE,
        "TEMPERATURE": LOINC_BODY_TEMPERATURE
    }
    
    target_loinc = loinc_map.get(vital_type, LOINC_SPO2)
    obs = create_fhir_observation(patient_id, target_loinc, val)
    return await ingest_fhir_observation(obs)


@app.post("/api/fhir/sync-hapi")
def trigger_hapi_sync():
    """Triggers sync of all stored observations to configured external HAPI FHIR server."""
    synced = 0
    for obs in fhir_store.observations:
        if fhir_store._sync_to_hapi(obs):
            synced += 1
    return {
        "status": "COMPLETED",
        "synced": synced,
        "total": len(fhir_store.observations),
        "target_hapi_url": fhir_store.external_hapi_url,
        "last_status": fhir_store.hapi_last_status
    }


@app.get("/fhir/Patient")
def list_fhir_patients():
    """Lists all Synthea patient resources in FHIR format."""
    patients = fhir_store.list_patients()
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(patients),
        "entry": [{"resource": p} for p in patients]
    }


@app.get("/fhir/Patient/{patient_id}")
def get_fhir_patient(patient_id: str):
    """Retrieves a single FHIR Patient."""
    patient = fhir_store.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


# =====================================================================
# Telemetry Ingestion, Simulator, and BIDMC Endpoints
# =====================================================================

@app.post("/api/vitals/ingest")
async def ingest_vitals_payload(payload: VitalSignsIngestPayload):
    """Simplified wearable ingestion endpoint."""
    result = process_telemetry_reading(
        patient_id=payload.patient_id,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        respiratory_rate=payload.respiratory_rate,
        body_temperature=payload.body_temperature,
        supplemental_oxygen=payload.supplemental_o2 or False,
        source_tag=f"WEARABLE_{payload.device_id}"
    )
    await ws_manager.broadcast({"type": "VITAL_UPDATE", "data": result})
    return result


@app.post("/api/simulator/event")
async def set_simulator_event(body: Dict[str, Any] = Body(...)):
    """
    Sets scripted event on simulator:
    event: GRADUAL_DRIFT | SUDDEN_SPIKE | MISSING_DATA | MOTION_NOISE | PROBE_REMOVAL | null
    """
    patient_id = body.get("patient_id", "P-003")
    event_type = body.get("event")
    virtual_wearable_simulator.set_event(patient_id, event_type)
    return {"status": "SUCCESS", "patient_id": patient_id, "active_event": event_type}


@app.get("/api/simulator/next")
async def get_simulator_tick(patient_id: str = "P-003"):
    """Generates next telemetry reading from the Virtual Wearable Simulator."""
    reading = virtual_wearable_simulator.generate_reading(patient_id)
    result = process_telemetry_reading(
        patient_id=reading["patient_id"],
        heart_rate=reading.get("heart_rate"),
        spo2=reading.get("spo2"),
        respiratory_rate=reading.get("respiratory_rate"),
        body_temperature=reading.get("body_temperature"),
        source_tag=f"SIMULATOR_{reading.get('event_simulated', 'NORMAL')}"
    )
    result["simulator_raw"] = reading
    await ws_manager.broadcast({"type": "VITAL_UPDATE", "data": result})
    return result


@app.get("/api/bidmc/next")
async def get_bidmc_tick(patient_id: str = "P-001"):
    """Streams the next genuine observation from the PhysioNet BIDMC dataset."""
    reading = bidmc_replay_engine.get_next_reading(patient_id)
    result = process_telemetry_reading(
        patient_id=reading["patient_id"],
        heart_rate=reading.get("heart_rate"),
        spo2=reading.get("spo2"),
        respiratory_rate=reading.get("respiratory_rate"),
        body_temperature=reading.get("body_temperature"),
        source_tag="PHYSIONET_BIDMC"
    )
    result["bidmc_raw"] = reading
    await ws_manager.broadcast({"type": "VITAL_UPDATE", "data": result})
    return result


# =====================================================================
# Patient Profiles, Symptom Check-in & Benchmark
# =====================================================================

@app.get("/api/patients")
def get_all_patients():
    """Lists all Recovery DNA profiles with baselines and clinical histories."""
    return recovery_dna_registry.list_all()


@app.get("/api/patient/{patient_id}")
def get_single_patient(patient_id: str):
    profile = recovery_dna_registry.get(patient_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return profile.to_dict()


class SymptomCheckIn(BaseModel):
    breathlessness: str = "none"  # none | mild | moderate | severe
    fever: bool = False
    dizziness: bool = False
    notes: Optional[str] = None


@app.post("/api/patient/{patient_id}/symptom-checkin")
async def patient_daily_checkin(patient_id: str, checkin: SymptomCheckIn):
    """Patient web portal symptom check-in integration."""
    patient_symptoms[patient_id] = checkin.model_dump()
    logger.info(f"Received symptom check-in from {patient_id}: {checkin}")
    return {
        "status": "RECORDED",
        "patient_id": patient_id,
        "symptoms": checkin.model_dump(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/alerts")
def get_recent_alerts(limit: int = 20):
    """Returns recent explainable clinical alert cards."""
    return recent_alerts[:limit]


@app.get("/api/benchmark")
def get_empirical_benchmark():
    """Runs empirical benchmark comparing CarePulse AI vs Fixed-Threshold Monitoring."""
    return run_comprehensive_benchmark()


# WebSocket Real-Time Channel
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial snapshot
        await websocket.send_text(json.dumps({
            "type": "INITIAL_SNAPSHOT",
            "patients": recovery_dna_registry.list_all(),
            "recent_alerts": recent_alerts[:10]
        }))
        while True:
            data = await websocket.receive_text()
            # Client can send commands via WS if desired
            try:
                cmd = json.loads(data)
                if cmd.get("action") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "system": "CarePulse AI",
        "version": "1.0.0",
        "time": datetime.now(timezone.utc).isoformat()
    }


# Serve React frontend build directly from FastAPI
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

