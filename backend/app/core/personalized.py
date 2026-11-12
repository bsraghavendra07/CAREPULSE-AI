"""
MINEARENA 1.0 — Personalized baseline anomaly detection engine.

This is an ADVISORY layer only — it **never** suppresses NEWS2 alerts.
Uses exponential moving average (EMA) to track patient-specific baselines
and flags deviations via Z-scores.
"""

from __future__ import annotations

import math
from collections import deque
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import (
    EMA_ALPHA,
    Z_SCORE_ALERT_THRESHOLD,
    Z_SCORE_SUSTAINED_READINGS,
    GRADUAL_DETERIORATION_WINDOW,
    GRADUAL_DETERIORATION_MIN_READINGS,
    GRADUAL_DETERIORATION_SPO2_DROP,
    GRADUAL_DETERIORATION_HR_RISE,
    GRADUAL_DETERIORATION_RR_RISE,
    GRADUAL_DETERIORATION_CONSECUTIVE_DECLINE,
)


# Parameters tracked for personalized baselines
_TRACKED_PARAMS: list[str] = ["hr", "spo2", "rr", "sbp", "temp"]


class BaselineMetric(BaseModel):
    """Detailed rolling baseline metrics for a single physiological parameter."""

    parameter: str
    baseline_mean: Optional[float] = None
    current_value: Optional[float] = None
    absolute_change: Optional[float] = None
    percentage_change: Optional[float] = None
    trend_direction: str = "Insufficient data"  # "↓ Declining", "↑ Increasing", "→ Stable", "Insufficient data"
    consecutive_steps: int = 0
    status: str = "Insufficient historical data"
    is_deteriorating: bool = False
    samples_count: int = 0


class GradualDeteriorationAlert(BaseModel):
    """Explanatory signal for gradual deterioration identified from rolling historical baseline."""

    detected: bool = False
    parameter: Optional[str] = None
    parameter_label: Optional[str] = None
    baseline_value: Optional[float] = None
    current_value: Optional[float] = None
    trend: Optional[str] = None
    alert_message: str = ""
    clinical_explanation: str = ""
    distinction_disclaimer: str = (
        "Personalization layer: this rolling baseline trend alert monitors gradual deterioration "
        "and is distinct from the NEWS2 score."
    )


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
    # Enhanced rolling baseline metrics per parameter
    trends: dict[str, BaselineMetric] = Field(default_factory=dict)
    # Explanatory signal distinguishing rolling deterioration from NEWS2
    gradual_deterioration: GradualDeteriorationAlert = Field(default_factory=GradualDeteriorationAlert)


class _PatientState:
    """Internal mutable state per patient."""

    __slots__ = ("ema", "ema_var", "count", "consecutive_flags", "windows")

    def __init__(self) -> None:
        # EMA of mean and variance per parameter
        self.ema: dict[str, float] = {}
        self.ema_var: dict[str, float] = {}
        self.count: dict[str, int] = {}
        # Count of consecutive readings where |Z| > threshold
        self.consecutive_flags: dict[str, int] = {}
        # Rolling historical window for trajectory analysis
        self.windows: dict[str, deque[float]] = {
            param: deque(maxlen=GRADUAL_DETERIORATION_WINDOW) for param in _TRACKED_PARAMS
        }


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
        """Update EMA, variance, and rolling history per parameter.

        Parameters
        ----------
        patient_id : str
        vitals : dict
            Must contain numeric values for keys in ``_TRACKED_PARAMS`` or alias names.
        """
        alias_map = {
            "hr": "heart_rate",
            "spo2": "oxygen_saturation",
            "rr": "respiratory_rate",
            "sbp": "systolic_bp",
            "temp": "body_temperature",
        }

        state = self._ensure_patient(patient_id)
        alpha = self._alpha

        for param in _TRACKED_PARAMS:
            raw = vitals.get(param)
            if raw is None and param in alias_map:
                raw = vitals.get(alias_map[param])
            if raw is None:
                continue

            if isinstance(raw, dict):
                raw = raw.get("value")
            try:
                value = float(raw)
            except (ValueError, TypeError):
                continue

            # Update rolling window
            state.windows[param].append(value)

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
        """Compute Z-scores, rolling baseline trends, and detect gradual deterioration.

        Parameters
        ----------
        patient_id : str
        vitals : dict

        Returns
        -------
        PersonalizedResult
        """
        alias_map = {
            "hr": "heart_rate",
            "spo2": "oxygen_saturation",
            "rr": "respiratory_rate",
            "sbp": "systolic_bp",
            "temp": "body_temperature",
        }
        param_labels = {
            "spo2": "SpO₂",
            "hr": "Heart Rate",
            "rr": "Respiratory Rate",
            "sbp": "Systolic BP",
            "temp": "Body Temperature",
        }

        state = self._ensure_patient(patient_id)

        baseline: dict[str, float] = {}
        z_scores: dict[str, float] = {}
        alert_params: list[str] = []
        trends: dict[str, BaselineMetric] = {}

        gradual_alert = GradualDeteriorationAlert()

        for param in _TRACKED_PARAMS:
            raw = vitals.get(param)
            if raw is None and param in alias_map:
                raw = vitals.get(alias_map[param])
            if isinstance(raw, dict):
                raw = raw.get("value")

            try:
                value = float(raw) if raw is not None else None
            except (ValueError, TypeError):
                value = None

            window = list(state.windows.get(param, []))

            # 1. Z-Score Calculation (using EMA baseline)
            if value is not None and param in state.ema:
                mean = state.ema[param]
                std = math.sqrt(state.ema_var[param]) if state.ema_var[param] > 0 else 0.0

                baseline[param] = round(mean, 2)
                z = round((value - mean) / std, 2) if std > 1e-6 else 0.0
                z_scores[param] = z

                # Track consecutive high-|Z| readings
                if abs(z) > Z_SCORE_ALERT_THRESHOLD:
                    state.consecutive_flags[param] = state.consecutive_flags.get(param, 0) + 1
                else:
                    state.consecutive_flags[param] = 0

                if state.consecutive_flags.get(param, 0) >= Z_SCORE_SUSTAINED_READINGS:
                    alert_params.append(param)

            # 2. Rolling Historical Baseline & Trend Analysis
            if len(window) < GRADUAL_DETERIORATION_MIN_READINGS:
                trends[param] = BaselineMetric(
                    parameter=param,
                    current_value=value,
                    trend_direction="Insufficient data",
                    status="Insufficient historical data",
                    samples_count=len(window),
                )
            else:
                # Rolling baseline mean over historical window
                w_mean = round(sum(window) / len(window), 2)
                cur_v = round(window[-1], 2)
                abs_change = round(cur_v - w_mean, 2)
                pct_change = round((abs_change / w_mean * 100.0), 2) if w_mean != 0 else 0.0

                # Count consecutive declining / increasing steps
                consec_declines = 0
                for i in range(len(window) - 1, 0, -1):
                    if window[i] < window[i - 1]:
                        consec_declines += 1
                    else:
                        break

                consec_rises = 0
                for i in range(len(window) - 1, 0, -1):
                    if window[i] > window[i - 1]:
                        consec_rises += 1
                    else:
                        break

                # Trend direction determination
                if abs_change <= -0.8 or consec_declines >= 2:
                    trend_dir = "↓ Declining"
                    consec_steps = consec_declines
                elif abs_change >= 0.8 or consec_rises >= 2:
                    trend_dir = "↑ Increasing"
                    consec_steps = consec_rises
                else:
                    trend_dir = "→ Stable"
                    consec_steps = 0

                # Detect meaningful gradual deterioration
                is_deteriorating = False
                label = param_labels.get(param, param.upper())

                if param == "spo2":
                    # Meaningful SpO2 deterioration: drop >= threshold or 4+ consecutive declines
                    if (w_mean - cur_v >= GRADUAL_DETERIORATION_SPO2_DROP) or (
                        consec_declines >= GRADUAL_DETERIORATION_CONSECUTIVE_DECLINE and abs_change <= -2.0
                    ):
                        is_deteriorating = True
                        if not gradual_alert.detected:
                            gradual_alert = GradualDeteriorationAlert(
                                detected=True,
                                parameter=param,
                                parameter_label=label,
                                baseline_value=w_mean,
                                current_value=cur_v,
                                trend="Downward",
                                alert_message=f"Gradual deterioration detected: {label} baseline: {w_mean:.1f}%, Current {label}: {cur_v:.1f}%, Trend: Downward",
                                clinical_explanation=(
                                    f"Patient's recent {label} rolling baseline is {w_mean:.1f}%, "
                                    f"now declining continuously to {cur_v:.1f}% ({abs_change:+.1f}% shift). "
                                    f"Identified {consec_declines} consecutive downward readings."
                                ),
                            )
                elif param == "hr":
                    # Meaningful HR rising deterioration
                    if (cur_v - w_mean >= GRADUAL_DETERIORATION_HR_RISE) or (
                        consec_rises >= GRADUAL_DETERIORATION_CONSECUTIVE_DECLINE and abs_change >= 10.0
                    ):
                        is_deteriorating = True
                        if not gradual_alert.detected:
                            gradual_alert = GradualDeteriorationAlert(
                                detected=True,
                                parameter=param,
                                parameter_label=label,
                                baseline_value=w_mean,
                                current_value=cur_v,
                                trend="Upward",
                                alert_message=f"Gradual deterioration detected: {label} baseline: {w_mean:.0f} bpm, Current {label}: {cur_v:.0f} bpm, Trend: Upward",
                                clinical_explanation=(
                                    f"Patient's heart rate rolling baseline is {w_mean:.0f} bpm, "
                                    f"gradually elevating to {cur_v:.0f} bpm ({abs_change:+.0f} bpm shift)."
                                ),
                            )
                elif param == "rr":
                    # Meaningful RR rising deterioration
                    if (cur_v - w_mean >= GRADUAL_DETERIORATION_RR_RISE) or (
                        consec_rises >= GRADUAL_DETERIORATION_CONSECUTIVE_DECLINE and abs_change >= 3.0
                    ):
                        is_deteriorating = True
                        if not gradual_alert.detected:
                            gradual_alert = GradualDeteriorationAlert(
                                detected=True,
                                parameter=param,
                                parameter_label=label,
                                baseline_value=w_mean,
                                current_value=cur_v,
                                trend="Upward",
                                alert_message=f"Gradual deterioration detected: {label} baseline: {w_mean:.0f} /min, Current {label}: {cur_v:.0f} /min, Trend: Upward",
                                clinical_explanation=(
                                    f"Patient's respiratory rate baseline is {w_mean:.0f} /min, "
                                    f"creeping upward to {cur_v:.0f} /min ({abs_change:+.0f} /min shift)."
                                ),
                            )

                trends[param] = BaselineMetric(
                    parameter=param,
                    baseline_mean=w_mean,
                    current_value=cur_v,
                    absolute_change=abs_change,
                    percentage_change=pct_change,
                    trend_direction=trend_dir,
                    consecutive_steps=consec_steps,
                    status="Gradual Deterioration" if is_deteriorating else "Normal",
                    is_deteriorating=is_deteriorating,
                    samples_count=len(window),
                )

        is_alert = len(alert_params) > 0 or gradual_alert.detected
        note = ""
        if gradual_alert.detected:
            note = f"PERSONALIZED TREND ALERT: {gradual_alert.alert_message}"
        elif is_alert:
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
            trends=trends,
            gradual_deterioration=gradual_alert,
        )
