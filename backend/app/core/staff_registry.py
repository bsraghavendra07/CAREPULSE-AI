"""
CarePulse — Hospital Staff Registry & Security Layer.

Manages hospital staff accounts, cryptographic password hashing,
PENDING_APPROVAL lifecycle, and administrative role assignment (DOCTOR, NURSE, HOSPITAL_ADMIN).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import secrets
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "staff_registry.json"


class StaffStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class StaffRole(str, Enum):
    DOCTOR = "DOCTOR"
    DOCTOR_ASSISTANT = "DOCTOR_ASSISTANT"
    NURSE = "NURSE"
    ACCOUNTANT = "ACCOUNTANT"
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
    STAFF_PENDING = "STAFF_PENDING"


class StaffUser(BaseModel):
    uid: str
    email: str
    full_name: str
    hospital_name: str
    employee_id: str
    phone_number: str
    role: StaffRole = StaffRole.STAFF_PENDING
    status: StaffStatus = StaffStatus.PENDING_APPROVAL
    password_hash: Optional[str] = None
    salt: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    department: Optional[str] = "Clinical Staff"

    def to_safe_dict(self) -> Dict[str, Any]:
        """Return staff user data omitting password hash and salt."""
        d = self.model_dump()
        d.pop("password_hash", None)
        d.pop("salt", None)
        return d


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Cryptographic PBKDF2-HMAC-SHA256 password hashing."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return hashed, salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies a plaintext password against the stored PBKDF2 hash using constant-time comparison."""
    if not password_hash or not salt:
        return False
    computed, _ = hash_password(password, salt)
    return secrets.compare_digest(computed, password_hash)


class StaffRegistry:
    """In-memory and file-backed staff registry ensuring secure registration and admin gating."""

    def __init__(self, storage_path: Path = DATA_FILE) -> None:
        self.storage_path = storage_path
        self._users: Dict[str, StaffUser] = {}  # uid -> StaffUser
        self._email_index: Dict[str, str] = {}  # lower(email) -> uid
        self._load()

    def _load(self) -> None:
        """Load registry from JSON storage file or seed default hospital staff."""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    for item in raw_data:
                        user = StaffUser(**item)
                        self._users[user.uid] = user
                        self._email_index[user.email.strip().lower()] = user.uid
                logger.info("Loaded %d staff records from %s", len(self._users), self.storage_path)
                self._seed_default_accounts()
                self._save()
                return
            except Exception as e:
                logger.warning("Could not read staff registry (%s), re-seeding default accounts.", e)

        # Seed pre-approved default clinical accounts for immediate demo & administrative verification
        self._seed_default_accounts()
        self._save()

    def _seed_default_accounts(self) -> None:
        """Seeds initial authorized hospital accounts: Administrator, Doctor, and Nurse."""
        # 1. Hospital Administrator
        admin_hash, admin_salt = hash_password("AdminPassword123!")
        admin_user = StaffUser(
            uid="staff-admin-001",
            email="admin@hospital.carepulse.org",
            full_name="Dr. Eleanor Vance",
            hospital_name="CarePulse Central Hospital",
            employee_id="EMP-ADMIN-001",
            phone_number="+1-555-0100",
            role=StaffRole.HOSPITAL_ADMIN,
            status=StaffStatus.APPROVED,
            password_hash=admin_hash,
            salt=admin_salt,
            department="Hospital Administration & Clinical Oversight",
            approved_at=datetime.utcnow().isoformat(),
            approved_by="SYSTEM_ROOT",
        )
        self._users[admin_user.uid] = admin_user
        self._email_index[admin_user.email.lower()] = admin_user.uid

        # 2. Attending Cardiologist (Doctor)
        doc_hash, doc_salt = hash_password("DoctorPassword123!")
        doc_user = StaffUser(
            uid="staff-dr-rivera",
            email="dr.rivera@hospital.carepulse.org",
            full_name="Dr. Robert Rivera",
            hospital_name="CarePulse Central Hospital",
            employee_id="EMP-DOC-104",
            phone_number="+1-555-0104",
            role=StaffRole.DOCTOR,
            status=StaffStatus.APPROVED,
            password_hash=doc_hash,
            salt=doc_salt,
            department="Cardiology & Post-Discharge Monitoring",
            approved_at=datetime.utcnow().isoformat(),
            approved_by="staff-admin-001",
        )
        self._users[doc_user.uid] = doc_user
        self._email_index[doc_user.email.lower()] = doc_user.uid

        # 3. Charge Nurse
        nurse_hash, nurse_salt = hash_password("NursePassword123!")
        nurse_user = StaffUser(
            uid="staff-nurse-chen",
            email="nurse.chen@hospital.carepulse.org",
            full_name="Elena Chen, RN",
            hospital_name="CarePulse Central Hospital",
            employee_id="EMP-NURSE-208",
            phone_number="+1-555-0208",
            role=StaffRole.NURSE,
            status=StaffStatus.APPROVED,
            password_hash=nurse_hash,
            salt=nurse_salt,
            department="Post-Discharge Ward 4B",
            approved_at=datetime.utcnow().isoformat(),
            approved_by="staff-admin-001",
        )
        self._users[nurse_user.uid] = nurse_user
        self._email_index[nurse_user.email.lower()] = nurse_user.uid

        # 4. Doctor Assistant
        asst_hash, asst_salt = hash_password("AssistantPassword123!")
        asst_user = StaffUser(
            uid="staff-asst-sloan",
            email="assistant.sloan@hospital.carepulse.org",
            full_name="Samantha Sloan, PA-C",
            hospital_name="CarePulse Central Hospital",
            employee_id="EMP-ASST-302",
            phone_number="+1-555-0302",
            role=StaffRole.DOCTOR_ASSISTANT,
            status=StaffStatus.APPROVED,
            password_hash=asst_hash,
            salt=asst_salt,
            department="Clinical Monitoring Support",
            approved_at=datetime.utcnow().isoformat(),
            approved_by="staff-admin-001",
        )
        self._users[asst_user.uid] = asst_user
        self._email_index[asst_user.email.lower()] = asst_user.uid

        # 5. Hospital Accountant
        acct_hash, acct_salt = hash_password("AccountantPassword123!")
        acct_user = StaffUser(
            uid="staff-acct-davis",
            email="accountant.davis@hospital.carepulse.org",
            full_name="Marcus Davis, CPA",
            hospital_name="CarePulse Central Hospital",
            employee_id="EMP-ACCT-401",
            phone_number="+1-555-0401",
            role=StaffRole.ACCOUNTANT,
            status=StaffStatus.APPROVED,
            password_hash=acct_hash,
            salt=acct_salt,
            department="Hospital Financial & Billing Services",
            approved_at=datetime.utcnow().isoformat(),
            approved_by="staff-admin-001",
        )
        self._users[acct_user.uid] = acct_user
        self._email_index[acct_user.email.lower()] = acct_user.uid

    def _save(self) -> None:
        """Persist current registry to JSON file safely."""
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            data = [user.model_dump() for user in self._users.values()]
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error("Failed to save staff registry: %s", e)

    def get_by_email(self, email: str) -> Optional[StaffUser]:
        uid = self._email_index.get(email.strip().lower())
        return self._users.get(uid) if uid else None

    def get_by_id(self, uid: str) -> Optional[StaffUser]:
        return self._users.get(uid)

    def get_user_by_session(self, token: str) -> Optional[StaffUser]:
        """Resolve staff user by token or session id."""
        if not token:
            return None
        clean_token = token.replace("Bearer ", "").strip()
        if clean_token.startswith("carepulse-staff-"):
            uid = clean_token.replace("carepulse-staff-", "")
            return self.get_by_id(uid)
        return self.get_by_id(clean_token) or self.get_by_email(clean_token)

    def register_staff(
        self,
        full_name: str,
        hospital_name: str,
        email: str,
        employee_id: str,
        phone_number: str,
        password: str,
        confirm_password: str,
    ) -> StaffUser:
        """Validates and registers a new hospital staff member with PENDING_APPROVAL status.
        
        Strict Requirements:
        - Validates all fields are non-empty.
        - Validates email regex.
        - Enforces password >= 8 characters with letters and numbers.
        - Ensures password matching.
        - Prevents duplicate accounts.
        - Users CANNOT self-assign roles or admin privileges (always PENDING_APPROVAL).
        """
        # 1. Validate required fields
        if not full_name or not full_name.strip():
            raise ValueError("Full Name is required.")
        if not hospital_name or not hospital_name.strip():
            raise ValueError("Hospital Name is required.")
        if not email or not email.strip():
            raise ValueError("Hospital Email Address is required.")
        if not employee_id or not employee_id.strip():
            raise ValueError("Employee ID is required.")
        if not phone_number or not phone_number.strip():
            raise ValueError("Phone Number is required.")
        if not password:
            raise ValueError("Password is required.")

        clean_email = email.strip().lower()

        # 2. Email format validation
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, clean_email):
            raise ValueError("Please provide a valid hospital email address format.")

        # 3. Password strength: >= 8 characters, at least 1 letter, at least 1 digit
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[a-zA-Z]", password):
            raise ValueError("Password must contain at least one letter.")
        if not re.search(r"[0-9]", password):
            raise ValueError("Password must contain at least one number.")

        # 4. Password confirmation
        if password != confirm_password:
            raise ValueError("Password and confirmation password do not match.")

        # 5. Prevent duplicate accounts
        if clean_email in self._email_index:
            raise ValueError("An account with this hospital email address already exists.")

        # 6. Secure password hashing
        pwd_hash, salt = hash_password(password)

        # 7. Create staff record with PENDING_APPROVAL
        uid = f"staff-{secrets.token_hex(6)}"
        user = StaffUser(
            uid=uid,
            email=clean_email,
            full_name=full_name.strip(),
            hospital_name=hospital_name.strip(),
            employee_id=employee_id.strip(),
            phone_number=phone_number.strip(),
            role=StaffRole.STAFF_PENDING,          # User CANNOT self-assign DOCTOR, NURSE, or HOSPITAL_ADMIN
            status=StaffStatus.PENDING_APPROVAL,   # Always PENDING_APPROVAL
            password_hash=pwd_hash,
            salt=salt,
            department="Awaiting Department Assignment",
            created_at=datetime.utcnow().isoformat(),
        )

        self._users[uid] = user
        self._email_index[clean_email] = uid
        self._save()
        logger.info("New staff registered: %s (%s) [STATUS: PENDING_APPROVAL]", user.full_name, user.email)
        return user

    def authenticate(self, email: str, password: str) -> tuple[Optional[StaffUser], Optional[str]]:
        """Authenticates hospital credentials and enforces approval status gating.
        
        Returns:
            (user, error_message)
            - If invalid credentials -> (None, "Invalid hospital email or password.")
            - If PENDING_APPROVAL -> (user, "Your registration has been submitted successfully. Please wait for hospital administrator approval.")
            - If REJECTED -> (user, "Your registration request was rejected by the hospital administrator.")
            - If APPROVED -> (user, None)
        """
        user = self.get_by_email(email)
        if not user or not user.password_hash or not user.salt:
            # Also allow default developer demo fallback if matching known email
            return None, "Invalid hospital email or password."

        if not verify_password(password, user.password_hash, user.salt):
            return None, "Invalid hospital email or password."

        if user.status == StaffStatus.PENDING_APPROVAL:
            return user, "Your registration has been submitted successfully. Please wait for hospital administrator approval."

        if user.status == StaffStatus.REJECTED:
            return user, "Your registration request was rejected by the hospital administrator."

        return user, None

    def list_pending(self) -> List[StaffUser]:
        """List all registrations awaiting hospital administrator approval."""
        return [u for u in self._users.values() if u.status == StaffStatus.PENDING_APPROVAL]

    def list_all(self) -> List[StaffUser]:
        """List all staff records."""
        return sorted(list(self._users.values()), key=lambda u: u.created_at, reverse=True)

    def approve_staff(
        self,
        uid: str,
        role: StaffRole,
        approved_by: str,
        department: Optional[str] = None,
    ) -> StaffUser:
        """Approves a staff member and assigns authorized clinical role (DOCTOR, NURSE, HOSPITAL_ADMIN)."""
        user = self.get_by_id(uid)
        if not user:
            raise KeyError(f"Staff member {uid} not found.")

        valid_roles = (
            StaffRole.DOCTOR,
            StaffRole.DOCTOR_ASSISTANT,
            StaffRole.NURSE,
            StaffRole.ACCOUNTANT,
            StaffRole.HOSPITAL_ADMIN,
        )
        if role not in valid_roles:
            raise ValueError(f"Invalid role '{role}'. Must be one of {valid_roles}.")

        user.status = StaffStatus.APPROVED
        user.role = role
        user.approved_at = datetime.utcnow().isoformat()
        user.approved_by = approved_by
        if department:
            user.department = department
        elif role == StaffRole.DOCTOR:
            user.department = "Medical Staff / Attending Physician"
        elif role == StaffRole.DOCTOR_ASSISTANT:
            user.department = "Clinical Monitoring Support"
        elif role == StaffRole.NURSE:
            user.department = "Inpatient Nursing Unit"
        elif role == StaffRole.ACCOUNTANT:
            user.department = "Hospital Financial & Billing Services"
        elif role == StaffRole.HOSPITAL_ADMIN:
            user.department = "Hospital Administration"

        self._save()
        logger.info("Staff %s (%s) APPROVED as %s by %s", user.full_name, user.email, user.role, approved_by)
        return user

    def reject_staff(self, uid: str, rejected_by: str) -> StaffUser:
        """Rejects a registration request."""
        user = self.get_by_id(uid)
        if not user:
            raise KeyError(f"Staff member {uid} not found.")

        user.status = StaffStatus.REJECTED
        user.approved_at = datetime.utcnow().isoformat()
        user.approved_by = rejected_by
        self._save()
        logger.info("Staff %s (%s) REJECTED by %s", user.full_name, user.email, rejected_by)
        return user


# Singleton instance
staff_registry = StaffRegistry()

