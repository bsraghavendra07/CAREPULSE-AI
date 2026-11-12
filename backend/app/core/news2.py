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


# ─── Result Model ─────────────────────────────────────────────────────────────

class NEWS2Result(BaseModel):
    """Outcome of a single NEWS2 calculation."""

    total_score: int
    sub_scores: dict[str, int]
    scale_used: ScaleUsed
    scale2_prescribed: bool
    scale2_justification: Optional[str] = None
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
) -> NEWS2Result:
    """Calculate the NEWS2 score for a set of vital signs.

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

    Returns
    -------
    NEWS2Result
    """
    def _get_f(d: dict, *keys: str, default: float) -> float:
        for k in keys:
            v = d.get(k)
            if v is not None:
                if isinstance(v, dict):
                    v = v.get("value")
                try:
                    return float(v)
                except (ValueError, TypeError):
                    continue
        return default

    rr   = _get_f(vitals, "rr", "respiratory_rate", default=16.0)
    spo2 = _get_f(vitals, "spo2", "oxygen_saturation", default=98.0)
    sbp  = _get_f(vitals, "sbp", "systolic_bp", default=120.0)
    hr   = _get_f(vitals, "hr", "heart_rate", default=75.0)
    temp = _get_f(vitals, "temp", "body_temperature", default=36.8)

    raw_acvpu = vitals.get("acvpu") or vitals.get("consciousness") or "A"
    if isinstance(raw_acvpu, dict):
        raw_acvpu = raw_acvpu.get("value", "A")
    acvpu = str(raw_acvpu).upper()

    # Compute sub-scores
    sub_scores: dict[str, int] = {}

    sub_scores["rr"]   = _score_respiration_rate(rr)
    sub_scores["sbp"]  = _score_systolic_bp(sbp)
    sub_scores["hr"]   = _score_pulse(hr)
    sub_scores["temp"] = _score_temperature(temp)
    sub_scores["acvpu"] = _score_consciousness(acvpu)
    sub_scores["supplemental_oxygen"] = _score_supplemental_oxygen(supplemental_oxygen)

    # SpO2 — scale selection
    if scale2_prescribed:
        sub_scores["spo2"] = _score_spo2_scale2(spo2, supplemental_oxygen)
        scale_used = ScaleUsed.SCALE_2
        scale2_justification = (
            "Scale 2 prescribed — patient has a target SpO2 of 88-92 % "
            "(e.g. risk of hypercapnic respiratory failure)."
        )
    else:
        sub_scores["spo2"] = _score_spo2_scale1(spo2)
        scale_used = ScaleUsed.SCALE_1
        scale2_justification = None

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
        scale_used=scale_used,
        scale2_prescribed=scale2_prescribed,
        scale2_justification=scale2_justification,
        risk_level=risk_level,
        has_red_score=has_red_score,
        red_score_parameter=red_score_parameter,
        triage_tier=triage_tier,
        alert_reason=alert_reason,
        clinical_action=clinical_action,
    )
