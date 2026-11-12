"""MINEARENA 1.0 — Main FastAPI application entry point."""

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
    routes_fhir,
    routes_patients,
    routes_report,
    routes_scenarios,
    routes_telemetry,
)
from app.api.websocket_manager import TelemetryManager

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
            scale2_prescribed = exts.get("urn:minearena:scale2_prescribed", {}).get("valueBoolean", False)
            risk_summary = exts.get("urn:minearena:risk_summary", {}).get("valueString", "")

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
                "scale2_prescribed": scale2_prescribed,
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
            patients[pid] = profile
            logger.info("Loaded patient profile %s (%s)", pid, full_name)
        except Exception as exc:
            logger.error("Failed to load patient from %s: %s", json_file, exc)

    return patients


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle."""
    logger.info("Starting MINEARENA 1.0 backend...")

    patients = _load_synthea_profiles()

    # Initialise simulation & scoring engines
    telemetry_manager.init_engines(patients)

    # Inject dependencies into routes
    routes_patients.set_patients(patients)
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
    title="MINEARENA 1.0 — Personalized Post-Discharge Deterioration Monitor",
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
app.include_router(routes_patients.router)
app.include_router(routes_telemetry.router)
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


@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket) -> None:
    """Real-time streaming WebSocket endpoint for client dashboards."""
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
        "system": "MINEARENA 1.0 Deterioration Monitor",
        "status": "operational",
        "version": "1.0.0",
    }

