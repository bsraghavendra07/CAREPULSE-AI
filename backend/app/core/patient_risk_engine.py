"""
Patient-Specific Decision Support Risk Engine.

Combines:
1. Vital-sign abnormality
2. Trend direction & severity (stable, gradual worsening, rapid spike)
3. Patient clinical context (Conditions & Medications from Synthea)

Formula:
  Risk Score = Vital Abnormality (0-50) + Trend Severity (0-30) + Patient Context (0-20)
  Normalized: 0 - 100
"""

from __future__ import annotations

from typing import Any


def calculate_patient_risk(
    patient: dict[str, Any],
    vitals: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Calculate a transparent, explainable decision-support risk score (0-100)."""
    factors: list[str] = []

    # Extract vital numerical values safely
    def _get_val(key: str, alt_key: str, default: float) -> float:
        obj = vitals.get(key) or vitals.get(alt_key)
        if isinstance(obj, dict):
            val = obj.get("value")
            if val is not None and str(val) != "None":
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass
        elif obj is not None and str(obj) != "None":
            try:
                return float(obj)
            except (ValueError, TypeError):
                pass
        return default

    hr = _get_val("heart_rate", "hr", 75.0)
    spo2 = _get_val("oxygen_saturation", "spo2", 98.0)
    rr = _get_val("respiratory_rate", "rr", 16.0)
    temp = _get_val("body_temperature", "temp", 36.8)
    sbp = _get_val("systolic_bp", "sbp", 120.0)

    # Check for sensor detachment / probe removal
    is_probe_removed = bool(vitals.get("probe_removed") or (spo2 == 0 and hr == 0))
    is_dropout = bool(vitals.get("heart_rate", {}).get("status") == "NO_READING" if isinstance(vitals.get("heart_rate"), dict) else False)

    if is_probe_removed:
        return {
            "patient_id": patient.get("id", "P-001"),
            "risk_score": 15,
            "risk_level": "LOW",
            "components": {
                "vital_abnormality": 0,
                "trend_severity": 0,
                "patient_context": 15,
            },
            "factors": [
                "Probe Removal Detected: SpO₂ sensor detached and HR flatlined",
                "Clinical deterioration suppressed to prevent false alarm",
            ],
            "alert_title": "Sensor Disconnection / Probe Detached",
            "alert_reason": "Vitals signal missing due to physical sensor detachment. System accurately distinguishes this equipment issue from physiological deterioration.",
            "disclaimer": "Decision-support suggestion — not a clinical diagnosis.",
        }

    if is_dropout:
        return {
            "patient_id": patient.get("id", "P-001"),
            "risk_score": 20,
            "risk_level": "LOW",
            "components": {
                "vital_abnormality": 0,
                "trend_severity": 5,
                "patient_context": 15,
            },
            "factors": [
                "Data Gap Detected: telemetry packet stream interrupted",
                "Patient monitor buffer active awaiting reconnect",
            ],
            "alert_title": "Telemetry Data Gap Detected",
            "alert_reason": "Temporary interruption in incoming sensor packets. System maintains active baseline state.",
            "disclaimer": "Decision-support suggestion — not a clinical diagnosis.",
        }

    # ── 1. Component A: Vital-Sign Abnormality (0 to 50 points) ──
    vital_abnormality = 0.0

    is_scale2 = patient.get("scale2_prescribed", False) or "copd" in str(patient.get("condition", "")).lower()

    # SpO2 evaluation
    if is_scale2:
        # Target 88-92%
        if spo2 < 84:
            vital_abnormality += 35
            factors.append(f"SpO₂ ({spo2:.0f}%) critically below hypercapnic threshold (target 88–92%)")
        elif spo2 < 88:
            vital_abnormality += 22
            factors.append(f"SpO₂ ({spo2:.0f}%) below prescribed target range (88–92%)")
        elif spo2 > 96:
            vital_abnormality += 10
            factors.append(f"SpO₂ ({spo2:.0f}%) elevated above safe limit for hypercapnia")
    else:
        # Standard target >= 95%
        if spo2 <= 91:
            vital_abnormality += 35
            factors.append(f"SpO₂ ({spo2:.0f}%) significantly below standard threshold (< 92%)")
        elif spo2 <= 94:
            vital_abnormality += 20
            factors.append(f"SpO₂ ({spo2:.0f}%) moderately hypoxic (92–94%)")

    # Heart Rate evaluation
    if hr >= 140:
        vital_abnormality += 30
        factors.append(f"Extreme tachycardia: Heart rate {hr:.0f} bpm")
    elif hr >= 115:
        vital_abnormality += 18
        factors.append(f"Moderate tachycardia: Heart rate {hr:.0f} bpm")
    elif hr < 45:
        vital_abnormality += 30
        factors.append(f"Severe bradycardia: Heart rate {hr:.0f} bpm")
    elif hr < 52:
        vital_abnormality += 15
        factors.append(f"Mild bradycardia: Heart rate {hr:.0f} bpm")

    # Respiratory Rate evaluation
    if rr >= 25 or rr <= 8:
        vital_abnormality += 25
        factors.append(f"Critical respiratory rate ({rr:.1f} /min)")
    elif rr >= 21 or rr <= 11:
        vital_abnormality += 12
        factors.append(f"Abnormal respiratory rate ({rr:.1f} /min)")

    # Temperature evaluation
    if temp >= 38.5:
        vital_abnormality += 20
        factors.append(f"High pyrexia: Body temperature {temp:.1f} °C")
    elif temp >= 37.8:
        vital_abnormality += 10
        factors.append(f"Low-grade fever: Body temperature {temp:.1f} °C")
    elif temp < 35.5:
        vital_abnormality += 20
        factors.append(f"Hypothermia: Body temperature {temp:.1f} °C")

    # Cap vital abnormality at 50
    vital_abnormality = min(50.0, vital_abnormality)

    # ── 2. Component B: Trend Severity (0 to 30 points) ──
    trend_severity = 0.0
    trend_type = "stable"

    if history and len(history) >= 4:
        # Check historical SpO2 and HR changes over recent ticks
        past_ticks = history[-10:]
        past_spo2: list[float] = []
        past_hr: list[float] = []

        for h in past_ticks:
            hv = h.get("vitals", {})
            h_spo2 = hv.get("oxygen_saturation", {}).get("value") or hv.get("spo2", {}).get("value")
            h_hr = hv.get("heart_rate", {}).get("value") or hv.get("hr", {}).get("value")
            if isinstance(h_spo2, (int, float)) and h_spo2 > 0:
                past_spo2.append(float(h_spo2))
            if isinstance(h_hr, (int, float)) and h_hr > 0:
                past_hr.append(float(h_hr))

        # Check SpO2 downward drift
        if len(past_spo2) >= 3:
            first_spo2 = past_spo2[0]
            last_spo2 = past_spo2[-1]
            diff = first_spo2 - last_spo2
            if diff >= 3.0:
                trend_severity += 24.0
                trend_type = "gradual_deterioration"
                factors.append(f"Sustained downward SpO₂ trend ({first_spo2:.0f}% → {last_spo2:.0f}%) over recent ticks")
            elif diff >= 1.5:
                trend_severity += 12.0
                factors.append(f"Downward SpO₂ drift ({first_spo2:.0f}% → {last_spo2:.0f}%)")

        # Check HR sudden spike
        if len(past_hr) >= 3:
            hr_diff = past_hr[-1] - min(past_hr[:-1])
            if hr_diff >= 35.0:
                trend_severity = max(trend_severity, 28.0)
                trend_type = "sudden_spike"
                factors.append(f"Rapid acute heart rate surge (+{hr_diff:.0f} bpm)")
            elif hr_diff >= 18.0:
                trend_severity = max(trend_severity, 15.0)
                factors.append(f"Accelerating heart rate slope (+{hr_diff:.0f} bpm)")

    # Cap trend severity at 30
    trend_severity = min(30.0, trend_severity)

    # ── 3. Component C: Patient Clinical Context from Synthea (0 to 20 points) ──
    patient_context_score = 0.0
    conditions_list = patient.get("conditions", [])
    if not conditions_list and patient.get("condition"):
        conditions_list = [patient.get("condition")]

    medications_list = patient.get("medications", [])
    med_names = [m["name"] if isinstance(m, dict) else str(m) for m in medications_list]

    cond_str = " ".join(str(c).lower() for c in conditions_list)

    # Context relevance 1: Respiratory Conditions (COPD, Asthma)
    has_respiratory_history = any(
        term in cond_str for term in ["copd", "asthma", "pulmonary", "emphysema", "bronchitis"]
    )
    if has_respiratory_history and (spo2 <= 94 or rr >= 21):
        patient_context_score += 18.0
        factors.append(
            f"Respiratory condition context ({conditions_list[0] if conditions_list else 'COPD'}) increases hypoxia alert priority"
        )
        # Check medication context
        respiratory_meds = [m for m in med_names if any(w in m.lower() for w in ["albuterol", "fluticasone", "salmeterol", "budesonide"])]
        if respiratory_meds:
            factors.append(f"Current Medication Context: {respiratory_meds[0]}")

    # Context relevance 2: Cardiovascular Conditions (Heart Failure, Hypertension, Atrial Fib)
    has_cardio_history = any(
        term in cond_str for term in ["heart failure", "hypertension", "infarction", "fibrillation", "cardiac", "artery"]
    )
    if has_cardio_history and (hr >= 105 or hr <= 52 or sbp >= 140):
        patient_context_score += 18.0
        cardio_name = next((c for c in conditions_list if any(t in c.lower() for t in ["heart", "hyper", "fib", "infarct"])), "Cardiovascular disease")
        factors.append(
            f"Cardiovascular clinical context ({cardio_name}) elevates tachyarrhythmia alert relevance"
        )
        cardio_meds = [m for m in med_names if any(w in m.lower() for w in ["metoprolol", "furosemide", "digoxin", "lisinopril", "apixaban", "aspirin"])]
        if cardio_meds:
            factors.append(f"Current Medication Context: {cardio_meds[0]}")

    # Context relevance 3: Sepsis / Infection / Diabetes
    has_septic_history = any(term in cond_str for term in ["sepsis", "infection", "diabetes"])
    if has_septic_history and (temp >= 37.8 or hr >= 100):
        patient_context_score += 15.0
        factors.append("Infection / metabolic clinical history increases alert sensitivity")

    # Baseline minimum contextual awareness
    if patient_context_score == 0 and conditions_list:
        patient_context_score = 5.0
        factors.append(f"Baseline clinical profile: {conditions_list[0]}")

    patient_context_score = min(20.0, patient_context_score)

    # ── Final Risk Score Summation (0 to 100) ──
    raw_total = vital_abnormality + trend_severity + patient_context_score
    total_score = max(0, min(100, int(round(raw_total))))

    if total_score >= 70:
        risk_level = "HIGH"
    elif total_score >= 40:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Construct explainable alert message
    if total_score >= 70:
        if trend_type == "sudden_spike" or hr >= 140:
            alert_title = "Critical heart-rate spike"
            alert_reason = f"Heart rate increased acutely to {hr:.0f} bpm. Clinical history of {conditions_list[0] if conditions_list else 'cardiovascular disease'} increases severity."
        else:
            alert_title = "Sustained deterioration detected"
            alert_reason = f"The alert is primarily driven by abnormal vitals (SpO₂ {spo2:.0f}%, HR {hr:.0f} bpm), with patient history ({conditions_list[0] if conditions_list else 'chronic condition'}) increasing the relevance of the event."
    elif total_score >= 40:
        alert_title = "Moderate physiological divergence"
        alert_reason = f"Vital parameters have departed from baseline. Patient clinical context ({conditions_list[0] if conditions_list else 'monitored'}) warrants continued ward oversight."
    else:
        alert_title = "Physiological vitals stable"
        alert_reason = "Current parameters and trends are within acceptable baseline bounds for this patient."

    return {
        "patient_id": patient.get("id", "P-001"),
        "patient_name": patient.get("name", "Robert Thompson"),
        "risk_score": total_score,
        "risk_level": risk_level,
        "components": {
            "vital_abnormality": int(round(vital_abnormality)),
            "trend_severity": int(round(trend_severity)),
            "patient_context": int(round(patient_context_score)),
        },
        "factors": factors or ["All monitored vital signs within baseline clinical ranges"],
        "alert_title": alert_title,
        "alert_reason": alert_reason,
        "primary_condition": patient.get("condition", "Post-Discharge Monitoring"),
        "conditions": conditions_list,
        "medications": medications_list,
        "disclaimer": "Decision-support suggestion — not a clinical diagnosis.",
    }
