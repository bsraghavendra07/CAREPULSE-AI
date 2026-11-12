"""
MINEARENA 1.0 — Conservative Signal Quality Index (SQI) / Artifact Detector.

Safety rules
------------
- NEVER auto-reject declining SpO2 or rising HR (could be real deterioration).
- Only flag physiologically IMPOSSIBLE readings.
- SQI flags are advisory only — they never suppress NEWS2.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from pydantic import BaseModel, Field

from app.config import SQI_THRESHOLDS


class SQIResult(BaseModel):
    """Signal Quality Index assessment for a single reading."""

    sqi: float = Field(ge=0.0, le=1.0, description="Signal quality 0 (worst) – 1 (best)")
    status: str = Field(description="HIGH | MEDIUM | LOW")
    artifact_detected: bool = False
    motion_injected: bool = False
    note: Optional[str] = None


def _get_val(d: dict | None, *keys: str, default: float = 0.0) -> float:
    """Helper to extract float whether value is float/int or {'value': float}."""
    if not d:
        return default
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


class ArtifactDetector:
    """Evaluates signal quality conservatively.

    Maintains per-patient history to detect flatline / spike patterns.
    """

    def __init__(self) -> None:
        # patient_id → list of recent (hr, spo2, temp, timestamp_tick) tuples
        self._history: dict[str, list[dict]] = defaultdict(list)
        self._flatline_counters: dict[str, dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )

    def evaluate(
        self,
        vitals: dict,
        prev_vitals: dict | None,
        motion_injected: bool,
        patient_id: str = "default",
    ) -> SQIResult:
        """Evaluate signal quality for the given vital-sign snapshot."""
        notes: list[str] = []
        worst_status = "HIGH"  # start optimistic

        hr   = _get_val(vitals, "hr", "heart_rate", default=70.0)
        spo2 = _get_val(vitals, "spo2", "oxygen_saturation", default=98.0)
        temp = _get_val(vitals, "temp", "body_temperature", default=37.0)

        # ── Rule 0: Probe Removal & Sensor Dropouts ──────────────────
        if vitals.get("probe_removed") or vitals.get("_probe_removed") or (hr == 0.0 and spo2 == 0.0):
            worst_status = "LOW"
            notes.append("PROBE REMOVED: Pulse oximeter detached. SpO2=0%, HR flatlined (Sensor Disconnected).")

        has_dropout = any(
            isinstance(v, dict) and v.get("status") == "NO_READING"
            for v in vitals.values()
        )
        if has_dropout:
            if worst_status != "LOW":
                worst_status = "LOW"
            notes.append("Sensor dropout: Temporary loss of telemetry readings.")

        # ── Rule 1: Physiological impossibility ──────────────────────
        if hr < SQI_THRESHOLDS["HR_MIN"] or hr > SQI_THRESHOLDS["HR_MAX"]:
            worst_status = "LOW"
            if not (hr == 0.0 and spo2 == 0.0):
                notes.append(f"Physiologically impossible HR={hr}")

        if spo2 < SQI_THRESHOLDS["SPO2_MIN"]:
            worst_status = "LOW"
            if not (hr == 0.0 and spo2 == 0.0):
                notes.append(f"Physiologically impossible SpO2={spo2}")

        if temp < SQI_THRESHOLDS["TEMP_MIN"] or temp > SQI_THRESHOLDS["TEMP_MAX"]:
            worst_status = "LOW"
            notes.append(f"Physiologically impossible Temp={temp}")

        # ── Rule 2: Instantaneous non-physiological HR spike ─────────
        if prev_vitals is not None:
            prev_hr = _get_val(prev_vitals, "hr", "heart_rate", default=hr)
            delta_hr = abs(hr - prev_hr)
            if delta_hr > SQI_THRESHOLDS["DELTA_HR_SPIKE"]:
                # Check if within spike-return window using history
                history = self._history[patient_id]
                if len(history) >= 2:
                    window = SQI_THRESHOLDS["SPIKE_RETURN_WINDOW"]
                    look_back = history[-min(window, len(history)):]
                    returned = any(
                        abs(_get_val(h, "hr", "heart_rate") - hr) < 10
                        for h in look_back
                    )
                    if not returned:
                        pass
                    else:
                        if worst_status == "HIGH":
                            worst_status = "MEDIUM"
                        notes.append(
                            f"Non-physiological HR spike ΔHR={delta_hr:.0f} "
                            "with return within window"
                        )
                else:
                    if worst_status == "HIGH":
                        worst_status = "MEDIUM"
                    notes.append(
                        f"Possible non-physiological HR spike ΔHR={delta_hr:.0f}"
                    )

        # ── Rule 3: Flatline / frozen ────────────────────────────────
        counters = self._flatline_counters[patient_id]
        for param, aliases in [("hr", ("hr", "heart_rate")), ("spo2", ("spo2", "oxygen_saturation")), ("rr", ("rr", "respiratory_rate"))]:
            val = _get_val(vitals, *aliases, default=-999.0)
            if val == -999.0:
                continue
            prev_val = counters.get(f"{param}_val")
            if prev_val is not None and val == float(prev_val):
                counters[param] = counters.get(param, 0) + 1
            else:
                counters[param] = 0
            counters[f"{param}_val"] = val

            if counters[param] > SQI_THRESHOLDS["FLATLINE_DURATION"]:
                worst_status = "LOW"
                notes.append(
                    f"Flatline detected: {param}={val} unchanged for "
                    f">{SQI_THRESHOLDS['FLATLINE_DURATION']}s"
                )

        # ── Rule 4: Motion injection ─────────────────────────────────
        if motion_injected:
            if worst_status == "HIGH":
                worst_status = "MEDIUM"
            notes.append("Motion artifact injected by simulator")

        # ── Compute numeric SQI ──────────────────────────────────────
        sqi_map = {"HIGH": 1.0, "MEDIUM": 0.6, "LOW": 0.2}
        sqi = sqi_map[worst_status]

        # ── Update history ───────────────────────────────────────────
        self._history[patient_id].append(dict(vitals))
        # Keep history bounded
        if len(self._history[patient_id]) > 120:
            self._history[patient_id] = self._history[patient_id][-60:]

        return SQIResult(
            sqi=sqi,
            status=worst_status,
            artifact_detected=worst_status != "HIGH",
            motion_injected=motion_injected,
            note="; ".join(notes) if notes else None,
        )
