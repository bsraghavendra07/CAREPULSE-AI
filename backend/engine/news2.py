"""
Royal College of Physicians (RCP) NEWS2 Scoring Engine
Implements the official National Early Warning Score 2 with full adherence to:
- Official parameter point thresholds
- SpO2 Scale 1 (standard) and SpO2 Scale 2 (hypercapnic respiratory failure)
- Mandatory single-parameter RED score triggers (score = 3 on any single parameter)
- Clinical risk tier mapping: WATCH (Low), REVIEW (Medium), URGENT (High)
"""

from typing import Dict, Any, Optional, Tuple


def score_respiratory_rate(rr: Optional[float]) -> Tuple[int, str]:
    if rr is None:
        return 0, "Not recorded"
    if rr <= 8:
        return 3, f"Severe Bradypnea (≤8 bpm: {rr:.1f})"
    elif 9 <= rr <= 11:
        return 1, f"Mild Bradypnea (9-11 bpm: {rr:.1f})"
    elif 12 <= rr <= 20:
        return 0, f"Normal (12-20 bpm: {rr:.1f})"
    elif 21 <= rr <= 24:
        return 2, f"Moderate Tachypnea (21-24 bpm: {rr:.1f})"
    else:  # >= 25
        return 3, f"Severe Tachypnea (≥25 bpm: {rr:.1f})"


def score_spo2(
    spo2: Optional[float], 
    scale: int = 1, 
    supplemental_oxygen: bool = False
) -> Tuple[int, str]:
    if spo2 is None:
        return 0, "Not recorded"
    
    if scale == 2:
        # Scale 2: Hypercapnic Respiratory Failure (Target range 88-92%)
        if spo2 <= 83:
            return 3, f"Scale 2 Critical Hypoxemia (≤83%: {spo2:.1f}%)"
        elif 84 <= spo2 <= 85:
            return 2, f"Scale 2 Low (84-85%: {spo2:.1f}%)"
        elif 86 <= spo2 <= 87:
            return 1, f"Scale 2 Low-Normal (86-87%: {spo2:.1f}%)"
        elif 88 <= spo2 <= 92:
            return 0, f"Scale 2 Target Optimum (88-92%: {spo2:.1f}%)"
        elif 93 <= spo2 <= 94:
            pts = 1 if supplemental_oxygen else 0
            return pts, f"Scale 2 High ({spo2:.1f}%, O2={supplemental_oxygen})"
        elif 95 <= spo2 <= 96:
            pts = 2 if supplemental_oxygen else 0
            return pts, f"Scale 2 Excessive O2 ({spo2:.1f}%, O2={supplemental_oxygen})"
        else:  # >= 97
            pts = 3 if supplemental_oxygen else 0
            return pts, f"Scale 2 Toxic O2 Risk ({spo2:.1f}%, O2={supplemental_oxygen})"
    else:
        # Scale 1: Standard
        if spo2 <= 91:
            return 3, f"Severe Hypoxemia (≤91%: {spo2:.1f}%)"
        elif 92 <= spo2 <= 93:
            return 2, f"Moderate Hypoxemia (92-93%: {spo2:.1f}%)"
        elif 94 <= spo2 <= 95:
            return 1, f"Mild Hypoxemia (94-95%: {spo2:.1f}%)"
        else:  # >= 96
            return 0, f"Normal Oxygenation (≥96%: {spo2:.1f}%)"


def score_heart_rate(hr: Optional[float]) -> Tuple[int, str]:
    if hr is None:
        return 0, "Not recorded"
    if hr <= 40:
        return 3, f"Severe Bradycardia (≤40 bpm: {hr:.1f})"
    elif 41 <= hr <= 50:
        return 1, f"Mild Bradycardia (41-50 bpm: {hr:.1f})"
    elif 51 <= hr <= 90:
        return 0, f"Normal (51-90 bpm: {hr:.1f})"
    elif 91 <= hr <= 110:
        return 1, f"Mild Tachycardia (91-110 bpm: {hr:.1f})"
    elif 111 <= hr <= 130:
        return 2, f"Moderate Tachycardia (111-130 bpm: {hr:.1f})"
    else:  # >= 131
        return 3, f"Severe Tachycardia (≥131 bpm: {hr:.1f})"


def score_temperature(temp: Optional[float]) -> Tuple[int, str]:
    if temp is None:
        return 0, "Not recorded"
    if temp <= 35.0:
        return 3, f"Severe Hypothermia (≤35.0°C: {temp:.1f}°C)"
    elif 35.1 <= temp <= 36.0:
        return 1, f"Mild Hypothermia (35.1-36.0°C: {temp:.1f}°C)"
    elif 36.1 <= temp <= 38.0:
        return 0, f"Normal (36.1-38.0°C: {temp:.1f}°C)"
    elif 38.1 <= temp <= 39.0:
        return 1, f"Mild Pyrexia (38.1-39.0°C: {temp:.1f}°C)"
    else:  # >= 39.1
        return 2, f"High Pyrexia (≥39.1°C: {temp:.1f}°C)"


def score_systolic_bp(sbp: Optional[float]) -> Tuple[int, str]:
    if sbp is None:
        return 0, "Not recorded"
    if sbp <= 90:
        return 3, f"Severe Hypotension (≤90 mmHg: {sbp:.1f})"
    elif 91 <= sbp <= 100:
        return 2, f"Moderate Hypotension (91-100 mmHg: {sbp:.1f})"
    elif 101 <= sbp <= 110:
        return 1, f"Mild Hypotension (101-110 mmHg: {sbp:.1f})"
    elif 111 <= sbp <= 219:
        return 0, f"Normal SBP (111-219 mmHg: {sbp:.1f})"
    else:  # >= 220
        return 3, f"Severe Hypertension (≥220 mmHg: {sbp:.1f})"


def calculate_news2(
    respiratory_rate: Optional[float] = None,
    spo2: Optional[float] = None,
    heart_rate: Optional[float] = None,
    temperature: Optional[float] = None,
    systolic_bp: Optional[float] = None,
    supplemental_oxygen: bool = False,
    use_scale_2: bool = False
) -> Dict[str, Any]:
    """
    Computes total NEWS2 score, individual component points, breakdown, and alert tier.
    """
    scale = 2 if use_scale_2 else 1
    
    rr_score, rr_desc = score_respiratory_rate(respiratory_rate)
    spo2_score, spo2_desc = score_spo2(spo2, scale=scale, supplemental_oxygen=supplemental_oxygen)
    hr_score, hr_desc = score_heart_rate(heart_rate)
    temp_score, temp_desc = score_temperature(temperature)
    sbp_score, sbp_desc = score_systolic_bp(systolic_bp)
    o2_score = 2 if supplemental_oxygen else 0
    o2_desc = "On supplemental oxygen (+2)" if supplemental_oxygen else "Room air (0)"

    breakdown = {
        "respiratory_rate": {"score": rr_score, "description": rr_desc, "value": respiratory_rate},
        "spo2": {"score": spo2_score, "description": spo2_desc, "value": spo2, "scale": scale},
        "heart_rate": {"score": hr_score, "description": hr_desc, "value": heart_rate},
        "temperature": {"score": temp_score, "description": temp_desc, "value": temperature},
        "systolic_bp": {"score": sbp_score, "description": sbp_desc, "value": systolic_bp},
        "supplemental_oxygen": {"score": o2_score, "description": o2_desc, "value": supplemental_oxygen}
    }

    total_score = rr_score + spo2_score + hr_score + temp_score + sbp_score + o2_score
    has_red_score = any(item["score"] == 3 for item in breakdown.values())

    # Alert Tiers:
    # 0-2 (and no red score): WATCH (Low clinical risk)
    # 3-4 OR any single score of 3: REVIEW (Medium clinical risk)
    # >= 5: URGENT (High clinical risk)
    if total_score >= 5:
        tier = "URGENT"
        clinical_risk = "High Clinical Risk"
        recommended_action = "Immediate clinician review / emergency escalation according to acute care protocol"
    elif total_score >= 3 or has_red_score:
        tier = "REVIEW"
        clinical_risk = "Medium Clinical Risk"
        recommended_action = "Urgent clinical review by remote monitoring physician / nurse triage"
    else:
        tier = "WATCH"
        clinical_risk = "Low Clinical Risk"
        recommended_action = "Routine home monitoring; continue scheduled vital sign tracking"

    return {
        "total_score": total_score,
        "tier": tier,
        "clinical_risk": clinical_risk,
        "has_red_score": has_red_score,
        "use_scale_2": use_scale_2,
        "recommended_action": recommended_action,
        "breakdown": breakdown
    }
