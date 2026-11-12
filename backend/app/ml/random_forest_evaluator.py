"""
CAREPULSE 1.0 — Supervised Random Forest Classifier Evaluation & Safety Validator.
Enforces the mandatory PS-03 clinical constraint:
"Implement RandomForestClassifier only if a valid labelled training dataset is available.
 Do not use NEWS2-generated labels as independent clinical ground truth.
 Do not generate artificial clinical labels."
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit, StratifiedKFold

logger = logging.getLogger(__name__)


class SupervisedEligibilityReport:
    """Evaluates whether supervised classification is clinically and scientifically permissible."""

    @staticmethod
    def evaluate_dataset_for_supervised_learning(
        df: pd.DataFrame,
        dataset_name: str = "PhysioNet BIDMC Sample",
    ) -> Dict[str, Any]:
        columns = list(df.columns)
        candidate_labels = [
            "deterioration",
            "deteriorated",
            "outcome",
            "sepsis_onset",
            "cardiac_arrest",
            "icu_transfer",
            "mortality",
            "clinical_ground_truth",
        ]
        found_labels = [c for c in columns if any(cand in c.lower() for cand in candidate_labels)]

        news2_columns = [c for c in columns if "news2" in c.lower() or "news" in c.lower() or "score" in c.lower()]

        is_eligible = len(found_labels) > 0

        report = {
            "dataset_name": dataset_name,
            "total_records": len(df),
            "columns": columns,
            "ground_truth_labels_found": found_labels,
            "news2_columns_detected": news2_columns,
            "supervised_training_permitted": is_eligible,
            "decision": "TRAIN_RANDOM_FOREST" if is_eligible else "PROHIBIT_SUPERVISED_TRAINING",
            "clinical_rationale": (
                "Valid supervised ground-truth outcome labels are present."
                if is_eligible
                else (
                    "The physiological dataset does NOT contain validated clinical deterioration outcome labels. "
                    "In adherence to clinical AI safety rules, generating artificial labels or adopting NEWS2 scores "
                    "as pseudo-ground truth is strictly prohibited because it induces circular validation and data leakage."
                )
            ),
            "unsupervised_fallback_active": True,
            "recommended_model": "Unsupervised Isolation Forest (Multivariate Anomaly Score)",
        }
        return report


def train_evaluate_random_forest_if_eligible(
    df: pd.DataFrame,
    label_col: str,
    patient_id_col: Optional[str] = None,
    features: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Safely train and evaluate RandomForestClassifier IF valid labels are present.
    Implements patient-level split to prevent data leakage and calculates full metrics.
    """
    if "news2" in label_col.lower() or "score" in label_col.lower():
        raise ValueError(
            "CLINICAL SAFETY VIOLATION: Using NEWS2-generated scores as supervised ground truth is prohibited. "
            "NEWS2 is a clinical protocol, not an independent statistical ground truth."
        )

    if label_col not in df.columns:
        return SupervisedEligibilityReport.evaluate_dataset_for_supervised_learning(df)

    clean_df = df.dropna(subset=[label_col])
    feat_cols = features or [c for c in clean_df.columns if c not in [label_col, patient_id_col, "timestamp"]]

    X = clean_df[feat_cols].values
    y = clean_df[label_col].values

    # Check class distribution
    unique, counts = np.unique(y, return_counts=True)
    class_dist = dict(zip([str(u) for u in unique], [int(c) for c in counts]))

    # Prevent patient-level data leakage
    if patient_id_col and patient_id_col in clean_df.columns:
        groups = clean_df[patient_id_col].values
        gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
        train_idx, test_idx = next(gss.split(X, y, groups=groups))
    else:
        # Fallback to stratified temporal split
        skf = StratifiedKFold(n_splits=4, shuffle=False)
        train_idx, test_idx = next(skf.split(X, y))

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    rf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42, class_weight="balanced")
    rf.fit(X_train, y_train)

    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1] if len(np.unique(y)) == 2 else None

    # Calculate metrics
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_test, y_pred).tolist()
    roc = float(roc_auc_score(y_test, y_prob)) if y_prob is not None and len(np.unique(y_test)) == 2 else None

    return {
        "status": "TRAINED_AND_EVALUATED",
        "training_records": len(X_train),
        "testing_records": len(X_test),
        "class_distribution": class_dist,
        "features": feat_cols,
        "patient_leakage_prevented": patient_id_col is not None,
        "metrics": {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc, 4) if roc else None,
            "confusion_matrix": cm,
        },
        "feature_importances": dict(zip(feat_cols, [round(float(fi), 4) for fi in rf.feature_importances_])),
    }
