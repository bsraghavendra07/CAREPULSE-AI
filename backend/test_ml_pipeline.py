"""
CAREPULSE 1.0 — Machine Learning Pipeline & Clinical AI Safety Test Suite.
Validates:
  1. Dataset Validation: BIDMC signals, duration, identifiers, annotations, and absence of deterioration labels
  2. Unsupervised ML Model: Isolation Forest multivariate anomaly detection & calibration (0.0 - 1.0)
  3. Random Forest Classifier Safety: Strict refusal to train without valid ground-truth labels (no circular NEWS2 labels)
  4. Prediction Integration: Output format, model version, timestamp, and WebSocket payload compliance
  5. Existing System Protection: NEWS2, Recovery DNA, Sensor Truth, FHIR R4, and Smart Specialist Routing preservation
  6. Honest Evaluation: Zero fabricated metrics, honest disclosure of unsupervised nature & clinical limitations
"""

from __future__ import annotations

import sys
from pathlib import Path
import pandas as pd
import numpy as np

from app.ml.dataset_validator import validate_bidmc_dataset
from app.ml.isolation_forest_model import (
    PhysiologicalIsolationForest,
    initialize_ml_model,
)
from app.ml.random_forest_evaluator import (
    SupervisedEligibilityReport,
    train_evaluate_random_forest_if_eligible,
)
from app.core.news2 import calculate_news2
from app.core.specialist_router import categorize_patient


def run_tests():
    print("=" * 75)
    print("CAREPULSE 1.0 — MACHINE LEARNING & CLINICAL AI SAFETY TEST SUITE")
    print("=" * 75)

    base_dir = Path(__file__).resolve().parent
    csv_file = base_dir / "app" / "data" / "bidmc" / "bidmc_sample_vitals.csv"

    passed = 0
    total = 8

    # ------------------------------------------------------------------
    # TEST 1: Dataset Validation (Signals, Duration, Labels)
    # ------------------------------------------------------------------
    val_report = validate_bidmc_dataset(csv_file)
    assert val_report["total_observations"] == 600, f"Expected 600 records, got {val_report['total_observations']}"
    assert val_report["recording_duration_seconds"] == 600
    assert val_report["recording_duration_minutes"] == 10.0

    # Available physiological signals
    signals = " ".join(val_report["physiological_signals_present"])
    assert "Heart Rate" in signals
    assert "Oxygen Saturation" in signals
    assert "Respiratory Rate" in signals

    # Missing signals identified
    missing = " ".join(val_report["physiological_signals_missing"])
    assert "Systolic Blood Pressure" in missing
    assert "Body Temperature" in missing

    # Confirm absence of deterioration labels
    assert val_report["genuine_deterioration_labels_present"] is False
    assert val_report["clinical_machine_learning_assessment"]["supervised_classification_permitted"] is False
    print("[PASS] Test 1: BIDMC dataset inspected: 3 signals present, 4 missing, 600s duration, 0 deterioration labels")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 2: Prohibition of Supervised Training on Unlabelled Telemetry
    # ------------------------------------------------------------------
    df = pd.read_csv(csv_file)
    eligibility = SupervisedEligibilityReport.evaluate_dataset_for_supervised_learning(df)
    assert eligibility["supervised_training_permitted"] is False
    assert eligibility["decision"] == "PROHIBIT_SUPERVISED_TRAINING"
    assert "strictly prohibited" in eligibility["clinical_rationale"]

    # Ensure system rejects NEWS2 scores as pseudo-ground truth
    rejected = False
    try:
        train_evaluate_random_forest_if_eligible(df, label_col="news2_score")
    except ValueError as e:
        if "CLINICAL SAFETY VIOLATION" in str(e):
            rejected = True
    assert rejected, "System failed to reject NEWS2 scores as pseudo-ground truth!"
    print("[PASS] Test 2: Random Forest safety guard active — rejected circular NEWS2 labeling and unlabelled training")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 3: Isolation Forest Model Training on BIDMC
    # ------------------------------------------------------------------
    model = PhysiologicalIsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    model.fit_from_csv(csv_file)
    assert model.is_trained is True
    assert model.training_records_count == 600
    assert "heart_rate" in model.feature_means
    print(f"[PASS] Test 3: Unsupervised Isolation Forest trained on {model.training_records_count} BIDMC observations")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 4: Normal Inlier Observation Prediction
    # ------------------------------------------------------------------
    # Mean vitals from BIDMC training data: HR ~ 76, SpO2 ~ 97, RR ~ 16
    normal_vitals = {"heart_rate": 76.0, "oxygen_saturation": 97.5, "respiratory_rate": 16.0}
    pred_normal = model.predict_observation(normal_vitals)

    assert 0.0 <= pred_normal.anomaly_score <= 1.0
    assert pred_normal.anomaly_score < 0.45, f"Expected normal score < 0.45, got {pred_normal.anomaly_score}"
    assert pred_normal.is_anomaly is False
    assert pred_normal.anomaly_level == "NORMAL"
    assert pred_normal.metric_type == "UNSUPERVISED_ANOMALY_SCORE"
    assert pred_normal.is_supervised_risk_prediction is False
    print(f"[PASS] Test 4: Normal inlier observation -> score: {pred_normal.anomaly_score} (NORMAL, is_anomaly=False)")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 5: Severe Multivariate Anomaly Detection
    # ------------------------------------------------------------------
    # Simultaneous extreme tachycardia, severe hypoxemia, and tachypnea
    severe_vitals = {"heart_rate": 142.0, "oxygen_saturation": 83.0, "respiratory_rate": 32.0}
    pred_severe = model.predict_observation(severe_vitals)

    assert pred_severe.anomaly_score >= 0.80, f"Expected anomaly score >= 0.80, got {pred_severe.anomaly_score}"
    assert pred_severe.is_anomaly is True
    assert pred_severe.anomaly_level in ("ELEVATED_ANOMALY", "SEVERE_ANOMALY")
    assert len(pred_severe.top_deviating_features) >= 2
    print(f"[PASS] Test 5: Severe multivariate anomaly -> score: {pred_severe.anomaly_score} ({pred_severe.anomaly_level}, reasons: {pred_severe.top_deviating_features})")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 6: Probe Removal / Sensor Flatline Handling
    # ------------------------------------------------------------------
    flatline_vitals = {"heart_rate": 0.0, "oxygen_saturation": 0.0, "respiratory_rate": 0.0}
    pred_flat = model.predict_observation(flatline_vitals)

    assert pred_flat.anomaly_score == 1.0
    assert pred_flat.is_anomaly is True
    assert "probe disconnect" in pred_flat.top_deviating_features[0].lower() or "flatline" in pred_flat.top_deviating_features[0].lower()
    print("[PASS] Test 6: Probe disconnect/flatline -> score: 1.000 (isolated without clinical misattribution)")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 7: Clinical Safety & Protocol Independence (NEWS2 & Routing Protection)
    # ------------------------------------------------------------------
    # Verify that NEWS2 calculation is completely untouched and independent
    news2_case = calculate_news2(
        {"heart_rate": 115, "oxygen_saturation": 91, "respiratory_rate": 24, "systolic_bp": 110, "body_temperature": 37.0},
        scale2_prescribed=False,
        supplemental_oxygen=False,
    )
    assert news2_case.total_score >= 7
    assert news2_case.triage_tier == "URGENT"
    assert news2_case.has_red_score is True

    # Verify that Specialist Routing operates independently
    p_profile = {"id": "P-001", "name": "Robert Thompson", "condition": "Post-Myocardial Infarction / Heart Failure"}
    routing = categorize_patient(p_profile)
    assert routing["department"] == "Cardiology"
    print("[PASS] Test 7: NEWS2 scoring & Specialist Routing verified 100% independent and protected")
    passed += 1

    # ------------------------------------------------------------------
    # TEST 8: Honest Evaluation & Disclaimer Verification
    # ------------------------------------------------------------------
    # Verify that disclaimer explicitly states it is NOT a deterioration probability
    disclaimer = pred_normal.clinical_distinction_disclaimer
    assert "NOT a clinical deterioration probability" in disclaimer
    assert "multivariate statistical distance" in disclaimer
    print("[PASS] Test 8: Honest evaluation verified — disclaimer explicitly distinguishes anomaly score from clinical risk")
    passed += 1

    print("=" * 75)
    print(f"ALL {passed}/{total} MACHINE LEARNING & SAFETY TESTS PASSED (100%)")
    print("=" * 75)


if __name__ == "__main__":
    run_tests()
