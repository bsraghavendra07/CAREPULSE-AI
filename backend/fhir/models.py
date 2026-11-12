"""
FHIR R4 Resource Models and LOINC Codes for CarePulse AI
Compliant with HL7 FHIR Release 4 (v4.0.1) Vital Signs Profile
"""

from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone

# Standard LOINC Codes for Mandatory Vital Signs
LOINC_HEART_RATE = "8867-4"
LOINC_SPO2 = "2708-6"
LOINC_SPO2_ALT = "59408-5"
LOINC_RESPIRATORY_RATE = "9279-1"
LOINC_BODY_TEMPERATURE = "8310-5"
LOINC_BP_SYSTOLIC = "8480-6"
LOINC_BP_DIASTOLIC = "8462-4"

LOINC_DEFINITIONS = {
    LOINC_HEART_RATE: {
        "code": LOINC_HEART_RATE,
        "display": "Heart rate",
        "system": "http://loinc.org",
        "unit": "beats/minute",
        "unit_code": "/min",
        "unit_system": "http://unitsofmeasure.org"
    },
    LOINC_SPO2: {
        "code": LOINC_SPO2,
        "display": "Oxygen saturation in Arterial blood by Pulse oximetry",
        "system": "http://loinc.org",
        "unit": "%",
        "unit_code": "%",
        "unit_system": "http://unitsofmeasure.org"
    },
    LOINC_SPO2_ALT: {
        "code": LOINC_SPO2_ALT,
        "display": "Oxygen saturation in Arterial blood by Pulse oximetry",
        "system": "http://loinc.org",
        "unit": "%",
        "unit_code": "%",
        "unit_system": "http://unitsofmeasure.org"
    },
    LOINC_RESPIRATORY_RATE: {
        "code": LOINC_RESPIRATORY_RATE,
        "display": "Respiratory rate",
        "system": "http://loinc.org",
        "unit": "breaths/minute",
        "unit_code": "/min",
        "unit_system": "http://unitsofmeasure.org"
    },
    LOINC_BODY_TEMPERATURE: {
        "code": LOINC_BODY_TEMPERATURE,
        "display": "Body temperature",
        "system": "http://loinc.org",
        "unit": "Cel",
        "unit_code": "Cel",
        "unit_system": "http://unitsofmeasure.org"
    },
    LOINC_BP_SYSTOLIC: {
        "code": LOINC_BP_SYSTOLIC,
        "display": "Systolic blood pressure",
        "system": "http://loinc.org",
        "unit": "mmHg",
        "unit_code": "mm[Hg]",
        "unit_system": "http://unitsofmeasure.org"
    },
    LOINC_BP_DIASTOLIC: {
        "code": LOINC_BP_DIASTOLIC,
        "display": "Diastolic blood pressure",
        "system": "http://loinc.org",
        "unit": "mmHg",
        "unit_code": "mm[Hg]",
        "unit_system": "http://unitsofmeasure.org"
    }
}


class Coding(BaseModel):
    system: Optional[str] = "http://loinc.org"
    code: Optional[str] = None
    display: Optional[str] = None


class CodeableConcept(BaseModel):
    coding: List[Coding] = Field(default_factory=list)
    text: Optional[str] = None


class Reference(BaseModel):
    reference: str
    display: Optional[str] = None


class Quantity(BaseModel):
    value: Optional[float] = None
    unit: Optional[str] = None
    system: Optional[str] = "http://unitsofmeasure.org"
    code: Optional[str] = None


class FHIRObservation(BaseModel):
    resourceType: str = "Observation"
    id: Optional[str] = None
    status: str = "final"
    category: Optional[List[CodeableConcept]] = None
    code: CodeableConcept
    subject: Reference
    effectiveDateTime: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    valueQuantity: Optional[Quantity] = None
    interpretation: Optional[List[CodeableConcept]] = None
    note: Optional[List[Dict[str, str]]] = None


class FHIRBundleEntry(BaseModel):
    resource: Dict[str, Any]


class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "transaction"
    entry: List[Dict[str, Any]] = Field(default_factory=list)


class FHIRFlag(BaseModel):
    resourceType: str = "Flag"
    id: Optional[str] = None
    status: str = "active"
    code: CodeableConcept
    subject: Reference
    period: Optional[Dict[str, str]] = None


# Simplified ingestion payload for wearables/streams that gets auto-converted to FHIR R4
class VitalSignsIngestPayload(BaseModel):
    patient_id: str
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    respiratory_rate: Optional[float] = None
    body_temperature: Optional[float] = None
    timestamp: Optional[str] = None
    device_id: Optional[str] = "wearable-pulse-01"
    supplemental_o2: Optional[bool] = False
    systolic_bp: Optional[float] = None


def create_fhir_observation(
    patient_id: str,
    loinc_code: str,
    value: Optional[float],
    effective_time: Optional[str] = None,
    obs_id: Optional[str] = None
) -> Dict[str, Any]:
    """Helper to generate a valid FHIR R4 Observation dictionary."""
    if loinc_code not in LOINC_DEFINITIONS:
        raise ValueError(f"Unsupported LOINC code: {loinc_code}")
    
    meta = LOINC_DEFINITIONS[loinc_code]
    effective_dt = effective_time or datetime.now(timezone.utc).isoformat()
    
    return {
        "resourceType": "Observation",
        "id": obs_id or f"obs-{loinc_code.replace('-', '')}-{int(datetime.now().timestamp() * 1000)}",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": meta["system"],
                    "code": meta["code"],
                    "display": meta["display"]
                }
            ],
            "text": meta["display"]
        },
        "subject": {
            "reference": f"Patient/{patient_id}"
        },
        "effectiveDateTime": effective_dt,
        "valueQuantity": {
            "value": value,
            "unit": meta["unit"],
            "system": meta["unit_system"],
            "code": meta["unit_code"]
        } if value is not None else None
    }
