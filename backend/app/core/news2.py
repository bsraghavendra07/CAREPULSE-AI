"""
MINEARENA 1.0 — NEWS2 scoring engine.

Implements the exact National Early Warning Score 2 (NEWS2) per the
Royal College of Physicians (RCP) December 2017 chart.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "LOW"
    LOW_MEDIUM = "LOW_MEDIUM"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ScaleUsed(str, Enum):
    SCALE_1 = "SCALE_1"
    SCALE_2 = "SCALE_2"


# ─── Clinical Personalization Rule 1: SpO2 Scale Evaluation ──────────────────

def evaluate_hypercapnic_failure(clinical_info: Any) -> tuple[bool, str, str]:
    """Inspects patient FHIR clinical conditions and documentation for hypercapnic respiratory failure.
    
    Rule:
    If the patient has documented hypercapnic respiratory failure (or COPD with CO2 retention /
    hypercapnic respiratory drive), use SpO2 Scale 2 rather than standard Scale 1.
    Target range: 88-92%.
    
    Parameters
    ----------
    clinical_info : Any
        String condition name, list of FHIR condition resources, or dict.
        
    Returns
    -------
    tuple[bool, str, str]
        (is_scale2_prescribed, target_range, justification)
    """
    if not clinical_info:
        return False, "≥96%", "Standard SpO₂ Scale 1 (no hypercapnic respiratory failure documented)"

    text_to_check = ""
    if isinstance(clinical_info, str):
        text_to_check = clinical_info.lower()
    elif isinstance(clinical_info, list):
        items = []
        for it in clinical_info:
            if isinstance(it, str):
                items.append(it)
            elif isinstance(it, dict):
                # FHIR Condition resource extraction
                code_text = it.get("code", {}).get("text", "")
                coding = " ".join([c.get("display", "") for c in it.get("code", {}).get("coding", [])])
                items.append(f"{code_text} {coding}")
        text_to_check = " ".join(items).lower()
    elif isinstance(clinical_info, dict):
        cond_str = str(clinical_info.get("condition", ""))
        risk_str = str(clinical_info.get("risk_summary", clinical_info.get("riskSummary", "")))
        text_to_check = f"{cond_str} {risk_str}".lower()

    keywords = [
        "hypercapnic",
        "hypercapnia",
        "co2 retention",
        "type 2 respiratory failure",
        "type ii respiratory failure",
        "hypercarbia",
    ]

    has_hypercapnic = any(kw in text_to_check for kw in keywords)

    # Check for COPD exacerbation with documented scale2 prescription flag
    if not has_hypercapnic and isinstance(clinical_info, dict):
        if clinical_info.get("scale2_prescribed") is True:
            has_hypercapnic = True

    if has_hypercapnic:
        return (
            True,
            "88–92%",
            "SpO₂ Scale 2 selected because hypercapnic respiratory failure is documented for this patient (target 88–92%).",
        )
    return (
        False,
        "≥96%",
        "Standard SpO₂ Scale 1 selected (no hypercapnic respiratory failure documented).",
    )


# ─── Result Model ─────────────────────────────────────────────────────────────

class NEWS2Result(BaseModel):
    """Outcome of a single NEWS2 calculation."""

    total_score: int
    sub_scores: dict[str, int]
    components: dict[str, Optional[int]] = Field(default_factory=dict)
    missing_parameters: list[str] = Field(default_factory=list)
    unreliable_components: list[str] = Field(default_factory=list)
    suppressed_due_to_artifact: bool = False
    artifact_suppression_note: Optional[str] = None
    primary_contributors: list[str] = Field(default_factory=list)
    scale_used: ScaleUsed
    scale2_prescribed: bool
    scale2_justification: Optional[str] = None
    target_spo2_range: str = "≥96%"
    risk_level: RiskLevel
    has_red_score: bool = False
    red_score_parameter: Optional[str] = None
    triage_tier: str = "ROUTINE"  # ROUTINE | WATCH | REVIEW | URGENT
    alert_reason: str = "All parameters within routine limits"
    clinical_action: str = "Ward-based response, minimum 12-hourly monitoring"


# ─── Individual parameter scoring functions ───────────────────────────────────

def _score_respiration_rate(rr: float) -> int:
    """Respiration Rate (breaths/min)."""
    if rr <= 8:
        return 3
    if rr <= 11:
        return 1
    if rr <= 20:
        return 0
    if rr <= 24:
        return 2
    return 3  # ≥25


def _score_spo2_scale1(spo2: float) -> int:
    """SpO2 Scale 1 (%)."""
    if spo2 <= 91:
        return 3
    if spo2 <= 93:
        return 2
    if spo2 <= 95:
        return 1
    return 0  # ≥96


def _score_spo2_scale2(spo2: float, supplemental_oxygen: bool) -> int:
    """SpO2 Scale 2 (%).

    Scale 2 is designed for patients with a prescribed target SpO2 of 88-92 %,
    e.g. those at risk of hypercapnic respiratory failure.
    """
    if spo2 <= 83:
        return 3
    if spo2 <= 85:
        return 2
    if spo2 <= 87:
        return 1
    if spo2 <= 92:
        # 88-92 on air = 0
        if not supplemental_oxygen:
            return 0
        # 88-92 on O2: the RCP chart gives 0 for 88-92 on air.
        # On O2 within 88-92 we still score 0 because the O2 scoring
        # only raises the score above 92 when on O2.
        return 0
    if spo2 <= 94:
        # 93-94 on O2 → 1; on air → 0 (not expected to reach here for air
        # patients since target is 88-92, but follow the chart)
        if supplemental_oxygen:
            return 1
        return 0
    if spo2 <= 96:
        # 95-96 on O2 → 2
        if supplemental_oxygen:
            return 2
        return 0
    # ≥97 on O2 → 3
    if supplemental_oxygen:
        return 3
    return 0  # ≥97 on air


def _score_supplemental_oxygen(supplemental_oxygen: bool) -> int:
    """Air or Oxygen: Air = 0, Oxygen = +2."""
    return 2 if supplemental_oxygen else 0


def _score_systolic_bp(sbp: float) -> int:
    """Systolic Blood Pressure (mmHg)."""
    if sbp <= 90:
        return 3
    if sbp <= 100:
        return 2
    if sbp <= 110:
        return 1
    if sbp <= 219:
        return 0
    return 3  # ≥220


def _score_pulse(hr: float) -> int:
    """Pulse / Heart Rate (bpm)."""
    if hr <= 40:
        return 3
    if hr <= 50:
        return 2
    if hr <= 90:
        return 0
    if hr <= 110:
        return 1
    if hr <= 130:
        return 2
    return 3  # ≥131


def _score_consciousness(acvpu: str) -> int:
    """Consciousness level (ACVPU).

    A = Alert → 0
    C, V, P, U → 3
    """
    if acvpu.upper() in ("A", "ALERT"):
        return 0
    return 3


def _score_temperature(temp: float) -> int:
    """Temperature (°C)."""
    if temp <= 35.0:
        return 3
    if temp <= 36.0:
        return 1
    if temp <= 38.0:
        return 0
    if temp <= 39.0:
        return 1
    return 2  # ≥39.1


# ─── Risk classification ─────────────────────────────────────────────────────

def _classify_risk(total_score: int, sub_scores: dict[str, int]) -> RiskLevel:
    """Determine clinical risk level.

    • LOW        — aggregate 0-4, no single parameter = 3
    • LOW_MEDIUM — aggregate 0-4, but any single parameter = 3
    • MEDIUM     — aggregate 5-6
    • HIGH       — aggregate ≥ 7
    """
    if total_score >= 7:
        return RiskLevel.HIGH
    if total_score >= 5:
        return RiskLevel.MEDIUM
    # 0-4: check for any single "red" score of 3
    if any(v == 3 for v in sub_scores.values()):
        return RiskLevel.LOW_MEDIUM
    return RiskLevel.LOW


# ─── Main scoring function ────────────────────────────────────────────────────

def calculate_news2(
    vitals: dict,
    scale2_prescribed: bool,
    supplemental_oxygen: bool,
    unreliable_signals: Optional[list[str]] = None,
) -> NEWS2Result:
    """Calculate the NEWS2 score for a set of vital signs with signal quality awareness.

    Parameters
    ----------
    vitals : dict
        Must contain keys: ``hr``, ``rr``, ``spo2``, ``sbp``, ``temp``,
        ``acvpu`` (str, one of A/C/V/P/U).
    scale2_prescribed : bool
        Whether SpO2 Scale 2 has been prescribed for this patient.
        Scale 2 is **never** auto-selected.
    supplemental_oxygen : bool
        Whether the patient is currently receiving supplemental oxygen.
    unreliable_signals : list[str], optional
        List of parameters deemed unreliable (e.g. ['spo2'] for probe removal).
        Unreliable parameters are not scored as acute deterioration.

    Returns
    -------
    NEWS2Result
    """
    unrel_set = set(unreliable_signals or [])
    def _get_f(d: dict, *keys: str) -> tuple[Optional[float], bool]:
        """Extract float value or None if missing."""
        for k in keys:
            if k in d:
                v = d.get(k)
                if v is not None:
                    if isinstance(v, dict):
                        v = v.get("value")
                    try:
                        return float(v), True
                    except (ValueError, TypeError):
                        continue
        return None, False

    rr_val, rr_present = _get_f(vitals, "rr", "respiratory_rate")
    spo2_val, spo2_present = _get_f(vitals, "spo2", "oxygen_saturation")
    sbp_val, sbp_present = _get_f(vitals, "sbp", "systolic_bp")
    hr_val, hr_present = _get_f(vitals, "hr", "heart_rate")
    temp_val, temp_present = _get_f(vitals, "temp", "body_temperature")

    raw_acvpu = vitals.get("acvpu")
    if raw_acvpu is None and "consciousness" in vitals:
        raw_acvpu = vitals.get("consciousness")
    acvpu_present = raw_acvpu is not None

    if isinstance(raw_acvpu, dict):
        raw_acvpu = raw_acvpu.get("value", "A")
    acvpu = str(raw_acvpu if raw_acvpu is not None else "A").upper()

    # Track missing parameters and unreliable components
    missing_parameters: list[str] = []
    unreliable_components: list[str] = []
    suppressed_due_to_artifact: bool = False
    artifact_suppression_note: Optional[str] = None

    if not rr_present:
        missing_parameters.append("respiratory_rate")
    if not spo2_present:
        missing_parameters.append("oxygen_saturation")
    if not sbp_present:
        missing_parameters.append("systolic_bp")
    if not hr_present:
        missing_parameters.append("heart_rate")
    if not temp_present:
        missing_parameters.append("body_temperature")

    # Compute sub-scores (0 if missing, but marked in missing_parameters)
    sub_scores: dict[str, int] = {}
    components: dict[str, Optional[int]] = {}
    primary_contributors: list[str] = []

    # 1. Respiration Rate
    if "rr" in unrel_set or "respiratory_rate" in unrel_set:
        sub_scores["rr"] = 0
        components["respiratory_rate"] = None
        unreliable_components.append("respiratory_rate")
        suppressed_due_to_artifact = True
        primary_contributors.append("RR: Unreliable sensor signal (excluded from acute score)")
    elif rr_present and rr_val is not None:
        rr_score = _score_respiration_rate(rr_val)
        sub_scores["rr"] = rr_score
        components["respiratory_rate"] = rr_score
        if rr_score >= 2:
            primary_contributors.append(f"Elevated respiratory rate ({rr_val:.0f} /min, Score {rr_score})")
        elif rr_score == 1:
            primary_contributors.append(f"Mild tachypnea/bradypnea ({rr_val:.0f} /min, Score 1)")
    else:
        sub_scores["rr"] = 0
        components["respiratory_rate"] = None

    # 2. Systolic BP
    if "sbp" in unrel_set or "systolic_bp" in unrel_set:
        sub_scores["sbp"] = 0
        components["systolic_bp"] = None
        unreliable_components.append("systolic_bp")
        suppressed_due_to_artifact = True
        primary_contributors.append("SBP: Unreliable sensor signal (excluded from acute score)")
    elif sbp_present and sbp_val is not None:
        sbp_score = _score_systolic_bp(sbp_val)
        sub_scores["sbp"] = sbp_score
        components["systolic_bp"] = sbp_score
        if sbp_score >= 2:
            primary_contributors.append(f"Hypotension/Severe hypertension (SBP {sbp_val:.0f} mmHg, Score {sbp_score})")
        elif sbp_score == 1:
            primary_contributors.append(f"Borderline SBP ({sbp_val:.0f} mmHg, Score 1)")
    else:
        sub_scores["sbp"] = 0
        components["systolic_bp"] = None

    # 3. Pulse / HR
    if "hr" in unrel_set or "heart_rate" in unrel_set:
        sub_scores["hr"] = 0
        components["heart_rate"] = None
        unreliable_components.append("heart_rate")
        suppressed_due_to_artifact = True
        primary_contributors.append("Heart Rate: Unreliable sensor signal (excluded from acute score)")
    elif hr_present and hr_val is not None:
        hr_score = _score_pulse(hr_val)
        sub_scores["hr"] = hr_score
        components["heart_rate"] = hr_score
        if hr_score >= 2:
            primary_contributors.append(f"Tachycardia/Bradycardia ({hr_val:.0f} bpm, Score {hr_score})")
        elif hr_score == 1:
            primary_contributors.append(f"Borderline heart rate ({hr_val:.0f} bpm, Score 1)")
    else:
        sub_scores["hr"] = 0
        components["heart_rate"] = None

    # 4. Temperature
    if "temp" in unrel_set or "body_temperature" in unrel_set:
        sub_scores["temp"] = 0
        components["temperature"] = None
        unreliable_components.append("body_temperature")
        suppressed_due_to_artifact = True
        primary_contributors.append("Temperature: Unreliable sensor signal (excluded from acute score)")
    elif temp_present and temp_val is not None:
        temp_score = _score_temperature(temp_val)
        sub_scores["temp"] = temp_score
        components["temperature"] = temp_score
        if temp_score >= 2:
            primary_contributors.append(f"Pyrexia/Hypothermia ({temp_val:.1f} °C, Score {temp_score})")
        elif temp_score == 1:
            primary_contributors.append(f"Mild abnormal temperature ({temp_val:.1f} °C, Score 1)")
    else:
        sub_scores["temp"] = 0
        components["temperature"] = None

    # 5. Consciousness (ACVPU)
    acvpu_score = _score_consciousness(acvpu)
    sub_scores["acvpu"] = acvpu_score
    components["consciousness"] = acvpu_score
    if acvpu_score > 0:
        primary_contributors.append(f"Altered consciousness ({acvpu}, Score {acvpu_score})")

    # 6. Supplemental Oxygen
    o2_score = _score_supplemental_oxygen(supplemental_oxygen)
    sub_scores["supplemental_oxygen"] = o2_score
    components["supplemental_oxygen"] = o2_score
    if o2_score > 0:
        primary_contributors.append("Supplemental oxygen prescribed (Score 2)")

    # 7. SpO2 — Scale 1 vs Scale 2 selection & Unreliability Suppression
    target_spo2_range = "≥96%"
    spo2_unreliable = "spo2" in unrel_set or "oxygen_saturation" in unrel_set

    if scale2_prescribed:
        target_spo2_range = "88–92%"
        if spo2_unreliable:
            sub_scores["spo2"] = 0
            components["spo2"] = None
            unreliable_components.append("spo2")
            suppressed_due_to_artifact = True
            primary_contributors.append("SpO₂: Unreliable reading (probe removed / artifact) - suppressed from NEWS2")
        elif spo2_present and spo2_val is not None:
            spo2_score = _score_spo2_scale2(spo2_val, supplemental_oxygen)
            sub_scores["spo2"] = spo2_score
            components["spo2"] = spo2_score
            if spo2_score >= 2:
                primary_contributors.append(f"SpO₂ off Scale 2 target ({spo2_val:.0f}%, Score {spo2_score})")
            elif spo2_score == 1:
                primary_contributors.append(f"SpO₂ mild Scale 2 deviation ({spo2_val:.0f}%, Score 1)")
        else:
            sub_scores["spo2"] = 0
            components["spo2"] = None

        scale_used = ScaleUsed.SCALE_2
        scale2_justification = (
            "SpO₂ Scale 2 selected because hypercapnic respiratory failure is documented for this patient (target 88–92%)."
        )
    else:
        if spo2_unreliable:
            sub_scores["spo2"] = 0
            components["spo2"] = None
            unreliable_components.append("spo2")
            suppressed_due_to_artifact = True
            primary_contributors.append("SpO₂: Unreliable reading (probe removed / artifact) - suppressed from NEWS2")
        elif spo2_present and spo2_val is not None:
            spo2_score = _score_spo2_scale1(spo2_val)
            sub_scores["spo2"] = spo2_score
            components["spo2"] = spo2_score
            if spo2_score >= 2:
                primary_contributors.append(f"Low SpO₂ ({spo2_val:.0f}%, Score {spo2_score})")
            elif spo2_score == 1:
                primary_contributors.append(f"Borderline low SpO₂ ({spo2_val:.0f}%, Score 1)")
        else:
            sub_scores["spo2"] = 0
            components["spo2"] = None

        scale_used = ScaleUsed.SCALE_1
        scale2_justification = None

    if suppressed_due_to_artifact:
        artifact_suppression_note = (
            "Clinical deterioration alert suppressed for unreliable sensor channel(s). "
            f"Unreliable signals: {', '.join(unreliable_components)}."
        )

    total_score = sum(sub_scores.values())

    # Red score detection (any single parameter = 3)
    red_params = [k for k, v in sub_scores.items() if v == 3]
    has_red_score = len(red_params) > 0
    red_score_parameter = red_params[0] if red_params else None

    risk_level = _classify_risk(total_score, sub_scores)

    # Explicit Triage Tier Mapping per Problem Statement
    if total_score >= 7:
        triage_tier = "URGENT"
        alert_reason = f"Severe multi-organ physiological deterioration (NEWS2 = {total_score})"
        clinical_action = "Emergency critical care assessment & continuous monitoring"
    elif total_score >= 5:
        triage_tier = "REVIEW"
        alert_reason = f"Medium physiological deviation (NEWS2 = {total_score})"
        clinical_action = "Urgent clinical review by acute competency team (minimum 1-hourly)"
    elif has_red_score:
        triage_tier = "WATCH"
        alert_reason = f"Single extreme parameter trigger: {str(red_score_parameter).upper()} = Score 3"
        clinical_action = "Urgent ward-based review by doctor to determine cause & escalation"
    else:
        triage_tier = "ROUTINE"
        alert_reason = "All vital signs within routine thresholds"
        clinical_action = "Routine post-discharge ward monitoring (minimum 12-hourly)"

    return NEWS2Result(
        total_score=total_score,
        sub_scores=sub_scores,
        components=components,
        missing_parameters=missing_parameters,
        unreliable_components=unreliable_components,
        suppressed_due_to_artifact=suppressed_due_to_artifact,
        artifact_suppression_note=artifact_suppression_note,
        primary_contributors=primary_contributors,
        scale_used=scale_used,
        scale2_prescribed=scale2_prescribed,
        scale2_justification=scale2_justification,
        target_spo2_range=target_spo2_range,
        risk_level=risk_level,
        has_red_score=has_red_score,
        red_score_parameter=red_score_parameter,
        triage_tier=triage_tier,
        alert_reason=alert_reason,
        clinical_action=clinical_action,
    )
