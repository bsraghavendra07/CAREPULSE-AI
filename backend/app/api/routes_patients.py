"""Patient profile routes – /api/patients."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/patients", tags=["patients"])

# Populated at startup by main.py
_patients: dict[str, dict[str, Any]] = {}


def set_patients(patients: dict[str, dict[str, Any]]) -> None:
    """Called once from ``main.py`` startup to inject patient data."""
    global _patients
    _patients = patients


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
