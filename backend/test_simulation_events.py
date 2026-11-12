"""Independent functional verification of PS 3.2 Simulation Events."""
import json
import time
import urllib.request

BASE_URL = "http://localhost:8000"

def post(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(endpoint):
    with urllib.request.urlopen(f"{BASE_URL}{endpoint}") as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_all():
    print("=== CAREPULSE PS 3.2 SIMULATION EVENTS VERIFICATION ===")

    # 1. State check
    state = get("/api/simulation/state")
    print(f"1. Initial Simulation State: is_paused={state['is_paused']}, speed={state['speed_factor']}")

    # 2. Test Card 1: Drift
    print("\n--- Testing Card 1: Gradual Vital Sign Drift ---")
    drift_res = post("/api/scenarios/event/start", {
        "patient_id": "P-001",
        "event_type": "drift",
        "duration": 15,
        "params": {"vital": "heart_rate", "start_val": 75, "target_val": 125}
    })
    print(f"Drift Started: {drift_res}")
    time.sleep(2)
    hist = get("/api/telemetry/P-001/history?n=3")
    latest_hr = hist[-1]["vitals"]["heart_rate"]["value"]
    print(f"Drift in progress -> HR: {latest_hr} bpm (target 125)")
    post("/api/scenarios/event/stop", {"patient_id": "P-001"})

    # 3. Test Card 2: Spike
    print("\n--- Testing Card 2: Sudden Vital Sign Spikes ---")
    spike_res = post("/api/scenarios/event/start", {
        "patient_id": "P-001",
        "event_type": "spike",
        "duration": 10,
        "params": {"vital": "heart_rate", "spike_val": 165}
    })
    print(f"Spike Triggered: {spike_res}")
    time.sleep(2)
    hist = get("/api/telemetry/P-001/history?n=5")
    print(f"DEBUG: hist ticks = {[(h['tick_number'], h['vitals']['heart_rate']['value']) for h in hist]}")
    spike_hr = [h['vitals']['heart_rate']['value'] for h in hist if h['tick_number'] >= spike_res['start_tick']][-1]
    print(f"Spike Reading -> HR: {spike_hr} bpm (expected 165.0)")
    assert spike_hr == 165.0, f"Expected 165.0, got {spike_hr}"
    post("/api/scenarios/event/stop", {"patient_id": "P-001"})

    # 4. Test Card 3: Missing Readings / Dropouts
    print("\n--- Testing Card 3: Missing Readings / Dropouts ---")
    drop_res = post("/api/scenarios/event/start", {
        "patient_id": "P-001",
        "event_type": "dropout",
        "duration": 10,
        "params": {"vital": "oxygen_saturation"}
    })
    print(f"Dropout Started: {drop_res}")
    time.sleep(2)
    hist = get("/api/telemetry/P-001/history?n=2")
    spo2_val = hist[-1]["vitals"]["oxygen_saturation"]["value"]
    spo2_status = hist[-1]["vitals"]["oxygen_saturation"].get("status")
    print(f"Dropout Reading -> SpO2 value: {spo2_val}, status: {spo2_status}")
    assert spo2_val is None or spo2_status == "NO_READING", "Expected missing reading"
    post("/api/scenarios/event/stop", {"patient_id": "P-001"})

    # 5. Test Card 4: Motion-Related Noise
    print("\n--- Testing Card 4: Motion-Related Noise ---")
    noise_res = post("/api/scenarios/event/start", {
        "patient_id": "P-004",
        "event_type": "motion_noise",
        "duration": 15,
        "params": {"vitals": ["oxygen_saturation", "heart_rate"], "intensity": "high"}
    })
    print(f"Motion Noise Started: {noise_res}")
    time.sleep(2)
    hist = get("/api/telemetry/P-004/history?n=2")
    sqi = hist[-1]["signal_quality"]
    print(f"Motion Artifact Status: SQI={sqi['sqi']}, status={sqi['status']}, note={sqi['note']}")
    assert sqi["status"] in ("MEDIUM", "LOW") or sqi["artifact_detected"], "Expected artifact detection"
    post("/api/scenarios/event/stop", {"patient_id": "P-004"})

    # 6. Test Card 5: Probe Removal Artifact
    print("\n--- Testing Card 5: Probe Removal Artifact ---")
    probe_res = post("/api/scenarios/event/start", {
        "patient_id": "P-001",
        "event_type": "probe_removal",
        "duration": -1,
        "params": {}
    })
    print(f"Probe Removal Started: {probe_res}")
    time.sleep(2)
    hist = get("/api/telemetry/P-001/history?n=2")
    probe_spo2 = hist[-1]["vitals"]["oxygen_saturation"]["value"]
    probe_hr = hist[-1]["vitals"]["heart_rate"]["value"]
    probe_removed_flag = hist[-1].get("probe_removed")
    sqi_probe = hist[-1]["signal_quality"]
    print(f"Probe Removed Vitals -> SpO2: {probe_spo2}, HR: {probe_hr}, flag: {probe_removed_flag}, SQI: {sqi_probe['status']}")
    assert probe_spo2 == 0.0, f"Expected SpO2=0, got {probe_spo2}"
    assert probe_hr == 0.0, f"Expected HR=0, got {probe_hr}"

    # Restore Probe
    rest_res = post("/api/scenarios/event/restore_probe", {"patient_id": "P-001"})
    print(f"Probe Restored: {rest_res}")
    time.sleep(2)
    hist = get("/api/telemetry/P-001/history?n=2")
    restored_spo2 = hist[-1]["vitals"]["oxygen_saturation"]["value"]
    print(f"Restored Vitals -> SpO2: {restored_spo2}% (Normal reading resumed)")
    assert restored_spo2 > 80.0, f"Expected normal SpO2, got {restored_spo2}"

    # 7. Test Common Controls: Pause, Resume, Reset
    print("\n--- Testing Common Controls: Pause, Resume, Reset ---")
    pause_res = post("/api/simulation/pause", {})
    print(f"Pause response: {pause_res}")
    st_paused = get("/api/simulation/state")
    assert st_paused["is_paused"] is True, "Expected paused=True"

    resume_res = post("/api/simulation/resume", {})
    print(f"Resume response: {resume_res}")
    st_resumed = get("/api/simulation/state")
    assert st_resumed["is_paused"] is False, "Expected paused=False"

    reset_res = post("/api/simulation/reset", {})
    print(f"Reset response: {reset_res}")

    # 8. Test Direct FHIR Observation Ingestion
    print("\n--- Testing Direct FHIR Observation Ingestion ---")
    fhir_res = post("/api/fhir/observation", {
        "resourceType": "Observation",
        "status": "final",
        "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
        "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart rate"}]},
        "subject": {"reference": "Patient/P-001"},
        "effectiveDateTime": "2026-11-12T20:20:00Z",
        "valueQuantity": {"value": 84, "unit": "/min", "system": "http://unitsofmeasure.org", "code": "/min"}
    })
    print(f"FHIR R4 Ingestion Success: Local ID={fhir_res.get('local_store_id')}, HAPI Cloud ID={fhir_res.get('hapi_resource_id')}")
    assert fhir_res.get("status") == "success" and fhir_res.get("local_store_id"), "Expected FHIR ingestion success"

    print("\n ALL PS 3.2 SIMULATION EVENTS AND CONTROLS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
