"""
Virtual Wearable Simulator (Mandatory PS-03 Requirement 3.2.A)
Streams real-time wearable telemetry and injects scripted clinical & device events:
1. Gradual vital-sign drift (slow deterioration)
2. Sudden spikes
3. Missing readings / device dropouts
4. Motion-related noise
5. Probe removal artifacts (SpO2=0, flatline HR)
6. Simulated continuous body temperature
7. Converts readings to standard HL7 FHIR R4 Observations for FHIR Ingestion API
"""

import random
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from backend.engine.recovery_dna import recovery_dna_registry
from backend.fhir.models import (
    LOINC_HEART_RATE,
    LOINC_SPO2,
    LOINC_RESPIRATORY_RATE,
    LOINC_BODY_TEMPERATURE,
    create_fhir_observation
)


class VirtualWearableSimulator:
    def __init__(self):
        self.step_counts: Dict[str, int] = {}
        # Active scenario/event override per patient:
        # None, "GRADUAL_DRIFT", "SUDDEN_SPIKE", "MISSING_DATA", "MOTION_NOISE", "PROBE_REMOVAL"
        self.active_events: Dict[str, Optional[str]] = {}
        self.drift_progress: Dict[str, int] = {}
        
        # State management
        self.status = "STOPPED"  # "STOPPED" | "RUNNING" | "PAUSED"
        self.interval_seconds = 2.5
        self.active_patient_id = "P-003"
        self.last_reading: Optional[Dict[str, Any]] = None

    def start(self, patient_id: Optional[str] = None, interval: Optional[float] = None):
        """Starts continuous simulation."""
        if patient_id:
            self.active_patient_id = patient_id
        if interval:
            self.interval_seconds = float(interval)
        self.status = "RUNNING"
        return self.get_state()

    def pause(self):
        """Pauses simulation."""
        self.status = "PAUSED"
        return self.get_state()

    def resume(self):
        """Resumes paused simulation."""
        self.status = "RUNNING"
        return self.get_state()

    def stop(self):
        """Stops simulation and resets step counts."""
        self.status = "STOPPED"
        return self.get_state()

    def set_event(self, patient_id: str, event_type: Optional[str]):
        """Sets an active scripted event for a patient."""
        self.active_events[patient_id] = event_type
        if event_type == "GRADUAL_DRIFT":
            self.drift_progress[patient_id] = 0

    def clear_event(self, patient_id: str):
        self.active_events[patient_id] = None
        self.drift_progress[patient_id] = 0

    def get_state(self) -> Dict[str, Any]:
        """Returns the full runtime state of the Virtual Wearable Simulator."""
        return {
            "status": self.status,
            "active_patient_id": self.active_patient_id,
            "interval_seconds": self.interval_seconds,
            "active_event": self.active_events.get(self.active_patient_id),
            "drift_step": self.drift_progress.get(self.active_patient_id, 0),
            "step_count": self.step_counts.get(self.active_patient_id, 0),
            "last_reading": self.last_reading
        }

    def generate_reading(self, patient_id: Optional[str] = None) -> Dict[str, Any]:
        """Generates the next telemetry reading for the requested patient."""
        p_id = patient_id or self.active_patient_id
        profile = recovery_dna_registry.get(p_id)
        if not profile:
            base_hr, base_spo2, base_rr, base_temp = 75.0, 97.0, 16.0, 36.8
        else:
            base_hr = profile.discharge_baseline["heart_rate"]
            base_spo2 = profile.discharge_baseline["spo2"]
            base_rr = profile.discharge_baseline["respiratory_rate"]
            base_temp = profile.discharge_baseline["temperature"]

        if p_id not in self.step_counts:
            self.step_counts[p_id] = 0
        self.step_counts[p_id] += 1
        step = self.step_counts[p_id]

        event = self.active_events.get(p_id)

        # Baseline physiological fluctuation (micro-variations)
        hr = base_hr + random.uniform(-1.5, 1.5)
        spo2 = base_spo2 + random.uniform(-0.5, 0.5)
        rr = base_rr + random.uniform(-0.8, 0.8)
        temp = base_temp + random.uniform(-0.1, 0.1)
        simulated_event_name = "STABLE"

        # Apply Scripted Events:
        if event == "GRADUAL_DRIFT":
            simulated_event_name = "GRADUAL_VITAL_SIGN_DRIFT"
            drift_step = self.drift_progress.get(p_id, 0)
            self.drift_progress[p_id] = drift_step + 1
            
            # Progressive decompensation trajectory:
            # SpO2 drifts down by 0.85% per step
            # HR climbs by 2.4 bpm per step
            # RR climbs by 0.95 breaths/min per step
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
            reading = {
                "patient_id": p_id,
                "heart_rate": None,
                "spo2": None,
                "respiratory_rate": None,
                "body_temperature": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_simulated": simulated_event_name,
                "device_status": "DISCONNECTED",
                "step_count": step
            }
            self.last_reading = reading
            return reading

        elif event == "MOTION_NOISE":
            simulated_event_name = "MOTION_RELATED_NOISE"
            # High-frequency motion artifact (e.g. brushing teeth, walking shaking arm)
            spo2 = max(68.0, base_spo2 - random.choice([16.0, 22.0]))
            hr = base_hr + random.choice([-28.0, 48.0])

        elif event == "PROBE_REMOVAL":
            simulated_event_name = "PROBE_REMOVAL_ARTIFACT"
            # Optical probe unclipped or slipped off finger
            # SpO2 drops to zero, HR flatlines at zero, RR uncoupled, Temp ambient
            spo2 = 0.0
            hr = 0.0
            rr = None
            temp = 24.2

        # Cap within physical limits
        if spo2 is not None and event != "PROBE_REMOVAL":
            spo2 = max(50.0, min(100.0, spo2))

        reading = {
            "patient_id": p_id,
            "heart_rate": round(hr, 1) if hr is not None else None,
            "spo2": round(spo2, 1) if spo2 is not None else None,
            "respiratory_rate": round(rr, 1) if rr is not None else None,
            "body_temperature": round(temp, 1) if temp is not None else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_simulated": simulated_event_name,
            "step_count": step,
            "device_id": "wearable-pulse-01",
            "source": "VIRTUAL_WEARABLE_SIMULATOR"
        }
        self.last_reading = reading
        return reading

    def create_fhir_bundle(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        """
        Converts the simulated reading into a compliant HL7 FHIR Release 4
        Vital Signs Bundle for submission into the FHIR R4 Ingestion API.
        """
        patient_id = reading["patient_id"]
        ts = reading["timestamp"]
        source_tag = reading.get("source", "VIRTUAL_WEARABLE_SIMULATOR")
        entries = []

        # Helper to attach source metadata
        def make_entry(obs_dict: Dict[str, Any]):
            obs_dict["meta"] = {
                "tag": [
                    {
                        "system": "http://carepulse.ai/fhir/source",
                        "code": source_tag,
                        "display": "Virtual Wearable Simulator"
                    }
                ]
            }
            obs_dict["device"] = {"display": "Virtual Wearable Pulse Oximeter & Respiration Sensor"}
            return {"resource": obs_dict}

        if reading.get("heart_rate") is not None:
            obs_hr = create_fhir_observation(patient_id, LOINC_HEART_RATE, reading["heart_rate"], ts)
            entries.append(make_entry(obs_hr))

        if reading.get("spo2") is not None:
            obs_spo2 = create_fhir_observation(patient_id, LOINC_SPO2, reading["spo2"], ts)
            entries.append(make_entry(obs_spo2))

        if reading.get("respiratory_rate") is not None:
            obs_rr = create_fhir_observation(patient_id, LOINC_RESPIRATORY_RATE, reading["respiratory_rate"], ts)
            entries.append(make_entry(obs_rr))

        if reading.get("body_temperature") is not None:
            obs_temp = create_fhir_observation(patient_id, LOINC_BODY_TEMPERATURE, reading["body_temperature"], ts)
            entries.append(make_entry(obs_temp))

        return {
            "resourceType": "Bundle",
            "type": "transaction",
            "entry": entries
        }


# Singleton instance
virtual_wearable_simulator = VirtualWearableSimulator()
