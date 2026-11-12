"""
CarePulse — Vital-Sign Reliability and Sensor Artifact Detection Layer.

Responsibilities:
1. Detect physiologically implausible vital-sign readings.
2. Identify flatlined and near-flatline signals.
3. Detect sensor-related artifacts (isolated outliers, rapid oscillations, motion noise).
4. Detect probe removal scenarios (SpO2=0, HR flatline, sensor disconnect).
5. Suppress false clinical alerts caused by unreliable sensor readings (e.g. probe removal).
6. Distinguish sensor-related issues from genuine multi-vital patient deterioration.
7. Preserve all raw observations for clinical auditability.
"""

from __future__ import annotations

import math
from collections import defaultdict, deque
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.config import SQI_THRESHOLDS, VITAL_VALIDATION_RANGES


# ─── Signal Quality States ───────────────────────────────────────────────────

class SignalState(str, Enum):
    VALID = "VALID"
    SUSPECT = "SUSPECT"
    ARTIFACT = "ARTIFACT"
    PROBE_REMOVED = "PROBE_REMOVED"
    FLATLINE = "FLATLINE"
    MISSING = "MISSING"


class SignalReliability(BaseModel):
    """Reliability assessment for an individual physiological channel."""

    parameter: str
    status: SignalState = SignalState.VALID
    reliable: bool = True
    current_value: Optional[float] = None
    reason: Optional[str] = None
    implausible: bool = False
    flatline: bool = False
    near_flatline: bool = False
    artifact_type: Optional[str] = None  # ISOLATED_OUTLIER | RAPID_OSCILLATION | MOTION_NOISE | PROBE_DETACHED

    @property
    def state(self) -> SignalState:
        return self.status

    @property
    def is_reliable(self) -> bool:
        return self.reliable



class SQIResult(BaseModel):
    """Aggregate Signal Quality Index and clinical alert qualification."""

    sqi: float = Field(ge=0.0, le=1.0, description="Signal quality 0 (worst) – 1 (best)")
    status: str = Field(description="HIGH | MEDIUM | LOW")
    artifact_detected: bool = False
    motion_injected: bool = False
    probe_removed: bool = False
    clinical_alert_suppressed: bool = False
    suppression_reason: Optional[str] = None
    sensor_alert: Optional[str] = None
    is_genuine_deterioration: bool = False
    genuine_deterioration_note: Optional[str] = None
    signals: Dict[str, SignalReliability] = Field(default_factory=dict)
    note: Optional[str] = None
    audit_log: List[Dict[str, Any]] = Field(default_factory=list)


def _get_val(d: dict | None, *keys: str, default: Optional[float] = None) -> Optional[float]:
    """Helper to extract float whether value is float/int or {'value': float}."""
    if not d:
        return default
    for k in keys:
        if k in d:
            v = d[k]
            if isinstance(v, dict):
                v = v.get("value")
            if v is not None:
                try:
                    return float(v)
                except (ValueError, TypeError):
                    continue
    return default


class ArtifactDetector:
    """Evaluates vital-sign reliability, detects sensor artifacts, and qualifies alerts."""

    def __init__(self) -> None:
        # patient_id -> deque of recent vitals snapshots
        self._history: dict[str, deque[dict[str, Any]]] = defaultdict(lambda: deque(maxlen=60))
        # patient_id -> parameter -> consecutive identical count
        self._flatline_counters: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._last_values: dict[str, dict[str, float]] = defaultdict(dict)

    def reset_patient(self, patient_id: str) -> None:
        """Reset historical buffers for a patient."""
        self._history[patient_id].clear()
        self._flatline_counters[patient_id].clear()
        self._last_values[patient_id].clear()

    def evaluate(
        self,
        vitals: dict,
        prev_vitals: dict | None,
        motion_injected: bool = False,
        patient_id: str = "default",
    ) -> SQIResult:
        """Run complete multi-channel reliability assessment on current vitals."""
        notes: list[str] = []
        audit_log: list[dict[str, Any]] = []

        # Extract numerical parameters
        hr = _get_val(vitals, "hr", "heart_rate")
        spo2 = _get_val(vitals, "spo2", "oxygen_saturation")
        rr = _get_val(vitals, "rr", "respiratory_rate")
        sbp = _get_val(vitals, "sbp", "systolic_bp")
        temp = _get_val(vitals, "temp", "body_temperature")

        signals: dict[str, SignalReliability] = {
            "spo2": SignalReliability(parameter="spo2", current_value=spo2),
            "heart_rate": SignalReliability(parameter="heart_rate", current_value=hr),
            "respiratory_rate": SignalReliability(parameter="respiratory_rate", current_value=rr),
            "systolic_bp": SignalReliability(parameter="systolic_bp", current_value=sbp),
            "body_temperature": SignalReliability(parameter="body_temperature", current_value=temp),
        }

        # ── 1. Check Missing Observations ────────────────────────────
        for param, sig in signals.items():
            if sig.current_value is None:
                sig.status = SignalState.MISSING
                sig.reliable = False
                sig.reason = "Observation unavailable / sensor disconnected"

        has_dropout = any(
            isinstance(v, dict) and v.get("status") == "NO_READING"
            for v in vitals.values()
        )

        # ── 2. Probe Removal Detection ───────────────────────────────
        is_probe_removed = bool(
            vitals.get("probe_removed")
            or vitals.get("_probe_removed")
            or (spo2 == 0.0 and (hr == 0.0 or hr is None or spo2 == 0.0))
        )

        clinical_alert_suppressed = False
        suppression_reason = None
        sensor_alert = None

        if is_probe_removed:
            signals["spo2"].status = SignalState.PROBE_REMOVED
            signals["spo2"].reliable = False
            signals["spo2"].artifact_type = "PROBE_DETACHED"
            signals["spo2"].reason = "Pulse oximeter probe detached (SpO₂=0%)"

            if hr == 0.0:
                signals["heart_rate"].status = SignalState.PROBE_REMOVED
                signals["heart_rate"].reliable = False
                signals["heart_rate"].reason = "Photoplethysmography flatline due to probe removal"

            clinical_alert_suppressed = True
            suppression_reason = (
                "SpO₂ signal is zero/absent due to probe removal. "
                "Clinical hypoxia deterioration alert suppressed because sensor is detached."
            )
            sensor_alert = (
                "⚠ SENSOR QUALITY ALERT: SpO₂ signal appears unavailable. "
                "Reason: Probe removal detected. Clinical hypoxia alert suppressed until reliable readings resume."
            )
            notes.append("PROBE REMOVED: Pulse oximeter detached")
            audit_log.append({
                "signal": "spo2",
                "value": spo2,
                "status": "PROBE_REMOVED",
                "action": "Suppressed false hypoxia alarm",
            })

        # ── 3. Implausible Vital Detection (Configurable Bounds) ─────
        for param_key, val, bounds_key in [
            ("spo2", spo2, "spo2"),
            ("heart_rate", hr, "heart_rate"),
            ("respiratory_rate", rr, "respiratory_rate"),
            ("systolic_bp", sbp, "systolic_bp"),
            ("body_temperature", temp, "body_temperature"),
        ]:
            if val is not None and not (is_probe_removed and param_key == "spo2" and val == 0.0):
                bounds = VITAL_VALIDATION_RANGES.get(bounds_key, {})
                hard_min = bounds.get("min", -999.0)
                hard_max = bounds.get("max", 999.0)

                if val < hard_min or val > hard_max:
                    sig = signals[param_key]
                    sig.status = SignalState.ARTIFACT
                    sig.reliable = False
                    sig.implausible = True
                    sig.reason = f"Physiologically impossible reading ({val} outside [{hard_min}, {hard_max}])"
                    notes.append(f"Implausible {param_key}={val}")
                    clinical_alert_suppressed = True
                    suppression_reason = (
                        f"Clinical deterioration alerts suppressed because {param_key} reading ({val}) "
                        f"is physiologically implausible (outside physiological limits [{hard_min}, {hard_max}])."
                    )
                    sensor_alert = (
                        f"⚠ SENSOR QUALITY ALERT: Physiologically impossible reading on {param_key} ({val}). "
                        "Clinical deterioration alert suppressed until valid telemetry resumes."
                    )
                    audit_log.append({
                        "signal": param_key,
                        "value": val,
                        "status": "ARTIFACT_IMPLAUSIBLE",
                        "action": "Flagged impossible physiological measurement",
                    })

        # ── 4. Flatline & Near-Flatline Detection ─────────────────────
        counters = self._flatline_counters[patient_id]
        last_vals = self._last_values[patient_id]
        history = self._history[patient_id]

        for p_name, val in [("heart_rate", hr), ("spo2", spo2), ("respiratory_rate", rr)]:
            if val is not None and not (is_probe_removed and val == 0.0):
                last_v = last_vals.get(p_name)
                if last_v is not None and math.isclose(val, last_v, abs_tol=1e-5):
                    counters[p_name] += 1
                else:
                    counters[p_name] = 0
                last_vals[p_name] = val

                # Check exact flatline
                if counters[p_name] >= SQI_THRESHOLDS["FLATLINE_DURATION"]:
                    sig = signals[p_name]
                    sig.status = SignalState.FLATLINE
                    sig.reliable = False
                    sig.flatline = True
                    sig.artifact_type = "FLATLINE"
                    sig.reason = f"Flatline: signal unchanged ({val}) for {counters[p_name]} consecutive ticks"
                    notes.append(f"Flatline detected on {p_name}={val}")
                    clinical_alert_suppressed = True
                    suppression_reason = (
                        f"Flatline detected on {p_name}. Sensor appears frozen or uncoupled. "
                        "Clinical deterioration alerts suppressed."
                    )
                    sensor_alert = (
                        f"⚠ SENSOR QUALITY ALERT: Flatline detected on {p_name}. "
                        "Check sensor connection. Clinical alert suppressed."
                    )

                # Check near-flatline (suspiciously constant signal over sliding window)
                if len(history) >= (SQI_THRESHOLDS["NEAR_FLATLINE_WINDOW"] - 1):
                    alias_key = "hr" if p_name == "heart_rate" else ("rr" if p_name == "respiratory_rate" else p_name)
                    recent_slice = [
                        _get_val(h, p_name, alias_key, default=None)
                        for h in list(history)[-(SQI_THRESHOLDS["NEAR_FLATLINE_WINDOW"] - 1):]
                    ]
                    clean_slice = [x for x in recent_slice if x is not None] + ([val] if val is not None else [])
                    if len(clean_slice) >= SQI_THRESHOLDS["NEAR_FLATLINE_WINDOW"]:
                        mean_val = sum(clean_slice) / len(clean_slice)
                        variance = sum((x - mean_val) ** 2 for x in clean_slice) / len(clean_slice)
                        if variance < SQI_THRESHOLDS["NEAR_FLATLINE_VAR"]:
                            sig = signals[p_name]
                            sig.near_flatline = True
                            sig.artifact_type = "NEAR_FLATLINE"
                            if sig.status == SignalState.VALID:
                                sig.status = SignalState.SUSPECT
                                sig.reason = f"Near-flatline: suspiciously constant signal (var={variance:.4f})"
                                notes.append(f"Near-flatline on {p_name}")

        # Fallback to history[-1] if prev_vitals was not explicitly provided
        if prev_vitals is None and history:
            prev_vitals = history[-1]

        # ── 5. Sensor Artifact: Isolated Sudden Jump / Outlier ───────
        if prev_vitals is not None and not is_probe_removed:
            prev_spo2 = _get_val(prev_vitals, "spo2", "oxygen_saturation")
            if spo2 is not None and prev_spo2 is not None:
                delta_spo2 = abs(spo2 - prev_spo2)
                # Impossible physiological jump in 1 second without clinical explanation
                if delta_spo2 >= SQI_THRESHOLDS["DELTA_SPO2_JUMP"]:
                    sig = signals["spo2"]
                    sig.status = SignalState.ARTIFACT
                    sig.reliable = False
                    sig.artifact_type = "ISOLATED_OUTLIER"
                    sig.reason = f"Sudden impossible SpO₂ jump (Δ={delta_spo2:.1f}% in 1s)"
                    notes.append(f"SpO2 isolated outlier artifact (jump from {prev_spo2} to {spo2})")
                    clinical_alert_suppressed = True
                    suppression_reason = (
                        f"Isolated SpO₂ jump ({prev_spo2}% → {spo2}%) is consistent with sensor optical artifact. "
                        "Immediate clinical alert suppressed pending signal stability."
                    )
                    sensor_alert = (
                        f"⚠ SENSOR QUALITY ALERT: SpO₂ sudden jump artifact detected ({prev_spo2}% → {spo2}%). "
                        "Clinical alarm suppressed pending signal confirmation."
                    )

            prev_hr = _get_val(prev_vitals, "hr", "heart_rate")
            if hr is not None and prev_hr is not None:
                delta_hr = abs(hr - prev_hr)
                if delta_hr >= SQI_THRESHOLDS["DELTA_HR_SPIKE"]:
                    sig = signals["heart_rate"]
                    sig.status = SignalState.ARTIFACT
                    sig.reliable = False
                    sig.artifact_type = "ISOLATED_OUTLIER"
                    sig.reason = f"Sudden impossible Heart Rate jump (Δ={delta_hr:.1f} bpm in 1s)"
                    notes.append(f"HR isolated spike artifact (jump from {prev_hr} to {hr})")
                    clinical_alert_suppressed = True
                    suppression_reason = f"Isolated HR spike ({prev_hr} → {hr} bpm) flagged as motion/optical artifact."
                    sensor_alert = f"⚠ SENSOR QUALITY ALERT: HR sudden spike artifact ({prev_hr} → {hr} bpm). Alert suppressed."
                    sig.artifact_type = "ISOLATED_OUTLIER"
                    sig.reason = f"Non-physiological HR jump (Δ={delta_hr:.0f} bpm in 1s)"
                    notes.append(f"Heart rate spike artifact ({prev_hr} → {hr})")

        # ── 6. Sensor Artifact: Rapid Oscillation (Noise) ────────────
        if len(history) >= 4 and not is_probe_removed:
            recent_spo2 = [
                _get_val(h, "spo2", "oxygen_saturation") for h in list(history)[-5:]
            ]
            valid_spo2 = [x for x in recent_spo2 if x is not None]
            if len(valid_spo2) >= 4:
                # Count direction changes
                diffs = [valid_spo2[i] - valid_spo2[i - 1] for i in range(1, len(valid_spo2))]
                direction_changes = sum(
                    1 for i in range(1, len(diffs))
                    if (diffs[i] * diffs[i - 1] < -15.0)  # sharp reversal > 4%
                )
                if direction_changes >= SQI_THRESHOLDS["OSCILLATION_COUNT"] - 1:
                    signals["spo2"].status = SignalState.ARTIFACT
                    signals["spo2"].reliable = False
                    signals["spo2"].artifact_type = "RAPID_OSCILLATION"
                    signals["spo2"].reason = "Rapid non-physiological signal oscillation (motion / contact noise)"
                    notes.append("Rapid oscillation artifact on SpO₂")

        # ── 7. Motion Noise Simulated ────────────────────────────────
        if motion_injected:
            signals["spo2"].status = SignalState.ARTIFACT
            signals["spo2"].artifact_type = "MOTION_NOISE"
            signals["spo2"].reliable = False
            signals["spo2"].reason = "Patient movement / motion artifact injected by simulator"
            notes.append("Motion artifact active on PPG sensor")

        # ── 8. Multi-Vital Cross-Check: Distinguish True Deterioration 
        is_genuine_deterioration = False
        genuine_note = None

        if len(history) >= 3 and not is_probe_removed:
            first_h = history[0]
            base_spo2 = _get_val(first_h, "spo2", "oxygen_saturation")
            base_hr = _get_val(first_h, "hr", "heart_rate")
            base_rr = _get_val(first_h, "rr", "respiratory_rate")

            if (
                spo2 is not None and base_spo2 is not None
                and hr is not None and base_hr is not None
                and rr is not None and base_rr is not None
            ):
                spo2_declined = (base_spo2 - spo2) >= 3.0
                hr_elevated = (hr - base_hr) >= 6.0
                rr_elevated = (rr - base_rr) >= 3.0

                # If SpO2 drops concomitantly with rising HR and/or RR:
                if spo2_declined and (hr_elevated or rr_elevated):
                    is_genuine_deterioration = True
                    genuine_note = (
                        f"Multi-vital physiological cross-check confirms genuine patient deterioration (Multi-vital concordance verified): "
                        f"SpO₂ dropped from {base_spo2:.0f}% to {spo2:.0f}%, "
                        f"HR compensated from {base_hr:.0f} to {hr:.0f} bpm, "
                        f"RR elevated from {base_rr:.0f} to {rr:.0f} /min. "
                        "Signals are physiologically consistent and validated."
                    )
                    # Restore reliability for physiological readings!
                    for p_name in ["spo2", "heart_rate", "respiratory_rate"]:
                        if signals[p_name].status in (SignalState.ARTIFACT, SignalState.SUSPECT):
                            if not signals[p_name].implausible:
                                signals[p_name].status = SignalState.VALID
                                signals[p_name].reliable = True
                                signals[p_name].reason = "Validated by multi-vital physiological concordance"
                    clinical_alert_suppressed = False
                    suppression_reason = None
                    sensor_alert = None

        # ── 9. Overall SQI and Status Computation ────────────────────
        # Count unreliable signals only among those actually measured/provided
        measured_signals = [
            s for s in [
                signals["spo2"],
                signals["heart_rate"],
                signals["respiratory_rate"],
                signals["systolic_bp"],
                signals["body_temperature"],
            ]
            if s.current_value is not None
        ]
        unreliable_count = sum(1 for s in measured_signals if not s.reliable)
        has_artifacts = any(s.status == SignalState.ARTIFACT for s in measured_signals) or has_dropout

        if is_probe_removed or unreliable_count >= 2:
            overall_status = "LOW"
            sqi_score = 0.2
        elif has_artifacts or motion_injected or unreliable_count == 1:
            overall_status = "MEDIUM"
            sqi_score = 0.6
        else:
            overall_status = "HIGH"
            sqi_score = 1.0

        # Provide short alias references for convenience
        signals["hr"] = signals["heart_rate"]
        signals["rr"] = signals["respiratory_rate"]
        signals["sbp"] = signals["systolic_bp"]
        signals["temp"] = signals["body_temperature"]

        # Save to patient history
        self._history[patient_id].append(dict(vitals))

        return SQIResult(
            sqi=sqi_score,
            status=overall_status,
            artifact_detected=overall_status != "HIGH",
            motion_injected=motion_injected,
            probe_removed=is_probe_removed,
            clinical_alert_suppressed=clinical_alert_suppressed,
            suppression_reason=suppression_reason,
            sensor_alert=sensor_alert,
            is_genuine_deterioration=is_genuine_deterioration,
            genuine_deterioration_note=genuine_note,
            signals=signals,
            note="; ".join(notes) if notes else "All biological telemetry channels nominal and reliable.",
            audit_log=audit_log,
        )


# ─── Global Singleton & Functional Helpers ────────────────────────────────────

artifact_detector = ArtifactDetector()


def evaluate_signal_reliability(
    patient_id: str = "default",
    spo2: Optional[float] = None,
    hr: Optional[float] = None,
    rr: Optional[float] = None,
    sbp: Optional[float] = None,
    temp: Optional[float] = None,
    probe_removed: bool = False,
    motion_injected: bool = False,
    prev_vitals: Optional[dict] = None,
) -> SQIResult:
    """Convenience helper to evaluate signal reliability for given vital signs."""
    vitals = {
        "spo2": spo2,
        "hr": hr,
        "rr": rr,
        "sbp": sbp,
        "temp": temp,
        "probe_removed": probe_removed,
    }
    return artifact_detector.evaluate(
        vitals=vitals,
        prev_vitals=prev_vitals,
        motion_injected=motion_injected,
        patient_id=patient_id,
    )


def detect_artifacts(
    spo2: Optional[float] = None,
    hr: Optional[float] = None,
    rr: Optional[float] = None,
    motion: bool = False,
    sbp: Optional[float] = None,
    temp: Optional[float] = None,
    prev_vitals: Optional[dict] = None,
    patient_id: str = "default",
) -> tuple[float, bool, list[str]]:
    """Backward-compatible tuple return (sqi, is_artifact, notes)."""
    res = evaluate_signal_reliability(
        patient_id=patient_id,
        spo2=spo2,
        hr=hr,
        rr=rr,
        sbp=sbp,
        temp=temp,
        motion_injected=motion,
        prev_vitals=prev_vitals,
    )
    notes = [res.note] if res.note else []
    return res.sqi, res.artifact_detected, notes

