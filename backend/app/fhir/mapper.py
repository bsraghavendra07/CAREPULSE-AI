"""FHIR R4 Observation / Bundle mapper for MINEARENA 1.0."""

from __future__ import annotations

import uuid
from typing import Any

# LOINC codes for vital-sign parameters
_LOINC: dict[str, str] = {
    "heart_rate": "8867-4",
    "oxygen_saturation": "2708-6",
    "respiratory_rate": "9279-1",
    "systolic_bp": "8480-6",
    "body_temperature": "8310-5",
}
LOINC_CODES = _LOINC

# Canonical UCUM display units
_UNITS: dict[str, str] = {
    "heart_rate": "beats/minute",
    "oxygen_saturation": "%",
    "respiratory_rate": "breaths/minute",
    "systolic_bp": "mmHg",
    "body_temperature": "Cel",
}

# Formal UCUM unit codes for valueQuantity.code
_UCUM_CODES: dict[str, str] = {
    "heart_rate": "/min",
    "oxygen_saturation": "%",
    "respiratory_rate": "/min",
    "systolic_bp": "mm[Hg]",
    "body_temperature": "Cel",
}


def create_observation(
    patient_id: str,
    vital_name: str,
    value: float,
    unit: str,
    timestamp: str,
    source: str,
) -> dict[str, Any]:
    """Return a valid FHIR R4 Observation resource dict.

    Parameters
    ----------
    patient_id : str
        Logical patient identifier (e.g. "P-001").
    vital_name : str
        Key into ``_LOINC`` / ``_UNITS`` (e.g. "heart_rate").
    value : float
        Numeric measurement value.
    unit : str
        UCUM unit string.
    timestamp : str
        ISO-8601 datetime string for ``effectiveDateTime``.
    source : str
        Either ``"BIDMC"`` or ``"SIMULATED"``.
    """
    obs_id = f"obs-{uuid.uuid4().hex[:12]}"
    loinc_code = _LOINC.get(vital_name, "unknown")

    return {
        "resourceType": "Observation",
        "id": obs_id,
        "meta": {
            "tag": [
                {
                    "system": "http://minearena.io/source",
                    "code": source,
                    "display": source,
                }
            ],
        },
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": loinc_code,
                    "display": vital_name.replace("_", " ").title(),
                }
            ],
            "text": vital_name.replace("_", " ").title(),
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": timestamp,
        "valueQuantity": {
            "value": value,
            "unit": unit,
            "system": "http://unitsofmeasure.org",
            "code": _UCUM_CODES.get(vital_name, unit),
        },
    }


def create_bundle(observations: list[dict[str, Any]]) -> dict[str, Any]:
    """Return a FHIR R4 Bundle of type ``collection``."""
    return {
        "resourceType": "Bundle",
        "id": f"bundle-{uuid.uuid4().hex[:12]}",
        "type": "collection",
        "total": len(observations),
        "entry": [
            {"fullUrl": f"urn:uuid:{obs.get('id', 'unknown')}", "resource": obs}
            for obs in observations
        ],
    }
