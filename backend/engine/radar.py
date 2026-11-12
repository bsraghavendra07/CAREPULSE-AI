"""
Early Deterioration Radar (Innovation 2)
Tracks multi-vital trajectory, velocity, direction, and cross-vital coupling over time.
Provides early warning before single static thresholds are crossed.
"""

from typing import Dict, Any, List, Optional
import numpy as np


class EarlyDeteriorationRadar:
    def __init__(self, trajectory_window: int = 12):
        self.trajectory_window = trajectory_window
        self.patient_trajectories: Dict[str, List[Dict[str, Any]]] = {}

    def analyze_trajectory(
        self,
        patient_id: str,
        heart_rate: Optional[float],
        spo2: Optional[float],
        respiratory_rate: Optional[float],
        temperature: Optional[float],
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        if patient_id not in self.patient_trajectories:
            self.patient_trajectories[patient_id] = []

        buffer = self.patient_trajectories[patient_id]
        
        # Add current point
        point = {
            "heart_rate": heart_rate,
            "spo2": spo2,
            "respiratory_rate": respiratory_rate,
            "temperature": temperature,
            "timestamp": timestamp
        }
        buffer.append(point)
        if len(buffer) > self.trajectory_window:
            buffer.pop(0)

        # Need at least 3 points to determine slope/rate of change
        if len(buffer) < 3:
            return {
                "radar_score": 10.0,
                "status": "STABLE_RECOVERY",
                "trajectory_direction": "STABLE",
                "rates_of_change": {"spo2_slope": 0.0, "hr_slope": 0.0, "rr_slope": 0.0},
                "early_warning_active": False,
                "summary": "Initializing trajectory baseline. Monitoring stable recovery.",
                "lead_time_minutes_ahead": 0
            }

        # Calculate slopes using linear regression over recent window
        valid_spo2 = [p["spo2"] for p in buffer if p["spo2"] is not None]
        valid_hr = [p["heart_rate"] for p in buffer if p["heart_rate"] is not None]
        valid_rr = [p["respiratory_rate"] for p in buffer if p["respiratory_rate"] is not None]

        spo2_slope = float(np.polyfit(range(len(valid_spo2)), valid_spo2, 1)[0]) if len(valid_spo2) >= 3 else 0.0
        hr_slope = float(np.polyfit(range(len(valid_hr)), valid_hr, 1)[0]) if len(valid_hr) >= 3 else 0.0
        rr_slope = float(np.polyfit(range(len(valid_rr)), valid_rr, 1)[0]) if len(valid_rr) >= 3 else 0.0

        # Radar composite score calculation (0 - 100)
        # Danger pattern: SpO2 dropping (negative slope), HR rising (positive slope), RR rising (positive slope)
        radar_score = 15.0
        early_warning_active = False
        reasons = []

        # SpO2 downward velocity
        if spo2_slope < -0.4:
            radar_score += min(35.0, abs(spo2_slope) * 25.0)
            reasons.append(f"SpO2 declining at {abs(spo2_slope):.2f}% per interval")

        # Heart rate upward velocity
        if hr_slope > 0.8:
            radar_score += min(30.0, hr_slope * 12.0)
            reasons.append(f"Heart rate accelerating (+{hr_slope:.2f} bpm/interval)")

        # Respiratory rate upward velocity
        if rr_slope > 0.4:
            radar_score += min(30.0, rr_slope * 20.0)
            reasons.append(f"Respiratory rate accelerating (+{rr_slope:.2f} bpm/interval)")

        # Coupled Decompensation Triad: SpO2 down + RR up + HR up
        is_coupled_decompensation = (spo2_slope < -0.3) and (rr_slope > 0.3 or hr_slope > 0.5)
        if is_coupled_decompensation:
            radar_score += 20.0
            reasons.append("Multi-vital decompensation triad detected (concurrent SpO2 drop with RR/HR elevation)")

        radar_score = min(100.0, max(0.0, radar_score))

        # Status categorization
        if radar_score >= 70.0:
            status = "ACUTE_DETERIORATION"
            early_warning_active = True
            lead_time = 35 # Estimated minutes ahead of catastrophic static threshold
        elif radar_score >= 45.0:
            status = "EARLY_WARNING"
            early_warning_active = True
            lead_time = 45 # Caught early during initial drift
        elif radar_score >= 25.0:
            status = "DRIFT_MONITORING"
            early_warning_active = False
            lead_time = 0
        else:
            status = "STABLE_RECOVERY"
            early_warning_active = False
            lead_time = 0

        summary = "; ".join(reasons) if reasons else "Vital signs tracking within stable recovery envelopes."

        return {
            "radar_score": round(radar_score, 1),
            "status": status,
            "trajectory_direction": "WORSENING" if early_warning_active else "STABLE",
            "rates_of_change": {
                "spo2_slope": round(spo2_slope, 2),
                "hr_slope": round(hr_slope, 2),
                "rr_slope": round(rr_slope, 2)
            },
            "is_coupled_decompensation": is_coupled_decompensation,
            "early_warning_active": early_warning_active,
            "summary": summary,
            "lead_time_minutes_ahead": lead_time
        }

# Singleton instance
early_deterioration_radar = EarlyDeteriorationRadar()
