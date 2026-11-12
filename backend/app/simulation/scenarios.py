"""
MINEARENA 1.0 — Pre-defined clinical deterioration scenarios.

Each scenario ramps vital-sign modifications over ~60 ticks to simulate
realistic physiological changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.config import SCENARIO_RAMP_TICKS


@dataclass
class _ActiveScenario:
    name: str
    start_tick: int
    patient_baselines: dict = field(default_factory=dict)


# ─── Scenario target definitions ─────────────────────────────────────────────

_SCENARIO_TARGETS: dict[str, dict] = {
    "sepsis": {
        "temp": 39.5,
        "hr": 125,
        "sbp": 85,
        "rr": 28,
    },
    "copd_exacerbation": {
        "spo2": 84,
        "rr": 26,
    },
    "cardiac_decompensation": {
        "hr": 135,
        "sbp": 88,
        "rr": 24,
    },
    "motion_artifact": {
        # Special handling — injects erratic spikes and motion flag
    },
    "sensor_disconnect": {
        # Special handling — flatline then zero
    },
    "normal_recovery": {
        # Returns all vitals to patient baseline (handled specially)
    },
}


class ScenarioEngine:
    """Manages active clinical deterioration scenarios per patient."""

    def __init__(self) -> None:
        self._active: dict[str, _ActiveScenario] = {}

    def trigger(
        self,
        patient_id: str,
        scenario_name: str,
        patient_baselines: dict | None = None,
    ) -> None:
        """Start a scenario for a patient.

        Parameters
        ----------
        patient_id : str
        scenario_name : str
            One of the keys in ``_SCENARIO_TARGETS``.
        patient_baselines : dict | None
            Current baseline vitals (needed for recovery / ramp calculation).
        """
        if scenario_name not in _SCENARIO_TARGETS:
            raise ValueError(
                f"Unknown scenario '{scenario_name}'. "
                f"Available: {list(_SCENARIO_TARGETS.keys())}"
            )
        self._active[patient_id] = _ActiveScenario(
            name=scenario_name,
            start_tick=0,
            patient_baselines=patient_baselines or {},
        )

    def apply(
        self,
        patient_id: str,
        base_vitals: dict,
        tick: int,
    ) -> dict:
        """Apply active scenario modifications to base vitals."""
        if patient_id not in self._active:
            return dict(base_vitals)

        alias_map = {
            "hr": "heart_rate",
            "spo2": "oxygen_saturation",
            "rr": "respiratory_rate",
            "sbp": "systolic_bp",
            "temp": "body_temperature",
        }

        def _get_val(d: dict, *keys: str) -> tuple[str | None, float]:
            for k in keys:
                if k in d:
                    v = d[k]
                    if isinstance(v, dict):
                        return k, float(v.get("value", 0))
                    try:
                        return k, float(v)
                    except (ValueError, TypeError):
                        continue
            return None, 0.0

        def _set_val(d: dict, key: str, val: float) -> None:
            if key in d and isinstance(d[key], dict):
                d[key] = {"value": round(val, 1), "source": d[key].get("source", "SIMULATED")}
            else:
                d[key] = round(val, 1)

        scenario = self._active[patient_id]
        elapsed = tick - scenario.start_tick
        progress = min(elapsed / SCENARIO_RAMP_TICKS, 1.0)  # 0.0 → 1.0

        result = dict(base_vitals)
        name = scenario.name

        if name in ("sepsis", "copd_exacerbation", "cardiac_decompensation"):
            targets = _SCENARIO_TARGETS[name]
            for param, target in targets.items():
                alt = alias_map.get(param, param)
                k, baseline = _get_val(result, param, alt)
                if k is not None:
                    new_val = baseline + (target - baseline) * progress
                    _set_val(result, k, new_val)

        elif name == "motion_artifact":
            result["motion_injected"] = True
            import random

            if elapsed < SCENARIO_RAMP_TICKS:
                k_spo2, cur_spo2 = _get_val(result, "spo2", "oxygen_saturation")
                k_hr, cur_hr = _get_val(result, "hr", "heart_rate")
                if k_spo2:
                    _set_val(result, k_spo2, max(40, min(100, cur_spo2 + random.uniform(-15, 5))))
                if k_hr:
                    _set_val(result, k_hr, max(30, min(200, cur_hr + random.uniform(-30, 40))))
            else:
                result["motion_injected"] = False

        elif name == "sensor_disconnect":
            if progress < 0.5:
                pass
            else:
                factor = (progress - 0.5) / 0.5
                for param in ("hr", "spo2", "rr"):
                    alt = alias_map.get(param, param)
                    k, val = _get_val(result, param, alt)
                    if k is not None:
                        _set_val(result, k, val * (1 - factor))

        elif name == "normal_recovery":
            baselines = scenario.patient_baselines
            for param in ("hr", "spo2", "rr", "sbp", "temp"):
                alt = alias_map.get(param, param)
                k, current = _get_val(result, param, alt)
                if k is not None and param in baselines:
                    target = float(baselines[param])
                    new_val = current + (target - current) * progress
                    _set_val(result, k, new_val)

        return result

    def get_active(self, patient_id: str) -> str | None:
        """Return the name of the active scenario, or None."""
        scenario = self._active.get(patient_id)
        return scenario.name if scenario else None

    def clear(self, patient_id: str) -> None:
        """Clear (stop) the active scenario for a patient."""
        self._active.pop(patient_id, None)
