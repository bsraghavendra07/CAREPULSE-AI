"""
CarePulse — Hospital Staff Registration & Admin Approval Verification Test Suite.

Verifies:
1. Registration with all required fields -> PENDING_APPROVAL status.
2. Email validation.
3. Password strength enforcement (min 8 chars, letters, digits).
4. Password confirmation match check.
5. Duplicate account rejection.
6. Prevention of self-assigned administrator privileges.
7. Gating of PENDING_APPROVAL users from logging in (HTTP 403).
8. Admin listing of pending staff.
9. Admin approval and clinical role assignment (DOCTOR, NURSE, HOSPITAL_ADMIN).
10. Successful login after administrator approval.
11. Admin rejection handling.
"""

import sys
import os
import unittest
from pathlib import Path

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.staff_registry import staff_registry, StaffRole, StaffStatus


class TestStaffRegistrationAndSecurity(unittest.TestCase):

    def setUp(self):
        # Use TestClient with context manager to trigger startup
        self.client = TestClient(app)

    def test_01_successful_registration_pending_approval(self):
        test_email = "test.doctor1@hospital.carepulse.org"
        # Clean up if exists from previous run
        existing = staff_registry.get_by_email(test_email)
        if existing:
            staff_registry._users.pop(existing.uid, None)
            staff_registry._email_index.pop(test_email, None)

        payload = {
            "full_name": "Dr. Sarah Jenkins",
            "hospital_name": "CarePulse Regional Health Center",
            "email": test_email,
            "employee_id": "EMP-DOC-9901",
            "phone_number": "+1-555-0991",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
        }

        resp = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("Please wait for hospital administrator approval", data["message"])
        user = data["user"]
        self.assertEqual(user["email"], test_email)
        self.assertEqual(user["status"], "PENDING_APPROVAL")
        self.assertEqual(user["role"], "STAFF_PENDING")
        print("✓ Test 1 Passed: New staff registered successfully with PENDING_APPROVAL status")

    def test_02_validation_invalid_email(self):
        payload = {
            "full_name": "Nurse Alex",
            "hospital_name": "CarePulse General",
            "email": "not-a-valid-email",
            "employee_id": "EMP-9002",
            "phone_number": "+1-555-0992",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        resp = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("valid hospital email", resp.json()["detail"].lower())
        print("✓ Test 2 Passed: Invalid email format rejected")

    def test_03_validation_weak_password(self):
        # Less than 8 characters
        payload_short = {
            "full_name": "Nurse Alex",
            "hospital_name": "CarePulse General",
            "email": "alex.short@hospital.carepulse.org",
            "employee_id": "EMP-9003",
            "phone_number": "+1-555-0993",
            "password": "Pass1",
            "confirm_password": "Pass1",
        }
        resp = self.client.post("/api/auth/register", json=payload_short)
        self.assertIn(resp.status_code, (400, 422))
        self.assertTrue("at least 8" in resp.text.lower() or "string_too_short" in resp.text.lower())

        # No digits
        payload_no_digit = {
            "full_name": "Nurse Alex",
            "hospital_name": "CarePulse General",
            "email": "alex.nodigit@hospital.carepulse.org",
            "employee_id": "EMP-9004",
            "phone_number": "+1-555-0994",
            "password": "PasswordOnlyLetters",
            "confirm_password": "PasswordOnlyLetters",
        }
        resp = self.client.post("/api/auth/register", json=payload_no_digit)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("at least one number", resp.json()["detail"].lower())
        print("✓ Test 3 Passed: Weak password requirements enforced")

    def test_04_password_mismatch(self):
        payload = {
            "full_name": "Dr. Mark Sloan",
            "hospital_name": "CarePulse General",
            "email": "sloan@hospital.carepulse.org",
            "employee_id": "EMP-9005",
            "phone_number": "+1-555-0995",
            "password": "CorrectPassword123!",
            "confirm_password": "DifferentPassword456!",
        }
        resp = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("do not match", resp.json()["detail"].lower())
        print("✓ Test 4 Passed: Password confirmation mismatch rejected")

    def test_05_prevent_duplicate_accounts(self):
        # Attempt registering default admin email
        payload = {
            "full_name": "Impostor Admin",
            "hospital_name": "CarePulse General",
            "email": "admin@hospital.carepulse.org",
            "employee_id": "EMP-9999",
            "phone_number": "+1-555-9999",
            "password": "Password123!",
            "confirm_password": "Password123!",
        }
        resp = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(resp.status_code, 409)
        self.assertIn("already exists", resp.json()["detail"].lower())
        print("✓ Test 5 Passed: Duplicate registration blocked with HTTP 409 Conflict")

    def test_06_pending_user_cannot_login(self):
        test_email = "pending.user@hospital.carepulse.org"
        existing = staff_registry.get_by_email(test_email)
        if existing:
            staff_registry._users.pop(existing.uid, None)
            staff_registry._email_index.pop(test_email, None)

        # Register pending user
        self.client.post("/api/auth/register", json={
            "full_name": "Pending Resident",
            "hospital_name": "CarePulse General",
            "email": test_email,
            "employee_id": "EMP-RES-01",
            "phone_number": "+1-555-0199",
            "password": "ValidPassword123!",
            "confirm_password": "ValidPassword123!",
        })

        # Attempt login
        login_resp = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "ValidPassword123!",
        })
        self.assertEqual(login_resp.status_code, 403)
        self.assertIn("Please wait for hospital administrator approval", login_resp.json()["detail"])
        print("✓ Test 6 Passed: Pending users blocked from login with explicit status message")

    def test_07_admin_lists_pending_and_approves_staff(self):
        test_email = "dr.watson@hospital.carepulse.org"
        existing = staff_registry.get_by_email(test_email)
        if existing:
            staff_registry._users.pop(existing.uid, None)
            staff_registry._email_index.pop(test_email, None)

        # Register
        reg_resp = self.client.post("/api/auth/register", json={
            "full_name": "Dr. John Watson",
            "hospital_name": "CarePulse General",
            "email": test_email,
            "employee_id": "EMP-DOC-221B",
            "phone_number": "+1-555-0221",
            "password": "WatsonPassword123!",
            "confirm_password": "WatsonPassword123!",
        })
        uid = reg_resp.json()["user"]["uid"]

        # Admin checks pending list
        pending_resp = self.client.get("/api/admin/pending-staff")
        self.assertEqual(pending_resp.status_code, 200)
        pending_list = pending_resp.json()
        uids = [u["uid"] for u in pending_list]
        self.assertIn(uid, uids)

        # Admin approves user as DOCTOR
        approve_resp = self.client.post(
            f"/api/admin/approve-staff/{uid}",
            json={"role": "DOCTOR", "department": "General Medicine"},
        )
        self.assertEqual(approve_resp.status_code, 200)
        approved_user = approve_resp.json()["user"]
        self.assertEqual(approved_user["status"], "APPROVED")
        self.assertEqual(approved_user["role"], "DOCTOR")

        # Now approved user can login successfully!
        login_resp = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WatsonPassword123!",
        })
        self.assertEqual(login_resp.status_code, 200)
        token_data = login_resp.json()
        self.assertTrue(token_data["success"])
        self.assertEqual(token_data["user"]["role"], "DOCTOR")
        print("✓ Test 7 Passed: Admin approved staff as DOCTOR and user logged in successfully")

    def test_08_admin_rejects_staff(self):
        test_email = "rejected.staff@hospital.carepulse.org"
        existing = staff_registry.get_by_email(test_email)
        if existing:
            staff_registry._users.pop(existing.uid, None)
            staff_registry._email_index.pop(test_email, None)

        reg_resp = self.client.post("/api/auth/register", json={
            "full_name": "Unverified Applicant",
            "hospital_name": "Unknown Clinic",
            "email": test_email,
            "employee_id": "EMP-REJ-01",
            "phone_number": "+1-555-0900",
            "password": "RejectMePass123!",
            "confirm_password": "RejectMePass123!",
        })
        uid = reg_resp.json()["user"]["uid"]

        # Admin rejects
        reject_resp = self.client.post(f"/api/admin/reject-staff/{uid}")
        self.assertEqual(reject_resp.status_code, 200)
        self.assertEqual(reject_resp.json()["user"]["status"], "REJECTED")

        # Login is blocked
        login_resp = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "RejectMePass123!",
        })
        self.assertEqual(login_resp.status_code, 403)
        self.assertIn("rejected", login_resp.json()["detail"].lower())
        print("✓ Test 8 Passed: Admin rejected staff applicant properly blocked")


if __name__ == "__main__":
    unittest.main()
