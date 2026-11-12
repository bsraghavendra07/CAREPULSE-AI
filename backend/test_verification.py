"""Verification test script for MINEARENA 1.0 backend engines."""

import asyncio
from app.core.news2 import calculate_news2, RiskLevel, ScaleUsed
from app.core.personalized import PersonalizedEngine
from app.core.artifact_detector import ArtifactDetector
from app.fhir.mapper import create_observation, create_bundle, LOINC_CODES
from app.simulation.scenarios import ScenarioEngine
from app.main import _load_synthea_profiles

def test_patients():
    profiles = _load_synthea_profiles()
    assert len(profiles) == 5, f"Expected 5 profiles, got {len(profiles)}"
    print("PASS: 5 Synthea patient profiles loaded successfully:")
    for pid, p in profiles.items():
        print(f"  - {pid}: {p['name']} ({p['condition']}), Scale 2: {p['scale2_prescribed']}")
    assert profiles["P-002"]["scale2_prescribed"] is True, "P-002 must have scale2_prescribed=True"
    for pid in ["P-001", "P-003", "P-004", "P-005"]:
        assert profiles[pid]["scale2_prescribed"] is False, f"{pid} must not have Scale 2"
    print("PASS: Scale 2 is strictly restricted to P-002 (COPD).")

def test_news2_official_thresholds():
    # 1. Normal healthy vitals on air
    normal = {
        "heart_rate": 72,
        "oxygen_saturation": 98,
        "respiratory_rate": 16,
        "systolic_bp": 120,
        "body_temperature": 36.8,
        "consciousness": "ALERT",
    }
    r_norm = calculate_news2(normal, scale2_prescribed=False, supplemental_oxygen=False)
    assert r_norm.total_score == 0
    assert r_norm.risk_level == RiskLevel.LOW
    print("PASS: Healthy vitals score 0 (LOW risk)")

    # 2. Scale 1 vs Scale 2 test for SpO2 = 90%
    copd_vitals = {
        "heart_rate": 75,
        "oxygen_saturation": 90, # 90% is score 3 in Scale 1, but score 0 in Scale 2
        "respiratory_rate": 16,
        "systolic_bp": 120,
        "body_temperature": 36.8,
        "consciousness": "ALERT",
    }
    r_scale1 = calculate_news2(copd_vitals, scale2_prescribed=False, supplemental_oxygen=False)
    r_scale2 = calculate_news2(copd_vitals, scale2_prescribed=True, supplemental_oxygen=False)
    assert r_scale1.sub_scores["spo2"] == 3, f"Scale 1 SpO2 90% should be 3, got {r_scale1.sub_scores['spo2']}"
    assert r_scale2.sub_scores["spo2"] == 0, f"Scale 2 SpO2 90% should be 0, got {r_scale2.sub_scores['spo2']}"
    print("PASS: Scale 1 vs Scale 2 verified — SpO2 90% is score 3 under Scale 1, score 0 under Scale 2.")

    # 3. Red Score test (single parameter score = 3)
    red_vitals = {
        "heart_rate": 135, # HR >= 131 scores 3!
        "oxygen_saturation": 98,
        "respiratory_rate": 16,
        "systolic_bp": 120,
        "body_temperature": 36.8,
        "consciousness": "ALERT",
    }
    r_red = calculate_news2(red_vitals, scale2_prescribed=False, supplemental_oxygen=False)
    assert r_red.has_red_score is True
    assert r_red.sub_scores["hr"] == 3
    print("PASS: Red Score trigger detected correctly on extreme parameter (HR 135 bpm -> Score 3).")

def test_artifact_safety():
    detector = ArtifactDetector()
    # Decreasing SpO2 must NOT be marked as artifact (safety rule)
    v1 = {"heart_rate": 80, "oxygen_saturation": 96, "respiratory_rate": 18, "body_temperature": 37.0}
    v2 = {"heart_rate": 90, "oxygen_saturation": 88, "respiratory_rate": 22, "body_temperature": 37.1}
    res = detector.evaluate(v2, v1, motion_injected=False)
    assert res.artifact_detected is False
    print("PASS: True clinical desaturation (SpO2 96% -> 88%) is NOT rejected as an artifact.")

    # Implausible physiological reading
    v_impossible = {"heart_rate": 350, "oxygen_saturation": 98, "respiratory_rate": 16, "body_temperature": 37.0}
    res_imp = detector.evaluate(v_impossible, v1, motion_injected=False)
    assert res_imp.artifact_detected is True
    assert res_imp.status == "LOW"
    print("PASS: Physiologically impossible reading (HR 350 bpm) correctly marked as artifact.")

def test_fhir_mapping():
    obs = create_observation("P-001", "heart_rate", 78.0, "beats/minute", "2026-11-12T12:00:00Z", "BIDMC")
    assert obs["resourceType"] == "Observation"
    assert obs["code"]["coding"][0]["code"] == LOINC_CODES["heart_rate"]
    assert obs["meta"]["tag"][0]["code"] == "BIDMC"
    bundle = create_bundle([obs])
    assert bundle["resourceType"] == "Bundle"
    assert bundle["total"] == 1
    print("PASS: FHIR R4 Observation & Bundle creation verified with LOINC 8867-4 and BIDMC provenance tag.")

if __name__ == "__main__":
    test_patients()
    test_news2_official_thresholds()
    test_artifact_safety()
    test_fhir_mapping()
    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
