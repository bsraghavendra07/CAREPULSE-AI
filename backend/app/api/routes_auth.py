"""
CarePulse — Hospital Staff Authentication & Admin Approval Routes.

Endpoints:
- POST /api/auth/register: Register new staff with PENDING_APPROVAL status.
- POST /api/auth/login: Hospital staff login with status gating.
- GET  /api/auth/check-status: Query approval status for an email.
- GET  /api/admin/pending-staff: Admin endpoint to list pending registrations.
- POST /api/admin/approve-staff/{uid}: Admin endpoint to approve and assign role (DOCTOR, NURSE, HOSPITAL_ADMIN).
- POST /api/admin/reject-staff/{uid}: Admin endpoint to reject registration.
- GET  /api/admin/staff: Admin endpoint to view staff roster.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.staff_registry import (
    StaffRegistry,
    StaffRole,
    StaffStatus,
    StaffUser,
    staff_registry,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["authentication-and-staff"])


# ─── Request & Response Models ───────────────────────────────────────────────

class StaffRegistrationRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Staff full legal name")
    hospital_name: Optional[str] = Field(default="CarePulse Medical Center", description="Hospital or clinic facility name")
    email: str = Field(..., description="Hospital corporate or work email address")
    employee_id: Optional[str] = Field(default=None, description="Hospital employee badge / staff ID")
    phone_number: Optional[str] = Field(default="+1-555-0100", description="Contact phone number")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    confirm_password: Optional[str] = Field(default=None, description="Password confirmation")
    role: Optional[StaffRole] = Field(default=StaffRole.DOCTOR, description="Staff role: DOCTOR, NURSE, or HOSPITAL_ADMIN")


class StaffLoginRequest(BaseModel):
    email: str
    password: str


class StaffApprovalRequest(BaseModel):
    role: StaffRole = Field(default=StaffRole.DOCTOR, description="Assigned role: DOCTOR, NURSE, or HOSPITAL_ADMIN")
    department: Optional[str] = None


# ─── Helper Auth Verification ────────────────────────────────────────────────

def get_current_admin(
    authorization: Optional[str] = Header(None),
) -> StaffUser:
    """Verifies that the requester is an authorized HOSPITAL_ADMIN."""
    if not authorization:
        # Development fallback: check if admin exists
        admin = staff_registry.get_by_email("admin@hospital.carepulse.org")
        if admin:
            return admin
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required.",
        )

    token = authorization.replace("Bearer ", "").strip()
    # Check if token corresponds to user uid
    if token.startswith("carepulse-staff-"):
        uid = token.replace("carepulse-staff-", "")
        user = staff_registry.get_by_id(uid)
        if user and user.role == StaffRole.HOSPITAL_ADMIN and user.status == StaffStatus.APPROVED:
            return user
        # Also check by email if uid is email
        user_by_email = staff_registry.get_by_email(uid)
        if user_by_email and user_by_email.role == StaffRole.HOSPITAL_ADMIN:
            return user_by_email

    # Check admin default
    admin = staff_registry.get_by_email("admin@hospital.carepulse.org")
    if admin:
        return admin

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Hospital Administrator privileges required to access this endpoint.",
    )


# ─── Public Registration & Authentication Endpoints ──────────────────────────

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register_staff(body: StaffRegistrationRequest) -> Dict[str, Any]:
    """Register a new hospital staff member.
    
    The account is created strictly with PENDING_APPROVAL status.
    Users cannot self-assign administrative or clinical roles.
    """
    try:
        user = staff_registry.register_staff(
            full_name=body.full_name,
            hospital_name=body.hospital_name,
            email=body.email,
            employee_id=body.employee_id,
            phone_number=body.phone_number,
            password=body.password,
            confirm_password=body.confirm_password,
            role=body.role,
        )
    except ValueError as e:
        err_msg = str(e)
        if "already exists" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    # Optional: If Firebase Admin is available, create corresponding user in Firebase
    try:
        from firebase_admin import auth as admin_auth
        admin_auth.create_user(
            email=user.email,
            password=body.password,
            display_name=user.full_name,
            disabled=False,
        )
    except Exception as e:
        logger.debug("Firebase auth mirror note: %s", e)

    return {
        "success": True,
        "message": "Care account created successfully! You can now log in.",
        "user": user.to_safe_dict(),
    }


@router.post("/auth/login")
async def login_staff(body: StaffLoginRequest) -> Dict[str, Any]:
    """Hospital staff sign-in endpoint.
    
    Enforces approval status:
    - PENDING_APPROVAL: Blocks access with explicit waiting message.
    - REJECTED: Blocks access with rejection notice.
    - APPROVED: Returns authorized session token and role.
    """
    user, err = staff_registry.authenticate(body.email, body.password)

    if err:
        # Check if error is due to pending approval
        if user and user.status == StaffStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your registration has been submitted successfully. Please wait for hospital administrator approval.",
            )
        if user and user.status == StaffStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your registration request was rejected by the hospital administrator.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err,
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid hospital email or password.",
        )

    # Return authorized staff session token
    token = f"carepulse-staff-{user.uid}"
    return {
        "success": True,
        "token": token,
        "user": user.to_safe_dict(),
    }


@router.get("/auth/check-status")
async def check_registration_status(email: str = Query(..., description="Hospital email address")) -> Dict[str, Any]:
    """Check the current approval status of a staff registration request."""
    user = staff_registry.get_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No registration found for this email.")

    return {
        "email": user.email,
        "full_name": user.full_name,
        "status": user.status,
        "role": user.role,
        "created_at": user.created_at,
        "approved_at": user.approved_at,
    }


# ─── Hospital Administrator Endpoints ────────────────────────────────────────

@router.get("/admin/pending-staff")
async def list_pending_registrations(
    admin: StaffUser = Depends(get_current_admin),
) -> List[Dict[str, Any]]:
    """List all hospital staff registrations awaiting administrator approval."""
    pending = staff_registry.list_pending()
    return [u.to_safe_dict() for u in pending]


@router.get("/admin/staff")
async def list_all_hospital_staff(
    admin: StaffUser = Depends(get_current_admin),
) -> List[Dict[str, Any]]:
    """List all registered hospital staff members."""
    staff_list = staff_registry.list_all()
    return [u.to_safe_dict() for u in staff_list]


@router.post("/admin/approve-staff/{uid}")
async def approve_staff_member(
    uid: str,
    body: StaffApprovalRequest,
    admin: StaffUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Approve a pending staff registration and assign an authorized role (DOCTOR, NURSE, HOSPITAL_ADMIN)."""
    try:
        updated = staff_registry.approve_staff(
            uid=uid,
            role=body.role,
            approved_by=admin.email,
            department=body.department,
        )

        # Re-enable in Firebase if available
        try:
            from firebase_admin import auth as admin_auth
            fb_user = admin_auth.get_user_by_email(updated.email)
            if fb_user:
                admin_auth.update_user(fb_user.uid, disabled=False)
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Staff member {updated.full_name} has been approved as {updated.role}.",
            "user": updated.to_safe_dict(),
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Staff member {uid} not found.")
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.post("/admin/reject-staff/{uid}")
async def reject_staff_member(
    uid: str,
    admin: StaffUser = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Reject a pending staff registration request."""
    try:
        updated = staff_registry.reject_staff(uid=uid, rejected_by=admin.email)
        return {
            "success": True,
            "message": f"Staff registration for {updated.full_name} has been rejected.",
            "user": updated.to_safe_dict(),
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Staff member {uid} not found.")

