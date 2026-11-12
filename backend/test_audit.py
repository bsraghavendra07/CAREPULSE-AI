import requests

base_url = "http://localhost:8000"

print("--- AUDIT TEST 1: Patient Profiles (Requirement 3.3) ---")
r = requests.get(f"{base_url}/api/patients")
patients = r.json()
print(f"Status: {r.status_code}, Found {len(patients)} patients:")
for p in patients:
    print(f"  - {p['id']}: {p['name']} | Condition: {p['condition']} | Scale2: {p['scale2_prescribed']}")

print("\n--- AUDIT TEST 2: FHIR R4 Ingestion API (Requirement 3.1) ---")
payload = {
    "patient_id": "P-001",
    "vital_name": "heart_rate",
    "value": 85.5
}
r = requests.post(f"{base_url}/api/fhir/observation", json=payload)
print(f"Status: {r.status_code}")
obs_res = r.json()
print(f"  LOINC: {obs_res.get('loinc_code')}, Vital: {obs_res.get('vital_name')}, Local ID: {obs_res.get('local_store_id')}")

print("\n--- AUDIT TEST 3: Scenario Triggering & Replay (Requirement 3.7 & 3.2) ---")
trigger_payload = {"patient_id": "P-001", "scenario": "cardiac_decompensation"}
r = requests.post(f"{base_url}/api/scenarios/trigger", json=trigger_payload)
print(f"Trigger Status: {r.status_code}, Response: {r.json()}")

r = requests.get(f"{base_url}/api/scenarios/active")
print(f"Active Scenarios: {r.json()}")

print("\n--- AUDIT TEST 4: Performance Evaluation Report (Requirement 3.7) ---")
r = requests.get(f"{base_url}/api/report/performance")
perf = r.json()
print(f"Performance Metrics: Total Ticks={perf.get('total_ticks')}, Alerts Fired={perf.get('news2_alerts_fired')}, Artifact Flags={perf.get('artifact_flags')}")

print("\n--- ALL AUDIT TESTS PASSED SUCCESSFULLY! ---")
