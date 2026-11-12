"""
MINEARENA 1.0 — Personalized baseline anomaly detection engine.

This is an ADVISORY layer only — it **never** suppresses NEWS2 alerts.
Uses exponential moving average (EMA) to track patient-specific baselines
and flags deviations via Z-scores.
"""

from __future__ import annotations

import math
from typing import Optional

from pydantic import BaseModel, Field

from app.config import EMA_ALPHA, Z_SCORE_ALERT_THRESHOLD, Z_SCORE_SUSTAINED_READINGS


# Parameters tracked for personalized baselines
_TRACKED_PARAMS: list[str] = ["hr", "spo2", "rr", "sbp", "temp"]


class PersonalizedResult(BaseModel):
    """Outcome of the personalized anomaly assessment."""

    baseline: dict[str, float] = Field(
        default_factory=dict,
        description="Current EMA baseline for each tracked parameter.",
    )
    z_scores: dict[str, float] = Field(
        default_factory=dict,
        description="Z-score of the latest reading vs baseline.",
    )
    is_advisory_alert: bool = False
    alert_parameters: list[str] = Field(default_factory=list)
    advisory_note: str = ""


class _PatientState:
    """Internal mutable state per patient."""

    __slots__ = ("ema", "ema_var", "count", "consecutive_flags")

    def __init__(self) -> None:
        # EMA of mean and variance per parameter
        self.ema: dict[str, float] = {}
        self.ema_var: dict[str, float] = {}
        self.count: dict[str, int] = {}
        # Count of consecutive readings where |Z| > threshold
        self.consecutive_flags: dict[str, int] = {}


class PersonalizedEngine:
    """Maintains per-patient baselines and flags advisory anomalies."""

    def __init__(self, alpha: float = EMA_ALPHA) -> None:
        self._alpha = alpha
        self._patients: dict[str, _PatientState] = {}

    # ── Internal helpers ───────────────────────────────────────────────

    def _ensure_patient(self, patient_id: str) -> _PatientState:
        if patient_id not in self._patients:
            self._patients[patient_id] = _PatientState()
        return self._patients[patient_id]

    # ── Public API ─────────────────────────────────────────────────────

    def update(self, patient_id: str, vitals: dict) -> None:
        """Update EMA and variance per parameter using exponential moving average.

        Parameters
        ----------
        patient_id : str
        vitals : dict
            Must contain numeric values for keys in ``_TRACKED_PARAMS``.
        """
        state = self._ensure_patient(patient_id)
        alpha = self._alpha

        for param in _TRACKED_PARAMS:
            value = vitals.get(param)
            if value is None:
                continue
            value = float(value)

            if param not in state.ema:
                # First reading: initialise
                state.ema[param] = value
                state.ema_var[param] = 0.0
                state.count[param] = 1
                state.consecutive_flags[param] = 0
            else:
                # Incremental EMA update
                prev_mean = state.ema[param]
                state.ema[param] = alpha * value + (1 - alpha) * prev_mean
                # EMA of variance (Welford-like with EMA)
                diff = value - prev_mean
                state.ema_var[param] = (1 - alpha) * (
                    state.ema_var[param] + alpha * diff * diff
                )
                state.count[param] += 1

    def get_assessment(self, patient_id: str, vitals: dict) -> PersonalizedResult:
        """Compute Z-scores and flag advisory alert if |Z| > 2.0 sustained for 3+ readings.

        Parameters
        ----------
        patient_id : str
        vitals : dict

        Returns
        -------
        PersonalizedResult
        """
        state = self._ensure_patient(patient_id)

        baseline: dict[str, float] = {}
        z_scores: dict[str, float] = {}
        alert_params: list[str] = []

        for param in _TRACKED_PARAMS:
            value = vitals.get(param)
            if value is None or param not in state.ema:
                continue
            value = float(value)

            mean = state.ema[param]
            std = math.sqrt(state.ema_var[param]) if state.ema_var[param] > 0 else 0.0

            baseline[param] = round(mean, 2)

            if std > 1e-6:
                z = (value - mean) / std
            else:
                z = 0.0
            z_scores[param] = round(z, 2)

            # Track consecutive high-|Z| readings
            if abs(z) > Z_SCORE_ALERT_THRESHOLD:
                state.consecutive_flags[param] = state.consecutive_flags.get(param, 0) + 1
            else:
                state.consecutive_flags[param] = 0

            if state.consecutive_flags.get(param, 0) >= Z_SCORE_SUSTAINED_READINGS:
                alert_params.append(param)

        is_alert = len(alert_params) > 0
        note = ""
        if is_alert:
            params_str = ", ".join(alert_params)
            note = (
                f"ADVISORY: {params_str} deviate significantly from patient baseline "
                f"for {Z_SCORE_SUSTAINED_READINGS}+ consecutive readings. "
                "This does NOT override NEWS2 — clinical judgement required."
            )

        return PersonalizedResult(
            baseline=baseline,
            z_scores=z_scores,
            is_advisory_alert=is_alert,
            alert_parameters=alert_params,
            advisory_note=note,
        )
