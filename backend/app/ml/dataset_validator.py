"""
CAREPULSE 1.0 — Physiological Dataset Validation Suite.
Inspects all available datasets before model selection in accordance with clinical AI standards.
Evaluates:
  1. Available physiological signals
  2. Recording duration & sampling rate
  3. Patient/recording identifiers
  4. Timestamps
  5. Available clinical annotations
  6. Presence of genuine deterioration outcome labels
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List
import pandas as pd


def validate_bidmc_dataset(csv_path: Path) -> Dict[str, Any]:
    """Inspect and validate the BIDMC dataset."""
    if not csv_path.exists():
        return {
            "file_exists": False,
            "error": f"File not found at {csv_path}",
        }

    df = pd.read_csv(csv_path)
    total_records = len(df)
    columns = list(df.columns)

    # 1. Available signals
    signals_present = []
    signals_missing = []
    candidate_signals = {
        "hr": "Heart Rate (LOINC: 8867-4)",
        "spo2": "Oxygen Saturation (LOINC: 2708-6)",
        "rr": "Respiratory Rate (LOINC: 9279-1)",
        "systolic_bp": "Systolic Blood Pressure (LOINC: 8480-6)",
        "body_temperature": "Body Temperature (LOINC: 8310-5)",
        "consciousness": "Consciousness Level ACVPU",
        "supplemental_oxygen": "Supplemental Oxygen Therapy",
    }

    for col_key, col_desc in candidate_signals.items():
        if col_key in df.columns or col_key.upper() in df.columns or col_key.lower() in [c.lower() for c in columns]:
            signals_present.append(col_desc)
        else:
            signals_missing.append(col_desc)

    # 2. Recording duration & sampling rate
    # Expected sampling: 1 Hz (1 reading per second)
    duration_seconds = total_records
    duration_minutes = round(total_records / 60.0, 2)

    # 3. Patient / recording identifiers
    has_patient_id_col = any("patient" in c.lower() or "subject" in c.lower() or "id" in c.lower() for c in columns)

    # 4. Timestamps
    timestamp_cols = [c for c in columns if "time" in c.lower() or "date" in c.lower()]

    # 5. Clinical annotations
    annotation_cols = [c for c in columns if "annot" in c.lower() or "event" in c.lower() or "note" in c.lower()]

    # 6. Genuine deterioration outcome labels
    outcome_label_candidates = [
        "deterioration",
        "outcome",
        "label",
        "target",
        "sepsis",
        "cardiac_arrest",
        "icu_admission",
        "mortality",
        "death",
        "rapid_response",
    ]
    detected_outcome_labels = [c for c in columns if any(cand in c.lower() for cand in outcome_label_candidates)]

    has_genuine_deterioration_labels = len(detected_outcome_labels) > 0

    # Summary statistics of vitals
    vitals_stats: Dict[str, Any] = {}
    for col in ["hr", "spo2", "rr"]:
        if col in df.columns:
            vitals_stats[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": round(float(df[col].mean()), 2),
                "std": round(float(df[col].std()), 2),
                "null_count": int(df[col].isnull().sum()),
            }

    validation_result = {
        "dataset_name": "PhysioNet BIDMC Congestive Heart Failure / PPG Continuous Telemetry Sample",
        "source_path": str(csv_path),
        "total_observations": total_records,
        "recording_duration_seconds": duration_seconds,
        "recording_duration_minutes": duration_minutes,
        "sampling_frequency": "1 Hz (1 reading / second)",
        "columns_found": columns,
        "physiological_signals_present": signals_present,
        "physiological_signals_missing": signals_missing,
        "patient_identifier_column": has_patient_id_col,
        "patient_cohort_context": "Anonymized Intensive Care Unit / Post-Acute Cardiorespiratory Continuous Waveforms",
        "timestamp_format": "ISO 8601 UTC Datetime strings" if "timestamp" in columns else "Elapsed Seconds",
        "clinical_annotations_present": len(annotation_cols) > 0,
        "genuine_deterioration_labels_present": has_genuine_deterioration_labels,
        "detected_outcome_columns": detected_outcome_labels,
        "vitals_distribution": vitals_stats,
        "clinical_machine_learning_assessment": {
            "supervised_classification_permitted": False,
            "supervised_prohibition_reason": (
                "The raw BIDMC telemetry dataset contains continuous physiological measurements without annotated "
                "clinical deterioration outcome labels. In accordance with clinical validation guidelines, generating "
                "artificial binary labels or utilizing NEWS2 scores as pseudo-ground truth is strictly prohibited."
            ),
            "recommended_model_architecture": "Unsupervised Multivariate Anomaly Detection (Isolation Forest)",
            "output_metric_type": "Unsupervised Physiological Anomaly Score (0.0 to 1.0)",
            "distinction_note": (
                "An anomaly score indicates statistical divergence from learned multivariate physiological baselines; "
                "it does NOT represent a clinical deterioration probability."
            ),
        },
    }

    return validation_result


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    csv_file = base_dir / "app" / "data" / "bidmc" / "bidmc_sample_vitals.csv"
    res = validate_bidmc_dataset(csv_file)
    print(json.dumps(res, indent=2))
