"""CarePulse — Main FastAPI application entry point."""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api import (
    routes_alerts,
    routes_auth,
    routes_billing,
    routes_fhir,
    routes_ml,
    routes_patient_portal,
    routes_patients,
    routes_report,
    routes_scenarios,
    routes_telemetry,
)
from app.api.websocket_manager import TelemetryManager
from app.core.news2 import evaluate_hypercapnic_failure
from app.core.specialist_router import categorize_patient
from app.core.staff_registry import StaffStatus, staff_registry
from app.ml.isolation_forest_model import initialize_ml_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Singleton Telemetry Manager
telemetry_manager = TelemetryManager()


def _load_synthea_profiles() -> dict[str, dict[str, Any]]:
    """Parse patient JSON files in app/data/synthea/."""
    synthea_dir = Path(__file__).resolve().parent / "data" / "synthea"
    bidmc_csv_path = Path(__file__).resolve().parent / "data" / "bidmc" / "bidmc_sample_vitals.csv"

    patients: dict[str, dict[str, Any]] = {}
    for json_file in sorted(synthea_dir.glob("*.json")):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)

            pid = data.get("id", json_file.stem)
            name_obj = data.get("name", [{}])[0]
            family = name_obj.get("family", "")
            given = " ".join(name_obj.get("given", []))
            full_name = f"{given} {family}".strip() or pid

            # Parse extensions
            exts = {ext.get("url"): ext for ext in data.get("extension", [])}

            condition = exts.get("urn:minearena:condition", {}).get("valueString", "Post-Discharge Monitoring")
            scale2_prescribed_ext = exts.get("urn:minearena:scale2_prescribed", {}).get("valueBoolean", False)
            risk_summary = exts.get("urn:minearena:risk_summary", {}).get("valueString", "")

            # Personalization Rule 1: Dynamic clinical evaluation of hypercapnic respiratory failure
            is_scale2, target_spo2_range, scale2_reason = evaluate_hypercapnic_failure(
                {"condition": condition, "risk_summary": risk_summary, "scale2_prescribed": scale2_prescribed_ext}
            )

            baseline_hr = float(exts.get("urn:minearena:baseline_hr", {}).get("valueDecimal", 75))
            baseline_spo2 = float(exts.get("urn:minearena:baseline_spo2", {}).get("valueDecimal", 97))
            baseline_rr = float(exts.get("urn:minearena:baseline_rr", {}).get("valueDecimal", 16))
            baseline_sbp = float(exts.get("urn:minearena:baseline_sbp", {}).get("valueDecimal", 120))
            baseline_temp = float(exts.get("urn:minearena:baseline_temp", {}).get("valueDecimal", 36.8))

            profile = {
                "id": pid,
                "name": full_name,
                "gender": data.get("gender", "unknown"),
                "birthDate": data.get("birthDate", "1970-01-01"),
                "condition": condition,
                "scale2_prescribed": is_scale2,
                "spo2_scale": 2 if is_scale2 else 1,
                "spo2_target": target_spo2_range,
                "scale2_justification": scale2_reason,
                "riskSummary": risk_summary,
                "baseline": {
                    "heart_rate": baseline_hr,
                    "oxygen_saturation": baseline_spo2,
                    "respiratory_rate": baseline_rr,
                    "systolic_bp": baseline_sbp,
                    "body_temperature": baseline_temp,
                },
                # Flat keys for WearableSimulator
                "baseline_hr": baseline_hr,
                "baseline_spo2": baseline_spo2,
                "baseline_rr": baseline_rr,
                "baseline_sbp": baseline_sbp,
                "baseline_temp": baseline_temp,
                # Connect BIDMC CSV replay for patients
                "bidmc_csv": str(bidmc_csv_path) if bidmc_csv_path.exists() else None,
            }
            # Feature 1: Automatically assign relevant medical department & specialist based on conditions
            specialist_meta = categorize_patient(profile)
            profile.update(specialist_meta)

            patients[pid] = profile
            logger.info("Loaded patient profile %s (%s) -> %s (%s)", pid, full_name, profile.get("department"), profile.get("specialist_name"))
        except Exception as exc:
            logger.error("Failed to load patient from %s: %s", json_file, exc)

    return patients


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle."""
    logger.info("Starting CarePulse backend...")

    patients = _load_synthea_profiles()

    # Initialise simulation & scoring engines
    telemetry_manager.init_engines(patients)

    # Initialise & train Unsupervised Isolation Forest model on BIDMC telemetry
    bidmc_csv_path = Path(__file__).resolve().parent / "data" / "bidmc" / "bidmc_sample_vitals.csv"
    initialize_ml_model(bidmc_csv_path)

    # Inject dependencies into routes
    routes_patients.set_patients(patients)
    routes_patients.set_telemetry_manager(telemetry_manager)
    routes_patient_portal.set_portal_dependencies(telemetry_manager, patients)
    routes_telemetry.set_manager(telemetry_manager)
    routes_scenarios.set_manager(telemetry_manager)
    routes_report.set_manager(telemetry_manager)
    routes_fhir.set_stores(
        telemetry_manager.fhir_store,
        telemetry_manager=telemetry_manager,
        patients=patients,
    )

    # Launch telemetry streaming loop in background
    telemetry_task = asyncio.create_task(telemetry_manager.run_telemetry_loop())

    yield

    logger.info("Stopping telemetry stream...")
    telemetry_manager.stop()
    telemetry_task.cancel()
    try:
        await telemetry_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="CarePulse — Personalized Post-Discharge Deterioration Monitor",
    description="Real-time multi-patient clinical deterioration monitoring using NEWS2 and individualized anomaly detection.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(routes_auth.router)
app.include_router(routes_patient_portal.router)
app.include_router(routes_billing.router)
app.include_router(routes_patients.router)
app.include_router(routes_telemetry.router)
app.include_router(routes_alerts.router)
app.include_router(routes_ml.router)
app.include_router(routes_scenarios.router)
app.include_router(routes_report.router)
app.include_router(routes_fhir.router)


class SpeedUpdate(BaseModel):
    factor: int


@app.post("/api/simulation/speed")
async def set_simulation_speed(body: SpeedUpdate) -> dict[str, Any]:
    """Adjust simulation playback speed (1x, 2x, 5x, 10x)."""
    factor = max(1, min(10, int(body.factor)))
    telemetry_manager.speed_factor = factor
    return {"speed_factor": factor}


@app.post("/api/simulation/pause")
async def pause_simulation() -> dict[str, Any]:
    """Pause background telemetry generation."""
    telemetry_manager.pause()
    return {"status": "paused", "is_paused": True}


@app.post("/api/simulation/resume")
async def resume_simulation() -> dict[str, Any]:
    """Resume background telemetry generation."""
    telemetry_manager.resume()
    return {"status": "running", "is_paused": False}


@app.post("/api/simulation/reset")
async def reset_simulation() -> dict[str, Any]:
    """Reset all active scenarios, events, and replayers."""
    telemetry_manager.reset_simulation()
    return {"status": "reset", "is_paused": telemetry_manager.is_paused}


@app.get("/api/simulation/state")
async def get_simulation_state() -> dict[str, Any]:
    """Get current simulation state."""
    return {
        "is_paused": telemetry_manager.is_paused,
        "speed_factor": telemetry_manager.speed_factor,
        "tick_number": telemetry_manager.tick_number,
    }


class DataSourceUpdateRequest(BaseModel):
    patient_id: str = "P-001"
    data_source: str  # "WEARABLE" or "BIDMC"


@app.post("/api/simulation/source")
async def update_simulation_source(body: DataSourceUpdateRequest) -> dict[str, Any]:
    """Set data source mode to WEARABLE or BIDMC."""
    telemetry_manager.set_data_source(body.patient_id, body.data_source)
    return {
        "status": "ok",
        "patient_id": body.patient_id,
        "data_source": telemetry_manager.get_data_source(body.patient_id),
    }


@app.get("/api/simulation/source")
async def query_simulation_source(patient_id: str = "P-001") -> dict[str, Any]:
    """Query data source mode for a patient."""
    return {
        "patient_id": patient_id,
        "data_source": telemetry_manager.get_data_source(patient_id),
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None,
) -> None:
    """Real-time streaming WebSocket endpoint for client dashboards."""
    # Enforce approval status gating: unapproved staff cannot access real-time clinical stream
    if token:
        if token.startswith("carepulse-staff-"):
            uid_or_email = token.replace("carepulse-staff-", "")
            user = staff_registry.get_by_id(uid_or_email) or staff_registry.get_by_email(uid_or_email)
            if user:
                if user.status != StaffStatus.APPROVED:
                    await websocket.close(code=1008, reason="Pending hospital administrator approval.")
                    return
                if user.role == StaffRole.ACCOUNTANT:
                    await websocket.close(code=1008, reason="Accounting staff are barred from raw clinical telemetry.")
                    return
        elif token.startswith("carepulse-patient-"):
            uid_or_email = token.replace("carepulse-patient-", "")
            p_user = patient_registry.get_by_id(uid_or_email) or patient_registry.get_by_email(uid_or_email)
            if not p_user:
                await websocket.close(code=1008, reason="Invalid patient credentials.")
                return

    await telemetry_manager.connect(websocket)
    try:
        while True:
            # Keep alive & accept any client command
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        telemetry_manager.disconnect(websocket)
    except Exception:
        telemetry_manager.disconnect(websocket)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "system": "CarePulse Deterioration Monitor",
        "status": "operational",
        "version": "1.0.0",
    }

