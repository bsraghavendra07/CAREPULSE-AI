"""
CAREPULSE 1.0 — Clinical Decision-Support (CDS) Alert Generation Engine.

Complies with Step 8 Specifications:
- Three distinct alert levels:
    1. WATCH: Mild or early abnormal patterns (e.g. gradual downward trend).
    2. REVIEW: Concerning pattern persists or multiple vital signs become abnormal.
    3. URGENT: Severe or persistent abnormal patterns across consecutive readings.

Every alert contains:
- alert_level (WATCH | REVIEW | URGENT)
- vital_sign involved (e.g. SpO₂, Heart Rate, Multi-parameter)
- current_value (formatted string)
- relevant trend/pattern
- short clinical explanation of why the alert was generated
- timestamp (ISO-8601)

Regulatory & Medical Disclaimer:
- Clearly labelled as a Clinical Decision-Support & Monitoring System.
- Does not present itself as an autonomous medical diagnostic tool.
"""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.core.artifact_detector import SQIResult


class CDSAlertLevel(str, Enum):
    ROUTINE = "ROUTINE"
    WATCH = "WATCH"
    REVIEW = "REVIEW"
    URGENT = "URGENT"


class CDSAlert(BaseModel):
    """Clinical Decision-Support Alert Object."""

    alert_id: str = Field(description="Unique identifier for the generated alert")
    patient_id: str
    patient_name: str
    alert_level: CDSAlertLevel
    vital_sign: str = Field(description="Vital sign involved (e.g. SpO₂, Heart Rate, Multi-parameter)")
    current_value: str = Field(description="Current value formatted with unit")
    trend_pattern: str = Field(description="Relevant physiological trend or pattern")
    explanation: str = Field(description="Short clinical explanation of why alert was generated")
    timestamp: str = Field(description="ISO-8601 alert generation timestamp")
    clinical_action: str = Field(description="Recommended decision-support action")
    is_artifact_suppressed: bool = Field(default=False, description="True if an isolated artifact was quarantined to prevent false alarm")
    system_classification: str = "Clinical Decision-Support & Monitoring System — Non-Diagnostic"


class CDSAlertGenerator:
    """Evaluates multi-vital time-series streams and generates WATCH, REVIEW, and URGENT alerts."""

    def __init__(self) -> None:
        # patient_id -> param -> deque of recent float values (last 20 readings)
        self._history: Dict[str, Dict[str, deque]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=20))
        )
        # patient_id -> count of consecutive abnormal readings
        self._consecutive_abnormal: Dict[str, Dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )
        # Stored recent alerts per patient
        self._recent_alerts: Dict[str, deque] = defaultdict(lambda: deque(maxlen=50))

    def evaluate_vitals(
        self,
        patient_id: str,
        patient_name: str,
        vitals: Dict[str, Any],
        sqi_result: SQIResult,
        scale2_prescribed: bool = False,
        news2_score: int = 0,
        current_tick: int = 0,
    ) -> Optional[CDSAlert]:
        """Generate a structured CDS alert based on vital trend, persistence, and artifact rules."""
        now_iso = datetime.now(timezone.utc).isoformat()
        alert_id = f"cds-{patient_id}-{current_tick}-{int(datetime.now().timestamp() * 1000) % 10000}"

        def _val(param: str) -> Optional[float]:
            v = vitals.get(param)
            if v is None:
                return None
            if isinstance(v, dict):
                v = v.get("value")
            if v is None:
                return None
            try:
                return float(v)
            except (ValueError, TypeError):
                return None

        spo2 = _val("oxygen_saturation") or _val("spo2")
        hr = _val("heart_rate") or _val("hr")
        rr = _val("respiratory_rate") or _val("rr")
        sbp = _val("systolic_bp") or _val("sbp")
        temp = _val("body_temperature") or _val("temp")

        hist_spo2 = self._history[patient_id]["spo2"]
        hist_hr = self._history[patient_id]["hr"]
        hist_rr = self._history[patient_id]["rr"]

        # ── 1. ARTIFACT QUARANTINE SAFETY RULE ─────────────────────────────────
        # "Do not use an unreliable reading alone to generate a critical alert."
        if sqi_result.is_unreliable or sqi_result.suppress_critical_alert:
            if sqi_result.affected_vital == "oxygen_saturation" and spo2 is not None:
                recent_samples = list(hist_spo2)[-4:]
                samples_str = " → ".join(f"{s:.0f}%" for s in recent_samples + [spo2])
                alert = CDSAlert(
                    alert_id=alert_id,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    alert_level=CDSAlertLevel.WATCH,
                    vital_sign="SpO₂ (Artifact Filtered)",
                    current_value=f"{spo2:.0f}%",
                    trend_pattern=f"Isolated reading ({samples_str})",
                    explanation=f"Isolated SpO₂ drop to {spo2:.0f}% flagged as {sqi_result.artifact_type.value}. "
                                "Surrounding readings normal. Critical alert safely suppressed to prevent alarm fatigue.",
                    timestamp=now_iso,
                    clinical_action="Inspect sensor contact and patient motion before clinical intervention.",
                    is_artifact_suppressed=True,
                )
                self._recent_alerts[patient_id].append(alert)
                return alert

        # Append valid readings to historical buffers
        if spo2 is not None:
            hist_spo2.append(spo2)
        if hr is not None:
            hist_hr.append(hr)
        if rr is not None:
            hist_rr.append(rr)

        # ── 2. SPO2 TREND & PERSISTENCE ANALYSIS ─────────────────────────────
        target_min = 88.0 if scale2_prescribed else 94.0

        if spo2 is not None:
            # Check consecutive readings below target
            if spo2 < target_min:
                self._consecutive_abnormal[patient_id]["spo2"] += 1
            else:
                self._consecutive_abnormal[patient_id]["spo2"] = 0

            consec_low = self._consecutive_abnormal[patient_id]["spo2"]
            recent_spo2 = list(hist_spo2)[-5:]
            recent_str = " → ".join(f"{s:.0f}%" for s in recent_spo2)

            # URGENT: Severe or persistent abnormal patterns
            # e.g., SpO2 fallen to <= 88% and remains low across consecutive readings (or <= 83% for Scale 2)
            critical_spo2_threshold = 84.0 if scale2_prescribed else 88.0
            if spo2 <= critical_spo2_threshold and consec_low >= 2:
                alert = CDSAlert(
                    alert_id=alert_id,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    alert_level=CDSAlertLevel.URGENT,
                    vital_sign="SpO₂",
                    current_value=f"{spo2:.0f}%",
                    trend_pattern=f"Persistent critical hypoxia across {consec_low} consecutive readings ({recent_str})",
                    explanation=f"SpO₂ has fallen to {spo2:.0f}% and remains low across consecutive readings. Immediate clinical attention is required.",
                    timestamp=now_iso,
                    clinical_action="Initiate emergency bedside airway/oxygen review and notify attending respiratory specialist.",
                )
                self._recent_alerts[patient_id].append(alert)
                return alert

            # REVIEW: Concerning pattern persists across multiple readings
            # e.g., SpO2 below expected range across multiple readings (>= 3 readings)
            if consec_low >= 3:
                alert = CDSAlert(
                    alert_id=alert_id,
                    patient_id=patient_id,
                    patient_name=patient_name,
                    alert_level=CDSAlertLevel.REVIEW,
                    vital_sign="SpO₂",
                    current_value=f"{spo2:.0f}%",
                    trend_pattern=f"Sustained sub-optimal oxygenation over {consec_low} readings ({recent_str})",
                    explanation=f"SpO₂ has remained below the expected range ({target_min:.0f}%) across multiple readings. Clinical review is recommended.",
                    timestamp=now_iso,
                    clinical_action="Assess patient breathing pattern, check oxygen delivery device, and schedule prompt clinician review.",
                )
                self._recent_alerts[patient_id].append(alert)
                return alert

            # WATCH: Mild or early abnormal patterns (gradual downward trend)
            # e.g., SpO2 is declining steadily over 4-5 readings even before hitting severe threshold
            if len(recent_spo2) >= 3:
                first_half_avg = sum(recent_spo2[:2]) / 2.0
                second_half_avg = sum(recent_spo2[-2:]) / 2.0
                if (first_half_avg - second_half_avg) >= 2.0 and second_half_avg <= 95.0:
                    alert = CDSAlert(
                        alert_id=alert_id,
                        patient_id=patient_id,
                        patient_name=patient_name,
                        alert_level=CDSAlertLevel.WATCH,
                        vital_sign="SpO₂",
                        current_value=f"{spo2:.0f}%",
                        trend_pattern=f"Downward trajectory over recent readings ({recent_str})",
                        explanation="SpO₂ is showing a gradual downward trend. Continue monitoring.",
                        timestamp=now_iso,
                        clinical_action="Increase vital-sign monitoring frequency and verify patient respiratory comfort.",
                    )
                    self._recent_alerts[patient_id].append(alert)
                    return alert

        # ── 3. MULTI-VITAL ABNORMALITY CHECK (REVIEW) ─────────────────────────
        # "REVIEW: Used when multiple vital signs become abnormal"
        abnormal_signs = []
        if hr is not None and hr > 105:
            abnormal_signs.append(f"Heart Rate={hr:.0f} bpm")
        if rr is not None and rr > 22:
            abnormal_signs.append(f"Respiration={rr:.0f} /min")
        if sbp is not None and sbp < 100:
            abnormal_signs.append(f"Systolic BP={sbp:.0f} mmHg")
        if temp is not None and temp > 38.3:
            abnormal_signs.append(f"Temperature={temp:.1f}°C")

        if len(abnormal_signs) >= 2:
            alert = CDSAlert(
                alert_id=alert_id,
                patient_id=patient_id,
                patient_name=patient_name,
                alert_level=CDSAlertLevel.REVIEW,
                vital_sign="Multi-parameter",
                current_value=f"HR {hr:.0f} bpm | RR {rr:.0f}/min",
                trend_pattern=f"Concurrent physiological deviation across: {', '.join(abnormal_signs)}",
                explanation=f"Multiple vital signs ({', '.join(abnormal_signs)}) have become abnormal simultaneously. Clinical review is recommended.",
                timestamp=now_iso,
                clinical_action="Conduct comprehensive bedside nursing assessment and calculate formal sepsis/SIRS criteria.",
            )
            self._recent_alerts[patient_id].append(alert)
            return alert

        # ── 4. SEVERE PHYSIOLOGICAL INSTABILITY (URGENT) ──────────────────────
        # High NEWS2 score (>= 7) or extreme single vital sign
        if news2_score >= 7 or (hr is not None and hr >= 135) or (sbp is not None and sbp <= 85):
            curr_str = f"NEWS2={news2_score}" if news2_score >= 7 else (f"HR={hr:.0f} bpm" if hr and hr >= 135 else f"SBP={sbp:.0f} mmHg")
            alert = CDSAlert(
                alert_id=alert_id,
                patient_id=patient_id,
                patient_name=patient_name,
                alert_level=CDSAlertLevel.URGENT,
                vital_sign="Multi-parameter Deterioration",
                current_value=curr_str,
                trend_pattern="Acute multi-system hemodynamic destabilization",
                explanation=f"Severe physiological instability detected ({curr_str}). Immediate clinical attention is required.",
                timestamp=now_iso,
                clinical_action="Activate Medical Emergency Team (MET) / Acute Response Team for immediate bedside intervention.",
            )
            self._recent_alerts[patient_id].append(alert)
            return alert

        # ── 5. MILD INDIVIDUAL DEVIATION (WATCH) ──────────────────────────────
        if (hr is not None and hr > 95) or (rr is not None and rr > 20) or (news2_score in (2, 3, 4)):
            dev_vital = "Heart Rate" if (hr and hr > 95) else ("Respiration" if (rr and rr > 20) else "General Vitals")
            dev_val = f"{hr:.0f} bpm" if (hr and hr > 95) else (f"{rr:.0f} /min" if (rr and rr > 20) else f"NEWS2={news2_score}")
            alert = CDSAlert(
                alert_id=alert_id,
                patient_id=patient_id,
                patient_name=patient_name,
                alert_level=CDSAlertLevel.WATCH,
                vital_sign=dev_vital,
                current_value=dev_val,
                trend_pattern=f"Mild elevation above post-discharge target ({dev_val})",
                explanation=f"{dev_vital} is showing a mild or early abnormal pattern. Continue monitoring.",
                timestamp=now_iso,
                clinical_action="Observe vital sign progression and maintain telemetry recording.",
            )
            self._recent_alerts[patient_id].append(alert)
            return alert

        return None

    def get_recent_alerts(self, patient_id: Optional[str] = None, limit: int = 30) -> List[CDSAlert]:
        """Retrieve recent CDS alerts."""
        if patient_id:
            return list(self._recent_alerts[patient_id])[-limit:]
        all_alerts: List[CDSAlert] = []
        for p_alerts in self._recent_alerts.values():
            all_alerts.extend(p_alerts)
        all_alerts.sort(key=lambda a: a.timestamp, reverse=True)
        return all_alerts[:limit]


# Global singleton CDS Alert Generator
cds_alert_generator = CDSAlertGenerator()
