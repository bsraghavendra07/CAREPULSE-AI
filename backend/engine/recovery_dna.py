"""
Recovery DNA - Individual Patient Recovery Intelligence (Innovation 1 & Mandatory PS-03 Rule 1 & Rule 2)
Maintains individual patient digital recovery profiles, rolling baselines,
chronic condition adaptations, and medication-aware vital sign expectations.
"""

from typing import Dict, Any, List, Optional
import numpy as np


class RecoveryDNAProfile:
    def __init__(
        self,
        patient_id: str,
        name: str,
        age: int,
        gender: str,
        conditions: List[str],
        medications: List[str],
        has_hypercapnic_failure: bool = False,
        baseline_spo2: float = 97.0,
        baseline_hr: float = 72.0,
        baseline_rr: float = 16.0,
        baseline_temp: float = 36.8,
        discharge_date: str = "2026-11-08"
    ):
        self.patient_id = patient_id
        self.name = name
        self.age = age
        self.gender = gender
        self.conditions = conditions
        self.medications = medications
        self.has_hypercapnic_failure = has_hypercapnic_failure
        
        # Static discharge baseline
        self.discharge_baseline = {
            "spo2": baseline_spo2,
            "heart_rate": baseline_hr,
            "respiratory_rate": baseline_rr,
            "temperature": baseline_temp
        }
        
        # Rolling baseline buffers (stores rolling window of verified valid readings)
        self.rolling_history: Dict[str, List[float]] = {
            "spo2": [baseline_spo2],
            "heart_rate": [baseline_hr],
            "respiratory_rate": [baseline_rr],
            "temperature": [baseline_temp]
        }
        self.rolling_window_size = 30
        self.discharge_date = discharge_date

    def update_rolling_baseline(self, vitals: Dict[str, Optional[float]]):
        """Appends valid readings to rolling buffer and updates statistical profile."""
        for key in ["spo2", "heart_rate", "respiratory_rate", "temperature"]:
            val = vitals.get(key)
            if val is not None:
                self.rolling_history[key].append(val)
                if len(self.rolling_history[key]) > self.rolling_window_size:
                    self.rolling_history[key].pop(0)

    def get_rolling_stats(self) -> Dict[str, Dict[str, float]]:
        """Computes mean, standard deviation, and range for rolling baselines."""
        stats = {}
        for key, vals in self.rolling_history.items():
            if vals:
                mean = float(np.mean(vals))
                std = float(np.std(vals)) if len(vals) > 1 else 1.0
                stats[key] = {
                    "mean": round(mean, 1),
                    "std": round(std if std > 0.1 else 0.5, 2),
                    "min": round(float(np.min(vals)), 1),
                    "max": round(float(np.max(vals)), 1)
                }
            else:
                base = self.discharge_baseline[key]
                stats[key] = {"mean": base, "std": 1.0, "min": base, "max": base}
        return stats

    def evaluate_personalized_deviation(
        self,
        heart_rate: Optional[float],
        spo2: Optional[float],
        respiratory_rate: Optional[float],
        temperature: Optional[float]
    ) -> Dict[str, Any]:
        """
        Evaluates current readings against individual rolling baseline.
        Implements Rule 2 (Individual Rolling Baseline) and Rule 1 (Scale 2 selection).
        """
        stats = self.get_rolling_stats()
        deviations = {}
        flags = []

        # Check SpO2 deviation
        if spo2 is not None:
            mean = stats["spo2"]["mean"]
            std = stats["spo2"]["std"]
            z_score = (spo2 - mean) / std
            deviations["spo2"] = {
                "current": spo2,
                "baseline_mean": mean,
                "z_score": round(z_score, 2),
                "delta": round(spo2 - mean, 1)
            }
            if z_score <= -2.0:
                flags.append(f"SpO2 dropped {abs(spo2 - mean):.1f}% below personal baseline of {mean}% ({z_score:.1f} SD)")

        # Check Heart Rate deviation
        if heart_rate is not None:
            mean = stats["heart_rate"]["mean"]
            std = stats["heart_rate"]["std"]
            z_score = (heart_rate - mean) / std
            deviations["heart_rate"] = {
                "current": heart_rate,
                "baseline_mean": mean,
                "z_score": round(z_score, 2),
                "delta": round(heart_rate - mean, 1)
            }
            # Medication check: if on Beta Blocker, heart rate increase is even more concerning
            on_beta_blocker = any("olol" in med.lower() or "carvedilol" in med.lower() or "metoprolol" in med.lower() for med in self.medications)
            threshold_z = 1.8 if on_beta_blocker else 2.2
            if z_score >= threshold_z:
                context = " (amplified concern due to Beta-Blocker therapy)" if on_beta_blocker else ""
                flags.append(f"Heart rate elevated +{heart_rate - mean:.1f} bpm above baseline of {mean} bpm ({z_score:.1f} SD){context}")

        # Check Respiratory Rate deviation
        if respiratory_rate is not None:
            mean = stats["respiratory_rate"]["mean"]
            std = stats["respiratory_rate"]["std"]
            z_score = (respiratory_rate - mean) / std
            deviations["respiratory_rate"] = {
                "current": respiratory_rate,
                "baseline_mean": mean,
                "z_score": round(z_score, 2),
                "delta": round(respiratory_rate - mean, 1)
            }
            if z_score >= 2.0:
                flags.append(f"Respiratory rate elevated +{respiratory_rate - mean:.1f} bpm above baseline of {mean} bpm ({z_score:.1f} SD)")

        return {
            "patient_id": self.patient_id,
            "has_hypercapnic_failure": self.has_hypercapnic_failure,
            "active_scale": "NEWS2 Scale 2 (Hypercapnic)" if self.has_hypercapnic_failure else "NEWS2 Scale 1 (Standard)",
            "deviations": deviations,
            "baseline_flags": flags,
            "has_personalized_alert": len(flags) > 0,
            "rolling_stats": stats
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "conditions": self.conditions,
            "medications": self.medications,
            "has_hypercapnic_failure": self.has_hypercapnic_failure,
            "discharge_baseline": self.discharge_baseline,
            "rolling_stats": self.get_rolling_stats(),
            "discharge_date": self.discharge_date
        }


class RecoveryDNARegistry:
    def __init__(self):
        self.profiles: Dict[str, RecoveryDNAProfile] = {}

    def register(self, profile: RecoveryDNAProfile):
        self.profiles[profile.patient_id] = profile

    def get(self, patient_id: str) -> Optional[RecoveryDNAProfile]:
        return self.profiles.get(patient_id)

    def list_all(self) -> List[Dict[str, Any]]:
        return [p.to_dict() for p in self.profiles.values()]

# Singleton registry
recovery_dna_registry = RecoveryDNARegistry()
