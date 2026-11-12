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


@dataclass
class _CustomSimulationEvent:
    event_type: str  # "drift", "spike", "dropout", "motion_noise", "probe_removal"
    start_tick: int
    duration_ticks: int
    params: dict = field(default_factory=dict)
    is_active: bool = True


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
    """Manages active clinical deterioration scenarios and scripted simulation events per patient."""

    def __init__(self) -> None:
        self._active: dict[str, _ActiveScenario] = {}
        self._custom_events: dict[str, _CustomSimulationEvent] = {}

    def trigger(
        self,
        patient_id: str,
        scenario_name: str,
        patient_baselines: dict | None = None,
    ) -> None:
        """Start a predefined scenario for a patient."""
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

    def trigger_custom_event(
        self,
        patient_id: str,
        event_type: str,
        duration_ticks: int,
        params: dict,
        start_tick: int,
    ) -> None:
        """Start a scripted PS 3.2 simulation event for a patient."""
        self._custom_events[patient_id] = _CustomSimulationEvent(
            event_type=event_type,
            start_tick=start_tick,
            duration_ticks=duration_ticks,
            params=dict(params),
            is_active=True,
        )

    def clear_custom_event(self, patient_id: str) -> None:
        """Stop/clear any active custom simulation event for a patient."""
        self._custom_events.pop(patient_id, None)

    def restore_probe(self, patient_id: str) -> None:
        """Restore probe attachment after probe removal."""
        event = self._custom_events.get(patient_id)
        if event and event.event_type == "probe_removal":
            self._custom_events.pop(patient_id, None)

    def get_custom_event_status(self, patient_id: str, current_tick: int) -> dict[str, Any] | None:
        """Return status and progress of any active custom simulation event."""
        event = self._custom_events.get(patient_id)
        if not event:
            return None
        elapsed = max(0, current_tick - event.start_tick)
        dur = event.duration_ticks
        pct = min(100, int((elapsed / max(1, dur)) * 100)) if dur > 0 else (100 if event.params.get("completed") else 50)
        status = "COMPLETED" if (event.params.get("completed") or (dur > 0 and elapsed >= dur and event.event_type != "probe_removal")) else ("RUNNING" if event.is_active else "INACTIVE")
        return {
            "event_type": event.event_type,
            "status": status,
            "elapsed_ticks": elapsed,
            "duration_ticks": dur,
            "progress_pct": pct,
            "params": event.params,
        }

    def apply(
        self,
        patient_id: str,
        base_vitals: dict,
        tick: int,
    ) -> dict:
        """Apply active custom events and scenario modifications to base vitals."""
        alias_map = {
            "hr": "heart_rate",
            "heart_rate": "hr",
            "spo2": "oxygen_saturation",
            "oxygen_saturation": "spo2",
            "rr": "respiratory_rate",
            "respiratory_rate": "rr",
            "sbp": "systolic_bp",
            "systolic_bp": "sbp",
            "temp": "body_temperature",
            "body_temperature": "temp",
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

        result = dict(base_vitals)

        # ── 1. Apply Custom Simulation Events (PS 3.2) ──
        if patient_id in self._custom_events:
            event = self._custom_events[patient_id]
            if event.is_active:
                elapsed = tick - event.start_tick
                dur = event.duration_ticks

                if event.event_type == "drift":
                    vital = event.params.get("vital", "heart_rate")
                    start_val = float(event.params.get("start_val", 75.0))
                    target_val = float(event.params.get("target_val", 120.0))
                    progress = min(1.0, elapsed / max(1, dur)) if dur > 0 else 1.0
                    cur_val = start_val + (target_val - start_val) * progress
                    _set_val(result, vital, cur_val)
                    _set_val(result, alias_map.get(vital, vital), cur_val)
                    if progress >= 1.0:
                        event.params["completed"] = True

                elif event.event_type == "spike":
                    vital = event.params.get("vital", "heart_rate")
                    spike_val = float(event.params.get("spike_val", 160.0))
                    if elapsed < dur:
                        _set_val(result, vital, spike_val)
                        _set_val(result, alias_map.get(vital, vital), spike_val)
                    else:
                        event.is_active = False
                        event.params["completed"] = True

                elif event.event_type == "dropout":
                    target_vital = event.params.get("vital", "all")
                    if elapsed < dur:
                        if target_vital == "all":
                            for k in ("hr", "heart_rate", "spo2", "oxygen_saturation", "rr", "respiratory_rate", "temp", "body_temperature", "sbp", "systolic_bp"):
                                if k in result:
                                    result[k] = {"value": None, "source": "DROPOUT", "status": "NO_READING"}
                        else:
                            result[target_vital] = {"value": None, "source": "DROPOUT", "status": "NO_READING"}
                            alt = alias_map.get(target_vital, target_vital)
                            result[alt] = {"value": None, "source": "DROPOUT", "status": "NO_READING"}
                    else:
                        event.is_active = False
                        event.params["completed"] = True

                elif event.event_type == "motion_noise":
                    if elapsed < dur:
                        result["motion_injected"] = True
                        result["_motion_injected"] = True
                        intensity = event.params.get("intensity", "medium")
                        factor = {"low": 4.0, "medium": 10.0, "high": 22.0}.get(intensity, 10.0)
                        target_vitals = event.params.get("vitals", ["oxygen_saturation", "heart_rate"])
                        import random
                        for v in target_vitals:
                            alt = alias_map.get(v, v)
                            k, cur = _get_val(result, v, alt)
                            if k is not None:
                                delta = random.uniform(-factor, factor)
                                if "spo2" in v or "oxygen" in v:
                                    new_val = max(55.0, min(100.0, cur + delta))
                                else:
                                    new_val = max(35.0, min(210.0, cur + delta * 1.5))
                                _set_val(result, k, new_val)
                    else:
                        event.is_active = False
                        event.params["completed"] = True

                elif event.event_type == "probe_removal":
                    # Indefinite until restore_probe or duration elapsed
                    if dur <= 0 or elapsed < dur:
                        _set_val(result, "oxygen_saturation", 0.0)
                        _set_val(result, "spo2", 0.0)
                        _set_val(result, "heart_rate", 0.0)
                        _set_val(result, "hr", 0.0)
                        result["probe_removed"] = True
                        result["_probe_removed"] = True
                    else:
                        event.is_active = False
                        event.params["completed"] = True

        # ── 2. Apply Predefined Clinical Scenarios ──
        if patient_id not in self._active:
            return result

        scenario = self._active[patient_id]
        elapsed = tick - scenario.start_tick
        progress = min(elapsed / SCENARIO_RAMP_TICKS, 1.0)  # 0.0 → 1.0

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
