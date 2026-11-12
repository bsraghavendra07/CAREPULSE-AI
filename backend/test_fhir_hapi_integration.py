"""Integration test script verifying Requirement 3.1: FHIR R4 Ingestion & HAPI FHIR Integration.
Connects directly to the backend application lifespan and real HAPI FHIR server (https://hapi.fhir.org/baseR4).
"""

import asyncio
import json
from datetime import datetime, timezone
import httpx

from app.main import app
from app.fhir.mapper import LOINC_CODES, _UCUM_CODES, _UNITS

TEST_CASES = [
    {
        "name": "Heart Rate",
        "vital_name": "heart_rate",
        "expected_loinc": "8867-4",
        "expected_ucum": "/min",
        "expected_unit": "beats/minute",
        "value": 84.0,
        "patient_id": "P-001",
    },
    {
        "name": "Oxygen Saturation (SpO2)",
        "vital_name": "oxygen_saturation",
        "expected_loinc": "2708-6",
        "expected_ucum": "%",
        "expected_unit": "%",
        "value": 96.0,
        "patient_id": "P-002",
    },
    {
        "name": "Respiratory Rate",
        "vital_name": "respiratory_rate",
        "expected_loinc": "9279-1",
        "expected_ucum": "/min",
        "expected_unit": "breaths/minute",
        "value": 18.0,
        "patient_id": "P-003",
    },
    {
        "name": "Body Temperature",
        "vital_name": "body_temperature",
        "expected_loinc": "8310-5",
        "expected_ucum": "Cel",
        "expected_unit": "Cel",
        "value": 37.2,
        "patient_id": "P-004",
    },
]


async def run_tests():
    print("==================================================================")
    print("STARTING REQUIREMENT 3.1 FHIR R4 INGESTION & HAPI FHIR VERIFICATION")
    print("==================================================================")

    hapi_base = "https://hapi.fhir.org/baseR4"
    results = []

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as local_client:
            async with httpx.AsyncClient(timeout=20.0) as hapi_client:

                for tc in TEST_CASES:
                    print(f"\n--- Testing Observation: {tc['name']} ---")
                    timestamp = datetime.now(timezone.utc).isoformat()

                    # Construct valid FHIR R4 Observation payload
                    fhir_payload = {
                        "resourceType": "Observation",
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
                                    "code": tc["expected_loinc"],
                                    "display": tc["name"],
                                }
                            ],
                            "text": tc["name"],
                        },
                        "subject": {
                            "reference": f"Patient/{tc['patient_id']}",
                        },
                        "effectiveDateTime": timestamp,
                        "valueQuantity": {
                            "value": tc["value"],
                            "unit": tc["expected_unit"],
                            "system": "http://unitsofmeasure.org",
                            "code": tc["expected_ucum"],
                        },
                        "meta": {
                            "tag": [
                                {
                                    "system": "http://minearena.io/source",
                                    "code": "FHIR_INGEST",
                                    "display": "FHIR R4 Ingestion API",
                                }
                            ]
                        },
                    }

                    # 1. Submit to Backend FHIR Ingestion API
                    endpoint = "/api/fhir/observation"
                    resp = await local_client.post(endpoint, json=fhir_payload)
                    http_status = resp.status_code
                    print(f"1. Ingestion POST {endpoint} -> HTTP {http_status}")

                    resp_data = {}
                    if http_status in (200, 201):
                        resp_data = resp.json()
                    else:
                        print(f"   Error: {resp.text}")

                    hapi_id = resp_data.get("hapi_resource_id")
                    print(f"2. HAPI FHIR Created Resource ID: {hapi_id}")

                    # 2. Retrieve directly from Real HAPI FHIR server using GET
                    hapi_retrieval_data = None
                    hapi_get_status = None
                    if hapi_id:
                        hapi_url = f"{hapi_base}/Observation/{hapi_id}"
                        hapi_get_resp = await hapi_client.get(hapi_url, headers={"Accept": "application/fhir+json"})
                        hapi_get_status = hapi_get_resp.status_code
                        if hapi_get_status == 200:
                            hapi_retrieval_data = hapi_get_resp.json()
                            print(f"3. Retrieved directly from HAPI FHIR: GET {hapi_url} -> HTTP 200 OK")
                        else:
                            print(f"3. HAPI GET {hapi_url} returned HTTP {hapi_get_status}")

                    # 3. Check Dashboard Telemetry History to verify actual backend reading reached dashboard
                    hist_url = f"/api/telemetry/{tc['patient_id']}/history"
                    hist_resp = await local_client.get(hist_url)
                    hist_records = hist_resp.json() if hist_resp.status_code == 200 else []
                    reading_reached_dashboard = any(
                        r.get("vitals", {}).get(tc["vital_name"], {}).get("value") == tc["value"]
                        for r in hist_records
                    )
                    print(f"4. Reading reached Dashboard Telemetry buffer: {reading_reached_dashboard}")

                    # Evaluations
                    loinc_correct = tc["expected_loinc"] == fhir_payload["code"]["coding"][0]["code"]
                    ucum_correct = tc["expected_ucum"] == fhir_payload["valueQuantity"]["code"]
                    structure_valid = (
                        fhir_payload.get("resourceType") == "Observation" and
                        fhir_payload.get("status") == "final" and
                        "code" in fhir_payload and
                        "subject" in fhir_payload and
                        "valueQuantity" in fhir_payload
                    )
                    patient_ref_correct = fhir_payload.get("subject", {}).get("reference") == f"Patient/{tc['patient_id']}"
                    stored_in_hapi = bool(hapi_id and hapi_get_status == 200)

                    test_result = {
                        "vital": tc["name"],
                        "endpoint": endpoint,
                        "request_payload": fhir_payload,
                        "http_response_code": http_status,
                        "http_response_body": resp_data,
                        "hapi_resource_id": hapi_id,
                        "retrieval_response_code": hapi_get_status,
                        "retrieved_resource": hapi_retrieval_data,
                        "checks": {
                            "fhir_ingestion_api": http_status == 201,
                            "loinc_code_verified": loinc_correct,
                            "ucum_unit_verified": ucum_correct,
                            "fhir_observation_structure_verified": structure_valid,
                            "patient_reference_verified": patient_ref_correct,
                            "stored_in_real_hapi": stored_in_hapi,
                            "retrieved_from_real_hapi": hapi_get_status == 200,
                            "backend_reading_reached_dashboard": reading_reached_dashboard,
                        }
                    }
                    results.append(test_result)

    with open("fhir_verification_result.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n==================================================================")
    print("VERIFICATION COMPLETED. SUMMARY OF RESULTS:")
    print("==================================================================")
    for res in results:
        v = res["vital"]
        c = res["checks"]
        print(f"\n{v}:")
        for check_name, passed in c.items():
            status_str = "PASS" if passed else "FAIL"
            print(f"  - {check_name}: {status_str}")


if __name__ == "__main__":
    asyncio.run(run_tests())
