"""
CarePulse — Requirement 3.4 NEWS2 Scoring Engine & Personalization Verification Suite.

Tests all 7 mandatory criteria:
1. Normal patient (low score)
2. High respiratory rate (elevates RR subscore to 3)
3. Low SpO2 (elevates SpO2 subscore)
4. Hypercapnic respiratory failure (Scale 2 selected, 88-92% target, 90% SpO2 scores 0)
5. Non-hypercapnic patient (Scale 1 selected, >=96% target, 90% SpO2 scores 3)
6. Gradual deterioration detection over rolling historical baseline (e.g. 98 -> 97 -> 96 -> 95 -> 94 -> 93)
7. Safe missing observations handling (no fake data fabrication)
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.core.news2 import (
    calculate_news2,
    evaluate_hypercapnic_failure,
    ScaleUsed,
    RiskLevel,
)
from app.core.personalized import PersonalizedEngine


class TestNEWS2ScoringEngine(unittest.TestCase):
    """Unit tests for NEWS2 scoring, personalization rules, and gradual deterioration."""

    def test_1_normal_patient(self):
        """Test 1: Normal vitals produce low NEWS2 score (0-1)."""
        normal_vitals = {
            "rr": 16,
            "spo2": 98,
            "sbp": 120,
            "hr": 72,
            "temp": 36.8,
            "acvpu": "A",
            "supplemental_oxygen": False,
        }
        res = calculate_news2(normal_vitals, scale2_prescribed=False, supplemental_oxygen=False)
        self.assertEqual(res.total_score, 0, f"Expected 0 for normal vitals, got {res.total_score}")
        self.assertEqual(res.risk_level, RiskLevel.LOW)
        self.assertFalse(res.has_red_score)
        self.assertEqual(res.scale_used, ScaleUsed.SCALE_1)
        self.assertEqual(res.target_spo2_range, "≥96%")
        print("✓ Test 1 Passed: Normal vitals produce low NEWS2 score 0.")

    def test_2_high_respiratory_rate(self):
        """Test 2: High respiratory rate increases corresponding component score."""
        tachypneic_vitals = {
            "rr": 26,  # >= 25 -> Score 3 (Red score)
            "spo2": 98,
            "sbp": 120,
            "hr": 72,
            "temp": 36.8,
            "acvpu": "A",
            "supplemental_oxygen": False,
        }
        res = calculate_news2(tachypneic_vitals, scale2_prescribed=False, supplemental_oxygen=False)
        self.assertEqual(res.sub_scores["rr"], 3, f"Expected RR subscore 3 for RR 26, got {res.sub_scores['rr']}")
        self.assertEqual(res.components["respiratory_rate"], 3)
        self.assertTrue(res.has_red_score)
        self.assertEqual(res.red_score_parameter, "rr")
        self.assertIn("Elevated respiratory rate", " ".join(res.primary_contributors))
        print("✓ Test 2 Passed: High respiratory rate produces RR component score 3 (Red parameter).")

    def test_3_low_spo2(self):
        """Test 3: Low SpO2 on Scale 1 produces appropriate score."""
        hypoxic_vitals = {
            "rr": 16,
            "spo2": 90,  # <= 91% on Scale 1 -> Score 3
            "sbp": 120,
            "hr": 72,
            "temp": 36.8,
            "acvpu": "A",
            "supplemental_oxygen": False,
        }
        res = calculate_news2(hypoxic_vitals, scale2_prescribed=False, supplemental_oxygen=False)
        self.assertEqual(res.sub_scores["spo2"], 3, f"Expected SpO2 subscore 3 for 90%, got {res.sub_scores['spo2']}")
        self.assertEqual(res.components["spo2"], 3)
        self.assertTrue(res.has_red_score)
        self.assertIn("Low SpO₂", " ".join(res.primary_contributors))
        print("✓ Test 3 Passed: SpO2 of 90% on Scale 1 scores 3 points.")

    def test_4_hypercapnic_respiratory_failure_scale2(self):
        """Test 4: Patient with documented hypercapnic failure uses Scale 2 (88-92% target)."""
        condition_doc = "Post-COPD exacerbation with hypercapnic respiratory failure risk"
        is_scale2, target, reason = evaluate_hypercapnic_failure(condition_doc)
        self.assertTrue(is_scale2)
        self.assertEqual(target, "88–92%")
        self.assertIn("hypercapnic", reason.lower())

        # On Scale 2, SpO2 of 90% is on target (88-92%) -> Score 0
        vitals = {
            "rr": 16,
            "spo2": 90,
            "sbp": 120,
            "hr": 72,
            "temp": 36.8,
            "acvpu": "A",
            "supplemental_oxygen": False,
        }
        res = calculate_news2(vitals, scale2_prescribed=is_scale2, supplemental_oxygen=False)
        self.assertEqual(res.scale_used, ScaleUsed.SCALE_2)
        self.assertEqual(res.sub_scores["spo2"], 0, f"Expected SpO2 score 0 on Scale 2 for 90%, got {res.sub_scores['spo2']}")
        self.assertEqual(res.target_spo2_range, "88–92%")
        print("✓ Test 4 Passed: Hypercapnic respiratory failure correctly selects Scale 2 (90% SpO2 scores 0).")

    def test_5_no_hypercapnic_respiratory_failure_scale1(self):
        """Test 5: Patient without hypercapnic failure uses Scale 1 (>=96% target)."""
        condition_doc = "Post-Myocardial Infarction / Congestive Heart Failure"
        is_scale2, target, reason = evaluate_hypercapnic_failure(condition_doc)
        self.assertFalse(is_scale2)
        self.assertEqual(target, "≥96%")

        # On Scale 1, SpO2 of 90% is hypoxic -> Score 3
        vitals = {
            "rr": 16,
            "spo2": 90,
            "sbp": 120,
            "hr": 72,
            "temp": 36.8,
            "acvpu": "A",
            "supplemental_oxygen": False,
        }
        res = calculate_news2(vitals, scale2_prescribed=is_scale2, supplemental_oxygen=False)
        self.assertEqual(res.scale_used, ScaleUsed.SCALE_1)
        self.assertEqual(res.sub_scores["spo2"], 3, f"Expected SpO2 score 3 on Scale 1 for 90%, got {res.sub_scores['spo2']}")
        self.assertEqual(res.target_spo2_range, "≥96%")
        print("✓ Test 5 Passed: Non-hypercapnic patient correctly uses Scale 1 (90% SpO2 scores 3).")

    def test_6_gradual_deterioration(self):
        """Test 6: Rolling baseline detects gradual deterioration over sliding history (98->97->96->95->94->93)."""
        engine = PersonalizedEngine()
        patient_id = "TEST-P001"

        # Sliding sequence of declining SpO2 values
        sequence = [98.0, 98.0, 97.0, 97.0, 96.0, 95.0, 94.0, 93.0]

        last_assessment = None
        for val in sequence:
            vitals = {"spo2": val, "hr": 75.0, "rr": 16.0, "sbp": 120.0, "temp": 36.8}
            engine.update(patient_id, vitals)
            last_assessment = engine.get_assessment(patient_id, vitals)

        self.assertIsNotNone(last_assessment)
        self.assertIn("spo2", last_assessment.trends)
        spo2_trend = last_assessment.trends["spo2"]

        self.assertEqual(spo2_trend.trend_direction, "↓ Declining")
        self.assertTrue(spo2_trend.is_deteriorating, "Expected is_deteriorating=True for gradual SpO2 drop")
        self.assertTrue(last_assessment.gradual_deterioration.detected)
        self.assertEqual(last_assessment.gradual_deterioration.parameter, "spo2")
        self.assertEqual(last_assessment.gradual_deterioration.trend, "Downward")
        self.assertIn("Gradual deterioration detected", last_assessment.gradual_deterioration.alert_message)
        self.assertIn("distinct from the NEWS2 score", last_assessment.gradual_deterioration.distinction_disclaimer)
        print(f"✓ Test 6 Passed: {last_assessment.gradual_deterioration.alert_message}")

    def test_7_missing_observations(self):
        """Test 7: Missing observations are safely identified without fabricating values."""
        partial_vitals = {
            "hr": 80,
            # rr, spo2, sbp, temp intentionally omitted
        }
        res = calculate_news2(partial_vitals, scale2_prescribed=False, supplemental_oxygen=False)
        self.assertIn("respiratory_rate", res.missing_parameters)
        self.assertIn("oxygen_saturation", res.missing_parameters)
        self.assertIn("systolic_bp", res.missing_parameters)
        self.assertIn("body_temperature", res.missing_parameters)

        self.assertIsNone(res.components["respiratory_rate"])
        self.assertIsNone(res.components["spo2"])
        self.assertEqual(res.components["heart_rate"], 0)

        # Baseline engine with insufficient readings (< 5 readings)
        engine = PersonalizedEngine()
        engine.update("TEST-P002", {"hr": 80})
        assessment = engine.get_assessment("TEST-P002", {"hr": 80})
        self.assertEqual(assessment.trends["hr"].status, "Insufficient historical data")
        self.assertEqual(assessment.trends["hr"].trend_direction, "Insufficient data")
        print("✓ Test 7 Passed: Missing observations and insufficient history handled safely without fabricating values.")


if __name__ == "__main__":
    unittest.main()

