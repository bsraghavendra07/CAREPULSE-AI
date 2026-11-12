"""
CarePulse — Patient Portal Registry & Data Isolation Layer.

Manages patient accounts, secure authentication, and ensures strict data isolation
so patients can ONLY access their own authorized clinical records, vitals, and recovery progress.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "patient_registry.json"


class PatientUser(BaseModel):
    uid: str
    email: str
    full_name: str
    phone_number: str
    patient_id: str  # Associated Synthea or clinical ID (e.g. P-001)
    password_hash: Optional[str] = None
    salt: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "ACTIVE"

    def to_safe_dict(self) -> Dict[str, Any]:
        """Return patient data omitting sensitive security fields."""
        d = self.model_dump()
        d.pop("password_hash", None)
        d.pop("salt", None)
        return d


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
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
    if not password_hash or not salt:
        return False
    computed, _ = hash_password(password, salt)
    return secrets.compare_digest(computed, password_hash)


class PatientRegistry:
    """Manages patient user authentication and profile storage."""

    def __init__(self, storage_path: Path = DATA_FILE) -> None:
        self.storage_path = storage_path
        self._users: Dict[str, PatientUser] = {}
        self._email_index: Dict[str, str] = {}
        self._load()

    def _load(self) -> None:
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    for item in raw_data:
                        user = PatientUser(**item)
                        self._users[user.uid] = user
                        self._email_index[user.email.strip().lower()] = user.uid
                logger.info("Loaded %d patient records from %s", len(self._users), self.storage_path)
                return
            except Exception as e:
                logger.warning("Could not read patient registry: %s. Re-seeding defaults.", e)

        self._seed_default_accounts()
        self._save()

    def _seed_default_accounts(self) -> None:
        """Seed default patient accounts linked to Synthea patients (P-001 through P-005)."""
        seed_patients = [
            ("patient@carepulse.org", "Robert Thompson", "+1-555-0182", "P-001", "PatientPassword123!"),
            ("margaret.chen@patient.carepulse.org", "Margaret Chen", "+1-555-0183", "P-002", "PatientPassword123!"),
            ("james.walker@patient.carepulse.org", "James Walker", "+1-555-0184", "P-003", "PatientPassword123!"),
        ]

        for email, name, phone, pid, pwd in seed_patients:
            h, s = hash_password(pwd)
            u = PatientUser(
                uid=f"patient-{pid.lower()}",
                email=email.lower(),
                full_name=name,
                phone_number=phone,
                patient_id=pid,
                password_hash=h,
                salt=s,
                created_at=datetime.utcnow().isoformat(),
                status="ACTIVE",
            )
            self._users[u.uid] = u
            self._email_index[u.email] = u.uid

    def _save(self) -> None:
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            data = [user.model_dump() for user in self._users.values()]
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error("Failed to save patient registry: %s", e)

    def get_by_email(self, email: str) -> Optional[PatientUser]:
        uid = self._email_index.get(email.strip().lower())
        return self._users.get(uid) if uid else None

    def get_by_id(self, uid: str) -> Optional[PatientUser]:
        return self._users.get(uid)

    def register_patient(
        self,
        full_name: str,
        email: str,
        phone_number: str,
        patient_id: str,
        password: str,
        confirm_password: str,
    ) -> PatientUser:
        """Validates and registers a new patient with access to their own records."""
        if not full_name or not full_name.strip():
            raise ValueError("Full Name is required.")
        if not email or not email.strip():
            raise ValueError("Email address is required.")
        if not phone_number or not phone_number.strip():
            raise ValueError("Phone Number is required.")
        if not patient_id or not patient_id.strip():
            raise ValueError("Patient ID is required.")
        if not password:
            raise ValueError("Password is required.")

        clean_email = email.strip().lower()

        # Email regex
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", clean_email):
            raise ValueError("Please provide a valid email address.")

        # Password strength
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[a-zA-Z]", password) or not re.search(r"[0-9]", password):
            raise ValueError("Password must contain both letters and numbers.")

        if password != confirm_password:
            raise ValueError("Password and confirmation password do not match.")

        if clean_email in self._email_index:
            raise ValueError("An account with this email address already exists.")

        pwd_hash, salt = hash_password(password)
        uid = f"patient-{secrets.token_hex(6)}"

        user = PatientUser(
            uid=uid,
            email=clean_email,
            full_name=full_name.strip(),
            phone_number=phone_number.strip(),
            patient_id=patient_id.strip().upper(),
            password_hash=pwd_hash,
            salt=salt,
            created_at=datetime.utcnow().isoformat(),
            status="ACTIVE",
        )

        self._users[uid] = user
        self._email_index[clean_email] = uid
        self._save()
        logger.info("New patient registered: %s (%s) [Patient ID: %s]", user.full_name, user.email, user.patient_id)
        return user

    def authenticate(self, email: str, password: str) -> tuple[Optional[PatientUser], Optional[str]]:
        user = self.get_by_email(email)
        if not user or not user.password_hash or not user.salt:
            return None, "Invalid email or password."

        if not verify_password(password, user.password_hash, user.salt):
            return None, "Invalid email or password."

        return user, None


patient_registry = PatientRegistry()

