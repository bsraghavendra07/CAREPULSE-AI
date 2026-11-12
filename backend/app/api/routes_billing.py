"""
CarePulse — Hospital Financial & Billing API Routes.

Exclusively accessible to ACCOUNTANT and HOSPITAL_ADMIN roles.
Provides billing summaries, invoices, claim processing, and financial telemetry reporting.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.core.staff_registry import StaffRole, staff_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])

# In-memory mock invoice store
_INVOICES: List[Dict[str, Any]] = [
    {
        "id": "INV-2026-001",
        "invoice_id": "INV-2026-001",
        "patient_id": "P-001",
        "patient_name": "Robert Thompson",
        "service": "Post-CABG Continuous Telemetry Monitoring (7 Days)",
        "amount": 1450.00,
        "insurance_covered": 1200.00,
        "patient_due": 250.00,
        "status": "PAID",
        "created_at": "2026-11-10T09:00:00Z",
        "payment_method": "BlueCross Health Insurance",
    },
    {
        "id": "INV-2026-002",
        "invoice_id": "INV-2026-002",
        "patient_id": "P-002",
        "patient_name": "Maria Garcia",
        "service": "COPD Wearable Remote SpO2 & Respiratory Monitoring",
        "amount": 920.00,
        "insurance_covered": 800.00,
        "patient_due": 120.00,
        "status": "PENDING",
        "created_at": "2026-11-11T14:30:00Z",
        "payment_method": "Medicare Part B",
    },
    {
        "id": "INV-2026-003",
        "invoice_id": "INV-2026-003",
        "patient_id": "P-003",
        "patient_name": "James Wilson",
        "service": "Cardiology Telemetry & Smart Specialist Escalation",
        "amount": 1780.00,
        "insurance_covered": 1500.00,
        "patient_due": 280.00,
        "status": "PENDING",
        "created_at": "2026-11-12T11:15:00Z",
        "payment_method": "Aetna Commercial",
    },
    {
        "id": "INV-2026-004",
        "invoice_id": "INV-2026-004",
        "patient_id": "P-004",
        "patient_name": "Eleanor Vance",
        "service": "Post-Sepsis Hemodynamic Stability Monitoring",
        "amount": 2100.00,
        "insurance_covered": 1900.00,
        "patient_due": 200.00,
        "status": "APPROVED",
        "created_at": "2026-11-12T16:45:00Z",
        "payment_method": "UnitedHealthcare",
    },
    {
        "id": "INV-2026-005",
        "invoice_id": "INV-2026-005",
        "patient_id": "P-005",
        "patient_name": "David Kim",
        "service": "Hypertensive Crisis Continuous Multi-Sensor Monitoring",
        "amount": 850.00,
        "insurance_covered": 700.00,
        "patient_due": 150.00,
        "status": "PENDING",
        "created_at": "2026-11-13T01:20:00Z",
        "payment_method": "Cigna Health",
    },
]


def verify_accountant_or_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_staff_token: Optional[str] = Header(None, alias="X-Staff-Token"),
) -> Dict[str, Any]:
    """Ensure caller is either an ACCOUNTANT or HOSPITAL_ADMIN."""
    raw_token = authorization or x_staff_token or ""
    if raw_token.lower().startswith("bearer "):
        raw_token = raw_token[7:].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff authentication token required",
        )

    # Check staff registry sessions
    staff_user = staff_registry.get_user_by_session(raw_token)
    if not staff_user:
        # Also check demo tokens
        if "accountant" in raw_token.lower():
            return {"role": StaffRole.ACCOUNTANT.value, "email": "accountant@hospital.carepulse.org"}
        if "admin" in raw_token.lower():
            return {"role": StaffRole.HOSPITAL_ADMIN.value, "email": "admin@hospital.carepulse.org"}
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valid hospital staff session required",
        )

    if staff_user.role not in (StaffRole.ACCOUNTANT, StaffRole.HOSPITAL_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Billing and Financial portal is only accessible to Accountants and Administrators",
        )

    return {"role": staff_user.role.value, "email": staff_user.email, "name": staff_user.full_name}


@router.get("/summary")
async def get_billing_summary(user: Dict[str, Any] = Depends(verify_accountant_or_admin)) -> Dict[str, Any]:
    """Return hospital-wide billing KPIs and telemetry revenue overview."""
    total_billed = sum(inv["amount"] for inv in _INVOICES)
    insurance_reimbursed = sum(inv["insurance_covered"] for inv in _INVOICES if inv["status"] in ("PAID", "PROCESSED"))
    pending_reimbursement = sum(inv["insurance_covered"] for inv in _INVOICES if inv["status"] in ("PENDING", "APPROVED"))
    patient_receivables = sum(inv["patient_due"] for inv in _INVOICES if inv["status"] not in ("PAID", "PROCESSED"))

    return {
        "status": "success",
        "total_billed": round(total_billed, 2),
        "total_insurance_reimbursement": round(insurance_reimbursed, 2),
        "pending_claims_value": round(pending_reimbursement, 2),
        "patient_co_pay_receivable": round(patient_receivables, 2),
        "active_monitored_patients": len(_INVOICES),
        "claims_approval_rate": "94.8%",
        "currency": "USD",
        "financial_summary": {
            "total_telemetry_billed": round(total_billed, 2),
            "insurance_reimbursed": round(insurance_reimbursed, 2),
            "pending_claims_value": round(pending_reimbursement, 2),
            "patient_co_pay_receivable": round(patient_receivables, 2),
        },
        "recent_invoices": _INVOICES,
    }


@router.get("/invoices")
async def list_invoices(user: Dict[str, Any] = Depends(verify_accountant_or_admin)) -> List[Dict[str, Any]]:
    """List all telemetry equipment and patient service invoices."""
    return _INVOICES


class ProcessInvoiceRequest(BaseModel):
    action: Optional[str] = Field(default="PROCESSED", description="Action: 'APPROVE', 'PROCESSED', or 'PAID'")
    notes: Optional[str] = Field(None, description="Optional accountant notes")


@router.post("/process-invoice/{invoice_id}")
async def process_invoice(
    invoice_id: str,
    payload: Optional[ProcessInvoiceRequest] = None,
    user: Dict[str, Any] = Depends(verify_accountant_or_admin),
) -> Dict[str, Any]:
    """Approve or mark processed an existing patient telemetry invoice."""
    for inv in _INVOICES:
        if inv["invoice_id"] == invoice_id or inv["id"] == invoice_id:
            inv["status"] = "PROCESSED"
            inv["processed_by"] = user.get("email")
            inv["processed_at"] = datetime.now(timezone.utc).isoformat()
            if payload and payload.notes:
                inv["accountant_notes"] = payload.notes
            return {"status": "success", "message": f"Invoice {invoice_id} processed", "invoice": inv}

    raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
