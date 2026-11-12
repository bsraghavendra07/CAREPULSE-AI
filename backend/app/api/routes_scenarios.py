"""Scenario trigger/clear routes – /api/scenarios."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

# Injected at startup
_manager: Any = None


def set_manager(manager: Any) -> None:  # noqa: ANN401
    global _manager
    _manager = manager


class ScenarioTrigger(BaseModel):
    patient_id: str
    scenario: str


class ScenarioClear(BaseModel):
    patient_id: str


@router.post("/trigger")
async def trigger_scenario(body: ScenarioTrigger) -> dict[str, Any]:
    """Trigger a clinical scenario (e.g. sepsis) on a patient."""
    if _manager is None:
        raise HTTPException(status_code=503, detail="Not initialised")
    _manager.scenario_engine.trigger(body.patient_id, body.scenario)

    # Record event for reporting
    scenario_id = f"{body.patient_id}:{body.scenario}"
    event = {
        "patient_id": body.patient_id,
        "scenario": body.scenario,
        "action": "trigger",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tick": _manager.tick_number,
    }
    _manager.scenario_events.append(event)
    _manager.scenario_start_ticks[scenario_id] = _manager.tick_number

    return {"status": "triggered", **event}


@router.get("/active")
async def active_scenarios() -> dict[str, Any]:
    """List active scenarios per patient."""
    if _manager is None:
        raise HTTPException(status_code=503, detail="Not initialised")
    result: dict[str, Any] = {}
    for pid in _manager._patients:
        active = _manager.scenario_engine.get_active(pid)
        if active:
            result[pid] = active
    return result


@router.post("/clear")
async def clear_scenario(body: ScenarioClear) -> dict[str, str]:
    """Clear any active scenario on a patient."""
    if _manager is None:
        raise HTTPException(status_code=503, detail="Not initialised")
    _manager.scenario_engine.clear(body.patient_id)

    event = {
        "patient_id": body.patient_id,
        "scenario": "cleared",
        "action": "clear",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tick": _manager.tick_number,
    }
    _manager.scenario_events.append(event)

    return {"status": "cleared", "patient_id": body.patient_id}
