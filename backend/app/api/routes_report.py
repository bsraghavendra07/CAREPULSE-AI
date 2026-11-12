"""Performance / reporting routes – /api/report."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/report", tags=["report"])

# Injected at startup
_manager: Any = None


def set_manager(manager: Any) -> None:  # noqa: ANN401
    global _manager
    _manager = manager


@router.get("/performance")
async def performance_report() -> dict[str, Any]:
    """Return live-computed performance metrics from runtime counters.

    All values are computed from actual counters – NEVER hardcoded.
    """
    if _manager is None:
        raise HTTPException(status_code=503, detail="Not initialised")

    total = _manager.total_ticks
    safe_total = max(total, 1)  # avoid division by zero
    SECONDS_PER_DAY = 86400.0

    # Total monitored patient-days across all patients
    total_monitored_seconds = total * 1.0
    total_patient_days = total_monitored_seconds / SECONDS_PER_DAY
    if total_patient_days > 0 and total > 0:
        alerts_per_patient_day = round(_manager.news2_alerts_fired / total_patient_days, 2)
    else:
        alerts_per_patient_day = 0.0

    # Per-patient breakdown
    per_patient: dict[str, dict[str, Any]] = {}
    for pid, pc in _manager.patient_counters.items():
        pt = max(pc["total_ticks"], 1)
        pt_seconds = pc["total_ticks"] * 1.0
        pt_days = pt_seconds / SECONDS_PER_DAY
        pt_alerts_day = round(pc["news2_alerts_fired"] / pt_days, 2) if pt_days > 0 and pc["total_ticks"] > 0 else 0.0

        per_patient[pid] = {
            "total_ticks": pc["total_ticks"],
            "news2_alerts_fired": pc["news2_alerts_fired"],
            "news2_red_scores": pc["news2_red_scores"],
            "personalized_advisories": pc["personalized_advisories"],
            "artifact_flags": pc["artifact_flags"],
            "news2_alert_rate": round(pc["news2_alerts_fired"] / pt * 100, 2),
            "artifact_flag_rate": round(pc["artifact_flags"] / pt * 100, 2),
            "alerts_per_patient_day": pt_alerts_day,
            "monitored_patient_days": round(pt_days, 4),
        }

    return {
        "total_ticks": total,
        "news2_alerts_fired": _manager.news2_alerts_fired,
        "news2_red_scores": _manager.news2_red_scores,
        "personalized_advisories": _manager.personalized_advisories,
        "artifact_flags": _manager.artifact_flags,
        "artifact_low_flags": _manager.artifact_low_flags,
        "news2_alert_rate": round(_manager.news2_alerts_fired / safe_total * 100, 2),
        "artifact_flag_rate": round(_manager.artifact_flags / safe_total * 100, 2),
        "alerts_per_patient_day": alerts_per_patient_day,
        "total_monitored_patient_days": round(total_patient_days, 4),
        "per_patient": per_patient,
        "scenario_events": _manager.scenario_events,
        "detection_latency": _manager.detection_latency,
    }
