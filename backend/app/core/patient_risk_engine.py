"""
Patient-Specific Decision Support Risk Engine.

Combines:
1. Current Vital Signs & Abnormality
2. Vital-Sign Trends & Rolling Baseline
3. Patient Clinical Profile (Synthea Conditions & Medications)
4. Patient-Reported Symptoms (Breathlessness, Fever, Dizziness)

Formula:
  Risk Score (0-100) = Vital Abnormality (0-45) + Trend Severity (0-25) + Patient Context (0-20) + Symptoms (0-10)
"""

from __future__ import annotations

from typing import Any


def calculate_patient_risk(
    patient: dict[str, Any],
    vitals: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
    symptoms: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Calculate a transparent, explainable decision-support risk score (0-100)."""
    factors: list[str] = []
    pid = patient.get("id", "P-001")

    # Fetch patient symptoms if not passed directly
    if symptoms is None:
        try:
            from app.api.routes_patient_portal import get_patient_symptoms
            symptoms = get_patient_symptoms(pid)
        except Exception:
            symptoms = {"breathlessness": "None", "fever": "Normal", "dizziness": "None"}

    # Extract numerical vital values safely
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

    # Clinical conditions
    conditions_list = patient.get("conditions", [])
    if not conditions_list and patient.get("condition"):
        conditions_list = [patient.get("condition")]
    primary_fact = conditions_list[0] if conditions_list else "Post-Discharge Monitoring"

    # ── 1. Check for Sensor Artifacts or Missing Data ──
    is_probe_removed = bool(vitals.get("probe_removed") or (spo2 == 0 and hr == 0))
    is_dropout = bool(
        vitals.get("heart_rate", {}).get("status") == "NO_READING"
        if isinstance(vitals.get("heart_rate"), dict)
        else False
    )

    if is_probe_removed:
        return {
            "patient_id": pid,
            "patient_name": patient.get("name", "Robert Thompson"),
            "risk_score": 10,
            "risk_level": "LOW",
            "early_warning_score": 0,
            "early_warning_tier": "Low",
            "early_warning_label": "0 · Low",
            "alert_level": "WATCH",
            "alert_category": "SENSOR_ARTIFACT",
            "reading": "SpO₂: 0% | HR: 0 bpm (Flatline)",
            "rule": "Probe removal detected",
            "patient_fact": primary_fact,
            "action": "Clinical alert suppressed",
            "components": {"vital_abnormality": 0, "trend_severity": 0, "patient_context": 10, "symptoms": 0},
            "factors": [
                "SENSOR ARTIFACT: Probe removal detected",
                "Clinical alert suppressed to protect against false alarms",
            ],
            "alert_title": "SENSOR ARTIFACT",
            "alert_reason": "Probe removal detected. Clinical alert suppressed.",
            "is_sensor_issue": True,
            "is_device_issue": False,
            "primary_condition": primary_fact,
            "conditions": conditions_list,
            "medications": patient.get("medications", []),
            "disclaimer": "Decision-support suggestion — not a clinical diagnosis.",
        }

    if is_dropout:
        return {
            "patient_id": pid,
            "patient_name": patient.get("name", "Robert Thompson"),
            "risk_score": 15,
            "risk_level": "LOW",
            "early_warning_score": 0,
            "early_warning_tier": "Low",
            "early_warning_label": "0 · Low",
            "alert_level": "WATCH",
            "alert_category": "DEVICE_ALERT",
            "reading": "Telemetry stream paused / packet dropout",
            "rule": "No wearable readings received",
            "patient_fact": primary_fact,
            "action": "Possible connectivity issue",
            "components": {"vital_abnormality": 0, "trend_severity": 5, "patient_context": 10, "symptoms": 0},
            "factors": [
                "DEVICE ALERT: No wearable readings received",
                "Possible connectivity issue. Telemetry buffer awaiting reconnection.",
            ],
            "alert_title": "DEVICE ALERT",
            "alert_reason": "No wearable readings received. Possible connectivity issue.",
            "is_sensor_issue": False,
            "is_device_issue": True,
            "primary_condition": primary_fact,
            "conditions": conditions_list,
            "medications": patient.get("medications", []),
            "disclaimer": "Decision-support suggestion — not a clinical diagnosis.",
        }

    # ── 2. Component A: Vital-Sign Abnormality (0 to 45 points) + NEWS2 Score ──
    vital_abnormality = 0.0
    news2_points = 0

    is_scale2 = patient.get("scale2_prescribed", False) or "copd" in primary_fact.lower()

    # SpO2 evaluation
    if is_scale2:
        # Scale 2: Target 88-92%
        if spo2 < 84:
            vital_abnormality += 35
            news2_points += 3
            factors.append(f"SpO₂ ({spo2:.0f}%) critically below hypercapnic target (88–92%)")
        elif spo2 < 88:
            vital_abnormality += 20
            news2_points += 2
            factors.append(f"SpO₂ ({spo2:.0f}%) below prescribed target range (88–92%)")
        elif spo2 > 96:
            vital_abnormality += 10
            news2_points += 2
            factors.append(f"SpO₂ ({spo2:.0f}%) elevated above safe limit for hypercapnia")
    else:
        # Scale 1: Standard
        if spo2 <= 91:
            vital_abnormality += 35
            news2_points += 3
            factors.append(f"SpO₂ ({spo2:.0f}%) significantly below standard threshold (< 92%)")
        elif spo2 <= 94:
            vital_abnormality += 18
            news2_points += 1
            factors.append(f"SpO₂ ({spo2:.0f}%) moderately hypoxic (92–94%)")

    # Heart Rate evaluation
    if hr >= 140:
        vital_abnormality += 28
        news2_points += 3
        factors.append(f"Extreme tachycardia: Heart rate {hr:.0f} bpm")
    elif hr >= 115:
        vital_abnormality += 16
        news2_points += 2
        factors.append(f"Moderate tachycardia: Heart rate {hr:.0f} bpm")
    elif hr >= 95:
        vital_abnormality += 8
        news2_points += 1
    elif hr < 45:
        vital_abnormality += 28
        news2_points += 3
        factors.append(f"Severe bradycardia: Heart rate {hr:.0f} bpm")
    elif hr < 52:
        vital_abnormality += 14
        news2_points += 1

    # Respiratory Rate evaluation
    if rr >= 25:
        vital_abnormality += 24
        news2_points += 3
        factors.append(f"Critical tachypnea: Respiratory rate {rr:.1f} /min")
    elif rr >= 21:
        vital_abnormality += 14
        news2_points += 2
        factors.append(f"Elevated respiratory rate {rr:.1f} /min")
    elif rr <= 8:
        vital_abnormality += 24
        news2_points += 3
        factors.append(f"Severe bradypnea: Respiratory rate {rr:.1f} /min")
    elif rr <= 11:
        vital_abnormality += 12
        news2_points += 1

    # Temperature evaluation
    if temp >= 38.5:
        vital_abnormality += 18
        news2_points += 2
        factors.append(f"Hyperpyrexia: Temperature {temp:.1f} °C")
    elif temp >= 37.8:
        vital_abnormality += 8
        news2_points += 1
        factors.append(f"Low-grade fever: Temperature {temp:.1f} °C")
    elif temp < 35.5:
        vital_abnormality += 18
        news2_points += 3
        factors.append(f"Hypothermia: Temperature {temp:.1f} °C")

    vital_abnormality = min(45.0, vital_abnormality)

    # ── 3. Component B: Trend Severity & Rolling Baseline (0 to 25 points) ──
    trend_severity = 0.0
    trend_str = "Stable"
    reading_progression = f"{spo2:.0f}%"

    if history and len(history) >= 4:
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

        if len(past_spo2) >= 3:
            first_s = past_spo2[0]
            mid_s = past_spo2[len(past_spo2) // 2]
            last_s = past_spo2[-1]
            diff = first_s - last_s
            reading_progression = f"{first_s:.0f}% → {mid_s:.0f}% → {last_s:.0f}%"

            if diff >= 3.0:
                trend_severity += 22.0
                trend_str = "Sustained downward trend"
                factors.append(f"Sustained downward trend ({reading_progression}) over rolling baseline")
            elif diff >= 1.5:
                trend_severity += 12.0
                trend_str = "Downward vital drift"
                factors.append(f"Gradual downward drift ({first_s:.0f}% → {last_s:.0f}%)")

        if len(past_hr) >= 3:
            hr_diff = past_hr[-1] - min(past_hr[:-1])
            if hr_diff >= 35.0:
                trend_severity = max(trend_severity, 24.0)
                trend_str = "Rapid acute tachycardia surge"
                reading_progression = f"HR {past_hr[0]:.0f} → {past_hr[-1]:.0f} bpm"
                factors.append(f"Rapid acute heart rate surge (+{hr_diff:.0f} bpm)")

    trend_severity = min(25.0, trend_severity)

    # ── 4. Component C: Patient Clinical Context from Synthea (0 to 20 points) ──
    patient_context_score = 0.0
    cond_str = " ".join(str(c).lower() for c in conditions_list)

    has_respiratory = any(term in cond_str for term in ["copd", "asthma", "pulmonary", "emphysema", "bronchitis"])
    has_cardio = any(term in cond_str for term in ["heart failure", "hypertension", "infarction", "fibrillation", "cardiac", "artery"])

    if has_respiratory and (spo2 <= 94 or rr >= 21):
        patient_context_score += 18.0
        factors.append(f"Respiratory history ({primary_fact}) elevates hypoxia alert relevance")

    if has_cardio and (hr >= 110 or hr <= 52 or sbp >= 140):
        patient_context_score += 18.0
        factors.append(f"Cardiovascular clinical context ({primary_fact}) elevates tachyarrhythmia alert relevance")

    if patient_context_score == 0 and conditions_list:
        patient_context_score = 5.0
        factors.append(f"Patient Fact: {primary_fact}")

    patient_context_score = min(20.0, patient_context_score)

    # ── 5. Component D: Patient-Reported Symptoms (0 to 10 points) ──
    symptom_score = 0.0
    b_sym = symptoms.get("breathlessness", "None")
    f_sym = symptoms.get("fever", "Normal")
    d_sym = symptoms.get("dizziness", "None")

    if b_sym in ("Moderate", "Severe"):
        symptom_score += 6.0
        news2_points += 1
        factors.append(f"Patient-reported symptom: {b_sym} breathlessness")
    elif b_sym == "Mild":
        symptom_score += 2.0
        factors.append("Patient-reported symptom: Mild breathlessness")

    if f_sym in ("Mild fever", "High fever"):
        symptom_score += 3.0
        factors.append(f"Patient-reported symptom: {f_sym}")

    if d_sym in ("Mild", "Severe"):
        symptom_score += 3.0
        factors.append(f"Patient-reported symptom: {d_sym} dizziness")

    symptom_score = min(10.0, symptom_score)

    # ── Final Risk Score & Alert Categorization (WATCH / REVIEW / URGENT) ──
    raw_total = vital_abnormality + trend_severity + patient_context_score + symptom_score
    total_score = max(0, min(100, int(round(raw_total))))

    # NEWS2 Early Warning Score
    early_warning_score = min(14, news2_points)
    if early_warning_score >= 7 or total_score >= 70:
        early_warning_tier = "High"
        early_warning_label = f"{early_warning_score} · High (Urgent)"
        alert_level = "URGENT"
    elif early_warning_score >= 4 or total_score >= 45:
        early_warning_tier = "Moderate"
        early_warning_label = f"{early_warning_score} · Moderate"
        alert_level = "REVIEW"
    elif early_warning_score >= 1 or total_score >= 25:
        early_warning_tier = "Low"
        early_warning_label = f"{early_warning_score} · Watch"
        alert_level = "WATCH"
    else:
        early_warning_tier = "Low"
        early_warning_label = f"{early_warning_score} · Low"
        alert_level = "WATCH"

    # Reading -> Rule -> Patient Fact Formatting
    rule_str = trend_str if trend_str != "Stable" else ("Threshold deviation" if vital_abnormality > 15 else "Baseline stability")
    alert_title = f"{alert_level}: SpO₂ gradually decreasing" if (spo2 <= 94 and "downward" in trend_str.lower()) else f"{alert_level}: Vital sign divergence"

    return {
        "patient_id": pid,
        "patient_name": patient.get("name", "Robert Thompson"),
        "risk_score": total_score,
        "risk_level": "HIGH" if total_score >= 70 else ("MODERATE" if total_score >= 45 else "LOW"),
        "early_warning_score": early_warning_score,
        "early_warning_tier": early_warning_tier,
        "early_warning_label": early_warning_label,
        "alert_level": alert_level,  # WATCH | REVIEW | URGENT
        "alert_category": "CLINICAL_DETERIORATION",
        "reading": reading_progression if "→" in reading_progression else f"SpO₂: {spo2:.0f}% | HR: {hr:.0f} bpm | RR: {rr:.1f}/min",
        "rule": rule_str,
        "patient_fact": primary_fact,
        "action": "Immediate clinical review requested" if alert_level == "URGENT" else "Review patient bedside trajectory",
        "components": {
            "vital_abnormality": int(round(vital_abnormality)),
            "trend_severity": int(round(trend_severity)),
            "patient_context": int(round(patient_context_score)),
            "symptoms": int(round(symptom_score)),
        },
        "factors": factors or ["Vital signs consistent with resting baseline"],
        "alert_title": alert_title,
        "alert_reason": f"Reading: {reading_progression} | Rule: {rule_str} | Patient fact: {primary_fact}",
        "is_sensor_issue": False,
        "is_device_issue": False,
        "symptoms": symptoms,
        "primary_condition": primary_fact,
        "conditions": conditions_list,
        "medications": patient.get("medications", []),
        "disclaimer": "Decision-support suggestion — not a clinical diagnosis.",
    }
