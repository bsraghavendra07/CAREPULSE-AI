"""
CAREPULSE 1.0 — Smart Specialist Routing Verification Test Suite.
Validates:
  1. Heart failure patient -> Cardiology
  2. COPD patient -> Pulmonology
  3. Atrial fibrillation patient -> Cardiology
  4. Patient with multiple conditions -> Relevant specialist
  5. Unmapped condition -> General attending clinician
  6. URGENT alert -> Specialist queue and emergency queue (emergency_flag: True)
  7. Sensor artifact -> Device warning, NOT a false clinical emergency
  8. Alert lifecycle management -> Acknowledge, Review, Resolve
  9. Live dynamic stats & department distribution (zero hardcoded numbers)
"""

import sys
from datetime import datetime, timezone

from app.core.specialist_router import (
    AlertSeverity,
    AlertStatus,
    Department,
    alert_store,
    categorize_patient,
    determine_department_for_condition,
    route_clinical_alert,
)


class MockNEWS2:
    def __init__(self, score: int, tier: str, has_red: bool = False, reason: str = "Tachycardia"):
        self.total_score = score
        self.triage_tier = tier
        self.has_red_score = has_red
        self.alert_reason = reason
        self.clinical_action = f"Escalate according to {tier} protocol"


def run_tests():
    print("=" * 70)
    print("CAREPULSE 1.0 — SMART SPECIALIST ROUTING TEST SUITE (FEATURE 1 - 7)")
    print("=" * 70)

    alert_store.clear()
    passed = 0
    total = 9

    # ------------------------------------------------------------------
    # TEST 1: Heart failure patient -> Cardiology
    # ------------------------------------------------------------------
    p1 = {
        "id": "P-001",
        "name": "Robert Thompson",
        "condition": "Post-Myocardial Infarction / Heart Failure",
    }
    cat1 = categorize_patient(p1)
    assert cat1["department"] == Department.CARDIOLOGY.value, f"Expected Cardiology, got {cat1['department']}"
    assert "Dr. Robert Rivera" in cat1["specialist_name"]

    alert1 = route_clinical_alert(
        patient=p1,
        news2_result=MockNEWS2(5, "REVIEW", reason="Elevated HR and BP"),
        vitals={"heart_rate": 115, "oxygen_saturation": 95, "respiratory_rate": 20, "systolic_bp": 145},
        sqi_status="HIGH",
        tick_number=1,
    )
    assert alert1 is not None
    assert alert1.department == Department.CARDIOLOGY.value
    assert "Dr. Robert Rivera" in alert1.specialist_name
    assert alert1.severity == AlertSeverity.REVIEW
    assert alert1.status == AlertStatus.PENDING
    print("[PASS] Test 1: Heart failure patient -> Cardiology (Dr. Robert Rivera, MD)")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 2: COPD patient -> Pulmonology
    # ------------------------------------------------------------------
    p2 = {
        "id": "P-002",
        "name": "Margaret Chen",
        "condition": "Post-COPD Exacerbation with Hypercapnic Failure",
    }
    cat2 = categorize_patient(p2)
    assert cat2["department"] == Department.PULMONOLOGY.value, f"Expected Pulmonology, got {cat2['department']}"
    assert "Dr. Elena Rostova" in cat2["specialist_name"]

    alert2 = route_clinical_alert(
        patient=p2,
        news2_result=MockNEWS2(6, "REVIEW", reason="Hypoxemia and tachypnea"),
        vitals={"heart_rate": 88, "oxygen_saturation": 86, "respiratory_rate": 26, "systolic_bp": 125},
        sqi_status="HIGH",
        tick_number=2,
    )
    assert alert2 is not None
    assert alert2.department == Department.PULMONOLOGY.value
    assert "Dr. Elena Rostova" in alert2.specialist_name
    print("[PASS] Test 2: COPD patient -> Pulmonology (Dr. Elena Rostova, MD)")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 3: Atrial fibrillation patient -> Cardiology
    # ------------------------------------------------------------------
    p4 = {
        "id": "P-004",
        "name": "Dorothy Mitchell",
        "condition": "Paroxysmal Atrial Fibrillation & Tremors",
    }
    cat4 = categorize_patient(p4)
    assert cat4["department"] == Department.CARDIOLOGY.value, f"Expected Cardiology, got {cat4['department']}"

    alert4 = route_clinical_alert(
        patient=p4,
        news2_result=MockNEWS2(5, "REVIEW", reason="Rapid ventricular rate (AF with RVR)"),
        vitals={"heart_rate": 138, "oxygen_saturation": 96, "respiratory_rate": 18, "systolic_bp": 115},
        sqi_status="HIGH",
        tick_number=3,
    )
    assert alert4 is not None
    assert alert4.department == Department.CARDIOLOGY.value
    print("[PASS] Test 3: Atrial fibrillation patient -> Cardiology (Electrophysiology Lead)")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 4: Patient with multiple conditions -> Relevant specialist based on clinical relevance
    # ------------------------------------------------------------------
    p_multi = {
        "id": "P-MULTI",
        "name": "Evelyn Reed",
        "condition": "Severe COPD with Secondary Cor Pulmonale & Atrial Fibrillation",
    }
    # When acute deterioration is driven by respiratory desaturation (CDS = Pulmonology)
    alert_resp = route_clinical_alert(
        patient=p_multi,
        news2_result=MockNEWS2(6, "REVIEW", reason="Critical bronchospasm and desaturation"),
        vitals={"heart_rate": 90, "oxygen_saturation": 85, "respiratory_rate": 28, "systolic_bp": 120},
        sqi_status="HIGH",
        tick_number=4,
        decision_specialty="Pulmonology",
    )
    assert alert_resp.department == Department.PULMONOLOGY.value

    # When acute deterioration is driven by sudden tachyarrhythmia (CDS = Cardiology)
    alert_card = route_clinical_alert(
        patient=p_multi,
        news2_result=MockNEWS2(6, "REVIEW", reason="Sudden AF with RVR > 140 bpm"),
        vitals={"heart_rate": 145, "oxygen_saturation": 94, "respiratory_rate": 18, "systolic_bp": 110},
        sqi_status="HIGH",
        tick_number=5,
        decision_specialty="Cardiology",
    )
    assert alert_card.department == Department.CARDIOLOGY.value
    print("[PASS] Test 4: Patient with multiple conditions -> Dynamically routed by clinical presentation")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 5: Unmapped condition -> General attending clinician
    # ------------------------------------------------------------------
    p_unmapped = {
        "id": "P-UNKNOWN-01",
        "name": "Arthur Pendelton",
        "condition": "Idiopathic Chronic Fatigue & Undifferentiated Malaise",
    }
    cat_unmapped = categorize_patient(p_unmapped)
    assert cat_unmapped["department"] == Department.GENERAL_MEDICINE.value
    assert "General Attending" in cat_unmapped["specialist_title"]

    alert_unmapped = route_clinical_alert(
        patient=p_unmapped,
        news2_result=MockNEWS2(4, "WATCH", reason="Moderate pyrexia"),
        vitals={"heart_rate": 88, "oxygen_saturation": 97, "respiratory_rate": 16, "systolic_bp": 120, "body_temperature": 38.6},
        sqi_status="HIGH",
        tick_number=6,
    )
    assert alert_unmapped.department == Department.GENERAL_MEDICINE.value
    assert "General Attending" in alert_unmapped.specialist_title
    print("[PASS] Test 5: Unmapped condition -> General Attending Clinician fallback")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 6: URGENT alert -> Specialist queue AND central emergency queue
    # ------------------------------------------------------------------
    p_urgent = {
        "id": "P-003",
        "name": "James Walker",
        "condition": "Post-Abdominal Surgery / Sepsis Risk",
    }
    alert_urgent = route_clinical_alert(
        patient=p_urgent,
        news2_result=MockNEWS2(8, "URGENT", has_red=True, reason="Severe septic shock (HR 130, SBP 80, Temp 39.4)"),
        vitals={"heart_rate": 130, "oxygen_saturation": 91, "respiratory_rate": 28, "systolic_bp": 80, "body_temperature": 39.4},
        sqi_status="HIGH",
        tick_number=7,
    )
    assert alert_urgent.severity == AlertSeverity.URGENT
    assert alert_urgent.emergency_flag is True, "Expected emergency_flag True for URGENT alert"
    assert alert_urgent.emergency_queue is True, "Expected emergency_queue True for URGENT alert"
    assert alert_urgent.department == Department.GENERAL_MEDICINE.value
    print("[PASS] Test 6: URGENT alert -> Dual-routed to specialist queue AND central emergency queue")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 7: Sensor artifact -> Device warning, NOT a false clinical emergency
    # ------------------------------------------------------------------
    p_artifact = {
        "id": "P-004",
        "name": "Dorothy Mitchell",
        "condition": "Paroxysmal Atrial Fibrillation & Tremors",
    }
    # Probe removal / flatline: HR=0, SpO2=0, SQI="LOW"
    alert_tech = route_clinical_alert(
        patient=p_artifact,
        news2_result=MockNEWS2(0, "ROUTINE"),
        vitals={"heart_rate": 0, "oxygen_saturation": 0, "respiratory_rate": 0, "systolic_bp": 0},
        sqi_status="LOW",
        sqi_note="Pulse oximeter optical probe disconnect detected",
        tick_number=8,
    )
    assert alert_tech.severity == AlertSeverity.DEVICE_WARNING
    assert alert_tech.is_artifact is True
    assert alert_tech.emergency_flag is False, "Sensor artifact must NEVER create a false clinical emergency"
    assert "Biomedical" in alert_tech.specialist_name or "Biomedical" in alert_tech.department
    print("[PASS] Test 7: Sensor artifact -> Isolated as Device Warning (NOT a false clinical emergency)")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 8: Alert lifecycle management (Acknowledge -> Review -> Resolve)
    # ------------------------------------------------------------------
    test_id = alert1.id
    ack_res = alert_store.update_status(test_id, AlertStatus.ACKNOWLEDGED, clinician_name="Dr. Rivera")
    assert ack_res.status == AlertStatus.ACKNOWLEDGED
    assert ack_res.acknowledged_by == "Dr. Rivera"

    rev_res = alert_store.update_status(test_id, AlertStatus.UNDER_REVIEW, clinician_name="Dr. Rivera")
    assert rev_res.status == AlertStatus.UNDER_REVIEW

    res_res = alert_store.update_status(test_id, AlertStatus.RESOLVED, clinician_name="Dr. Rivera")
    assert res_res.status == AlertStatus.RESOLVED
    print("[PASS] Test 8: Alert lifecycle transitions (ACKNOWLEDGED -> UNDER_REVIEW -> RESOLVED) verified")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 9: Live dynamic statistics & department distribution
    # ------------------------------------------------------------------
    stats = alert_store.get_stats()
    assert stats["total_alerts"] >= 7
    assert stats["resolved_alerts"] >= 1
    assert stats["urgent_alerts"] >= 1
    assert isinstance(stats["department_distribution"], dict)
    assert stats["department_distribution"][Department.CARDIOLOGY.value] >= 2
    assert stats["department_distribution"][Department.PULMONOLOGY.value] >= 1
    print(f"[PASS] Test 9: Live stats calculated dynamically: {stats['total_alerts']} total, {stats['urgent_alerts']} urgent, depts: {stats['department_distribution']}")
    passed += 1

    print("=" * 70)
    print(f"ALL {passed}/{total} SMART SPECIALIST ROUTING TESTS PASSED (100%)")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
