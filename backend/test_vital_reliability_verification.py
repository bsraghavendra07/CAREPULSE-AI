"""
CarePulse - Vital-Sign Reliability and Sensor Artifact Detection Layer
Comprehensive Verification Test Suite

Tests:
1. Plausible vs Implausible Vital-Sign Ranges
2. Flatline Detection (>= 15 identical readings)
3. Near-Flatline Detection (suspiciously low variance)
4. Isolated Outlier / Sudden Impossible Jump
5. Rapid Oscillation / High-Frequency Noise
6. Probe Removal Detection & Hypoxia False-Alarm Suppression
7. Missing Observation Handling (No fabricated values)
8. Multi-Vital Cross-Check (Concordant deterioration is NEVER suppressed)
9. NEWS2 Integration (Unreliable signals gated, no false acute 3 score)
10. Signal Reliability State Enum Validation (VALID, SUSPECT, ARTIFACT, PROBE_REMOVED, FLATLINE, MISSING)
11. End-to-End WebSocket Ingestion Signal Quality Evaluation
12. Audit Logging & Clear Diagnostic Notes
"""

import sys
import os
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.core.artifact_detector import (
    SignalState,
    SignalReliability,
    SQIResult,
    evaluate_signal_reliability,
    detect_artifacts,
    artifact_detector,
)
from app.core.news2 import calculate_news2
from app.config import VITAL_VALIDATION_RANGES, SQI_THRESHOLDS


class TestVitalReliability(unittest.TestCase):

    def setUp(self):
        # Reset in-memory history before each test to ensure isolation
        artifact_detector._history.clear()
        artifact_detector._flatline_counters.clear()
        artifact_detector._last_values.clear()

    # -------------------------------------------------------------
    # Test 1: Normal Physiological Vitals -> VALID
    # -------------------------------------------------------------
    def test_01_normal_vitals_valid(self):
        res = evaluate_signal_reliability(
            patient_id="TEST_01",
            spo2=98.0,
            hr=76.0,
            rr=16.0,
            sbp=120.0,
            temp=36.8,
            probe_removed=False,
        )
        self.assertFalse(res.probe_removed)
        self.assertFalse(res.clinical_alert_suppressed)
        self.assertIsNone(res.sensor_alert)
        self.assertEqual(res.signals["spo2"].state, SignalState.VALID)
        self.assertEqual(res.signals["hr"].state, SignalState.VALID)
        self.assertEqual(res.signals["rr"].state, SignalState.VALID)
        self.assertTrue(res.signals["spo2"].is_reliable)
        self.assertGreaterEqual(res.sqi, 0.90)
        print("✓ Test 1 Passed: Normal vitals correctly evaluated as VALID with high SQI")

    # -------------------------------------------------------------
    # Test 2: Implausible Values (Out of Physiological Range)
    # -------------------------------------------------------------
    def test_02_implausible_vitals(self):
        # SpO2 > 100
        res_high_spo2 = evaluate_signal_reliability(
            patient_id="TEST_02A",
            spo2=105.0,
            hr=72.0,
            rr=14.0,
        )
        self.assertEqual(res_high_spo2.signals["spo2"].state, SignalState.ARTIFACT)
        self.assertFalse(res_high_spo2.signals["spo2"].is_reliable)
        self.assertTrue(res_high_spo2.clinical_alert_suppressed)
        self.assertTrue(res_high_spo2.signals["spo2"].implausible)
        self.assertIn("impossible reading", res_high_spo2.signals["spo2"].reason)

        # SpO2 < 0
        res_neg_spo2 = evaluate_signal_reliability(
            patient_id="TEST_02B",
            spo2=-5.0,
            hr=72.0,
        )
        self.assertEqual(res_neg_spo2.signals["spo2"].state, SignalState.ARTIFACT)
        self.assertFalse(res_neg_spo2.signals["spo2"].is_reliable)

        # Extreme impossible HR (320 bpm)
        res_ext_hr = evaluate_signal_reliability(
            patient_id="TEST_02C",
            spo2=97.0,
            hr=320.0,
        )
        self.assertEqual(res_ext_hr.signals["hr"].state, SignalState.ARTIFACT)
        self.assertFalse(res_ext_hr.signals["hr"].is_reliable)

        # Extreme impossible Temp (52.0 C)
        res_ext_temp = evaluate_signal_reliability(
            patient_id="TEST_02D",
            spo2=97.0,
            hr=75.0,
            temp=52.0,
        )
        self.assertEqual(res_ext_temp.signals["temp"].state, SignalState.ARTIFACT)
        self.assertFalse(res_ext_temp.signals["temp"].is_reliable)
        print("✓ Test 2 Passed: Implausible values detected as ARTIFACT and flagged unreliable")

    # -------------------------------------------------------------
    # Test 3: Flatline Detection (15+ consecutive identical readings)
    # -------------------------------------------------------------
    def test_03_flatline_detection(self):
        pid = "TEST_03_FLATLINE"
        # Feed 16 identical readings
        res = None
        for i in range(16):
            res = evaluate_signal_reliability(
                patient_id=pid,
                spo2=96.0,
                hr=72.0,
                rr=16.0,
            )

        self.assertIsNotNone(res)
        self.assertEqual(res.signals["spo2"].state, SignalState.FLATLINE)
        self.assertEqual(res.signals["hr"].state, SignalState.FLATLINE)
        self.assertFalse(res.signals["spo2"].is_reliable)
        self.assertTrue(res.clinical_alert_suppressed)
        self.assertIn("FLATLINE", res.signals["spo2"].artifact_type)
        self.assertIsNotNone(res.sensor_alert)
        print("✓ Test 3 Passed: 15+ consecutive identical readings triggered FLATLINE state")

    # -------------------------------------------------------------
    # Test 4: Near-Flatline (Unnaturally constant / near-zero variance)
    # -------------------------------------------------------------
    def test_04_near_flatline_detection(self):
        pid = "TEST_04_NEAR_FLATLINE"
        # 12 readings with extremely minuscule fluctuation (variance < 0.02)
        res = None
        for i in range(12):
            val = 97.0 + (0.01 if i % 2 == 0 else 0.0)
            res = evaluate_signal_reliability(
                patient_id=pid,
                spo2=val,
                hr=72.0 + (1 if i % 2 == 0 else 0),
            )

        self.assertIsNotNone(res)
        self.assertIn(res.signals["spo2"].state, [SignalState.SUSPECT, SignalState.FLATLINE, SignalState.ARTIFACT])
        self.assertIn("NEAR_FLATLINE", res.signals["spo2"].artifact_type)
        print("✓ Test 4 Passed: Low-variance signal detected as NEAR_FLATLINE")

    # -------------------------------------------------------------
    # Test 5: Sudden Isolated Outlier Jump
    # -------------------------------------------------------------
    def test_05_isolated_outlier_jump(self):
        pid = "TEST_05_JUMP"
        # Baseline
        for _ in range(5):
            evaluate_signal_reliability(patient_id=pid, spo2=98.0, hr=75.0, rr=16.0)

        # Single sudden impossible drop: 98 -> 45 (drop > 25% with no HR/RR change)
        jump_res = evaluate_signal_reliability(patient_id=pid, spo2=45.0, hr=75.0, rr=16.0)

        self.assertEqual(jump_res.signals["spo2"].state, SignalState.ARTIFACT)
        self.assertFalse(jump_res.signals["spo2"].is_reliable)
        self.assertIn("ISOLATED_OUTLIER", jump_res.signals["spo2"].artifact_type)
        self.assertTrue(jump_res.clinical_alert_suppressed)
        print("✓ Test 5 Passed: Sudden isolated jump identified as ARTIFACT and suppressed")

    # -------------------------------------------------------------
    # Test 6: Rapid High-Frequency Oscillation
    # -------------------------------------------------------------
    def test_06_rapid_oscillation(self):
        pid = "TEST_06_OSC"
        # Alternating sharply: 96, 75, 96, 75, 96, 75
        vals = [96.0, 75.0, 96.0, 75.0, 96.0, 75.0]
        res = None
        for v in vals:
            res = evaluate_signal_reliability(patient_id=pid, spo2=v, hr=75.0, rr=16.0)

        self.assertIsNotNone(res)
        self.assertIn("RAPID_OSCILLATION", res.signals["spo2"].artifact_type)
        self.assertFalse(res.signals["spo2"].is_reliable)
        print("✓ Test 6 Passed: High-frequency alternating values detected as RAPID_OSCILLATION")

    # -------------------------------------------------------------
    # Test 7: Probe Removal Scenario & Suppression
    # -------------------------------------------------------------
    def test_07_probe_removal(self):
        # Case A: probe_removed flag explicitly True
        res_a = evaluate_signal_reliability(
            patient_id="TEST_07A",
            spo2=0.0,
            hr=0.0,
            probe_removed=True,
        )
        self.assertTrue(res_a.probe_removed)
        self.assertEqual(res_a.signals["spo2"].state, SignalState.PROBE_REMOVED)
        self.assertFalse(res_a.signals["spo2"].is_reliable)
        self.assertTrue(res_a.clinical_alert_suppressed)
        self.assertIsNotNone(res_a.sensor_alert)
        self.assertIn("probe removal", res_a.sensor_alert.lower())

        # Case B: SpO2 drops to 0 without probe flag
        res_b = evaluate_signal_reliability(
            patient_id="TEST_07B",
            spo2=0.0,
            hr=70.0,
            probe_removed=False,
        )
        self.assertTrue(res_b.probe_removed)
        self.assertEqual(res_b.signals["spo2"].state, SignalState.PROBE_REMOVED)
        self.assertTrue(res_b.clinical_alert_suppressed)
        print("✓ Test 7 Passed: Probe removal identified; false acute hypoxia suppressed")

    # -------------------------------------------------------------
    # Test 8: Missing Observations Handled Without Fabrication
    # -------------------------------------------------------------
    def test_08_missing_observations(self):
        res = evaluate_signal_reliability(
            patient_id="TEST_08",
            spo2=98.0,
            hr=72.0,
            rr=None,
            temp=None,
            sbp=None,
        )
        self.assertEqual(res.signals["rr"].state, SignalState.MISSING)
        self.assertEqual(res.signals["temp"].state, SignalState.MISSING)
        self.assertEqual(res.signals["sbp"].state, SignalState.MISSING)
        self.assertFalse(res.signals["rr"].is_reliable)
        self.assertIn("Observation unavailable", res.signals["rr"].reason)
        print("✓ Test 8 Passed: Missing observations cleanly marked as MISSING without fabrication")

    # -------------------------------------------------------------
    # Test 9: Multi-Vital Cross-Check (True Deterioration is NEVER Suppressed)
    # -------------------------------------------------------------
    def test_09_true_physiological_deterioration_protected(self):
        pid = "TEST_09_TRUE_DET"
        # Baseline normal
        for _ in range(5):
            evaluate_signal_reliability(patient_id=pid, spo2=97.0, hr=75.0, rr=16.0)

        # True respiratory failure / sepsis / shock onset:
        # SpO2 drops by 6% (97 -> 91), HR climbs by 25 bpm (75 -> 100), RR climbs by 8 (16 -> 24)
        det_res = evaluate_signal_reliability(
            patient_id=pid,
            spo2=91.0,
            hr=100.0,
            rr=24.0,
            probe_removed=False,
        )

        self.assertTrue(det_res.is_genuine_deterioration)
        self.assertFalse(det_res.clinical_alert_suppressed)
        self.assertTrue(det_res.signals["spo2"].is_reliable)
        self.assertEqual(det_res.signals["spo2"].state, SignalState.VALID)
        self.assertIsNotNone(det_res.genuine_deterioration_note)
        self.assertIn("Multi-vital concordance verified", det_res.genuine_deterioration_note)
        print("✓ Test 9 Passed: Multi-vital physiological deterioration validated and NEVER suppressed")

    # -------------------------------------------------------------
    # Test 10: NEWS2 Engine Gating with Unreliable / Probe-Removed Signals
    # -------------------------------------------------------------
    def test_10_news2_gating_integration(self):
        # Scenario A: SpO2 is 0 or probe removed.
        # If scored naively, SpO2 <= 91 would get 3 points (High Risk / Red Alert).
        # With reliability gating, unreliable signals are excluded from acute score!
        news_suppressed = calculate_news2(
            vitals={
                "respiratory_rate": 16,
                "spo2": 0.0,
                "systolic_bp": 120,
                "heart_rate": 72,
                "consciousness": "ALERT",
                "temperature": 37.0,
            },
            scale2_prescribed=False,
            supplemental_oxygen=False,
            unreliable_signals=["spo2"],
        )

        self.assertTrue(news_suppressed.suppressed_due_to_artifact)
        self.assertEqual(news_suppressed.sub_scores.get("spo2", 0), 0)
        self.assertIn("spo2", news_suppressed.unreliable_components)
        self.assertEqual(news_suppressed.total_score, 0)
        self.assertEqual(news_suppressed.risk_level, "LOW")

        # Scenario B: Normal reliable vitals score normally
        news_normal = calculate_news2(
            vitals={
                "respiratory_rate": 16,
                "spo2": 98.0,
                "systolic_bp": 120,
                "heart_rate": 72,
                "consciousness": "ALERT",
                "temperature": 37.0,
            },
            scale2_prescribed=False,
            supplemental_oxygen=False,
            unreliable_signals=[],
        )
        self.assertFalse(news_normal.suppressed_due_to_artifact)
        self.assertEqual(news_normal.total_score, 0)
        print("✓ Test 10 Passed: NEWS2 gating excludes unreliable signals, preventing false Red Alerts")

    # -------------------------------------------------------------
    # Test 11: Backward Compatibility of detect_artifacts wrapper
    # -------------------------------------------------------------
    def test_11_backward_compatibility(self):
        # Legacy detect_artifacts() signature
        sqi, is_artifact, notes = detect_artifacts(
            spo2=98.0,
            hr=75.0,
            rr=16.0,
            patient_id="TEST_11",
        )
        self.assertIsInstance(sqi, float)
        self.assertIsInstance(is_artifact, bool)
        self.assertIsInstance(notes, list)
        self.assertFalse(is_artifact)
        print("✓ Test 11 Passed: Legacy detect_artifacts wrapper operates seamlessly")

    # -------------------------------------------------------------
    # Test 12: REST API GET /api/patients/{id}/signal-quality
    # -------------------------------------------------------------
    def test_12_rest_api_signal_quality_endpoint(self):
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as client:
            response = client.get("/api/patients/P-001/signal-quality")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["patient_id"], "P-001")
            self.assertIn("sqi_score", data)
            self.assertIn("signals", data)
            self.assertIn("spo2", data["signals"])
            self.assertIn("heart_rate", data["signals"])
            self.assertIn("respiratory_rate", data["signals"])
            self.assertIn("body_temperature", data["signals"])
            self.assertIn("clinical_alert_suppressed", data)
            self.assertIn("clinical_decision_support_disclaimer", data)
            print("✓ Test 12 Passed: REST API GET /api/patients/{id}/signal-quality verified")

    # -------------------------------------------------------------
    # Test 13: Audit Trail & Clinical Decision Support Disclaimers
    # -------------------------------------------------------------
    def test_13_audit_trail_and_disclaimer(self):
        # Simulate artifact injection and verify full auditability
        res = evaluate_signal_reliability(
            patient_id="TEST_13_AUDIT",
            spo2=0.0,
            hr=0.0,
            probe_removed=True,
        )
        self.assertTrue(len(res.audit_log) > 0)
        entry = res.audit_log[0]
        self.assertEqual(entry["signal"], "spo2")
        self.assertEqual(entry["status"], "PROBE_REMOVED")
        self.assertIn("Suppressed false hypoxia alarm", entry["action"])
        print("✓ Test 13 Passed: Audit trail logs all suppression actions with full transparency")



if __name__ == "__main__":
    unittest.main()
