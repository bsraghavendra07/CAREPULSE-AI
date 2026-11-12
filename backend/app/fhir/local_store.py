"""In-memory fallback FHIR store for when HAPI is slow or unreachable."""

from __future__ import annotations

import uuid
from typing import Any

from app.fhir.mapper import create_bundle


class LocalFHIRStore:
    """Thread-safe (GIL-protected) in-memory FHIR resource store."""

    def __init__(self) -> None:
        self._resources: dict[str, dict[str, Any]] = {}  # id -> resource
        self._by_type: dict[str, list[str]] = {}          # resourceType -> [ids]
        self._by_patient: dict[str, list[str]] = {}       # patient_id -> [ids]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def store(self, resource: dict[str, Any]) -> str:
        """Persist *resource* in memory and return its (generated) id."""
        rid = resource.get("id") or f"local-{uuid.uuid4().hex[:12]}"
        resource["id"] = rid
        self._resources[rid] = resource

        rtype = resource.get("resourceType", "Unknown")
        self._by_type.setdefault(rtype, []).append(rid)

        # Index by patient reference if present
        patient_ref = (resource.get("subject") or {}).get("reference", "")
        if patient_ref.startswith("Patient/"):
            pid = patient_ref.split("/", 1)[1]
            self._by_patient.setdefault(pid, []).append(rid)

        return rid

    def get(self, resource_type: str, resource_id: str) -> dict[str, Any] | None:
        """Retrieve a single resource by type and id."""
        res = self._resources.get(resource_id)
        if res and res.get("resourceType") == resource_type:
            return res
        return None

    def search(
        self,
        resource_type: str,
        patient_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return all resources matching *resource_type* (and optionally *patient_id*)."""
        if patient_id:
            ids = self._by_patient.get(patient_id, [])
            return [
                self._resources[rid]
                for rid in ids
                if self._resources.get(rid, {}).get("resourceType") == resource_type
            ]
        ids = self._by_type.get(resource_type, [])
        return [self._resources[rid] for rid in ids if rid in self._resources]

    def get_bundle(self, patient_id: str) -> dict[str, Any]:
        """Return all Observations for *patient_id* as a FHIR R4 Bundle."""
        observations = self.search("Observation", patient_id=patient_id)
        return create_bundle(observations)
