"""Test suite for Clinical Specialty Recommendation Rules."""
import sys
from app.core.specialty_recommender import recommend_specialty, SuggestedSpecialtyResult
from app.core.news2 import calculate_news2

def run_tests():
    print("================================================================")
    print("TESTING CLINICAL DECISION SUPPORT: SUGGESTED SPECIALTY RULES")
    print("================================================================")
    
    passed = 0
    total = 7

    # Test 1: Sustained SpO2 decline -> Pulmonology
    v1 = {"heart_rate": 75, "oxygen_saturation": 89, "respiratory_rate": 16, "systolic_bp": 120, "body_temperature": 37.0}
    n1 = calculate_news2(v1, scale2_prescribed=False, supplemental_oxygen=False)
    res1 = recommend_specialty(n1, v1, sqi_status="HIGH")
    assert res1.suggested_specialty == "Pulmonology", f"Expected Pulmonology, got {res1.suggested_specialty}"
    assert res1.triggering_pattern in ("SUSTAINED_SPO2_DECLINE", "SpO₂ showing a sustained downward trend"), f"Unexpected pattern: {res1.triggering_pattern}"
    print("[PASS] Test 1: Sustained SpO2 decline -> Pulmonology")
    passed += 1

    # Test 2: Persistent abnormal respiratory rate -> Pulmonology
    v2 = {"heart_rate": 75, "oxygen_saturation": 98, "respiratory_rate": 26, "systolic_bp": 120, "body_temperature": 37.0}
    n2 = calculate_news2(v2, scale2_prescribed=False, supplemental_oxygen=False)
    res2 = recommend_specialty(n2, v2, sqi_status="HIGH")
    assert res2.suggested_specialty == "Pulmonology", f"Expected Pulmonology, got {res2.suggested_specialty}"
    assert res2.triggering_pattern in ("PERSISTENT_ABNORMAL_RR", "Persistent abnormal respiratory rate"), f"Unexpected pattern: {res2.triggering_pattern}"
    print("[PASS] Test 2: Persistent abnormal respiratory rate -> Pulmonology")
    passed += 1

    # Test 3: Heart-rate concern -> Cardiology
    v3 = {"heart_rate": 135, "oxygen_saturation": 98, "respiratory_rate": 16, "systolic_bp": 120, "body_temperature": 37.0}
    n3 = calculate_news2(v3, scale2_prescribed=False, supplemental_oxygen=False)
    res3 = recommend_specialty(n3, v3, sqi_status="HIGH")
    assert res3.suggested_specialty == "Cardiology", f"Expected Cardiology, got {res3.suggested_specialty}"
    assert res3.triggering_pattern in ("HEART_RATE_CONCERN", "Heart-rate related concern"), f"Unexpected pattern: {res3.triggering_pattern}"
    print("[PASS] Test 3: Heart-rate concern -> Cardiology")
    passed += 1

    # Test 4: Persistent temperature concern -> Internal Medicine
    v4 = {"heart_rate": 75, "oxygen_saturation": 98, "respiratory_rate": 16, "systolic_bp": 120, "body_temperature": 39.2}
    n4 = calculate_news2(v4, scale2_prescribed=False, supplemental_oxygen=False)
    res4 = recommend_specialty(n4, v4, sqi_status="HIGH")
    assert res4.suggested_specialty == "Internal Medicine", f"Expected Internal Medicine, got {res4.suggested_specialty}"
    assert res4.triggering_pattern in ("PERSISTENT_TEMP_ABNORMALITY", "Persistent temperature abnormality"), f"Unexpected pattern: {res4.triggering_pattern}"
    print("[PASS] Test 4: Persistent temperature concern -> Internal Medicine")
    passed += 1

    # Test 5: Multiple vital abnormalities -> General Medicine
    # e.g. Sepsis: HR elevated, Temp elevated, RR elevated, BP low
    v5 = {"heart_rate": 125, "oxygen_saturation": 95, "respiratory_rate": 26, "systolic_bp": 85, "body_temperature": 39.5}
    n5 = calculate_news2(v5, scale2_prescribed=False, supplemental_oxygen=False)
    res5 = recommend_specialty(n5, v5, sqi_status="HIGH")
    assert res5.suggested_specialty == "General Medicine", f"Expected General Medicine, got {res5.suggested_specialty}"
    assert res5.triggering_pattern in ("MULTIPLE_VITAL_ABNORMALITIES", "Multiple vital-sign abnormalities"), f"Unexpected pattern: {res5.triggering_pattern}"
    print("[PASS] Test 5: Multiple vital abnormalities -> General Medicine")
    passed += 1

    # Test 6: Normal patient readings -> No unnecessary recommendation
    v6 = {"heart_rate": 72, "oxygen_saturation": 98, "respiratory_rate": 15, "systolic_bp": 120, "body_temperature": 36.8}
    n6 = calculate_news2(v6, scale2_prescribed=False, supplemental_oxygen=False)
    res6 = recommend_specialty(n6, v6, sqi_status="HIGH")
    assert res6.is_applicable is False, "Expected is_applicable False"
    assert res6.suggested_specialty is None, f"Expected None, got {res6.suggested_specialty}"
    print("[PASS] Test 6: Normal patient readings -> No unnecessary recommendation (is_applicable=False)")
    passed += 1

    # Test 7: Sensor probe removal -> Unreliable sensor readings, no clinical specialty
    v7 = {"heart_rate": 0, "oxygen_saturation": 0, "respiratory_rate": 0, "systolic_bp": 0, "body_temperature": 36.8}
    n7 = calculate_news2(v7, scale2_prescribed=False, supplemental_oxygen=False)
    res7 = recommend_specialty(n7, v7, sqi_status="LOW")
    assert res7.is_applicable is False, "Expected is_applicable False for probe removal"
    assert res7.suggested_specialty is None, f"Expected None for probe removal, got {res7.suggested_specialty}"
    assert res7.triggering_pattern == "SENSOR_UNRELIABLE", f"Expected SENSOR_UNRELIABLE, got {res7.triggering_pattern}"
    print("[PASS] Test 7: Sensor probe removal -> No clinical specialty (SENSOR_UNRELIABLE, is_applicable=False)")
    passed += 1

    print("================================================================")
    print(f"ALL {passed}/{total} SPECIALTY RECOMMENDATION TESTS PASSED (100%)")
    print("================================================================")

if __name__ == "__main__":
    run_tests()
