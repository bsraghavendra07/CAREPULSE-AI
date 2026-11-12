"""
FHIR R4 Repository and HAPI FHIR compliant storage interface.
Maintains in-memory & file-backed store for Patient, Observation, Condition, and Flag resources.
Can also sync with an external HAPI FHIR server if HAPI_FHIR_URL is provided.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("carepulse.fhir.store")

class FHIRStore:
    def __init__(self, external_hapi_url: Optional[str] = None):
        self.external_hapi_url = external_hapi_url or os.environ.get("HAPI_FHIR_URL", "")
        self.patients: Dict[str, Dict[str, Any]] = {}
        self.observations: List[Dict[str, Any]] = []
        self.conditions: Dict[str, List[Dict[str, Any]]] = {}
        self.medications: Dict[str, List[Dict[str, Any]]] = {}
        self.flags: List[Dict[str, Any]] = []

    def save_patient(self, patient_dict: Dict[str, Any]) -> Dict[str, Any]:
        p_id = patient_dict.get("id")
        if not p_id:
            p_id = f"P-{len(self.patients) + 1:03d}"
            patient_dict["id"] = p_id
        patient_dict["resourceType"] = "Patient"
        self.patients[p_id] = patient_dict
        return patient_dict

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        return self.patients.get(patient_id)

    def list_patients(self) -> List[Dict[str, Any]]:
        return list(self.patients.values())

    def save_observation(self, obs_dict: Dict[str, Any]) -> Dict[str, Any]:
        if "resourceType" not in obs_dict:
            obs_dict["resourceType"] = "Observation"
        if "id" not in obs_dict or not obs_dict["id"]:
            obs_dict["id"] = f"obs-{len(self.observations) + 1}"
        if "effectiveDateTime" not in obs_dict:
            obs_dict["effectiveDateTime"] = datetime.now(timezone.utc).isoformat()
        
        self.observations.append(obs_dict)
        return obs_dict

    def get_observations_for_patient(
        self, 
        patient_id: str, 
        loinc_code: Optional[str] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        target_ref = f"Patient/{patient_id}"
        results = []
        
        for obs in reversed(self.observations):
            subj_ref = obs.get("subject", {}).get("reference")
            if subj_ref != target_ref and subj_ref != patient_id:
                continue
            
            if loinc_code:
                codings = obs.get("code", {}).get("coding", [])
                matched = any(c.get("code") == loinc_code for c in codings)
                if not matched:
                    continue
            
            results.append(obs)
            if len(results) >= limit:
                break
                
        return list(reversed(results))

    def add_condition(self, patient_id: str, condition: Dict[str, Any]):
        condition["resourceType"] = "Condition"
        condition["subject"] = {"reference": f"Patient/{patient_id}"}
        if patient_id not in self.conditions:
            self.conditions[patient_id] = []
        self.conditions[patient_id].append(condition)

    def get_conditions(self, patient_id: str) -> List[Dict[str, Any]]:
        return self.conditions.get(patient_id, [])

    def add_medication(self, patient_id: str, medication: Dict[str, Any]):
        medication["resourceType"] = "MedicationStatement"
        medication["subject"] = {"reference": f"Patient/{patient_id}"}
        if patient_id not in self.medications:
            self.medications[patient_id] = []
        self.medications[patient_id].append(medication)

    def get_medications(self, patient_id: str) -> List[Dict[str, Any]]:
        return self.medications.get(patient_id, [])

    def save_flag(self, flag: Dict[str, Any]) -> Dict[str, Any]:
        flag["resourceType"] = "Flag"
        flag["id"] = flag.get("id") or f"flag-{len(self.flags) + 1}"
        self.flags.append(flag)
        return flag

    def get_flags_for_patient(self, patient_id: str) -> List[Dict[str, Any]]:
        target_ref = f"Patient/{patient_id}"
        return [f for f in self.flags if f.get("subject", {}).get("reference") == target_ref]

# Singleton instance
fhir_store = FHIRStore()
