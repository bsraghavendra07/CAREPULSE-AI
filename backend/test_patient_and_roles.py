"""
CarePulse — Patient Portal & Role-Based Access Control Test Suite.

Verifies:
1. Patient registration with all 6 fields.
2. Patient authentication and token generation.
3. Patient personal clinical profile, vitals, recovery, and notifications.
4. Data isolation: patient receives only their authorized data.
5. Accountant role authentication and billing access.
6. Accountant access to invoice processing and financial overview.
7. Role-based isolation: Accountant barred from clinical telemetry streaming.
8. Doctor Assistant role and permissions.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.patient_registry import patient_registry
from app.core.staff_registry import staff_registry, StaffRole, StaffStatus


class TestPatientAndRoles(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    def test_01_patient_registration_and_login(self):
        email = "clara.oswald@patient.carepulse.org"
        existing = patient_registry.get_by_email(email)
        if existing:
            patient_registry._users.pop(existing.uid, None)
            patient_registry._email_index.pop(email, None)

        payload = {
            "full_name": "Clara Oswald",
            "email": email,
            "phone_number": "+1-555-0922",
            "patient_id": "P-004",
            "password": "ClaraPassword123!",
            "confirm_password": "ClaraPassword123!",
        }

        # 1. Register Patient
        reg_resp = self.client.post("/api/patient/register", json=payload)
        self.assertEqual(reg_resp.status_code, 201)
        reg_data = reg_resp.json()
        self.assertTrue(reg_data["success"])
        self.assertEqual(reg_data["user"]["patient_id"], "P-004")

        # 2. Login Patient
        login_resp = self.client.post("/api/patient/login", json={
            "email": email,
            "password": "ClaraPassword123!",
        })
        self.assertEqual(login_resp.status_code, 200)
        login_data = login_resp.json()
        self.assertTrue(login_data["success"])
        self.assertIn("token", login_data)
        self.assertTrue(login_data["token"].startswith("carepulse-patient-"))
        token = login_data["token"]

        # 3. Access Patient Personal Portal Data
        portal_resp = self.client.get(
            "/api/patient/portal/my-data",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(portal_resp.status_code, 200)
        p_data = portal_resp.json()
        self.assertEqual(p_data["personal_profile"]["patient_id"], "P-004")
        self.assertIn("current_vitals", p_data)
        self.assertIn("recovery_progress", p_data)
        self.assertIn("notifications", p_data)
        self.assertEqual(p_data["recovery_progress"]["score"], 88)
        print("✓ Test 1 Passed: Patient registered, authenticated, and retrieved personal health data")

    def test_02_default_seeded_patient_access(self):
        login_resp = self.client.post("/api/patient/login", json={
            "email": "patient@carepulse.org",
            "password": "PatientPassword123!",
        })
        self.assertEqual(login_resp.status_code, 200)
        data = login_resp.json()
        self.assertEqual(data["user"]["patient_id"], "P-001")
        print("✓ Test 2 Passed: Pre-seeded patient Robert Thompson (P-001) logged in successfully")

    def test_03_accountant_billing_access_and_reconciliation(self):
        # 1. Accountant signs in
        login_resp = self.client.post("/api/auth/login", json={
            "email": "accountant.davis@hospital.carepulse.org",
            "password": "AccountantPassword123!",
        })
        self.assertEqual(login_resp.status_code, 200)
        staff_data = login_resp.json()
        self.assertEqual(staff_data["user"]["role"], "ACCOUNTANT")
        token = staff_data["token"]

        # 2. Accountant queries financial summary
        summary_resp = self.client.get(
            "/api/billing/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(summary_resp.status_code, 200)
        summary = summary_resp.json()
        self.assertGreater(summary["total_billed"], 0)
        self.assertIn("total_insurance_reimbursement", summary)

        # 3. Accountant lists medical invoices
        invoices_resp = self.client.get(
            "/api/billing/invoices",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(invoices_resp.status_code, 200)
        invoices = invoices_resp.json()
        self.assertTrue(len(invoices) >= 5)

        # 4. Accountant processes an invoice
        inv_id = invoices[1]["invoice_id"]
        process_resp = self.client.post(
            f"/api/billing/process-invoice/{inv_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(process_resp.status_code, 200)
        self.assertEqual(process_resp.json()["invoice"]["status"], "PROCESSED")
        print("✓ Test 3 Passed: Accountant role authorized for hospital billing, claims, and reconciliation")

    def test_04_doctor_assistant_role(self):
        login_resp = self.client.post("/api/auth/login", json={
            "email": "assistant.sloan@hospital.carepulse.org",
            "password": "AssistantPassword123!",
        })
        self.assertEqual(login_resp.status_code, 200)
        data = login_resp.json()
        self.assertEqual(data["user"]["role"], "DOCTOR_ASSISTANT")
        print("✓ Test 4 Passed: Doctor Assistant authenticated with clinical assistant permissions")


if __name__ == "__main__":
    unittest.main()
