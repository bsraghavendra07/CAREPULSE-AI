"""
CarePulse AI — Clinical Decision Support: Suggested Specialty for Review.

Implements rule-based mapping from vital-sign deterioration patterns to
clinical specialty recommendations for physician review.

Safety Guidelines:
- Clinical decision support ONLY; not a diagnosis or treatment recommendation.
- Never diagnose diseases, prescribe medications, or recommend treatments/dosages.
- Never override NEWS2 scores or suppress clinical deterioration alerts.
- Never recommend a clinical specialty based on sensor artifacts or probe removal.
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class SuggestedSpecialtyResult(BaseModel):
    """Clinical Decision Support recommendation for specialist review."""

    alert_id: Optional[str] = Field(
        default=None,
        description="Unique alert identifier for clinical audit trail",
    )
    triggering_pattern: Optional[str] = Field(
        default=None,
        description="Identified physiological pattern (e.g. SUSTAINED_SPO2_DECLINE)",
    )
    suggested_specialty: Optional[str] = Field(
        default=None,
        description="Pulmonology | Cardiology | Internal Medicine | General Medicine | None",
    )
    reason: Optional[str] = Field(
        default=None,
        description="Clinical rationale explaining why this specialty is suggested",
    )
    decision_support_only: bool = Field(
        default=True,
        description="Mandatory disclaimer flag",
    )
    is_applicable: bool = Field(
        default=False,
        description="True if clinical alert requires specialist review",
    )


def _extract_val(d: dict[str, Any] | None, *keys: str, default: float = 0.0) -> float:
    if not d:
        return default
    for k in keys:
        if k in d:
            v = d[k]
            if isinstance(v, dict):
                v = v.get("value", default)
            try:
                return float(v)
            except (ValueError, TypeError):
                continue
    return default


def recommend_specialty(
    news2_result: Any,
    vitals: dict[str, Any],
    sqi_status: str = "HIGH",
    history: list[dict[str, Any]] | None = None,
    patient_id: str = "default",
    alert_id: str | None = None,
) -> SuggestedSpecialtyResult:
    """Analyze alert-triggering vital signs and recommend a medical specialty.

    Parameters
    ----------
    news2_result : NEWS2Result or dict
        NEWS2 computation result containing total_score, sub_scores, triage_tier, etc.
    vitals : dict
        Current vital signs dictionary.
    sqi_status : str
        Signal quality status: 'HIGH', 'MEDIUM', 'LOW'.
    history : list[dict] | None
        Recent vital signs history for trend detection.
    patient_id : str
        Patient identifier.
    alert_id : str | None
        Optional alert ID to link with.

    Returns
    -------
    SuggestedSpecialtyResult
    """
    effective_alert_id = alert_id or f"alert-{patient_id}"

    # Extract score details
    if hasattr(news2_result, "sub_scores"):
        sub_scores = dict(news2_result.sub_scores)
        total_score = getattr(news2_result, "total_score", 0)
        has_red = getattr(news2_result, "has_red_score", False)
        triage_tier = getattr(news2_result, "triage_tier", "ROUTINE")
    elif isinstance(news2_result, dict):
        sub_scores = dict(news2_result.get("sub_scores", {}))
        total_score = news2_result.get("total_score", 0)
        has_red = news2_result.get("has_red_score", False)
        triage_tier = news2_result.get("triage_tier", "ROUTINE")
    else:
        sub_scores = {}
        total_score = 0
        has_red = False
        triage_tier = "ROUTINE"

    hr = _extract_val(vitals, "hr", "heart_rate", default=75.0)
    spo2 = _extract_val(vitals, "spo2", "oxygen_saturation", default=98.0)

    # ──────────────────────────────────────────────────────────────────────────
    # Safety Check 1: Probe Removal / Sensor Unreliable
    # Do NOT recommend a clinical specialty when the alert is artifact-driven.
    # ──────────────────────────────────────────────────────────────────────────
    if sqi_status == "LOW" or hr <= 0.0 or spo2 <= 0.0:
        return SuggestedSpecialtyResult(
            alert_id=effective_alert_id,
            triggering_pattern="SENSOR_UNRELIABLE",
            suggested_specialty=None,
            reason="Sensor telemetry is unreliable or disconnected (probe removal / flatline). Technical inspection required before clinical specialty review.",
            decision_support_only=True,
            is_applicable=False,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Safety Check 2: Normal / Routine State
    # No clinical alert -> no specialty recommendation.
    # ──────────────────────────────────────────────────────────────────────────
    if total_score == 0 and not has_red and triage_tier == "ROUTINE":
        return SuggestedSpecialtyResult(
            alert_id=effective_alert_id,
            triggering_pattern=None,
            suggested_specialty=None,
            reason=None,
            decision_support_only=True,
            is_applicable=False,
        )

    # Sub-scores per organ system
    score_rr = sub_scores.get("rr", 0) or sub_scores.get("respiration_rate", 0)
    score_spo2 = sub_scores.get("spo2", 0) or sub_scores.get("oxygen_saturation", 0)
    score_hr = sub_scores.get("hr", 0) or sub_scores.get("pulse", 0)
    score_sbp = sub_scores.get("sbp", 0) or sub_scores.get("systolic_bp", 0)
    score_temp = sub_scores.get("temp", 0) or sub_scores.get("temperature", 0)
    score_acvpu = sub_scores.get("acvpu", 0) or sub_scores.get("consciousness", 0)

    # Organ system categories
    abnormal_categories: list[str] = []
    if score_spo2 > 0 or score_rr > 0:
        abnormal_categories.append("RESPIRATORY")
    if score_hr > 0 or score_sbp > 0:
        abnormal_categories.append("CARDIAC")
    if score_temp > 0:
        abnormal_categories.append("TEMPERATURE")
    if score_acvpu > 0:
        abnormal_categories.append("NEUROLOGICAL")

    # ──────────────────────────────────────────────────────────────────────────
    # Rule 5: Multiple vital-sign abnormalities across categories
    # Suggest General Medicine when multi-system deterioration is present.
    # ──────────────────────────────────────────────────────────────────────────
    if len(abnormal_categories) >= 2 and (total_score >= 4 or len(abnormal_categories) >= 3):
        return SuggestedSpecialtyResult(
            alert_id=effective_alert_id,
            triggering_pattern="MULTIPLE_VITAL_ABNORMALITIES",
            suggested_specialty="General Medicine",
            reason="The alert is driven by multi-system physiological deviations across multiple vital-sign categories.",
            decision_support_only=True,
            is_applicable=True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Single Primary Category Mappings
    # ──────────────────────────────────────────────────────────────────────────
    # Calculate group max and total scores
    resp_score = score_spo2 + score_rr
    card_score = score_hr + score_sbp
    temp_score = score_temp

    # 1. Pulmonology
    if resp_score >= card_score and resp_score >= temp_score and resp_score > 0:
        if score_spo2 >= score_rr:
            return SuggestedSpecialtyResult(
                alert_id=effective_alert_id,
                triggering_pattern="SUSTAINED_SPO2_DECLINE",
                suggested_specialty="Pulmonology",
                reason="The alert is primarily driven by a sustained respiratory-related oxygenation pattern.",
                decision_support_only=True,
                is_applicable=True,
            )
        else:
            return SuggestedSpecialtyResult(
                alert_id=effective_alert_id,
                triggering_pattern="PERSISTENT_ABNORMAL_RR",
                suggested_specialty="Pulmonology",
                reason="The alert is primarily driven by a persistent respiratory rate abnormality.",
                decision_support_only=True,
                is_applicable=True,
            )

    # 2. Cardiology
    if card_score >= resp_score and card_score >= temp_score and card_score > 0:
        return SuggestedSpecialtyResult(
            alert_id=effective_alert_id,
            triggering_pattern="HEART_RATE_CONCERN",
            suggested_specialty="Cardiology",
            reason="The alert is primarily driven by a cardiovascular vital-sign pattern (heart rate / hemodynamic deviation).",
            decision_support_only=True,
            is_applicable=True,
        )

    # 3. Internal Medicine
    if temp_score > 0:
        return SuggestedSpecialtyResult(
            alert_id=effective_alert_id,
            triggering_pattern="PERSISTENT_TEMP_ABNORMALITY",
            suggested_specialty="Internal Medicine",
            reason="The alert is primarily driven by a persistent core body temperature abnormality.",
            decision_support_only=True,
            is_applicable=True,
        )

    # Fallback if any single abnormal score exists
    if len(abnormal_categories) > 0:
        return SuggestedSpecialtyResult(
            alert_id=effective_alert_id,
            triggering_pattern="MULTIPLE_VITAL_ABNORMALITIES",
            suggested_specialty="General Medicine",
            reason="The alert involves combined clinical vital-sign deviations.",
            decision_support_only=True,
            is_applicable=True,
        )

    return SuggestedSpecialtyResult(
        alert_id=effective_alert_id,
        triggering_pattern=None,
        suggested_specialty=None,
        reason=None,
        decision_support_only=True,
        is_applicable=False,
    )
