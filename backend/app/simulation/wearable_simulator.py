"""
MINEARENA 1.0 — Virtual Wearable Simulator.

Generates vital-sign parameters that BIDMC does not provide (BP, Temp, ACVPU,
supplemental O₂) and can also run in full-simulation mode producing all params.
"""

from __future__ import annotations

import random
from typing import Optional


class WearableSimulator:
    """Virtual wearable device that emits realistic noisy vital signs.

    Parameters
    ----------
    patient_profile : dict
        Must include baseline keys: ``baseline_hr``, ``baseline_spo2``,
        ``baseline_rr``, ``baseline_sbp``, ``baseline_temp``.
        Optionally: ``acvpu`` (default "A"), ``supplemental_oxygen`` (default False).
    """

    def __init__(self, patient_profile: dict) -> None:
        self._profile = patient_profile
        self._baselines = {
            "hr":   float(patient_profile.get("baseline_hr", 75)),
            "spo2": float(patient_profile.get("baseline_spo2", 97)),
            "rr":   float(patient_profile.get("baseline_rr", 16)),
            "sbp":  float(patient_profile.get("baseline_sbp", 120)),
            "temp": float(patient_profile.get("baseline_temp", 36.8)),
        }
        self._acvpu: str = patient_profile.get("acvpu", "A")
        self._supplemental_oxygen: bool = patient_profile.get(
            "supplemental_oxygen", False
        )

    # ── Noise helpers ─────────────────────────────────────────────────

    @staticmethod
    def _noisy(value: float, std: float) -> float:
        """Add small Gaussian noise."""
        return value + random.gauss(0, std)

    # ── Public API ────────────────────────────────────────────────────

    def generate_vitals(
        self,
        bidmc_data: dict | None = None,
        scenario_modifier: dict | None = None,
    ) -> dict:
        """Generate a complete set of vital signs.

        Parameters
        ----------
        bidmc_data : dict | None
            If provided, reuse HR/SpO2/RR from BIDMC (tagged ``"BIDMC"``)
            and generate only BP / Temp / ACVPU / O₂ (tagged ``"SIMULATED"``).
            If ``None``, generate **all** parameters (tagged ``"SIMULATED"``).
        scenario_modifier : dict | None
            Optional overrides to apply (e.g. from a deterioration scenario).
            Keys are parameter names, values are target floats.

        Returns
        -------
        dict
            Complete vitals snapshot with each parameter as a sub-dict
            containing ``value`` and ``source``.
        """
        base = dict(self._baselines)  # copy

        # Apply scenario modifiers to baselines
        if scenario_modifier:
            for key, val in scenario_modifier.items():
                if key in base:
                    base[key] = float(val)
                # Handle special keys
                if key == "acvpu":
                    self._acvpu = str(val)
                if key == "supplemental_oxygen":
                    self._supplemental_oxygen = bool(val)
                if key == "motion_injected":
                    pass  # handled downstream

        vitals: dict = {}

        if bidmc_data is not None:
            # Use BIDMC data for HR, SpO2, RR (already tagged)
            for param in ("hr", "spo2", "rr"):
                if param in bidmc_data:
                    vitals[param] = bidmc_data[param]  # {value, source}

            # Generate only the missing parameters
            vitals["sbp"] = {
                "value": round(self._noisy(base["sbp"], 3.0)),
                "source": "SIMULATED",
            }
            vitals["temp"] = {
                "value": round(self._noisy(base["temp"], 0.1), 1),
                "source": "SIMULATED",
            }
        else:
            # Full simulation mode — generate everything
            vitals["hr"] = {
                "value": round(self._noisy(base["hr"], 2.0)),
                "source": "SIMULATED",
            }
            vitals["spo2"] = {
                "value": max(0, min(100, round(self._noisy(base["spo2"], 0.5)))),
                "source": "SIMULATED",
            }
            vitals["rr"] = {
                "value": round(self._noisy(base["rr"], 1.0), 1),
                "source": "SIMULATED",
            }
            vitals["sbp"] = {
                "value": round(self._noisy(base["sbp"], 3.0)),
                "source": "SIMULATED",
            }
            vitals["temp"] = {
                "value": round(self._noisy(base["temp"], 0.1), 1),
                "source": "SIMULATED",
            }

        # Always add ACVPU and supplemental oxygen (simulated)
        vitals["acvpu"] = {"value": self._acvpu, "source": "SIMULATED"}
        vitals["supplemental_oxygen"] = {
            "value": self._supplemental_oxygen,
            "source": "SIMULATED",
        }

        # Propagate motion_injected flag if present
        if scenario_modifier and scenario_modifier.get("motion_injected"):
            vitals["motion_injected"] = True
        else:
            vitals["motion_injected"] = False

        return vitals
