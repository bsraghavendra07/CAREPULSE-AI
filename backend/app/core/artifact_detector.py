"""
CAREPULSE 1.0 — Artifact Detection & Signal Quality Assessment Module.

Complies with Step 7 Specifications:
1. Missing readings — detects omitted, null, NaN or unreceived vital signs.
2. Flatlined signals — detects constant/frozen signals without biological variability.
3. Motion-related noise — detects sudden unrealistic spikes or isolated drops (e.g. 98 -> 97 -> 96 -> 70 -> 97 -> 98).
4. Invalid sensor values — detects physiologically impossible or out-of-range sensor readings.

For every detected artifact:
- Marks reading as unreliable (is_unreliable = True).
- Provides distinct artifact_type and human-readable explanation.
- Suppresses critical alerts downstream to prevent false alarms.
- Preserves original_reading for complete medical auditability and traceability.
"""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.config import SQI_THRESHOLDS


class ArtifactType(str, Enum):
    NONE = "NONE"
    MISSING_READING = "MISSING_READING"
    FLATLINE = "FLATLINE"
    MOTION_NOISE = "MOTION_NOISE"
    INVALID_VALUE = "INVALID_VALUE"


class SQIResult(BaseModel):
    """Signal Quality & Artifact Detection Assessment for incoming telemetry."""

    sqi: float = Field(ge=0.0, le=1.0, description="Signal quality 0.0 (unusable) to 1.0 (optimal)")
    status: str = Field(description="HIGH | MEDIUM | LOW")
    artifact_detected: bool = False
    motion_injected: bool = False
    note: Optional[str] = None

    # Step 7 Specific Fields
    is_unreliable: bool = False
    artifact_type: ArtifactType = ArtifactType.NONE
    affected_vital: Optional[str] = None
    unreliable_reason: Optional[str] = None
    original_reading: Dict[str, Any] = Field(default_factory=dict, description="Raw unedited sensor reading for traceability")
    suppress_critical_alert: bool = False
    traceable_history: List[float] = Field(default_factory=list, description="Recent parameter readings showing waveform context")


def _get_val(d: dict | None, *keys: str, default: Optional[float] = None) -> Optional[float]:
    """Helper to extract float whether value is float/int or {'value': float}."""
    if not d:
        return default
    for k in keys:
        if k in d:
            v = d[k]
            if v is None:
                return None
            if isinstance(v, dict):
                v = v.get("value")
            if v is None:
                return None
            try:
                f_val = float(v)
                import math
                if math.isnan(f_val):
                    return None
                return f_val
            except (ValueError, TypeError):
                continue
    return default


class ArtifactDetector:
    """Evaluates incoming telemetry for artifacts and sensor unreliability.

    Maintains per-patient history to detect flatlines, isolated spikes, and missing values.
    """

    def __init__(self) -> None:
        # patient_id -> deque of recent vitals dictionaries
        self._history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=60))
        # patient_id -> param -> list of recent float values
        self._param_history: Dict[str, Dict[str, deque]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=30))
        )
        # patient_id -> param -> identical count
        self._flatline_counters: Dict[str, Dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )
        # patient_id -> param -> last seen value
        self._last_values: Dict[str, Dict[str, Optional[float]]] = defaultdict(dict)
        # patient_id -> param -> last received timestamp tick
        self._last_seen_tick: Dict[str, Dict[str, int]] = defaultdict(dict)

    def evaluate(
        self,
        vitals: dict,
        prev_vitals: dict | None,
        motion_injected: bool = False,
        patient_id: str = "default",
        current_tick: int = 0,
    ) -> SQIResult:
        """Evaluate signal quality and artifact status for a vital-sign snapshot."""
        notes: list[str] = []
        worst_status = "HIGH"
        detected_artifact = ArtifactType.NONE
        affected_vital: Optional[str] = None
        is_unreliable = False
        suppress_critical = False

        # Capture raw copy for complete traceability
        original_copy = dict(vitals)

        # Extract primary vital sign values
        raw_hr = _get_val(vitals, "hr", "heart_rate")
        raw_spo2 = _get_val(vitals, "spo2", "oxygen_saturation")
        raw_rr = _get_val(vitals, "rr", "respiratory_rate")
        raw_sbp = _get_val(vitals, "sbp", "systolic_bp")
        raw_temp = _get_val(vitals, "temp", "body_temperature")

        vitals_dict = {
            "heart_rate": raw_hr,
            "oxygen_saturation": raw_spo2,
            "respiratory_rate": raw_rr,
            "systolic_bp": raw_sbp,
            "body_temperature": raw_temp,
        }

        # ── 1. MISSING READINGS CHECK ─────────────────────────────────────────
        # Check if mandatory vital signs are absent, null, or missing
        missing_vitals = []
        for v_name, v_val in vitals_dict.items():
            if v_val is None:
                missing_vitals.append(v_name)
            else:
                self._last_seen_tick[patient_id][v_name] = current_tick

        if missing_vitals:
            is_unreliable = True
            suppress_critical = True
            detected_artifact = ArtifactType.MISSING_READING
            affected_vital = missing_vitals[0]
            worst_status = "LOW"
            notes.append(f"Missing reading: {', '.join(missing_vitals)} omitted or null in stream")

        # ── 2. INVALID SENSOR VALUES CHECK ────────────────────────────────────
        # Medically reasonable physiological boundaries
        if not is_unreliable:
            if raw_hr is not None and (raw_hr < 25 or raw_hr > 260):
                is_unreliable = True
                suppress_critical = True
                detected_artifact = ArtifactType.INVALID_VALUE
                affected_vital = "heart_rate"
                worst_status = "LOW"
                notes.append(f"Invalid sensor value: HR={raw_hr:.1f} bpm outside physiological limits (25–260)")

            elif raw_spo2 is not None and (raw_spo2 < 40 or raw_spo2 > 100):
                is_unreliable = True
                suppress_critical = True
                detected_artifact = ArtifactType.INVALID_VALUE
                affected_vital = "oxygen_saturation"
                worst_status = "LOW"
                notes.append(f"Invalid sensor value: SpO₂={raw_spo2:.1f}% outside physiological range (40–100%)")

            elif raw_rr is not None and (raw_rr < 4 or raw_rr > 60):
                is_unreliable = True
                suppress_critical = True
                detected_artifact = ArtifactType.INVALID_VALUE
                affected_vital = "respiratory_rate"
                worst_status = "LOW"
                notes.append(f"Invalid sensor value: RR={raw_rr:.1f} /min outside physiological limits (4–60)")

            elif raw_sbp is not None and (raw_sbp < 40 or raw_sbp > 260):
                is_unreliable = True
                suppress_critical = True
                detected_artifact = ArtifactType.INVALID_VALUE
                affected_vital = "systolic_bp"
                worst_status = "LOW"
                notes.append(f"Invalid sensor value: SBP={raw_sbp:.1f} mmHg outside limits (40–260)")

            elif raw_temp is not None and (raw_temp < 30.0 or raw_temp > 45.0):
                is_unreliable = True
                suppress_critical = True
                detected_artifact = ArtifactType.INVALID_VALUE
                affected_vital = "body_temperature"
                worst_status = "LOW"
                notes.append(f"Invalid sensor value: Temp={raw_temp:.1f}°C outside limits (30.0–45.0°C)")

        # ── 3. FLATLINED SIGNALS CHECK ────────────────────────────────────────
        # Detect signals remaining identical or near-zero variance across consecutive readings
        # (Zero biological heart rate variability or frozen ADC buffer)
        FLATLINE_CONSECUTIVE_LIMIT = 15  # 15 seconds without any variability
        counters = self._flatline_counters[patient_id]
        last_vals = self._last_values[patient_id]

        for param in ("heart_rate", "oxygen_saturation", "respiratory_rate"):
            cur_val = vitals_dict.get(param)
            if cur_val is None:
                continue

            prev_val = last_vals.get(param)
            if prev_val is not None and abs(cur_val - prev_val) < 0.001:
                counters[param] = counters.get(param, 0) + 1
            else:
                counters[param] = 0
            last_vals[param] = cur_val

            if counters[param] >= FLATLINE_CONSECUTIVE_LIMIT:
                worst_status = "LOW"
                if not is_unreliable:
                    is_unreliable = True
                    suppress_critical = True
                    detected_artifact = ArtifactType.FLATLINE
                    affected_vital = param
                notes.append(
                    f"Flatlined signal detected: {param}={cur_val:.1f} frozen across {counters[param]} consecutive readings"
                )

        # ── 4. MOTION-RELATED NOISE & ISOLATED SPIKE/DROP CHECK ──────────────
        # Detect sudden isolated drops or spikes (e.g., SpO2: 98 -> 97 -> 96 -> 70 -> 97 -> 98)
        spo2_history = self._param_history[patient_id]["oxygen_saturation"]
        hr_history = self._param_history[patient_id]["heart_rate"]

        if raw_spo2 is not None:
            # Check for sudden isolated SpO2 drop
            if len(spo2_history) >= 2:
                prev_1 = spo2_history[-1]
                prev_2 = spo2_history[-2]
                delta_drop = prev_1 - raw_spo2

                # If SpO2 drops by >= 8% in a single second while previous baseline was normal (>= 92%)
                if delta_drop >= 8.0 and prev_1 >= 92.0 and prev_2 >= 92.0:
                    worst_status = "MEDIUM" if worst_status != "LOW" else "LOW"
                    is_unreliable = True
                    suppress_critical = True
                    detected_artifact = ArtifactType.MOTION_NOISE
                    affected_vital = "oxygen_saturation"
                    notes.append(
                        f"Isolated sudden SpO₂ drop ({prev_1:.0f}% → {raw_spo2:.0f}%, Δ={delta_drop:.0f}%). "
                        "Flagged as transient motion noise — urgent alert quarantined."
                    )

            # Check if this reading represents a rapid rebound from an isolated drop
            if len(spo2_history) >= 3:
                val_t_minus_1 = spo2_history[-1]
                val_t_minus_2 = spo2_history[-2]
                # Pattern: 96 -> 70 -> 97 (rebound from dip)
                if val_t_minus_2 >= 94.0 and val_t_minus_1 < 85.0 and raw_spo2 >= 94.0:
                    notes.append(
                        f"SpO₂ signal recovered to {raw_spo2:.0f}% confirming previous dip ({val_t_minus_1:.0f}%) was motion noise"
                    )

        if raw_hr is not None and not is_unreliable:
            # Check for sudden non-physiological HR jump (> 45 bpm in 1s)
            if len(hr_history) >= 1:
                prev_hr = hr_history[-1]
                delta_hr = abs(raw_hr - prev_hr)
                if delta_hr > 45.0:
                    worst_status = "MEDIUM" if worst_status != "LOW" else "LOW"
                    is_unreliable = True
                    suppress_critical = True
                    detected_artifact = ArtifactType.MOTION_NOISE
                    affected_vital = "heart_rate"
                    notes.append(f"Sudden HR jump ΔHR={delta_hr:.0f} bpm detected (motion/electrode artifact)")

        # Simulator motion injection flag
        if motion_injected:
            worst_status = "MEDIUM" if worst_status != "LOW" else "LOW"
            if detected_artifact == ArtifactType.NONE:
                detected_artifact = ArtifactType.MOTION_NOISE
                is_unreliable = True
                suppress_critical = True
                affected_vital = "motion_sensor"
            notes.append("Accelerometer motion artifact confirmed by wearable sensor")

        # Record into history buffers
        if raw_spo2 is not None:
            spo2_history.append(raw_spo2)
        if raw_hr is not None:
            hr_history.append(raw_hr)
        self._history[patient_id].append(original_copy)

        # Recent traceable history sequence (e.g. for SpO2 or affected vital)
        traceable_list = list(spo2_history)[-8:] if affected_vital == "oxygen_saturation" else (
            list(hr_history)[-8:] if affected_vital == "heart_rate" else []
        )

        sqi_map = {"HIGH": 1.0, "MEDIUM": 0.65, "LOW": 0.25}
        sqi = sqi_map[worst_status]

        return SQIResult(
            sqi=sqi,
            status=worst_status,
            artifact_detected=(detected_artifact != ArtifactType.NONE or worst_status != "HIGH"),
            motion_injected=motion_injected,
            note="; ".join(notes) if notes else "All telemetry signals within physiological bounds",
            is_unreliable=is_unreliable,
            artifact_type=detected_artifact,
            affected_vital=affected_vital,
            unreliable_reason="; ".join(notes) if notes else None,
            original_reading=original_copy,
            suppress_critical_alert=suppress_critical,
            traceable_history=traceable_list,
        )
