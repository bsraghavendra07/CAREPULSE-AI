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
        self.last_error: str | None = None

    async def upsert_patient(
        self, patient_id: str, patient_resource: dict[str, Any]
    ) -> tuple[dict[str, Any] | None, str | None]:
        """PUT /Patient/{id} – creates or updates the synthetic Patient on HAPI.
        Returns (response_dict, error_string).
        """
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
                self.last_error = None
                return resp.json(), None
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            err_msg = f"HAPI upsert_patient ({patient_id}) failed: {exc}"
            logger.warning(err_msg)
            self.last_error = err_msg
            return None, err_msg

    async def create_resource(self, resource: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
        """POST a FHIR resource to HAPI. Returns (response_dict, error_string)."""
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
                self.last_error = None
                return resp.json(), None
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            err_msg = f"HAPI create_resource failed: {exc}"
            logger.warning(err_msg)
            self.last_error = err_msg
            return None, err_msg

    async def get_resource(
        self, resource_type: str, resource_id: str
    ) -> tuple[dict[str, Any] | None, str | None]:
        """GET a FHIR resource by type and id. Returns (response_dict, error_string)."""
        url = f"{self.base_url}/{resource_type}/{resource_id}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    url,
                    headers={"Accept": "application/fhir+json"},
                )
                resp.raise_for_status()
                self.last_error = None
                return resp.json(), None
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            err_msg = f"HAPI get_resource ({resource_type}/{resource_id}) failed: {exc}"
            logger.warning(err_msg)
            self.last_error = err_msg
            return None, err_msg

    async def search_resources(
        self, resource_type: str, params: dict[str, Any] | None = None
    ) -> tuple[dict[str, Any] | None, str | None]:
        """GET /{resourceType}?params... Returns (Bundle_dict, error_string)."""
        url = f"{self.base_url}/{resource_type}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    url,
                    params=params or {},
                    headers={"Accept": "application/fhir+json"},
                )
                resp.raise_for_status()
                self.last_error = None
                return resp.json(), None
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            err_msg = f"HAPI search_resources ({resource_type}) failed: {exc}"
            logger.warning(err_msg)
            self.last_error = err_msg
            return None, err_msg
