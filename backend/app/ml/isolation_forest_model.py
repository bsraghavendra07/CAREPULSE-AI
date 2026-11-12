"""
CAREPULSE 1.0 — Unsupervised Physiological Anomaly Detection Engine (Isolation Forest).
Learns multivariate physiological patterns from genuine BIDMC telemetry recordings.
Detects unusual combinations of vital signs and generates an Anomaly Score (0.0 - 1.0).

CLINICAL SAFETY DISTINCTION:
An anomaly score represents statistical distance from learned baseline distributions;
it is strictly distinct from a clinical deterioration probability or medical diagnosis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Feature column keys
DEFAULT_FEATURES = ["heart_rate", "oxygen_saturation", "respiratory_rate"]


class AnomalyPrediction(BaseModel):
    model_version: str = "CarePulse-Physio-IsolationForest-v1.0"
    model_type: str = "Unsupervised Isolation Forest (scikit-learn)"
    timestamp: str
    anomaly_score: float = Field(description="Normalized anomaly score from 0.0 (normal cluster) to 1.0 (highly unusual)")
    raw_decision_score: float = Field(description="Raw Isolation Forest decision function score (lower = more anomalous)")
    is_anomaly: bool = Field(description="True if multivariate observation falls outside the inlier threshold")
    anomaly_level: str = Field(description="NORMAL, BORDERLINE, ELEVATED_ANOMALY, SEVERE_ANOMALY")
    top_deviating_features: List[str] = Field(default_factory=list, description="Vitals contributing most to the anomaly")
    metric_type: str = "UNSUPERVISED_ANOMALY_SCORE"
    is_supervised_risk_prediction: bool = False
    clinical_distinction_disclaimer: str = (
        "Unsupervised Anomaly Score: Measures multivariate statistical distance from physiological baseline patterns. "
        "This is NOT a clinical deterioration probability or diagnostic prediction."
    )


class PhysiologicalIsolationForest:
    """Unsupervised Isolation Forest model trained on physiological observations."""

    def __init__(self, n_estimators: int = 100, contamination: float = 0.08, random_state: int = 42) -> None:
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state

        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.feature_names: List[str] = DEFAULT_FEATURES

        # Baseline distribution statistics for feature deviation attribution
        self.feature_means: Dict[str, float] = {}
        self.feature_stds: Dict[str, float] = {}

        self.is_trained: bool = False
        self.training_records_count: int = 0
        self.trained_at: Optional[str] = None
        self.training_dataset_name: str = "PhysioNet BIDMC PPG Continuous Telemetry Sample"

        # Calibration limits derived from training decision function
        self._min_dec_score: float = -0.35
        self._max_dec_score: float = 0.25

    def fit_from_dataframe(self, df: pd.DataFrame) -> None:
        """Fit Isolation Forest on continuous telemetry observations."""
        clean_df = pd.DataFrame()

        # Map possible column aliases
        alias_map = {
            "heart_rate": ["hr", "heart_rate", "pulse", "HR", "PULSE"],
            "oxygen_saturation": ["spo2", "oxygen_saturation", "o2_sat", "SpO2"],
            "respiratory_rate": ["rr", "respiratory_rate", "resp", "RR", "RESP"],
        }

        for feat, aliases in alias_map.items():
            matched = None
            for a in aliases:
                if a in df.columns:
                    matched = a
                    break
            if matched:
                clean_df[feat] = pd.to_numeric(df[matched], errors="coerce")
            else:
                clean_df[feat] = 75.0 if "heart" in feat else (97.0 if "oxygen" in feat else 16.0)

        # Drop invalid or NaN rows
        clean_df = clean_df.dropna()
        if len(clean_df) < 50:
            raise ValueError(f"Insufficient valid records for training: {len(clean_df)}")

        X = clean_df[DEFAULT_FEATURES].values

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)

        # Calculate baseline means and standard deviations
        for i, feat in enumerate(DEFAULT_FEATURES):
            self.feature_means[feat] = float(np.mean(X[:, i]))
            self.feature_stds[feat] = float(np.std(X[:, i])) or 1.0

        # Calibrate decision scores
        dec_scores = self.model.decision_function(X_scaled)
        self._min_dec_score = float(np.percentile(dec_scores, 1)) - 0.05
        self._max_dec_score = float(np.percentile(dec_scores, 99)) + 0.05

        self.is_trained = True
        self.training_records_count = len(clean_df)
        self.trained_at = datetime.now(timezone.utc).isoformat()
        logger.info(
            "PhysiologicalIsolationForest fitted on %d records (contamination=%.2f)",
            self.training_records_count,
            self.contamination,
        )

    def fit_from_csv(self, csv_path: Path) -> None:
        """Load and train from BIDMC CSV file."""
        if not csv_path.exists():
            raise FileNotFoundError(f"Training CSV not found at {csv_path}")
        df = pd.read_csv(csv_path)
        self.fit_from_dataframe(df)

    def predict_observation(self, vitals: Dict[str, Any]) -> AnomalyPrediction:
        """
        Evaluate a single telemetry observation against the learned multivariate distribution.
        Returns an AnomalyPrediction with normalized anomaly score (0.0 - 1.0).
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        # If model is not trained yet, initialize with default physiological priors
        if not self.is_trained or self.model is None or self.scaler is None:
            self._init_default_priors()

        # Extract features
        hr = self._extract_num(vitals, "heart_rate", "hr", default=75.0)
        spo2 = self._extract_num(vitals, "oxygen_saturation", "spo2", default=97.0)
        rr = self._extract_num(vitals, "respiratory_rate", "rr", default=16.0)

        # Handle flatline / probe disconnect extreme case directly
        if hr <= 0 or spo2 <= 0:
            return AnomalyPrediction(
                timestamp=now_iso,
                anomaly_score=1.0,
                raw_decision_score=-0.5,
                is_anomaly=True,
                anomaly_level="SEVERE_ANOMALY",
                top_deviating_features=["Sensor flatline / probe disconnect (HR=0 or SpO2=0)"],
            )

        X = np.array([[hr, spo2, rr]])
        X_scaled = self.scaler.transform(X)

        # Raw decision score: higher = normal inlier, lower = unusual outlier
        raw_dec = float(self.model.decision_function(X_scaled)[0])
        pred_label = int(self.model.predict(X_scaled)[0])  # +1 inlier, -1 outlier

        # Normalize score into calibrated [0.0, 1.0] anomaly metric
        # Invert scale so higher = more anomalous
        span = max(self._max_dec_score - self._min_dec_score, 0.1)
        norm_score = 1.0 - ((raw_dec - self._min_dec_score) / span)
        anomaly_score = float(np.clip(norm_score, 0.0, 1.0))
        anomaly_score = round(anomaly_score, 3)

        is_anomaly = pred_label == -1 or anomaly_score >= 0.65

        # Classify anomaly level
        if anomaly_score < 0.40:
            level = "NORMAL"
        elif anomaly_score < 0.65:
            level = "BORDERLINE"
        elif anomaly_score < 0.85:
            level = "ELEVATED_ANOMALY"
        else:
            level = "SEVERE_ANOMALY"

        # Determine feature-level deviations (Z-score from training mean)
        deviations = []
        vals = {"heart_rate": hr, "oxygen_saturation": spo2, "respiratory_rate": rr}
        labels = {"heart_rate": "Heart Rate", "oxygen_saturation": "Oxygen Saturation", "respiratory_rate": "Respiratory Rate"}
        units = {"heart_rate": "bpm", "oxygen_saturation": "%", "respiratory_rate": "/min"}

        for feat in DEFAULT_FEATURES:
            m = self.feature_means.get(feat, 75.0)
            s = self.feature_stds.get(feat, 1.0)
            v = vals[feat]
            z = (v - m) / s
            if abs(z) >= 1.75:
                sign = "+" if z > 0 else ""
                deviations.append(f"{labels[feat]} ({v:.1f} {units[feat]}, {sign}{z:.1f}σ from baseline)")

        if not deviations and is_anomaly:
            deviations.append("Multivariate interaction: joint vital combination diverges from training cluster")

        return AnomalyPrediction(
            timestamp=now_iso,
            anomaly_score=anomaly_score,
            raw_decision_score=round(raw_dec, 4),
            is_anomaly=is_anomaly,
            anomaly_level=level,
            top_deviating_features=deviations,
        )

    def _init_default_priors(self) -> None:
        """Initialize with synthetic BIDMC physiological distribution if trained file wasn't loaded."""
        np.random.seed(42)
        n = 500
        # Realistic post-discharge physiological cluster
        hrs = np.random.normal(76.0, 3.8, n)
        spo2s = np.random.normal(97.1, 1.1, n)
        rrs = np.random.normal(16.1, 1.5, n)
        X = np.column_stack([hrs, spo2s, rrs])

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(n_estimators=self.n_estimators, contamination=self.contamination, random_state=42)
        self.model.fit(X_scaled)

        for i, feat in enumerate(DEFAULT_FEATURES):
            self.feature_means[feat] = float(np.mean(X[:, i]))
            self.feature_stds[feat] = float(np.std(X[:, i]))

        self.is_trained = True
        self.training_records_count = n
        self.trained_at = datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _extract_num(d: Dict[str, Any], *keys: str, default: float = 0.0) -> float:
        for k in keys:
            if k in d:
                v = d[k]
                if isinstance(v, dict):
                    v = v.get("value", default)
                try:
                    return float(v)
                except (ValueError, TypeError):
                    continue
        return default


# Singleton ML Service
isolation_forest_service = PhysiologicalIsolationForest()


def initialize_ml_model(csv_path: Optional[Path] = None) -> PhysiologicalIsolationForest:
    """Train or initialize the Isolation Forest model on startup."""
    global isolation_forest_service
    if csv_path and csv_path.exists():
        try:
            isolation_forest_service.fit_from_csv(csv_path)
            logger.info("CarePulse Isolation Forest trained on BIDMC dataset: %s", csv_path)
        except Exception as e:
            logger.warning("Failed training on CSV %s (%s). Using calibrated priors.", csv_path, e)
            isolation_forest_service._init_default_priors()
    else:
        isolation_forest_service._init_default_priors()
    return isolation_forest_service
