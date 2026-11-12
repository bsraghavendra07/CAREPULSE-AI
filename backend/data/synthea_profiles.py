"""
Synthea-Style Synthetic Patient Profiles (Mandatory Requirement 3.3)
Generates five distinct patient profiles with realistic clinical histories,
active conditions, medications, discharge vitals, and Recovery DNA baselines.
"""

from typing import List, Dict, Any
from backend.fhir.store import fhir_store
from backend.engine.recovery_dna import RecoveryDNAProfile, recovery_dna_registry

SYNTHEA_PATIENT_DEFINITIONS = [
    {
        "id": "P-001",
        "name": "Rajesh Sharma",
        "age": 62,
        "gender": "male",
        "telecom": "+91-98450-12345",
        "address": "Bangalore, Karnataka, India",
        "discharge_diagnosis": "Post-Coronary Artery Bypass Graft (CABG) & NSTEMI",
        "conditions": [
            "Coronary Artery Disease (CAD)",
            "Status Post CABG x3",
            "Essential Hypertension",
            "Type 2 Diabetes Mellitus"
        ],
        "medications": [
            "Metoprolol Succinate 50mg daily (Beta-Blocker)",
            "Aspirin 75mg daily",
            "Atorvastatin 40mg daily",
            "Metformin 500mg BD"
        ],
        "has_hypercapnic_failure": False,
        "baseline": {
            "spo2": 97.0,
            "heart_rate": 64.0,  # Lower resting HR expected due to Metoprolol
            "respiratory_rate": 15.0,
            "temperature": 36.7
        },
        "discharge_date": "2026-11-05"
    },
    {
        "id": "P-002",
        "name": "Arthur Pendelton",
        "age": 71,
        "gender": "male",
        "telecom": "+1-617-555-0192",
        "address": "Boston, MA, USA",
        "discharge_diagnosis": "Acute Exacerbation of Chronic Obstructive Pulmonary Disease (AECOPD)",
        "conditions": [
            "Severe COPD (GOLD Stage III)",
            "Documented Chronic Hypercapnic Respiratory Failure",
            "Secondary Pulmonary Hypertension"
        ],
        "medications": [
            "Tiotropium Bromide Respimat 2.5mcg daily",
            "Formoterol / Budesonide Inhaler BD",
            "Prednisone 10mg daily taper",
            "Oxygen Therapy (Titrated 1-2 L/min PRN)"
        ],
        "has_hypercapnic_failure": True,  # Mandatory Rule 1: Requires NEWS2 SpO2 Scale 2 (88-92% target!)
        "baseline": {
            "spo2": 90.0,  # Resting target for COPD: 88-92% is NORMAL!
            "heart_rate": 78.0,
            "respiratory_rate": 18.0,
            "temperature": 36.6
        },
        "discharge_date": "2026-11-07"
    },
    {
        "id": "P-003",
        "name": "Priya Patel",
        "age": 54,
        "gender": "female",
        "telecom": "+91-94480-67890",
        "address": "Hubli, Karnataka, India",
        "discharge_diagnosis": "Post-Severe Community-Acquired Bilateral Pneumonia with Sepsis",
        "conditions": [
            "Resolving Bilateral Lower Lobe Pneumonia",
            "Post-Septic Syndrome Recovery",
            "Mild Bronchial Asthma"
        ],
        "medications": [
            "Amoxicillin-Clavulanate 625mg TDS",
            "Salbutamol MDI PRN",
            "Vitamin C & Zinc supplementation"
        ],
        "has_hypercapnic_failure": False,
        "baseline": {
            "spo2": 96.0,
            "heart_rate": 74.0,
            "respiratory_rate": 16.0,
            "temperature": 36.8
        },
        "discharge_date": "2026-11-08"
    },
    {
        "id": "P-004",
        "name": "David Chen",
        "age": 48,
        "gender": "male",
        "telecom": "+1-415-555-0144",
        "address": "San Francisco, CA, USA",
        "discharge_diagnosis": "Decompensated Congestive Heart Failure (NYHA Class II)",
        "conditions": [
            "Dilated Cardiomyopathy (LVEF 38%)",
            "Congestive Heart Failure",
            "Chronic Kidney Disease Stage II"
        ],
        "medications": [
            "Sacubitril / Valsartan 49/51mg BD",
            "Carvedilol 12.5mg BD",
            "Furosemide 40mg daily morning",
            "Spironolactone 25mg daily"
        ],
        "has_hypercapnic_failure": False,
        "baseline": {
            "spo2": 98.0,
            "heart_rate": 68.0,
            "respiratory_rate": 16.0,
            "temperature": 36.6
        },
        "discharge_date": "2026-11-06"
    },
    {
        "id": "P-005",
        "name": "Sunita Rao",
        "age": 67,
        "gender": "female",
        "telecom": "+91-80-2345-6789",
        "address": "Mysore, Karnataka, India",
        "discharge_diagnosis": "Post-Laparoscopic Cholecystectomy with Basal Atelectasis",
        "conditions": [
            "Post-Operative Day 4 Laparoscopic Surgery",
            "Post-Anesthetic Basal Atelectasis",
            "Mild Osteoarthritis"
        ],
        "medications": [
            "Cefuroxime Axetil 500mg BD",
            "Paracetamol 1000mg TDS",
            "Incentive Spirometry QDS",
            "Pantoprazole 40mg OD"
        ],
        "has_hypercapnic_failure": False,
        "baseline": {
            "spo2": 96.0,
            "heart_rate": 76.0,
            "respiratory_rate": 17.0,
            "temperature": 36.9
        },
        "discharge_date": "2026-11-09"
    }
]


def initialize_synthea_profiles():
    """Initializes FHIR store and Recovery DNA registry with the 5 profiles."""
    for p in SYNTHEA_PATIENT_DEFINITIONS:
        # 1. FHIR Patient Resource
        fhir_patient = {
            "resourceType": "Patient",
            "id": p["id"],
            "name": [{"use": "official", "text": p["name"]}],
            "gender": p["gender"],
            "birthDate": f"{2026 - p['age']}-05-15",
            "telecom": [{"system": "phone", "value": p["telecom"]}],
            "address": [{"text": p["address"]}],
            "extension": [
                {
                    "url": "http://carepulse.ai/fhir/StructureDefinition/hypercapnic-failure",
                    "valueBoolean": p["has_hypercapnic_failure"]
                },
                {
                    "url": "http://carepulse.ai/fhir/StructureDefinition/discharge-diagnosis",
                    "valueString": p["discharge_diagnosis"]
                }
            ]
        }
        fhir_store.save_patient(fhir_patient)

        # 2. FHIR Condition Resources
        for cond_name in p["conditions"]:
            fhir_store.add_condition(p["id"], {
                "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
                "code": {"text": cond_name}
            })

        # 3. FHIR Medication Resources
        for med_name in p["medications"]:
            fhir_store.add_medication(p["id"], {
                "status": "active",
                "medicationCodeableConcept": {"text": med_name}
            })

        # 4. Register in Recovery DNA Profile
        dna_profile = RecoveryDNAProfile(
            patient_id=p["id"],
            name=p["name"],
            age=p["age"],
            gender=p["gender"],
            conditions=p["conditions"],
            medications=p["medications"],
            has_hypercapnic_failure=p["has_hypercapnic_failure"],
            baseline_spo2=p["baseline"]["spo2"],
            baseline_hr=p["baseline"]["heart_rate"],
            baseline_rr=p["baseline"]["respiratory_rate"],
            baseline_temp=p["baseline"]["temperature"],
            discharge_date=p["discharge_date"]
        )
        recovery_dna_registry.register(dna_profile)


# Run at module load
initialize_synthea_profiles()
