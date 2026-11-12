"""WebSocket broadcast hub for real-time patient telemetry."""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

from app.config import WS_TICK_INTERVAL_BASE
from app.core.artifact_detector import ArtifactDetector, SQIResult
from app.core.news2 import NEWS2Result, calculate_news2
from app.core.specialty_recommender import recommend_specialty, SuggestedSpecialtyResult
from app.core.specialist_router import route_clinical_alert, RoutedAlert
from app.core.personalized import PersonalizedEngine, PersonalizedResult
from app.fhir.local_store import LocalFHIRStore
from app.fhir.mapper import create_observation, _UNITS
from app.simulation.bidmc_replayer import BIDMCReplayer
from app.simulation.scenarios import ScenarioEngine
from app.simulation.wearable_simulator import WearableSimulator

logger = logging.getLogger(__name__)

# Maximum history entries kept per patient
_MAX_HISTORY = 500


class TelemetryManager:
    """Manages WebSocket clients and a background telemetry loop."""

    def __init__(self) -> None:
        # WebSocket bookkeeping
        self._clients: list[WebSocket] = []

        # Engines – populated by init_engines()
        self._patients: dict[str, dict[str, Any]] = {}
        self._simulators: dict[str, WearableSimulator] = {}
        self._replayers: dict[str, BIDMCReplayer] = {}
        self._replay_iters: dict[str, Any] = {}
        self.scenario_engine: ScenarioEngine = ScenarioEngine()
        self._personalized: PersonalizedEngine = PersonalizedEngine()
        self._artifact_detector: ArtifactDetector = ArtifactDetector()
        self.fhir_store: LocalFHIRStore = LocalFHIRStore()

        # Per-patient previous vitals for artifact detection
        self._prev_vitals: dict[str, dict[str, Any] | None] = {}

        # Telemetry history ring-buffers
        self.history: dict[str, deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=_MAX_HISTORY)
        )

        # Runtime counters ---------------------------------------------------
        self.speed_factor: int = 1
        self.tick_number: int = 0
        self.total_ticks: int = 0
        self.news2_alerts_fired: int = 0
        self.news2_red_scores: int = 0
        self.personalized_advisories: int = 0
        self.artifact_flags: int = 0
        self.artifact_low_flags: int = 0

        # Per-patient counters
        self.patient_counters: dict[str, dict[str, int]] = defaultdict(
            lambda: {
                "total_ticks": 0,
                "news2_alerts_fired": 0,
                "news2_red_scores": 0,
                "personalized_advisories": 0,
                "artifact_flags": 0,
            }
        )

        # Scenario events log
        self.scenario_events: list[dict[str, Any]] = []
        # scenario_id -> tick when triggered
        self.scenario_start_ticks: dict[str, int] = {}
        # scenario_id -> detection latency (ticks)
        self.detection_latency: dict[str, int | None] = {}

        self._running = False

    # ------------------------------------------------------------------
    # Engine initialisation (called from main.py startup)
    # ------------------------------------------------------------------

    def init_engines(
        self,
        patients: dict[str, dict[str, Any]],
        bidmc_csv_dir: str | None = None,
    ) -> None:
        """Wire up simulators and replayers for each patient."""
        self._patients = patients
        for pid, profile in patients.items():
            self._simulators[pid] = WearableSimulator(profile)
            self._prev_vitals[pid] = None

            csv_path = profile.get("bidmc_csv")
            if csv_path:
                try:
                    replayer = BIDMCReplayer(csv_path)
                    self._replayers[pid] = replayer
                except Exception:
                    logger.warning("No BIDMC CSV for %s – full-sim mode", pid)

    # ------------------------------------------------------------------
    # WebSocket connection management
    # ------------------------------------------------------------------

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._clients:
            self._clients.remove(websocket)

    async def broadcast(self, data: dict[str, Any]) -> None:
        """Send *data* as JSON to every connected client."""
        dead: list[WebSocket] = []
        for ws in self._clients:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    # ------------------------------------------------------------------
    # Background telemetry loop
    # ------------------------------------------------------------------

    async def run_telemetry_loop(self) -> None:
        """Infinite loop: tick through all patients, score, broadcast."""
        self._running = True

        # Initialise replay async generators
        for pid, replayer in self._replayers.items():
            self._replay_iters[pid] = replayer.replay(self.speed_factor)

        while self._running:
            self.tick_number += 1

            for pid, profile in self._patients.items():
                self.total_ticks += 1
                pc = self.patient_counters[pid]
                pc["total_ticks"] += 1

                # 1. Get BIDMC data if available
                bidmc_data: dict[str, Any] | None = None
                replay_iter = self._replay_iters.get(pid)
                if replay_iter is not None:
                    try:
                        bidmc_data = await replay_iter.__anext__()
                    except StopAsyncIteration:
                        # Restart from beginning
                        self._replayers[pid].reset()
                        self._replay_iters[pid] = self._replayers[pid].replay(
                            self.speed_factor
                        )
                        try:
                            bidmc_data = await self._replay_iters[pid].__anext__()
                        except StopAsyncIteration:
                            bidmc_data = None

                # 2. Generate vitals via WearableSimulator
                vitals = self._simulators[pid].generate_vitals(bidmc_data)

                # 3. Apply scenario overlay if any
                vitals = self.scenario_engine.apply(pid, vitals, self.tick_number)

                # 4. Artifact detection
                motion_injected = vitals.get("_motion_injected", False)
                sqi_result: SQIResult = self._artifact_detector.evaluate(
                    vitals, self._prev_vitals.get(pid), motion_injected
                )
                self._prev_vitals[pid] = dict(vitals)

                if sqi_result.artifact_detected:
                    self.artifact_flags += 1
                    pc["artifact_flags"] += 1
                if sqi_result.status == "LOW":
                    self.artifact_low_flags += 1

                # 5. NEWS2 scoring
                scale2 = profile.get("scale2_prescribed", False)
                supp_o2 = vitals.get("supplemental_oxygen", {})
                supp_o2_val = supp_o2.get("value", False) if isinstance(supp_o2, dict) else bool(supp_o2)

                news2_input = {
                    "heart_rate": _extract_value(vitals, "heart_rate"),
                    "oxygen_saturation": _extract_value(vitals, "oxygen_saturation"),
                    "respiratory_rate": _extract_value(vitals, "respiratory_rate"),
                    "systolic_bp": _extract_value(vitals, "systolic_bp"),
                    "body_temperature": _extract_value(vitals, "body_temperature"),
                    "consciousness": _extract_value(vitals, "consciousness"),
                    "supplemental_oxygen": supp_o2_val,
                }
                news2_result: NEWS2Result = calculate_news2(
                    news2_input, scale2, supp_o2_val
                )

                if news2_result.risk_level in ("MEDIUM", "HIGH"):
                    self.news2_alerts_fired += 1
                    pc["news2_alerts_fired"] += 1
                    # Check detection latency for active scenarios
                    for sid, start_tick in list(self.scenario_start_ticks.items()):
                        if sid.startswith(pid) and sid not in self.detection_latency:
                            self.detection_latency[sid] = self.tick_number - start_tick

                if news2_result.has_red_score:
                    self.news2_red_scores += 1
                    pc["news2_red_scores"] += 1

                # 6. Personalized engine
                self._personalized.update(pid, news2_input)
                pers_result: PersonalizedResult = self._personalized.get_assessment(
                    pid, news2_input
                )
                if pers_result.is_advisory_alert:
                    self.personalized_advisories += 1
                    pc["personalized_advisories"] += 1

                # 6.5 Suggested Specialty for Review (Clinical Decision Support)
                specialty_result = recommend_specialty(
                    news2_result=news2_result,
                    vitals=news2_input,
                    sqi_status=sqi_result.status,
                    patient_id=pid,
                    alert_id=f"alert-{pid}-{self.tick_number}",
                )

                # 6.6 Smart Specialist Routing Engine
                routed_alert = route_clinical_alert(
                    patient=profile,
                    news2_result=news2_result,
                    vitals=vitals,
                    sqi_status=sqi_result.status,
                    sqi_note=sqi_result.note,
                    tick_number=self.tick_number,
                    decision_specialty=specialty_result.suggested_specialty if specialty_result.is_applicable else None,
                )

                # 7. FHIR Observation (store locally)
                now_iso = datetime.now(timezone.utc).isoformat()
                obs_id: str | None = None
                for vname in ("heart_rate", "oxygen_saturation", "respiratory_rate", "systolic_bp", "body_temperature"):
                    val = _extract_value(vitals, vname)
                    if val is None:
                        continue
                    src = _extract_source(vitals, vname)
                    unit = _UNITS.get(vname, "")
                    obs = create_observation(pid, vname, float(val), unit, now_iso, src)
                    stored_id = self.fhir_store.store(obs)
                    if obs_id is None:
                        obs_id = stored_id

                # 8. Build broadcast payload
                payload: dict[str, Any] = {
                    "timestamp": now_iso,
                    "patient_id": pid,
                    "tick_number": self.tick_number,
                    "vitals": _build_vitals_payload(vitals),
                    "signal_quality": {
                        "sqi": sqi_result.sqi,
                        "status": sqi_result.status,
                        "artifact_detected": sqi_result.artifact_detected,
                        "motion_injected": sqi_result.motion_injected,
                        "note": sqi_result.note,
                    },
                    "news2": _news2_to_dict(news2_result),
                    "suggested_specialty": specialty_result.model_dump(),
                    "routed_alert": routed_alert.model_dump() if routed_alert else None,
                    "personalized": _pers_to_dict(pers_result),
                    "fhir_observation_id": obs_id,
                }

                # Save to history
                self.history[pid].append(payload)

                # Broadcast
                await self.broadcast(payload)

            # Sleep until next tick
            interval = WS_TICK_INTERVAL_BASE / max(self.speed_factor, 1)
            await asyncio.sleep(interval)

    async def ingest_fhir_reading(
        self,
        patient_id: str,
        vital_name: str,
        value: float,
        unit: str,
        source: str = "FHIR_INGEST",
        obs_id: str | None = None,
    ) -> dict[str, Any]:
        """Ingest external FHIR Observation vital and update patient telemetry & dashboard."""
        profile = self._patients.get(patient_id, {})
        scale2_prescribed = profile.get("scale2_prescribed", False)

        latest = self.history[patient_id][-1]["vitals"] if self.history[patient_id] else None

        vitals: dict[str, Any] = {}
        for vk in ["heart_rate", "oxygen_saturation", "respiratory_rate", "systolic_bp", "body_temperature"]:
            if vk == vital_name:
                vitals[vk] = {"value": value, "source": source}
            elif latest and vk in latest:
                vitals[vk] = latest[vk]
            else:
                base_val = profile.get("baseline", {}).get(
                    vk,
                    75.0 if "rate" in vk else 97.0 if "sat" in vk else 16.0 if "resp" in vk else 120.0 if "bp" in vk else 36.8
                )
                vitals[vk] = {"value": base_val, "source": "BASELINE"}
        vitals["consciousness"] = {"value": "Alert", "source": "SIMULATED"}
        vitals["supplemental_oxygen"] = {"value": False, "source": "SIMULATED"}

        # Run clinical engines
        news2_input = {
            "hr": _extract_value(vitals, "heart_rate"),
            "spo2": _extract_value(vitals, "oxygen_saturation"),
            "rr": _extract_value(vitals, "respiratory_rate"),
            "sbp": _extract_value(vitals, "systolic_bp"),
            "temp": _extract_value(vitals, "body_temperature"),
            "acvpu": "A",
        }
        news2_result = calculate_news2(
            news2_input,
            scale2_prescribed=scale2_prescribed,
            supplemental_oxygen=False,
        )
        pers_result = self._personalized.get_assessment(patient_id, news2_input)
        routed_alert = route_clinical_alert(
            patient=profile,
            news2_result=news2_result,
            vitals=vitals,
            sqi_status="GOOD",
            sqi_note=None,
            tick_number=self.tick_number,
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "timestamp": now_iso,
            "patient_id": patient_id,
            "tick_number": self.tick_number,
            "vitals": _build_vitals_payload(vitals),
            "signal_quality": {
                "sqi": 1.0,
                "status": "GOOD",
                "artifact_detected": False,
                "motion_injected": False,
                "note": f"Ingested via FHIR R4 API ({vital_name}={value} {unit})",
            },
            "news2": _news2_to_dict(news2_result),
            "routed_alert": routed_alert.model_dump() if routed_alert else None,
            "personalized": _pers_to_dict(pers_result),
            "fhir_observation_id": obs_id,
        }
        self.history[patient_id].append(payload)
        await self.broadcast(payload)
        return payload

    def stop(self) -> None:
        self._running = False


# ======================================================================
# Internal helpers
# ======================================================================

def _extract_value(vitals: dict[str, Any], key: str) -> Any:
    """Extract scalar value whether vitals[key] is ``{value:…}`` or raw."""
    v = vitals.get(key)
    if isinstance(v, dict):
        return v.get("value")
    return v


def _extract_source(vitals: dict[str, Any], key: str) -> str:
    v = vitals.get(key)
    if isinstance(v, dict):
        return v.get("source", "SIMULATED")
    return "SIMULATED"


def _build_vitals_payload(vitals: dict[str, Any]) -> dict[str, Any]:
    keys = [
        "heart_rate",
        "oxygen_saturation",
        "respiratory_rate",
        "systolic_bp",
        "body_temperature",
        "consciousness",
        "supplemental_oxygen",
    ]
    out: dict[str, Any] = {}
    for k in keys:
        v = vitals.get(k)
        if isinstance(v, dict):
            out[k] = {"value": v.get("value"), "source": v.get("source", "SIMULATED")}
        else:
            out[k] = {"value": v, "source": "SIMULATED"}
    return out


def _news2_to_dict(r: NEWS2Result) -> dict[str, Any]:
    try:
        return r.model_dump()
    except AttributeError:
        return {
            "total_score": r.total_score,
            "sub_scores": r.sub_scores,
            "scale_used": r.scale_used,
            "scale2_prescribed": r.scale2_prescribed,
            "scale2_justification": r.scale2_justification,
            "risk_level": r.risk_level,
            "has_red_score": r.has_red_score,
            "red_score_parameter": r.red_score_parameter,
            "triage_tier": getattr(r, "triage_tier", "ROUTINE"),
            "alert_reason": getattr(r, "alert_reason", ""),
            "clinical_action": getattr(r, "clinical_action", ""),
            "suggested_specialty": getattr(r, "suggested_specialty", None),
        }


def _pers_to_dict(r: PersonalizedResult) -> dict[str, Any]:
    try:
        return r.model_dump()
    except AttributeError:
        return {
            "baseline": r.baseline,
            "z_scores": r.z_scores,
            "is_advisory_alert": r.is_advisory_alert,
            "alert_parameters": r.alert_parameters,
            "advisory_note": r.advisory_note,
        }
