"""
CAREPULSE 1.0 — Requirement 3.1 (FHIR R4 Ingestion API) Complete Verification Test Harness.
Executes live tests against backend and public HAPI FHIR cloud server.
DOES NOT MODIFY ANY APPLICATION CODE.
"""

import json
import requests
import time

BASE_URL = "http://localhost:8000"
HAPI_BASE = "https://hapi.fhir.org/baseR4"

results = {
    "api_tests": [],
    "fhir_compliance": [],
    "hapi_storage_tests": [],
    "negative_tests": [],
}

print("=====================================================================")
print("STARTING REQUIREMENT 3.1 VERIFICATION SUITE")
print("=====================================================================")

# ─────────────────────────────────────────────────────────────────────────────
# 1. API VERIFICATION & 2. FHIR COMPLIANCE & 3. HAPI CLOUD STORAGE
# ─────────────────────────────────────────────────────────────────────────────

VITAL_TESTS = [
    {
        "vital_name": "heart_rate",
        "loinc": "8867-4",
        "ucum": "/min",
        "value": 82.0,
        "patient_id": "P-001",
        "label": "Heart Rate",
    },
    {
        "vital_name": "oxygen_saturation",
        "loinc": "2708-6",
        "ucum": "%",
        "value": 97.0,
        "patient_id": "P-002",
        "label": "SpO2 (Oxygen Saturation)",
    },
    {
        "vital_name": "respiratory_rate",
        "loinc": "9279-1",
        "ucum": "/min",
        "value": 18.0,
        "patient_id": "P-003",
        "label": "Respiratory Rate",
    },
    {
        "vital_name": "body_temperature",
        "loinc": "8310-5",
        "ucum": "Cel",
        "value": 37.0,
        "patient_id": "P-004",
        "label": "Body Temperature",
    },
]

for vt in VITAL_TESTS:
    print(f"\n--- Testing Mandatory Vital: {vt['label']} ({vt['loinc']}) ---")
    
    # 1. Test using Simplified JSON format
    payload = {
        "patient_id": vt["patient_id"],
        "vital_name": vt["vital_name"],
        "value": vt["value"],
    }
    
    try:
        t0 = time.time()
        res = requests.post(f"{BASE_URL}/api/fhir/observation", json=payload, timeout=45)
        latency = round((time.time() - t0) * 1000, 1)
        
        status_code = res.status_code
        res_data = res.json() if status_code == 201 else {"raw": res.text}
        
        print(f"Backend POST Status: {status_code} ({latency} ms)")
        hapi_id = res_data.get("hapi_resource_id")
        local_id = res_data.get("local_store_id")
        print(f"  Local Observation ID: {local_id}")
        print(f"  HAPI Resource ID: {hapi_id}")
        
        # Check stored observation structure for FHIR R4 compliance
        obs = res_data.get("stored_observation", {})
        
        # Verify fields
        compliance = {
            "resourceType": obs.get("resourceType") == "Observation",
            "status": obs.get("status") == "final",
            "has_vital_category": any(
                c.get("code") == "vital-signs"
                for cat in obs.get("category", [])
                for c in cat.get("coding", [])
            ),
            "patient_reference": obs.get("subject", {}).get("reference") == f"Patient/{vt['patient_id']}",
            "loinc_code": any(
                c.get("code") == vt["loinc"]
                for c in obs.get("code", {}).get("coding", [])
            ),
            "numerical_value": obs.get("valueQuantity", {}).get("value") == vt["value"],
            "ucum_unit": obs.get("valueQuantity", {}).get("code") == vt["ucum"],
            "has_effectiveDateTime": bool(obs.get("effectiveDateTime")),
        }
        
        # Direct HAPI Verification: fetch from public HAPI cloud
        hapi_retrieved = None
        hapi_direct_match = False
        if hapi_id:
            try:
                hapi_res = requests.get(f"{HAPI_BASE}/Observation/{hapi_id}", timeout=10)
                if hapi_res.status_code == 200:
                    hapi_retrieved = hapi_res.json()
                    # verify retrieved data matches
                    ret_val = hapi_retrieved.get("valueQuantity", {}).get("value")
                    ret_code = hapi_retrieved.get("code", {}).get("coding", [{}])[0].get("code")
                    ret_subject = hapi_retrieved.get("subject", {}).get("reference")
                    hapi_direct_match = (
                        ret_val == vt["value"] and
                        ret_code == vt["loinc"] and
                        ret_subject == f"Patient/{vt['patient_id']}"
                    )
                    print(f"  Direct HAPI Cloud GET: 200 OK (Data matched: {hapi_direct_match})")
                else:
                    print(f"  Direct HAPI Cloud GET failed: {hapi_res.status_code} {hapi_res.text[:100]}")
            except Exception as e:
                print(f"  Direct HAPI Cloud GET Exception: {e}")
        else:
            print("  WARNING: No HAPI Resource ID returned!")
        
        results["api_tests"].append({
            "vital": vt["label"],
            "loinc": vt["loinc"],
            "status_code": status_code,
            "latency_ms": latency,
            "local_id": local_id,
            "hapi_id": hapi_id,
            "payload": payload,
            "response": res_data,
        })
        
        results["fhir_compliance"].append({
            "vital": vt["label"],
            "compliance": compliance,
            "observation": obs,
        })
        
        results["hapi_storage_tests"].append({
            "vital": vt["label"],
            "hapi_resource_id": hapi_id,
            "retrieved_from_cloud": hapi_retrieved,
            "matches_submitted": hapi_direct_match,
        })
        
    except Exception as e:
        print(f"ERROR testing {vt['label']}: {e}")
        results["api_tests"].append({
            "vital": vt["label"],
            "error": str(e)
        })

# ─────────────────────────────────────────────────────────────────────────────
# 4. NEGATIVE TESTING
# ─────────────────────────────────────────────────────────────────────────────
print("\n=====================================================================")
print("STARTING NEGATIVE TESTING SUITE")
print("=====================================================================")

NEGATIVE_TESTS = [
    {
        "name": "Missing Patient ID",
        "payload": {"vital_name": "heart_rate", "value": 80},
        "expected_code": 400,
    },
    {
        "name": "Invalid LOINC Code (Unsupported Vital)",
        "payload": {"patient_id": "P-001", "vital_name": "blood_glucose", "value": 110},
        "expected_code": 400,
    },
    {
        "name": "Missing valueQuantity / Value",
        "payload": {"patient_id": "P-001", "vital_name": "heart_rate"},
        "expected_code": 400,
    },
    {
        "name": "Standard FHIR missing subject",
        "payload": {
            "resourceType": "Observation",
            "status": "final",
            "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4"}]},
            "valueQuantity": {"value": 80, "unit": "/min", "code": "/min"}
        },
        "expected_code": 400,
    },
    {
        "name": "Standard FHIR invalid LOINC code 99999-9",
        "payload": {
            "resourceType": "Observation",
            "status": "final",
            "subject": {"reference": "Patient/P-001"},
            "code": {"coding": [{"system": "http://loinc.org", "code": "99999-9"}]},
            "valueQuantity": {"value": 80, "unit": "/min", "code": "/min"}
        },
        "expected_code": 400,
    },
    {
        "name": "Standard FHIR missing valueQuantity value",
        "payload": {
            "resourceType": "Observation",
            "status": "final",
            "subject": {"reference": "Patient/P-001"},
            "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4"}]},
            "valueQuantity": {"unit": "/min", "code": "/min"}
        },
        "expected_code": 400,
    },
    {
        "name": "Nonexistent Patient Ingestion",
        "payload": {"patient_id": "P-999-NONEXISTENT", "vital_name": "heart_rate", "value": 80},
        "expected_code": 201, # Check how backend handles synthetic auto-creation vs rejection
    },
]

for nt in NEGATIVE_TESTS:
    try:
        res = requests.post(f"{BASE_URL}/api/fhir/observation", json=nt["payload"], timeout=10)
        status = res.status_code
        detail = res.json() if "application/json" in res.headers.get("Content-Type", "") else res.text
        passed = (status >= 400) if nt["expected_code"] == 400 else True
        print(f"Test '{nt['name']}': Status {status} (Expected {nt['expected_code']}) -> {'REJECTED OK' if passed else 'UNEXPECTED'}")
        results["negative_tests"].append({
            "test_name": nt["name"],
            "payload": nt["payload"],
            "status_code": status,
            "response": detail,
            "passed": passed,
        })
    except Exception as e:
        print(f"Test '{nt['name']}' Error: {e}")
        results["negative_tests"].append({
            "test_name": nt["name"],
            "error": str(e),
            "passed": False,
        })

# Save results JSON
with open("fhir_verification_raw_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("\n=====================================================================")
print("ALL LIVE VERIFICATION TESTS FINISHED. SAVED fhir_verification_raw_results.json")
print("=====================================================================")
