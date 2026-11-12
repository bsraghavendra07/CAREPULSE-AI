"""Async HAPI FHIR R4 client – pushes *synthetic* Synthea data only."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class HAPIFHIRClient:
    """Lightweight async wrapper around a public HAPI FHIR R4 endpoint.

    Only **synthetic** Synthea data is ever transmitted.
    Real BIDMC patient identifiers are NEVER sent.
    """

    def __init__(
        self,
        base_url: str = "https://hapi.fhir.org/baseR4",
        timeout_ms: int = 5000,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._timeout = timeout_ms / 1000.0

    async def upsert_patient(
        self, patient_id: str, patient_resource: dict[str, Any]
    ) -> dict[str, Any] | None:
        """PUT /Patient/{id} – creates or updates the synthetic Patient on HAPI."""
        url = f"{self.base_url}/Patient/{patient_id}"
        resource = dict(patient_resource)
        resource["id"] = patient_id
        resource["resourceType"] = "Patient"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.put(
                    url,
                    json=resource,
                    headers={
                        "Content-Type": "application/fhir+json",
                        "Accept": "application/fhir+json",
                    },
                )
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            logger.warning("HAPI upsert_patient (%s) failed: %s", patient_id, exc)
            return None

    async def create_resource(self, resource: dict[str, Any]) -> dict[str, Any] | None:
        """POST a FHIR resource to HAPI. Returns response JSON or None on error."""
        resource_type = resource.get("resourceType", "Observation")
        url = f"{self.base_url}/{resource_type}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    url,
                    json=resource,
                    headers={
                        "Content-Type": "application/fhir+json",
                        "Accept": "application/fhir+json",
                    },
                )
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            logger.warning("HAPI create_resource failed: %s", exc)
            return None

    async def get_resource(
        self, resource_type: str, resource_id: str
    ) -> dict[str, Any] | None:
        """GET a FHIR resource by type and id. Returns JSON or None."""
        url = f"{self.base_url}/{resource_type}/{resource_id}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    url,
                    headers={"Accept": "application/fhir+json"},
                )
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            logger.warning("HAPI get_resource failed: %s", exc)
            return None
