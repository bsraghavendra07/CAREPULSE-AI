"""
Virtual Wearable Simulator (Mandatory PS-03 Requirement 3.2.A)
Streams real-time wearable telemetry and injects scripted clinical & device events:
1. Gradual vital-sign drift (slow deterioration)
2. Sudden spikes
3. Missing readings / device dropouts
4. Motion-related noise
5. Probe removal artifacts (SpO2=0, flatline HR)
6. Simulated continuous body temperature
"""

import random
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.engine.recovery_dna import recovery_dna_registry


class VirtualWearableSimulator:
    def __init__(self):
        self.step_counts: Dict[str, int] = {}
        # Active scenario/event override per patient:
        # None, "GRADUAL_DRIFT", "SUDDEN_SPIKE", "MISSING_DATA", "MOTION_NOISE", "PROBE_REMOVAL"
        self.active_events: Dict[str, Optional[str]] = {}
        self.drift_progress: Dict[str, int] = {}

    def set_event(self, patient_id: str, event_type: Optional[str]):
        """Sets an active scripted event for a patient."""
        self.active_events[patient_id] = event_type
        if event_type == "GRADUAL_DRIFT":
            self.drift_progress[patient_id] = 0

    def clear_event(self, patient_id: str):
        self.active_events[patient_id] = None
        self.drift_progress[patient_id] = 0

    def generate_reading(self, patient_id: str = "P-003") -> Dict[str, Any]:
        """Generates the next telemetry reading for the requested patient."""
        profile = recovery_dna_registry.get(patient_id)
        if not profile:
            base_hr, base_spo2, base_rr, base_temp = 75.0, 97.0, 16.0, 36.8
        else:
            base_hr = profile.discharge_baseline["heart_rate"]
            base_spo2 = profile.discharge_baseline["spo2"]
            base_rr = profile.discharge_baseline["respiratory_rate"]
            base_temp = profile.discharge_baseline["temperature"]

        if patient_id not in self.step_counts:
            self.step_counts[patient_id] = 0
        self.step_counts[patient_id] += 1
        step = self.step_counts[patient_id]

        event = self.active_events.get(patient_id)

        # Baseline physiological fluctuation (micro-variations)
        hr = base_hr + random.uniform(-1.5, 1.5)
        spo2 = base_spo2 + random.uniform(-0.5, 0.5)
        rr = base_rr + random.uniform(-0.8, 0.8)
        temp = base_temp + random.uniform(-0.1, 0.1)
        simulated_event_name = "STABLE"

        # Apply Scripted Events:
        if event == "GRADUAL_DRIFT":
            simulated_event_name = "GRADUAL_VITAL_SIGN_DRIFT"
            drift_step = self.drift_progress.get(patient_id, 0)
            self.drift_progress[patient_id] = drift_step + 1
            
            # Progressive decompensation trajectory:
            # SpO2 drifts down by 0.8% per step
            # HR climbs by 2.2 bpm per step
            # RR climbs by 0.9 bpm per step
            # Temp slowly rises (low-grade fever onset)
            spo2_drift = min(14.0, drift_step * 0.85)
            hr_drift = min(45.0, drift_step * 2.4)
            rr_drift = min(12.0, drift_step * 0.95)
            temp_drift = min(1.8, drift_step * 0.12)

            spo2 = max(82.0, base_spo2 - spo2_drift)
            hr = min(135.0, base_hr + hr_drift)
            rr = min(32.0, base_rr + rr_drift)
            temp = min(38.8, base_temp + temp_drift)

        elif event == "SUDDEN_SPIKE":
            simulated_event_name = "SUDDEN_SPIKE"
            # Acute sudden paroxysmal tachycardia or sudden hypoxemic event
            hr = base_hr + random.choice([38.0, 45.0])
            spo2 = max(84.0, base_spo2 - 10.0)
            rr = base_rr + 8.0

        elif event == "MISSING_DATA":
            simulated_event_name = "MISSING_READINGS_DROPOUT"
            # Bluetooth dropout / missing packets
            return {
                "patient_id": patient_id,
                "heart_rate": None,
                "spo2": None,
                "respiratory_rate": None,
                "body_temperature": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_simulated": simulated_event_name,
                "device_status": "DISCONNECTED"
            }

        elif event == "MOTION_NOISE":
            simulated_event_name = "MOTION_RELATED_NOISE"
            # High-frequency motion artifact (e.g. brushing teeth, walking shaking arm)
            spo2 = max(68.0, base_spo2 - random.choice([16.0, 22.0]))
            hr = base_hr + random.choice([-28.0, 48.0])

        elif event == "PROBE_REMOVAL":
            simulated_event_name = "PROBE_REMOVAL_ARTIFACT"
            # Optical probe unclipped or slipped off finger
            spo2 = 0.0
            hr = 0.0
            rr = None  # Respiration transducer also uncoupled
            temp = 24.2  # Room temperature recorded by unattached thermistor

        # Cap within physical limits
        if spo2 is not None and event != "PROBE_REMOVAL":
            spo2 = max(50.0, min(100.0, spo2))

        return {
            "patient_id": patient_id,
            "heart_rate": round(hr, 1) if hr is not None else None,
            "spo2": round(spo2, 1) if spo2 is not None else None,
            "respiratory_rate": round(rr, 1) if rr is not None else None,
            "body_temperature": round(temp, 1) if temp is not None else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_simulated": simulated_event_name,
            "step_count": step
        }


# Singleton instance
virtual_wearable_simulator = VirtualWearableSimulator()
