"""Telemetry history routes – /api/telemetry."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

# Injected at startup
_manager: Any = None


def set_manager(manager: Any) -> None:  # noqa: ANN401
    """Called once from ``main.py`` startup."""
    global _manager
    _manager = manager


@router.get("/{patient_id}/history")
async def get_history(
    patient_id: str,
    n: int = Query(default=50, ge=1, le=500, description="Number of recent records"),
) -> list[dict[str, Any]]:
    """Return the last *n* telemetry records for a patient."""
    if _manager is None:
        raise HTTPException(status_code=503, detail="Telemetry not initialised")
    buf = _manager.history.get(patient_id)
    if buf is None:
        return []
    # Return most recent n entries (oldest first)
    entries = list(buf)
    return entries[-n:]
