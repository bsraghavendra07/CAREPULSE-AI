"""
CarePulse — Automated Clinical Team Escalation via FHIR R4.

Generates standard FHIR R4:
1. CommunicationRequest (multilingual notifications: English, Kannada, Hindi)
2. Flag (patient priority status)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Literal


SUPPORTED_LANGUAGES = ["en", "kn", "hi"]


def generate_multilingual_message(
    patient_id: str,
    patient_name: str,
    alert_level: str,
    alert_title: str,
    reading: str,
    rule: str,
    patient_fact: str,
    language: str = "en",
) -> str:
    """Generate clinically accurate escalation text in English, Kannada, or Hindi."""
    lang = language.lower() if language else "en"

    if lang == "kn":
        return (
            f"ವೈದ್ಯಕೀಯ ತುರ್ತು ಎಚ್ಚರಿಕೆ (CLINICAL ESCALATION) — {alert_level.upper()}\n"
            f"ರೋಗಿ: {patient_name} (ಐಡಿ: {patient_id})\n"
            f"ಎಚ್ಚರಿಕೆ: {alert_title}\n"
            f"ಪ್ರಸ್ತುತ ರೀಡಿಂಗ್ (Reading): {reading}\n"
            f"ನಿಯಮ (Rule): {rule}\n"
            f"ರೋಗಿಯ ಇತಿಹಾಸ (Patient Fact): {patient_fact}\n"
            f"ಸೂಚನೆ: ಕೇರ್‌ಪಲ್ಸ್ ಕ್ಲಿನಿಕಲ್ ಡಿಸಿಷನ್-ಸಪೋರ್ಟ್ ಸಿಸ್ಟಮ್‌ನಿಂದ ತುರ್ತು ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆಗೆ ವಿನಂತಿಸಲಾಗಿದೆ."
        )

    if lang == "hi":
        return (
            f"चिकित्सीय दल एस्केलेशन (CLINICAL ESCALATION) — {alert_level.upper()}\n"
            f"रोगी: {patient_name} (आईडी: {patient_id})\n"
            f"चेतावनी: {alert_title}\n"
            f"वर्तमान रीडिंग (Reading): {reading}\n"
            f"नियम (Rule): {rule}\n"
            f"रोगी का संदर्भ (Patient Fact): {patient_fact}\n"
            f"नोट: केयरपल्स क्लिनिकल डिसीजन-सपोर्ट सिस्टम द्वारा तत्काल चिकित्सीय समीक्षा की सिफारिश की जाती है।"
        )

    # Default to English
    return (
        f"CLINICAL TEAM ESCALATION — {alert_level.upper()}\n"
        f"Patient: {patient_name} (ID: {patient_id})\n"
        f"Alert: {alert_title}\n"
        f"Reading: {reading}\n"
        f"Rule: {rule}\n"
        f"Patient Fact: {patient_fact}\n"
        f"Notice: Clinical review recommended by CarePulse decision-support system."
    )


def create_fhir_communication_request(
    patient_id: str,
    patient_name: str,
    alert_level: str,
    alert_title: str,
    reading: str,
    rule: str,
    patient_fact: str,
    language: str = "en",
    recipient_role: str = "Attending Clinician / Rapid Response Team",
) -> Dict[str, Any]:
    """Create a standard HL7 FHIR R4 CommunicationRequest resource."""
    req_id = f"comm-req-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    message_text = generate_multilingual_message(
        patient_id=patient_id,
        patient_name=patient_name,
        alert_level=alert_level,
        alert_title=alert_title,
        reading=reading,
        rule=rule,
        patient_fact=patient_fact,
        language=language,
    )

    priority_map = {
        "URGENT": "urgent",
        "REVIEW": "asap",
        "WATCH": "routine",
    }
    fhir_priority = priority_map.get(alert_level.upper(), "routine")

    return {
        "resourceType": "CommunicationRequest",
        "id": req_id,
        "status": "active",
        "priority": fhir_priority,
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/communication-category",
                        "code": "alert",
                        "display": "Alert",
                    }
                ]
            }
        ],
        "subject": {
            "reference": f"Patient/{patient_id}",
            "display": patient_name,
        },
        "authoredOn": now_iso,
        "recipient": [
            {
                "display": recipient_role,
            }
        ],
        "payload": [
            {
                "contentString": message_text,
            }
        ],
        "extension": [
            {
                "url": "http://carepulse.org/fhir/escalation-language",
                "valueCode": language,
            },
            {
                "url": "http://carepulse.org/fhir/alert-rule",
                "valueString": rule,
            },
            {
                "url": "http://carepulse.org/fhir/patient-fact",
                "valueString": patient_fact,
            },
        ],
        "_metadata": {
            "language": language,
            "reading": reading,
            "rule": rule,
            "patient_fact": patient_fact,
            "message": message_text,
        },
    }


def create_fhir_flag(
    patient_id: str,
    patient_name: str,
    alert_level: str,
    alert_title: str,
) -> Dict[str, Any]:
    """Create a standard HL7 FHIR R4 Flag resource."""
    flag_id = f"flag-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    code_val = "clinical"
    if alert_level.upper() == "URGENT":
        code_val = "safety"

    return {
        "resourceType": "Flag",
        "id": flag_id,
        "status": "active",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/flag-category",
                        "code": code_val,
                        "display": "Clinical Health Warning",
                    }
                ]
            }
        ],
        "code": {
            "text": f"[{alert_level.upper()}] {alert_title}",
        },
        "subject": {
            "reference": f"Patient/{patient_id}",
            "display": patient_name,
        },
        "period": {
            "start": now_iso,
        },
    }

