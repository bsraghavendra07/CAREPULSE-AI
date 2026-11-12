"""
Explainable Clinical Alert Cards Generator (Innovation 4 & PS-03 Requirement 3.6)
Generates transparent, auditable clinical alert cards detailing:
- Current vs Previous reading deltas
- Applied personalization rules (Rule 1: Scale 2, Rule 2: Rolling baseline)
- Specific patient profile factors that influenced scoring
- Step-by-step clinical justification
- Recommended clinical protocol action
- Multilingual translations (English, Kannada, Hindi)
- Statutory Clinical Decision Support disclaimer
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone


def generate_multilingual_summary(tier: str, reason: str, patient_name: str) -> Dict[str, str]:
    """Generates localized alert briefings for clinical care teams."""
    if tier == "URGENT":
        return {
            "en": f"CRITICAL ALERT: Patient {patient_name} requires immediate medical review. Reason: {reason}.",
            "kn": f"ತುರ್ತು ಎಚ್ಚರಿಕೆ: ರೋಗಿ {patient_name} ತಕ್ಷಣದ ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆಗೆ ಒಳಗಾಗಬೇಕಾಗಿದೆ. ಕಾರಣ: {reason}.",
            "hi": f"आपातकालीन चेतावनी: मरीज {patient_name} को तत्काल चिकित्सीय समीक्षा की आवश्यकता है। कारण: {reason}।"
        }
    elif tier == "REVIEW":
        return {
            "en": f"CLINICAL REVIEW: Patient {patient_name} showing concerning vital drifts. Reason: {reason}.",
            "kn": f"ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ: ರೋಗಿ {patient_name} ಅವರ ಆರೋಗ್ಯ ಸಂಕೇತಗಳಲ್ಲಿ ಗಮನಾರ್ಹ ಬದಲಾವಣೆ ಕಂಡುಬಂದಿದೆ. ಕಾರಣ: {reason}.",
            "hi": f"चिकित्सीय समीक्षा: मरीज {patient_name} के महत्वपूर्ण संकेतों में चिंताजनक बदलाव दिख रहे हैं। कारण: {reason}।"
        }
    elif tier == "SENSOR_WARNING":
        return {
            "en": f"SENSOR ALERT: Sensor issue detected for {patient_name}. Data cannot be trusted. Reason: {reason}.",
            "kn": f"ಸೆನ್ಸರ್ ಎಚ್ಚರಿಕೆ: {patient_name} ಅವರ ಉಪಕರಣದಲ್ಲಿ ದೋಷ ಕಂಡುಬಂದಿದೆ. ದಯವಿಟ್ಟು ಸಾಧನವನ್ನು ಪರಿಶೀಲಿಸಿ. ಕಾರಣ: {reason}.",
            "hi": f"सेंसर चेतावनी: {patient_name} के उपकरण में त्रुटि पाई गई है। कृपया सेंसर की जांच करें। कारण: {reason}।"
        }
    else:
        return {
            "en": f"WATCH: Patient {patient_name} vital signs are within stable recovery parameters.",
            "kn": f"ಸ್ಥಿರ ಚೇತರಿಕೆ: ರೋಗಿ {patient_name} ಅವರ ಆರೋಗ್ಯ ಸಂಕೇತಗಳು ಸಹಜ ಸ್ಥಿತಿಯಲ್ಲಿವೆ.",
            "hi": f"स्थिर स्थिति: मरीज {patient_name} के महत्वपूर्ण संकेत सामान्य और स्थिर हैं।"
        }


def build_explainable_alert_card(
    patient_profile: Dict[str, Any],
    current_vitals: Dict[str, Optional[float]],
    previous_vitals: Optional[Dict[str, Optional[float]]],
    news2_result: Dict[str, Any],
    sensor_verdict: Dict[str, Any],
    radar_result: Dict[str, Any],
    personalized_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synthesizes intelligence engine outputs into an explainable clinical alert card.
    """
    patient_id = patient_profile.get("patient_id", "Unknown")
    patient_name = patient_profile.get("name", "Unknown Patient")
    
    # Check if sensor truth engine detected an artifact
    if not sensor_verdict.get("is_valid", True):
        tier = "SENSOR_WARNING"
        reason = sensor_verdict.get("explanation", "Sensor artifact detected")
        clinical_action = "Inspect wearable placement; re-attach probe or check Bluetooth connectivity. Clinical alarm suppressed to avoid alarm fatigue."
        applied_rules = ["Sensor Truth Engine: Physiological Plausibility & Artifact Suppression Filter"]
        reasons_list = [
            f"Artifact Class: {sensor_verdict.get('artifact_type')}",
            sensor_verdict.get("explanation"),
            "False clinical emergency suppressed to protect clinician attention."
        ]
    else:
        # Clinical Tier driven by NEWS2 + Radar + Personalized rules
        tier = news2_result.get("tier", "WATCH")
        
        # If Early Deterioration Radar detected acute drift before NEWS2 crossed 5, elevate to REVIEW
        if radar_result.get("early_warning_active") and tier == "WATCH":
            tier = "REVIEW"

        reasons_list = []
        applied_rules = []

        # Document Rule 1
        if personalized_result.get("has_hypercapnic_failure"):
            applied_rules.append("Rule 1: NEWS2 SpO2 Scale 2 applied (Target: 88-92% for documented Hypercapnic Respiratory Failure / COPD)")
        else:
            applied_rules.append("Rule 1: Standard NEWS2 SpO2 Scale 1 applied (Target: ≥96%)")

        # Document Rule 2
        if personalized_result.get("has_personalized_alert"):
            applied_rules.append("Rule 2: Individual Rolling Baseline Deviation Triggered (detected departure from patient's 7-day recovery mean)")
            for flag in personalized_result.get("baseline_flags", []):
                reasons_list.append(flag)

        # Document Radar findings
        if radar_result.get("early_warning_active"):
            applied_rules.append(f"Early Deterioration Radar: Trajectory Velocity Alert ({radar_result.get('status')})")
            reasons_list.append(radar_result.get("summary"))

        # Add NEWS2 reasons
        for param, detail in news2_result.get("breakdown", {}).items():
            if detail.get("score", 0) > 0:
                reasons_list.append(f"{param.replace('_', ' ').title()}: {detail.get('description')} (+{detail.get('score')} pts)")

        if not reasons_list:
            reasons_list.append("All observed vital signs conform to personal recovery baseline.")

        reason = reasons_list[0] if reasons_list else "Routine post-discharge vital tracking."
        clinical_action = news2_result.get("recommended_action")

    # Build parameter comparison table
    param_table = []
    prev = previous_vitals or {}
    
    params = [
        ("Oxygen Saturation (SpO2)", "spo2", "%", 95.0),
        ("Heart Rate", "heart_rate", "bpm", 75.0),
        ("Respiratory Rate", "respiratory_rate", "bpm", 16.0),
        ("Body Temperature", "body_temperature", "°C", 36.8)
    ]
    
    for label, key, unit, default_val in params:
        curr_val = current_vitals.get(key)
        prev_val = prev.get(key)
        delta_str = f"{(curr_val - prev_val):+.1f} {unit}" if (curr_val is not None and prev_val is not None) else "N/A"
        
        param_table.append({
            "parameter": label,
            "key": key,
            "unit": unit,
            "previous": f"{prev_val:.1f} {unit}" if prev_val is not None else "--",
            "current": f"{curr_val:.1f} {unit}" if curr_val is not None else "--",
            "delta": delta_str
        })

    multilingual = generate_multilingual_summary(tier, reason, patient_name)

    card = {
        "alert_id": f"alert-{int(datetime.now().timestamp() * 1000)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "patient_id": patient_id,
        "patient_name": patient_name,
        "tier": tier,
        "reason": reason,
        "parameters": param_table,
        "applied_rules": applied_rules,
        "clinical_reasons": reasons_list,
        "patient_context": {
            "age": patient_profile.get("age"),
            "gender": patient_profile.get("gender"),
            "conditions": patient_profile.get("conditions", []),
            "medications": patient_profile.get("medications", []),
            "discharge_baseline": patient_profile.get("discharge_baseline", {})
        },
        "news2_total": news2_result.get("total_score", 0),
        "news2_tier": news2_result.get("tier", "WATCH"),
        "sensor_verdict": sensor_verdict,
        "radar_score": radar_result.get("radar_score", 0),
        "radar_lead_time_minutes": radar_result.get("lead_time_minutes_ahead", 0),
        "recommended_action": clinical_action,
        "multilingual_briefs": multilingual,
        "disclaimer": "CLINICAL DECISION SUPPORT NOTICE: This alert is generated by an algorithmic early-warning model intended for certified medical professional review. It is not an automated medical diagnosis or prescription."
    }
    
    return card
