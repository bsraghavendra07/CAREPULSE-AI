"""
CAREPULSE 1.0 — Smart Specialist Routing Engine.
Routes clinical alerts to the appropriate medical specialist based on registered
conditions, clinical presentation, and emergency safety protocols.
"""

from __future__ import annotations

import logging
import re
import threading
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class Department(str, Enum):
    CARDIOLOGY = "Cardiology"
    PULMONOLOGY = "Pulmonology"
    NEUROLOGY = "Neurology"
    NEPHROLOGY = "Nephrology"
    ENDOCRINOLOGY = "Endocrinology"
    GENERAL_MEDICINE = "General Medicine / Critical Care"
    SURGICAL_CARE = "Surgical Care / Orthopedics"


class AlertStatus(str, Enum):
    PENDING = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"


class AlertSeverity(str, Enum):
    ROUTINE = "ROUTINE"
    WATCH = "WATCH"
    REVIEW = "REVIEW"
    URGENT = "URGENT"
    DEVICE_WARNING = "DEVICE_WARNING"


class SpecialistInfo(BaseModel):
    id: str
    name: str
    title: str
    department: Department
    email: str
    initials: str
    phone_extension: str


# Simulated specialist roster
SPECIALIST_ROSTER: Dict[Department, SpecialistInfo] = {
    Department.CARDIOLOGY: SpecialistInfo(
        id="spec-card-01",
        name="Dr. Robert Rivera, MD",
        title="Senior Cardiologist & Electrophysiology Lead",
        department=Department.CARDIOLOGY,
        email="dr.rivera@hospital.carepulse.org",
        initials="RR",
        phone_extension="x4102",
    ),
    Department.PULMONOLOGY: SpecialistInfo(
        id="spec-pulm-01",
        name="Dr. Elena Rostova, MD",
        title="Consultant Pulmonologist & Respiratory Lead",
        department=Department.PULMONOLOGY,
        email="dr.rostova@hospital.carepulse.org",
        initials="ER",
        phone_extension="x4205",
    ),
    Department.GENERAL_MEDICINE: SpecialistInfo(
        id="spec-gen-01",
        name="Dr. Marcus Vance, MD",
        title="Consultant in Internal & Critical Care Medicine",
        department=Department.GENERAL_MEDICINE,
        email="dr.vance@hospital.carepulse.org",
        initials="MV",
        phone_extension="x4001",
    ),
    Department.NEUROLOGY: SpecialistInfo(
        id="spec-neuro-01",
        name="Dr. Sarah Chen, MD, PhD",
        title="Consultant Neurologist & Neurovascular Specialist",
        department=Department.NEUROLOGY,
        email="dr.chen@hospital.carepulse.org",
        initials="SC",
        phone_extension="x4310",
    ),
    Department.NEPHROLOGY: SpecialistInfo(
        id="spec-neph-01",
        name="Dr. Arthur Pendelton, MD",
        title="Senior Consultant Nephrologist",
        department=Department.NEPHROLOGY,
        email="dr.pendelton@hospital.carepulse.org",
        initials="AP",
        phone_extension="x4415",
    ),
    Department.ENDOCRINOLOGY: SpecialistInfo(
        id="spec-endo-01",
        name="Dr. Maya Patel, MD",
        title="Consultant Endocrinologist & Diabetologist",
        department=Department.ENDOCRINOLOGY,
        email="dr.patel@hospital.carepulse.org",
        initials="MP",
        phone_extension="x4520",
    ),
    Department.SURGICAL_CARE: SpecialistInfo(
        id="spec-surg-01",
        name="Dr. Julian Hayes, MD, FRCS",
        title="Consultant Orthopedic & Post-Operative Surgeon",
        department=Department.SURGICAL_CARE,
        email="dr.hayes@hospital.carepulse.org",
        initials="JH",
        phone_extension="x4630",
    ),
}

# General Attending fallback
GENERAL_ATTENDING = SpecialistInfo(
    id="spec-gen-attending",
    name="Dr. Robert Rivera, MD",
    title="General Attending Clinician - Ward 4B",
    department=Department.GENERAL_MEDICINE,
    email="dr.rivera@hospital.carepulse.org",
    initials="RR",
    phone_extension="x4000",
)


# Condition keyword-to-department rules (case-insensitive substring match)
CONDITION_DEPARTMENT_MAP = [
    # Cardiology
    ("heart failure", Department.CARDIOLOGY),
    ("myocardial infarction", Department.CARDIOLOGY),
    ("cardiomyopathy", Department.CARDIOLOGY),
    ("atrial fibrillation", Department.CARDIOLOGY),
    ("arrhythmia", Department.CARDIOLOGY),
    ("cardiac", Department.CARDIOLOGY),
    ("hypertension", Department.CARDIOLOGY),
    # Pulmonology
    ("copd", Department.PULMONOLOGY),
    ("pneumonia", Department.PULMONOLOGY),
    ("respiratory failure", Department.PULMONOLOGY),
    ("asthma", Department.PULMONOLOGY),
    ("hypercapnic", Department.PULMONOLOGY),
    # Endocrinology
    ("diabetes", Department.ENDOCRINOLOGY),
    ("diabetic", Department.ENDOCRINOLOGY),
    ("ketoacidosis", Department.ENDOCRINOLOGY),
    ("thyroid", Department.ENDOCRINOLOGY),
    # Nephrology
    ("kidney disease", Department.NEPHROLOGY),
    ("renal failure", Department.NEPHROLOGY),
    ("nephropathy", Department.NEPHROLOGY),
    ("dialysis", Department.NEPHROLOGY),
    # Neurology
    ("stroke", Department.NEUROLOGY),
    ("epilepsy", Department.NEUROLOGY),
    ("seizure", Department.NEUROLOGY),
    ("neurological", Department.NEUROLOGY),
    ("tia", Department.NEUROLOGY),
    # Surgical Care / Orthopedics
    ("post-knee arthroplasty", Department.SURGICAL_CARE),
    ("arthroplasty", Department.SURGICAL_CARE),
    ("orthopedic", Department.SURGICAL_CARE),
    ("surgical complication", Department.SURGICAL_CARE),
    ("post-operative", Department.SURGICAL_CARE),
    ("post-op", Department.SURGICAL_CARE),
    # Sepsis / Critical Care / General Medicine
    ("sepsis", Department.GENERAL_MEDICINE),
    ("sirs", Department.GENERAL_MEDICINE),
    ("bacteremia", Department.GENERAL_MEDICINE),
    ("shock", Department.GENERAL_MEDICINE),
    ("post-abdominal surgery", Department.GENERAL_MEDICINE),
]


def determine_department_for_condition(condition_str: str) -> Optional[Department]:
    """Match condition text against clinical rules using word boundaries without inferring disease from vitals."""
    if not condition_str:
        return None
    lower = condition_str.lower().strip()
    for keyword, dept in CONDITION_DEPARTMENT_MAP:
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, lower):
            return dept
    return None


def categorize_patient(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Extract registered medical conditions and assign department & primary specialist."""
    condition = profile.get("condition", "")
    pid = profile.get("id", "")

    dept = determine_department_for_condition(condition)
    if not dept:
        specialist = GENERAL_ATTENDING
        dept = Department.GENERAL_MEDICINE
    else:
        specialist = SPECIALIST_ROSTER.get(dept, GENERAL_ATTENDING)

    return {
        "department": dept.value,
        "specialist_id": specialist.id,
        "specialist_name": specialist.name,
        "specialist_title": specialist.title,
        "specialist_email": specialist.email,
        "specialist_initials": specialist.initials,
        "phone_extension": specialist.phone_extension,
    }


class RoutedAlert(BaseModel):
    id: str = Field(description="Unique alert ID")
    patient_id: str
    patient_name: str
    patient_condition: str
    department: str
    specialist_name: str
    specialist_title: str
    specialist_email: str
    severity: AlertSeverity
    news2_score: int
    triage_tier: str
    alert_reason: str
    clinical_action: str
    vital_readings: Dict[str, Any]
    timestamp: str
    status: AlertStatus = AlertStatus.PENDING
    status_updated_at: Optional[str] = None
    acknowledged_by: Optional[str] = None
    emergency_flag: bool = False
    emergency_queue: bool = False
    is_artifact: bool = False
    sensor_note: Optional[str] = None
    decision_support_specialty: Optional[str] = None


class AlertStore:
    """Thread-safe in-memory store for routed specialist alerts."""

    def __init__(self, max_alerts: int = 200) -> None:
        self._alerts: List[RoutedAlert] = []
        self._lock = threading.Lock()
        self._max_alerts = max_alerts

    def add_alert(self, alert: RoutedAlert) -> RoutedAlert:
        with self._lock:
            # Check for recent duplicate pending alert for same patient and reason within 30s
            for existing in self._alerts:
                if (
                    existing.patient_id == alert.patient_id
                    and existing.severity == alert.severity
                    and existing.status == AlertStatus.PENDING
                    and existing.alert_reason == alert.alert_reason
                ):
                    # Update vitals and timestamp on existing alert rather than spamming queue
                    existing.vital_readings = alert.vital_readings
                    existing.news2_score = alert.news2_score
                    existing.timestamp = alert.timestamp
                    return existing

            self._alerts.insert(0, alert)
            if len(self._alerts) > self._max_alerts:
                self._alerts.pop()
            return alert

    def get_alerts(
        self,
        department: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        patient_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[RoutedAlert]:
        with self._lock:
            result = self._alerts
            if department and department.lower() != "all":
                result = [a for a in result if a.department.lower() == department.lower()]
            if status and status.lower() != "all":
                result = [a for a in result if a.status.value.lower() == status.lower()]
            if severity and severity.lower() != "all":
                result = [a for a in result if a.severity.value.lower() == severity.lower()]
            if patient_id:
                result = [a for a in result if a.patient_id == patient_id]
            return result[:limit]

    def update_status(
        self,
        alert_id: str,
        new_status: AlertStatus,
        clinician_name: str = "Dr. Rivera",
    ) -> Optional[RoutedAlert]:
        with self._lock:
            for alert in self._alerts:
                if alert.id == alert_id:
                    alert.status = new_status
                    alert.status_updated_at = datetime.now(timezone.utc).isoformat()
                    alert.acknowledged_by = clinician_name
                    return alert
            return None

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._alerts)
            pending = sum(1 for a in self._alerts if a.status == AlertStatus.PENDING)
            acknowledged = sum(1 for a in self._alerts if a.status == AlertStatus.ACKNOWLEDGED)
            under_review = sum(1 for a in self._alerts if a.status == AlertStatus.UNDER_REVIEW)
            resolved = sum(1 for a in self._alerts if a.status == AlertStatus.RESOLVED)
            urgent = sum(1 for a in self._alerts if a.severity == AlertSeverity.URGENT)

            # Department breakdown
            dept_counts: Dict[str, int] = {}
            for d in Department:
                dept_counts[d.value] = sum(1 for a in self._alerts if a.department == d.value)

            return {
                "total_alerts": total,
                "pending_reviews": pending,
                "acknowledged_alerts": acknowledged,
                "under_review_alerts": under_review,
                "resolved_alerts": resolved,
                "urgent_alerts": urgent,
                "department_distribution": dept_counts,
            }

    def clear(self) -> None:
        with self._lock:
            self._alerts.clear()


# Global Alert Store singleton
alert_store = AlertStore()


def route_clinical_alert(
    patient: Dict[str, Any],
    news2_result: Any,
    vitals: Dict[str, Any],
    sqi_status: str = "HIGH",
    sqi_note: Optional[str] = None,
    tick_number: int = 0,
    decision_specialty: Optional[str] = None,
) -> Optional[RoutedAlert]:
    """
    Core Routing Pipeline:
    1. Check for sensor artifact (low SQI / probe removal). If artifact, create
       DEVICE_WARNING for technical inspection and NEVER a clinical emergency.
    2. Identify patient & medical conditions.
    3. Determine relevant specialty based on condition & deteriorating vital pattern.
    4. Find assigned specialist.
    5. Route alert to specialist queue.
    6. If URGENT, dual-route to central emergency queue.
    """
    pid = patient.get("id", "P-UNKNOWN")
    pname = patient.get("name", "Unknown Patient")
    pcondition = patient.get("condition", "General Post-Discharge")

    # 1. Check Artifact / Technical Warning
    hr_val = vitals.get("heart_rate", {}).get("value", 75) if isinstance(vitals.get("heart_rate"), dict) else vitals.get("heart_rate", 75)
    spo2_val = vitals.get("oxygen_saturation", {}).get("value", 98) if isinstance(vitals.get("oxygen_saturation"), dict) else vitals.get("oxygen_saturation", 98)

    is_sensor_unreliable = (
        sqi_status == "LOW"
        or (hr_val is not None and hr_val <= 0.0)
        or (spo2_val is not None and spo2_val <= 0.0)
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    alert_id = f"alert-{pid}-{tick_number}-{int(datetime.now().timestamp() * 1000) % 10000}"

    if is_sensor_unreliable:
        # Separate device warning - NEVER treated as clinical deterioration
        tech_alert = RoutedAlert(
            id=alert_id,
            patient_id=pid,
            patient_name=pname,
            patient_condition=pcondition,
            department="Clinical Engineering / Biomedical",
            specialist_name="Biomedical Engineering Team",
            specialist_title="Clinical Sensor Support",
            specialist_email="biomed@hospital.carepulse.org",
            severity=AlertSeverity.DEVICE_WARNING,
            news2_score=0,
            triage_tier="DEVICE_WARNING",
            alert_reason=f"Telemetry signal unreliable: {sqi_note or 'Probe disconnect / motion noise'}. Technical verification required.",
            clinical_action="Inspect wearable sensor, verify probe placement, and check skin contact.",
            vital_readings={k: v.get("value") if isinstance(v, dict) else v for k, v in vitals.items()},
            timestamp=now_iso,
            status=AlertStatus.PENDING,
            emergency_flag=False,
            emergency_queue=False,
            is_artifact=True,
            sensor_note=sqi_note,
        )
        return alert_store.add_alert(tech_alert)

    # 2. Extract NEWS2 details
    score = getattr(news2_result, "total_score", 0)
    triage_tier = getattr(news2_result, "triage_tier", "ROUTINE")
    has_red = getattr(news2_result, "has_red_score", False)
    alert_reason = getattr(news2_result, "alert_reason", "NEWS2 physiological deviation")
    clinical_action = getattr(news2_result, "clinical_action", "Clinical bedside assessment recommended")

    # Only route if genuine clinical alert (WATCH, REVIEW, URGENT or score >= 3)
    if triage_tier == "ROUTINE" and score < 3 and not has_red:
        return None

    # Map severity
    if triage_tier == "URGENT" or has_red or score >= 7:
        severity = AlertSeverity.URGENT
    elif triage_tier == "REVIEW" or score >= 5:
        severity = AlertSeverity.REVIEW
    else:
        severity = AlertSeverity.WATCH

    # 3. Determine Specialty
    # Multiple conditions handling:
    # If patient has multiple conditions or specific organ deviation,
    # match against decision support pattern or primary condition.
    matched_dept = determine_department_for_condition(pcondition)

    # If decision support identified a specific acute specialty that matches the patient's care context
    if decision_specialty and decision_specialty != "General Medicine":
        for d in Department:
            if d.value.lower() == decision_specialty.lower():
                matched_dept = d
                break

    if not matched_dept:
        matched_dept = Department.GENERAL_MEDICINE
        specialist = GENERAL_ATTENDING
    else:
        specialist = SPECIALIST_ROSTER.get(matched_dept, GENERAL_ATTENDING)

    # 4. Emergency dual-routing safety:
    # Urgent alerts MUST appear in both specialist queue AND central emergency queue
    is_urgent = (severity == AlertSeverity.URGENT)

    clean_vitals = {k: v.get("value") if isinstance(v, dict) else v for k, v in vitals.items()}

    alert = RoutedAlert(
        id=alert_id,
        patient_id=pid,
        patient_name=pname,
        patient_condition=pcondition,
        department=matched_dept.value,
        specialist_name=specialist.name,
        specialist_title=specialist.title,
        specialist_email=specialist.email,
        severity=severity,
        news2_score=score,
        triage_tier=triage_tier,
        alert_reason=alert_reason,
        clinical_action=clinical_action,
        vital_readings=clean_vitals,
        timestamp=now_iso,
        status=AlertStatus.PENDING,
        emergency_flag=is_urgent,
        emergency_queue=is_urgent,
        is_artifact=False,
        decision_support_specialty=decision_specialty,
    )

    return alert_store.add_alert(alert)
