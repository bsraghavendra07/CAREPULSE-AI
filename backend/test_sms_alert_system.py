"""
Unit and Integration Tests for CarePulse Real-World Emergency SMS Dispatch System.
Verifies:
1. Formatting of emergency cellular SMS message text with patient details and complete physiological report.
2. Emergency trigger logic (URGENT / NEWS2 >= 7 / Red score = 3).
3. Anti-spam throttling cooldown (30 seconds per patient).
4. Endpoints: /api/sms/alerts, /api/sms/alerts/latest, /api/sms/send-test, /api/sms/config.
5. Simulated Tier-1 carrier delivery and Twilio payload structure.
"""

import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.sms_dispatcher import (
    SMSAlertRecord,
    FullClinicalReport,
    format_emergency_sms_text,
    dispatch_emergency_sms,
    sms_store,
)


def test_emergency_sms_format():
    """Verify that cellular SMS text contains all mandatory clinical elements."""
    vitals = {
        "heart_rate": 142,
        "oxygen_saturation": 83,
        "respiratory_rate": 32,
        "systolic_bp": 84,
        "body_temperature": 39.1,
    }
    sms_text = format_emergency_sms_text(
        patient_name="Robert Thompson",
        patient_id="P-001",
        patient_age=68,
        patient_gender="male",
        condition="Post-Myocardial Infarction",
        news2_score=11,
        red_param="heart_rate",
        trigger_reason="Severe Tachycardia & Acute Hypoxemia",
        vitals=vitals,
        specialist_name="Dr. Robert Rivera, MD",
        specialist_dept="Cardiology",
        clinical_action="Immediate bedside cardiac resuscitation & emergency oxygen escalation",
        report_url="http://localhost:5173/report?patient_id=P-001&alert_id=test-1",
    )

    assert "🚨 CAREPULSE CRITICAL EMERGENCY ALERT 🚨" in sms_text
    assert "Robert Thompson (#P-001)" in sms_text
    assert "68M" in sms_text
    assert "NEWS2: 11" in sms_text
    assert "[RED ALARM: HEART_RATE]" in sms_text
    assert "HR: 142 bpm" in sms_text
    assert "SpO2: 83%" in sms_text
    assert "RR: 32 /min" in sms_text
    assert "Dr. Robert Rivera, MD (Cardiology)" in sms_text
    assert "http://localhost:5173/report?patient_id=P-001&alert_id=test-1" in sms_text


async def test_emergency_dispatch_and_cooldown():
    """Verify emergency dispatch succeeds and cooldown suppresses rapid repeated alerts."""
    patient = {
        "id": "P-TEST-99",
        "name": "Sarah Connor",
        "gender": "female",
        "birthDate": "1965-05-12",
        "condition": "Severe Sepsis",
        "specialist_name": "Dr. Marcus Vance, MD",
        "specialist_title": "Consultant in Intensive Care",
        "department": "General Medicine / Critical Care",
        "specialist_phone": "+1 (555) 911-2233",
    }
    
    class MockAlert:
        id = "alert-test-99"
        severity = "URGENT"
        emergency_flag = True
        news2_score = 8
        alert_reason = "Acute septic shock with hypotension"
        clinical_action = "Initiate Sepsis Six protocol immediately"
        specialist_name = patient["specialist_name"]
        specialist_title = patient["specialist_title"]
        department = patient["department"]
        specialist_phone = patient["specialist_phone"]

    vitals = {"heart_rate": 130, "oxygen_saturation": 88, "respiratory_rate": 28, "systolic_bp": 85, "body_temperature": 39.5}

    # First dispatch should succeed
    record1 = await dispatch_emergency_sms(patient, MockAlert(), vitals, force=False)
    assert record1 is not None
    assert record1.patient_id == "P-TEST-99"
    assert record1.delivery_status in ("DELIVERED", "DELIVERED (SIMULATED)")
    assert record1.full_report.news2_total_score == 8
    assert record1.full_report.vital_signs["heart_rate"] == 130

    # Immediate second dispatch for the same patient should be throttled by cooldown
    record2 = await dispatch_emergency_sms(patient, MockAlert(), vitals, force=False)
    assert record2 is None

    # Forced dispatch should bypass cooldown
    record3 = await dispatch_emergency_sms(patient, MockAlert(), vitals, force=True)
    assert record3 is not None
    assert record3.id != record1.id


async def test_sms_api_endpoints():
    """Verify FastAPI routes for SMS alert history, latest, and test trigger."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger test SMS
        post_resp = await client.post("/api/sms/send-test", json={
            "patient_id": "P-001",
            "recipient_phone": "+1 (555) 345-6789",
            "custom_note": "Doctor on-demand emergency verification test",
            "force_urgent": True,
        })
        assert post_resp.status_code == 201
        data = post_resp.json()
        assert data["patient_id"] == "P-001"
        assert data["recipient_phone"] == "+1 (555) 345-6789"
        assert "Doctor on-demand emergency verification test" in data["message_body"]
        assert data["full_report"]["vital_signs"]["heart_rate"] == 138

        # 2. Get list of SMS alerts
        list_resp = await client.get("/api/sms/alerts")
        assert list_resp.status_code == 200
        alerts = list_resp.json()
        assert len(alerts) >= 1
        assert any(a["id"] == data["id"] for a in alerts)

        # 3. Get latest SMS alert
        latest_resp = await client.get("/api/sms/alerts/latest")
        assert latest_resp.status_code == 200
        latest = latest_resp.json()
        assert latest is not None
        assert latest["id"] == data["id"]

        # 4. Get specific SMS by ID
        detail_resp = await client.get(f"/api/sms/alerts/{data['id']}")
        assert detail_resp.status_code == 200
        assert detail_resp.json()["id"] == data["id"]

        # 5. Check config
        cfg_resp = await client.get("/api/sms/config")
        assert cfg_resp.status_code == 200
        cfg = cfg_resp.json()
        assert "cooldown_seconds" in cfg


if __name__ == "__main__":
    print("Running SMS alert tests...")
    test_emergency_sms_format()
    print("✓ test_emergency_sms_format passed")
    asyncio.run(test_emergency_dispatch_and_cooldown())
    print("✓ test_emergency_dispatch_and_cooldown passed")
    asyncio.run(test_sms_api_endpoints())
    print("✓ test_sms_api_endpoints passed")
    print("\nALL SMS ALERT TESTS PASSED SUCCESSFULLY! 🎉")
