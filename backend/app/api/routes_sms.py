"""
CAREPULSE 1.0 — Emergency SMS Notification API Routes (/api/sms).
Provides clinical visibility into dispatched cellular emergency SMS alerts,
gateway configuration, and test dispatch tools.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.sms_dispatcher import (
    CriticalityAnalysis,
    SMSAlertRecord,
    SMSGatewayConfig,
    analyze_situation_criticality,
    dispatch_emergency_sms,
    sms_store,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sms", tags=["emergency-sms"])


class SendTestSMSRequest(BaseModel):
    patient_id: str = Field(default="P-001", description="Patient ID to generate emergency report for")
    recipient_phone: str = Field(default="+1 (555) 911-0000", description="Recipient cellular phone number")
    custom_note: Optional[str] = Field(default=None, description="Optional custom clinician note to append to report")
    force_urgent: bool = Field(default=True, description="Force emergency escalation severity")


class ConfigUpdateRequest(BaseModel):
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    from_number: Optional[str] = None
    default_recipient_phone: Optional[str] = None
    cooldown_seconds: Optional[int] = None


# Reference to patients injected from main.py
_patients: Dict[str, Dict[str, Any]] = {}


def set_patients(patients: Dict[str, Dict[str, Any]]) -> None:
    global _patients
    _patients = patients


@router.get("/alerts", response_model=List[SMSAlertRecord])
async def list_dispatched_sms(
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
) -> List[SMSAlertRecord]:
    """Retrieve history of all emergency SMS dispatches with full clinical reports."""
    if patient_id:
        return sms_store.get_by_patient(patient_id)[:limit]
    return sms_store.get_all(limit=limit)


@router.get("/alerts/latest", response_model=Optional[SMSAlertRecord])
async def get_latest_sms() -> Optional[SMSAlertRecord]:
    """Retrieve the most recent emergency cellular SMS dispatch."""
    all_sms = sms_store.get_all(limit=1)
    if not all_sms:
        return None
    return all_sms[0]


@router.get("/alerts/{sms_id}", response_model=SMSAlertRecord)
async def get_sms_by_id(sms_id: str) -> SMSAlertRecord:
    """Retrieve full details and clinical snapshot of a specific emergency SMS."""
    record = sms_store.get_by_id(sms_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency SMS dispatch '{sms_id}' not found.",
        )
    return record


@router.post("/send-test", response_model=SMSAlertRecord, status_code=status.HTTP_201_CREATED)
async def send_test_emergency_sms(req: SendTestSMSRequest) -> SMSAlertRecord:
    """
    On-demand emergency SMS dispatch test.
    Generates an emergency report snapshot for the specified patient and sends
    a cellular SMS to the recipient phone number.
    """
    patient = _patients.get(req.patient_id)
    if not patient:
        # Fallback patient profile if not loaded
        patient = {
            "id": req.patient_id,
            "name": "Robert Thompson",
            "gender": "male",
            "birthDate": "1958-03-15",
            "condition": "Post-Myocardial Infarction / Acute Coronary Syndrome",
            "specialist_name": "Dr. Robert Rivera, MD",
            "department": "Cardiology",
        }

    # Simulated acute emergency vitals
    simulated_urgent_vitals = {
        "heart_rate": 138,
        "oxygen_saturation": 84,
        "respiratory_rate": 30,
        "systolic_bp": 86,
        "body_temperature": 38.8,
    }

    # Mock urgent NEWS2 result
    class MockNEWS2:
        total_score = 9
        has_red_score = True
        red_score_parameter = "heart_rate"
        triage_tier = "URGENT"

    class MockAlert:
        id = f"test-alert-{req.patient_id}-{int(datetime.now().timestamp())}"
        severity = "URGENT"
        alert_reason = req.custom_note or "Acute deterioration simulation: Severe Tachycardia (138 bpm) & Hypoxemia (84%)"
        clinical_action = "Immediate bedside cardiac resuscitation & emergency oxygen escalation required"
        specialist_name = patient.get("specialist_name", "Dr. Robert Rivera, MD")
        specialist_title = "Senior Cardiologist & Electrophysiology Lead"
        department = patient.get("department", "Cardiology")

    record = await dispatch_emergency_sms(
        patient=patient,
        alert=MockAlert(),
        vitals=simulated_urgent_vitals,
        news2_result=MockNEWS2(),
        ml_anomaly={"anomaly_score": 0.985, "anomaly_level": "SEVERE_ANOMALY"},
        force=True,
        override_recipient_phone=req.recipient_phone,
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispatch test emergency SMS.",
        )

    return record


class SimulateCriticalRequest(BaseModel):
    patient_id: str = Field(default="P-001", description="Target patient ID")
    condition_type: str = Field(
        default="cardiac_crisis",
        description="Crisis type: cardiac_crisis | septic_shock | respiratory_arrest",
    )
    recipient_phone: Optional[str] = Field(default=None, description="Optional custom recipient phone")


class CriticalSimulationResponse(BaseModel):
    criticality_analysis: CriticalityAnalysis
    dispatched_sms: SMSAlertRecord


@router.post("/simulate-critical-deterioration", response_model=CriticalSimulationResponse)
async def simulate_critical_deterioration(req: SimulateCriticalRequest) -> CriticalSimulationResponse:
    """
    Test autonomous clinical deterioration analyzer:
    1. Injects acute multi-system vitals.
    2. Runs continuous autonomous criticality analysis.
    3. Confirms situation is CRITICAL.
    4. Automatically dispatches cellular emergency SMS to assigned specialist.
    """
    patient = _patients.get(req.patient_id)
    if not patient:
        patient = {
            "id": req.patient_id,
            "name": "Robert Thompson",
            "gender": "male",
            "birthDate": "1958-03-15",
            "condition": "Post-Myocardial Infarction / Acute Heart Failure",
            "specialist_name": "Dr. Robert Rivera, MD",
            "department": "Cardiology",
        }

    # Prescribed vital patterns for critical scenarios
    if req.condition_type == "septic_shock":
        acute_vitals = {
            "heart_rate": 136,
            "oxygen_saturation": 88,
            "respiratory_rate": 29,
            "systolic_bp": 82,
            "body_temperature": 39.8,
        }
        news2_score = 11
        red_param = "systolic_bp"
        reason = "Septic Shock: Severe Hypotension (82 mmHg) & Hyperpyrexia (39.8°C)"
    elif req.condition_type == "respiratory_arrest":
        acute_vitals = {
            "heart_rate": 118,
            "oxygen_saturation": 79,
            "respiratory_rate": 34,
            "systolic_bp": 105,
            "body_temperature": 37.4,
        }
        news2_score = 10
        red_param = "oxygen_saturation"
        reason = "Acute Hypoxemic Respiratory Failure (SpO2 79% on Room Air)"
    else:  # cardiac_crisis
        acute_vitals = {
            "heart_rate": 165,
            "oxygen_saturation": 86,
            "respiratory_rate": 28,
            "systolic_bp": 88,
            "body_temperature": 37.1,
        }
        news2_score = 12
        red_param = "heart_rate"
        reason = "Acute Hemodynamic Crisis: Malignant Tachyarrhythmia & Hypotension"

    class MockNEWS2:
        total_score = news2_score
        has_red_score = True
        red_score_parameter = red_param
        triage_tier = "URGENT"

    # Step 1: Run autonomous clinical criticality analysis
    analysis = analyze_situation_criticality(
        patient=patient,
        vitals=acute_vitals,
        news2_result=MockNEWS2(),
        sqi_status="GOOD",
        ml_anomaly={"anomaly_score": 0.992, "anomaly_level": "SEVERE_ANOMALY"},
        decision_specialty=patient.get("department"),
    )

    if not analysis.is_critical:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vitals did not trigger critical deterioration threshold.",
        )

    class MockAlert:
        id = f"auto-crit-{req.patient_id}-{int(datetime.now().timestamp())}"
        severity = "URGENT"
        alert_reason = reason
        clinical_action = analysis.action_directive
        specialist_name = patient.get("specialist_name", "Dr. Robert Rivera, MD")
        specialist_title = patient.get("specialist_title", "Senior Specialist")
        department = patient.get("department", "Cardiology")
        emergency_flag = True

    # Step 2: Automatically dispatch emergency SMS
    record = await dispatch_emergency_sms(
        patient=patient,
        alert=MockAlert(),
        vitals=acute_vitals,
        news2_result=MockNEWS2(),
        ml_anomaly={"anomaly_score": 0.992, "anomaly_level": "SEVERE_ANOMALY"},
        criticality_analysis=analysis,
        force=True,
        override_recipient_phone=req.recipient_phone,
        auto_dispatched=True,
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to auto-dispatch emergency SMS for critical situation.",
        )

    return CriticalSimulationResponse(
        criticality_analysis=analysis,
        dispatched_sms=record,
    )


@router.get("/config", response_model=SMSGatewayConfig)
async def get_sms_config() -> SMSGatewayConfig:
    """Get current cellular SMS gateway configuration."""
    cfg = sms_store.config.copy()
    # Mask secret token for clinical security
    if cfg.auth_token:
        cfg.auth_token = f"***masked***{cfg.auth_token[-4:] if len(cfg.auth_token) >= 4 else ''}"
    return cfg


@router.post("/config", response_model=SMSGatewayConfig)
async def update_sms_config(req: ConfigUpdateRequest) -> SMSGatewayConfig:
    """Update gateway configuration (Twilio credentials, destination phone, cooldown)."""
    cfg = sms_store.config
    if req.account_sid is not None:
        cfg.account_sid = req.account_sid.strip() or None
    if req.auth_token is not None:
        cfg.auth_token = req.auth_token.strip() or None
    if req.from_number is not None:
        cfg.from_number = req.from_number.strip()
    if req.default_recipient_phone is not None:
        cfg.default_recipient_phone = req.default_recipient_phone.strip()
    if req.cooldown_seconds is not None:
        cfg.cooldown_seconds = max(5, req.cooldown_seconds)

    masked = cfg.copy()
    if masked.auth_token:
        masked.auth_token = f"***masked***{masked.auth_token[-4:] if len(masked.auth_token) >= 4 else ''}"
    return masked
