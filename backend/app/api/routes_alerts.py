"""
CAREPULSE 1.0 — Smart Specialist Alerts API routes (/api/alerts).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.specialist_router import (
    AlertSeverity,
    AlertStatus,
    Department,
    RoutedAlert,
    alert_store,
    categorize_patient,
    route_clinical_alert,
)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertStatusUpdate(BaseModel):
    clinician_name: Optional[str] = "Dr. Rivera"


class ManualAlertRouteRequest(BaseModel):
    patient_id: str
    patient_name: str
    patient_condition: str
    news2_score: int
    triage_tier: str
    alert_reason: str
    vitals: Dict[str, Any]
    sqi_status: Optional[str] = "HIGH"
    sqi_note: Optional[str] = None
    has_red_score: Optional[bool] = False
    decision_specialty: Optional[str] = None


@router.get("/", response_model=List[RoutedAlert])
async def list_routed_alerts(
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, ACKNOWLEDGED, UNDER_REVIEW, RESOLVED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (WATCH, REVIEW, URGENT, DEVICE_WARNING)"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    limit: int = Query(50, ge=1, le=200),
) -> List[RoutedAlert]:
    """Retrieve routed specialist alerts with optional clinical filters."""
    return alert_store.get_alerts(
        department=department,
        status=status,
        severity=severity,
        patient_id=patient_id,
        limit=limit,
    )


@router.get("/stats")
async def get_alert_stats() -> Dict[str, Any]:
    """Return live KPI statistics for the Specialist Alert Center."""
    return alert_store.get_stats()


@router.post("/{alert_id}/acknowledge", response_model=RoutedAlert)
async def acknowledge_alert(
    alert_id: str,
    body: Optional[AlertStatusUpdate] = None,
) -> RoutedAlert:
    """Specialist acknowledges awareness of the routed alert."""
    clinician = body.clinician_name if body else "Dr. Rivera"
    updated = alert_store.update_status(alert_id, AlertStatus.ACKNOWLEDGED, clinician_name=clinician)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return updated


@router.post("/{alert_id}/review", response_model=RoutedAlert)
async def review_alert(
    alert_id: str,
    body: Optional[AlertStatusUpdate] = None,
) -> RoutedAlert:
    """Specialist marks alert as actively under clinical investigation."""
    clinician = body.clinician_name if body else "Dr. Rivera"
    updated = alert_store.update_status(alert_id, AlertStatus.UNDER_REVIEW, clinician_name=clinician)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return updated


@router.post("/{alert_id}/resolve", response_model=RoutedAlert)
async def resolve_alert(
    alert_id: str,
    body: Optional[AlertStatusUpdate] = None,
) -> RoutedAlert:
    """Specialist documents resolution and closes the alert."""
    clinician = body.clinician_name if body else "Dr. Rivera"
    updated = alert_store.update_status(alert_id, AlertStatus.RESOLVED, clinician_name=clinician)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return updated


@router.post("/route-test", response_model=RoutedAlert)
async def test_route_alert(req: ManualAlertRouteRequest) -> RoutedAlert:
    """Test harness endpoint to verify specialist routing rules."""
    class MockNEWS2:
        total_score = req.news2_score
        triage_tier = req.triage_tier
        has_red_score = req.has_red_score or (req.news2_score >= 7)
        alert_reason = req.alert_reason
        clinical_action = "Assessed via Test Route Endpoint"

    patient_dict = {
        "id": req.patient_id,
        "name": req.patient_name,
        "condition": req.patient_condition,
    }

    routed = route_clinical_alert(
        patient=patient_dict,
        news2_result=MockNEWS2(),
        vitals=req.vitals,
        sqi_status=req.sqi_status or "HIGH",
        sqi_note=req.sqi_note,
        tick_number=999,
        decision_specialty=req.decision_specialty,
    )

    if not routed:
        raise HTTPException(status_code=400, detail="Alert did not meet routing thresholds (e.g. routine score 0)")
    return routed
