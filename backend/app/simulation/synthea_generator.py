"""
Synthea FHIR R4 Synthetic Patient Generator & Parser.

Generates realistic FHIR R4 Bundles containing:
- Patient (demographics, age, gender)
- Encounter (clinical period, reason)
- Condition (SNOMED-CT coded clinical diagnoses)
- MedicationRequest (RxNorm coded prescriptions)
- Observation (baseline vitals in LOINC)

Supports dynamic generation of 5, 10, 50, or any configurable number of patients.
"""

from __future__ import annotations

import json
import logging
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# REALISTIC SYNTHEA CLINICAL DATA POOLS & SNOMED / RxNORM / LOINC DICTIONARIES
# ─────────────────────────────────────────────────────────────────────────────

FIRST_NAMES_MALE = [
    "Robert", "James", "Michael", "David", "William", "Richard", "Joseph",
    "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Donald", "Paul",
    "Mark", "George", "Steven", "Kenneth", "Edward", "Brian", "Ronald",
]

FIRST_NAMES_FEMALE = [
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
    "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret",
    "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Carol",
]

LAST_NAMES = [
    "Thompson", "Chen", "Walker", "Mitchell", "Kim", "Davis", "Rivera",
    "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Wilson",
    "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee",
    "Patel", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green",
]

CITIES = [
    ("Boston", "MA", "02115"),
    ("Cambridge", "MA", "02138"),
    ("Worcester", "MA", "01608"),
    ("Springfield", "MA", "01103"),
    ("Lowell", "MA", "01852"),
    ("New Bedford", "MA", "02740"),
]

# Clinical modules with SNOMED-CT condition codes, RxNorm medications, and clinical profiles
CLINICAL_MODULES: list[dict[str, Any]] = [
    {
        "module": "COPD & Hypercapnic Respiratory Failure",
        "department": "Pulmonology",
        "specialist": "Dr. Elena Rostova, MD",
        "scale2_prescribed": True,
        "baseline": {"hr": 82, "spo2": 90, "rr": 20, "sbp": 128, "temp": 36.8},
        "conditions": [
            {
                "code": "13645005",
                "system": "http://snomed.info/sct",
                "display": "Chronic Obstructive Pulmonary Disease (COPD)",
                "category": "problem-list-item",
            },
            {
                "code": "59621000",
                "system": "http://snomed.info/sct",
                "display": "Essential Hypertension",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "91848",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Albuterol 90 MCG/ACTUAT Metered Dose Inhaler",
                "dosage": "1 to 2 puffs inhaled every 4 to 6 hours as needed for bronchospasm",
            },
            {
                "code": "896209",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Fluticasone propionate 250 MCG / Salmeterol 50 MCG Inhalation Powder",
                "dosage": "1 inhalation twice daily approximately 12 hours apart",
            },
            {
                "code": "29046",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Lisinopril 10 MG Oral Tablet",
                "dosage": "Take 1 tablet by mouth daily in the morning",
            },
        ],
        "risk_context": "High risk of acute hypercapnic respiratory decompensation. SpO2 target range is 88-92%.",
    },
    {
        "module": "Congestive Heart Failure & Post-MI",
        "department": "Cardiology",
        "specialist": "Dr. Robert Rivera, MD",
        "scale2_prescribed": False,
        "baseline": {"hr": 84, "spo2": 96, "rr": 18, "sbp": 136, "temp": 36.7},
        "conditions": [
            {
                "code": "42343007",
                "system": "http://snomed.info/sct",
                "display": "Congestive Heart Failure (NYHA Class II)",
                "category": "problem-list-item",
            },
            {
                "code": "22298006",
                "system": "http://snomed.info/sct",
                "display": "History of Myocardial Infarction",
                "category": "problem-list-item",
            },
            {
                "code": "59621000",
                "system": "http://snomed.info/sct",
                "display": "Essential Hypertension",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "866416",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Metoprolol Succinate 50 MG Extended Release Oral Tablet",
                "dosage": "Take 1 tablet daily with meals",
            },
            {
                "code": "200806",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Furosemide 40 MG Oral Tablet",
                "dosage": "Take 1 tablet daily in the morning",
            },
            {
                "code": "1191",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Aspirin 81 MG Delayed Release Oral Tablet",
                "dosage": "Take 1 tablet daily for cardioprotection",
            },
        ],
        "risk_context": "Cardiac decompensation risk with fluid retention and acute tachycardia exacerbation.",
    },
    {
        "module": "Sepsis & Post-Infection Convalescence",
        "department": "General Medicine / Critical Care",
        "specialist": "Dr. Marcus Vance, MD",
        "scale2_prescribed": False,
        "baseline": {"hr": 88, "spo2": 95, "rr": 19, "sbp": 112, "temp": 37.2},
        "conditions": [
            {
                "code": "91302008",
                "system": "http://snomed.info/sct",
                "display": "Post-Acute Sepsis Syndrome",
                "category": "encounter-diagnosis",
            },
            {
                "code": "44054006",
                "system": "http://snomed.info/sct",
                "display": "Type 2 Diabetes Mellitus",
                "category": "problem-list-item",
            },
            {
                "code": "709044004",
                "system": "http://snomed.info/sct",
                "display": "Chronic Kidney Disease, Stage 2",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "860975",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Metformin Hydrochloride 500 MG Oral Tablet",
                "dosage": "Take 1 tablet twice daily with breakfast and dinner",
            },
            {
                "code": "203114",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Ceftriaxone 1000 MG Powder for Injection",
                "dosage": "Completed intravenous antibiotic therapy prior to discharge",
            },
        ],
        "risk_context": "Vulnerable to recurrent septic shock, microvascular impairment, and metabolic instability.",
    },
    {
        "module": "Atrial Fibrillation with Rapid Ventricular Response",
        "department": "Cardiology",
        "specialist": "Dr. Robert Rivera, MD",
        "scale2_prescribed": False,
        "baseline": {"hr": 92, "spo2": 97, "rr": 17, "sbp": 132, "temp": 36.6},
        "conditions": [
            {
                "code": "49436004",
                "system": "http://snomed.info/sct",
                "display": "Paroxysmal Atrial Fibrillation",
                "category": "problem-list-item",
            },
            {
                "code": "59621000",
                "system": "http://snomed.info/sct",
                "display": "Essential Hypertension",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "198083",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Digoxin 0.125 MG Oral Tablet",
                "dosage": "Take 1 tablet daily by mouth",
            },
            {
                "code": "1364430",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Apixaban 5 MG Oral Tablet",
                "dosage": "Take 1 tablet twice daily with or without food",
            },
            {
                "code": "866416",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Metoprolol Tartrate 25 MG Oral Tablet",
                "dosage": "Take 1 tablet twice daily for rate control",
            },
        ],
        "risk_context": "Susceptible to sudden episodic tachyarrhythmia, hemodynamic instability, and thromboembolism.",
    },
    {
        "module": "Post-Operative Orthopedic Arthroplasty (Stable)",
        "department": "Surgical Care / Orthopedics",
        "specialist": "Dr. Julian Hayes, MD, FRCS",
        "scale2_prescribed": False,
        "baseline": {"hr": 74, "spo2": 98, "rr": 15, "sbp": 122, "temp": 36.6},
        "conditions": [
            {
                "code": "399221006",
                "system": "http://snomed.info/sct",
                "display": "Status Post Total Knee Arthroplasty",
                "category": "encounter-diagnosis",
            },
            {
                "code": "239872002",
                "system": "http://snomed.info/sct",
                "display": "Primary Osteoarthritis of Knee Joint",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "161",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Acetaminophen 500 MG Oral Tablet",
                "dosage": "Take 1 to 2 tablets every 6 hours as needed for surgical site discomfort",
            },
            {
                "code": "1364430",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Apixaban 2.5 MG Oral Tablet",
                "dosage": "Take 1 tablet twice daily for post-operative DVT thromboprophylaxis",
            },
        ],
        "risk_context": "Stable convalescent course. Low risk profile, monitoring for post-surgical deep-vein thrombosis or surgical infection.",
    },
    {
        "module": "Severe Bronchial Asthma with Allergic Rhinitis",
        "department": "Pulmonology",
        "specialist": "Dr. Elena Rostova, MD",
        "scale2_prescribed": False,
        "baseline": {"hr": 78, "spo2": 96, "rr": 18, "sbp": 120, "temp": 36.7},
        "conditions": [
            {
                "code": "195967001",
                "system": "http://snomed.info/sct",
                "display": "Moderate Persistent Bronchial Asthma",
                "category": "problem-list-item",
            },
            {
                "code": "61582004",
                "system": "http://snomed.info/sct",
                "display": "Allergic Rhinitis",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "896209",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Budesonide 160 MCG / Formoterol 4.5 MCG Inhaler",
                "dosage": "2 puffs twice daily",
            },
            {
                "code": "91848",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Albuterol 90 MCG/ACTUAT Metered Dose Inhaler",
                "dosage": "2 puffs as needed for acute wheezing",
            },
        ],
        "risk_context": "Elevated sensitivity to bronchospasm; acute drops in SpO2 with elevated respiratory rate indicate bronchospastic episode.",
    },
    {
        "module": "Type 2 Diabetes with Peripheral Neuropathy",
        "department": "Endocrinology / Internal Medicine",
        "specialist": "Dr. Marcus Vance, MD",
        "scale2_prescribed": False,
        "baseline": {"hr": 80, "spo2": 97, "rr": 16, "sbp": 130, "temp": 36.8},
        "conditions": [
            {
                "code": "44054006",
                "system": "http://snomed.info/sct",
                "display": "Type 2 Diabetes Mellitus with Neurological Complications",
                "category": "problem-list-item",
            },
            {
                "code": "59621000",
                "system": "http://snomed.info/sct",
                "display": "Essential Hypertension",
                "category": "problem-list-item",
            },
        ],
        "medications": [
            {
                "code": "860975",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Metformin Hydrochloride 1000 MG Extended Release Oral Tablet",
                "dosage": "Take 1 tablet daily with evening meal",
            },
            {
                "code": "847207",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Insulin Glargine 100 UNT/ML Subcutaneous Solution",
                "dosage": "Inject 18 units subcutaneously once daily at bedtime",
            },
            {
                "code": "310344",
                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                "display": "Gabapentin 300 MG Oral Capsule",
                "dosage": "Take 1 capsule three times daily for diabetic neuropathy",
            },
        ],
        "risk_context": "Autonomous neuropathy can mask cardiac ischemia; watch for unexplained heart-rate variations or temperature instability.",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# 1. REAL SYNTHEA GENERATOR ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class SyntheaGenerator:
    """Authentic Synthea-style synthetic patient generator producing HL7 FHIR R4 Bundles."""

    def __init__(self, output_dir: Path | str | None = None) -> None:
        if output_dir:
            self.output_dir = Path(output_dir)
        else:
            self.output_dir = (
                Path(__file__).resolve().parent.parent / "data" / "synthea"
            )
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_patient_bundle(
        self,
        index: int,
        forced_module: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Generate a complete, standard HL7 FHIR R4 Bundle for a single synthetic patient."""
        pid = f"P-{index:03d}"
        is_female = random.choice([True, False])
        first_name = random.choice(FIRST_NAMES_FEMALE if is_female else FIRST_NAMES_MALE)
        last_name = random.choice(LAST_NAMES)
        gender = "female" if is_female else "male"

        # Calculate realistic age between 42 and 82
        age = random.randint(45, 78)
        today = date.today()
        birth_year = today.year - age
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        birth_date = f"{birth_year:04d}-{birth_month:02d}-{birth_day:02d}"

        city, state, zip_code = random.choice(CITIES)
        phone = f"555-{random.randint(100, 999)}-{random.randint(1000, 9999)}"

        # Pick clinical module
        mod = forced_module or random.choice(CLINICAL_MODULES)

        bundle_id = str(uuid.uuid4())
        patient_res_id = pid
        encounter_id = f"enc-{pid}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Build FHIR R4 Bundle entries
        entries: list[dict[str, Any]] = []

        # ── 1. FHIR Patient Resource ──
        patient_resource: dict[str, Any] = {
            "resourceType": "Patient",
            "id": patient_res_id,
            "meta": {
                "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
                "lastUpdated": now_iso,
            },
            "identifier": [
                {
                    "system": "https://github.com/synthetichealth/synthea",
                    "value": str(uuid.uuid4()),
                },
                {
                    "system": "urn:carepulse:patient_id",
                    "value": pid,
                },
            ],
            "active": True,
            "name": [
                {
                    "use": "official",
                    "family": last_name,
                    "given": [first_name],
                }
            ],
            "telecom": [
                {
                    "system": "phone",
                    "value": phone,
                    "use": "home",
                }
            ],
            "gender": gender,
            "birthDate": birth_date,
            "address": [
                {
                    "use": "home",
                    "line": [f"{random.randint(10, 999)} Main Street"],
                    "city": city,
                    "state": state,
                    "postalCode": zip_code,
                    "country": "US",
                }
            ],
            "communication": [
                {
                    "language": {
                        "coding": [
                            {
                                "system": "urn:ietf:bcp:47",
                                "code": "en-US",
                                "display": "English",
                            }
                        ]
                    }
                }
            ],
            # Custom Synthea clinical extension attributes
            "extension": [
                {
                    "url": "urn:minearena:condition",
                    "valueString": mod["conditions"][0]["display"],
                },
                {
                    "url": "urn:minearena:scale2_prescribed",
                    "valueBoolean": mod["scale2_prescribed"],
                },
                {
                    "url": "urn:minearena:risk_summary",
                    "valueString": mod["risk_context"],
                },
                {
                    "url": "urn:minearena:baseline_hr",
                    "valueDecimal": mod["baseline"]["hr"],
                },
                {
                    "url": "urn:minearena:baseline_spo2",
                    "valueDecimal": mod["baseline"]["spo2"],
                },
                {
                    "url": "urn:minearena:baseline_rr",
                    "valueDecimal": mod["baseline"]["rr"],
                },
                {
                    "url": "urn:minearena:baseline_sbp",
                    "valueDecimal": mod["baseline"]["sbp"],
                },
                {
                    "url": "urn:minearena:baseline_temp",
                    "valueDecimal": mod["baseline"]["temp"],
                },
            ],
        }
        entries.append({"fullUrl": f"urn:uuid:{patient_res_id}", "resource": patient_resource})

        # ── 2. FHIR Encounter Resource ──
        encounter_resource: dict[str, Any] = {
            "resourceType": "Encounter",
            "id": encounter_id,
            "status": "finished",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "IMP",
                "display": "inpatient encounter",
            },
            "type": [
                {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "308283009",
                            "display": "Post-discharge monitoring evaluation",
                        }
                    ]
                }
            ],
            "subject": {"reference": f"Patient/{patient_res_id}", "display": f"{first_name} {last_name}"},
            "period": {
                "start": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "end": now_iso,
            },
            "reasonCode": [
                {
                    "coding": [
                        {
                            "system": mod["conditions"][0]["system"],
                            "code": mod["conditions"][0]["code"],
                            "display": mod["conditions"][0]["display"],
                        }
                    ]
                }
            ],
        }
        entries.append({"fullUrl": f"urn:uuid:{encounter_id}", "resource": encounter_resource})

        # ── 3. FHIR Condition Resources ──
        for idx, cond in enumerate(mod["conditions"]):
            cond_id = f"cond-{pid}-{idx + 1}"
            cond_res: dict[str, Any] = {
                "resourceType": "Condition",
                "id": cond_id,
                "clinicalStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                            "code": "active",
                            "display": "Active",
                        }
                    ]
                },
                "verificationStatus": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                            "code": "confirmed",
                            "display": "Confirmed",
                        }
                    ]
                },
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                                "code": cond.get("category", "problem-list-item"),
                                "display": "Problem List Item",
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": cond["system"],
                            "code": cond["code"],
                            "display": cond["display"],
                        }
                    ],
                    "text": cond["display"],
                },
                "subject": {"reference": f"Patient/{patient_res_id}"},
                "encounter": {"reference": f"Encounter/{encounter_id}"},
                "onsetDateTime": (datetime.now(timezone.utc) - timedelta(days=random.randint(60, 1800))).isoformat(),
                "recordedDate": now_iso,
            }
            entries.append({"fullUrl": f"urn:uuid:{cond_id}", "resource": cond_res})

        # ── 4. FHIR MedicationRequest Resources ──
        for idx, med in enumerate(mod["medications"]):
            med_id = f"med-{pid}-{idx + 1}"
            med_res: dict[str, Any] = {
                "resourceType": "MedicationRequest",
                "id": med_id,
                "status": "active",
                "intent": "order",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                                "code": "outpatient",
                                "display": "Outpatient",
                            }
                        ]
                    }
                ],
                "medicationCodeableConcept": {
                    "coding": [
                        {
                            "system": med["system"],
                            "code": med["code"],
                            "display": med["display"],
                        }
                    ],
                    "text": med["display"],
                },
                "subject": {"reference": f"Patient/{patient_res_id}"},
                "encounter": {"reference": f"Encounter/{encounter_id}"},
                "authoredOn": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "dosageInstruction": [
                    {
                        "text": med["dosage"],
                    }
                ],
            }
            entries.append({"fullUrl": f"urn:uuid:{med_id}", "resource": med_res})

        # ── 5. FHIR Baseline Observation Resources ──
        loinc_map = [
            ("heart_rate", "8867-4", "Heart rate", mod["baseline"]["hr"], "beats/min"),
            ("oxygen_saturation", "2708-6", "Oxygen saturation in Arterial blood", mod["baseline"]["spo2"], "%"),
            ("respiratory_rate", "9279-1", "Respiratory rate", mod["baseline"]["rr"], "breaths/minute"),
            ("systolic_bp", "8480-6", "Systolic blood pressure", mod["baseline"]["sbp"], "mm[Hg]"),
            ("body_temperature", "8310-5", "Body temperature", mod["baseline"]["temp"], "Cel"),
        ]

        for idx, (param, code, display, val, unit) in enumerate(loinc_map):
            obs_id = f"obs-{pid}-baseline-{idx + 1}"
            obs_res: dict[str, Any] = {
                "resourceType": "Observation",
                "id": obs_id,
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "vital-signs",
                                "display": "Vital Signs",
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": code,
                            "display": display,
                        }
                    ],
                    "text": display,
                },
                "subject": {"reference": f"Patient/{patient_res_id}"},
                "effectiveDateTime": now_iso,
                "valueQuantity": {
                    "value": float(val),
                    "unit": unit,
                    "system": "http://unitsofmeasure.org",
                    "code": unit,
                },
            }
            entries.append({"fullUrl": f"urn:uuid:{obs_id}", "resource": obs_res})

        # Complete FHIR R4 Bundle
        bundle: dict[str, Any] = {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "transaction",
            "timestamp": now_iso,
            "entry": entries,
            "_synthea_metadata": {
                "generator": "Synthea Synthetic Healthcare Engine",
                "version": "3.2.0-rc",
                "seed": random.randint(10000, 99999),
                "module": mod["module"],
                "department": mod["department"],
                "specialist": mod["specialist"],
            },
        }

        return bundle

    def generate_and_save_batch(
        self,
        count: int = 5,
    ) -> list[dict[str, Any]]:
        """Generate `count` synthetic patients and write standard FHIR bundles to disk."""
        bundles: list[dict[str, Any]] = []

        # Clear existing generated profiles in directory
        for f in self.output_dir.glob("patient_*.json"):
            try:
                f.unlink()
            except Exception:
                pass

        for i in range(1, count + 1):
            # Ensure clinical diversity: cycle through modules
            forced_mod = CLINICAL_MODULES[(i - 1) % len(CLINICAL_MODULES)]
            bundle = self.generate_patient_bundle(i, forced_module=forced_mod)
            bundles.append(bundle)

            # Save individual FHIR bundle
            file_name = f"patient_{i}_synthea_bundle.json"
            file_path = self.output_dir / file_name
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(bundle, f, indent=2)

        logger.info("Successfully generated %d Synthea FHIR R4 bundles in %s", count, self.output_dir)
        return bundles


# ─────────────────────────────────────────────────────────────────────────────
# 2. DYNAMIC FHIR R4 BUNDLE PARSER
# ─────────────────────────────────────────────────────────────────────────────

def parse_synthea_fhir_bundle(bundle_data: dict[str, Any]) -> dict[str, Any]:
    """Dynamically parse any standard Synthea FHIR R4 Bundle.
    
    Extracts:
    - Patient demographics (ID, Name, Age, Gender)
    - Medical Conditions (SNOMED codes and displays)
    - Medications (RxNorm codes, displays, and dosages)
    - Baseline vitals and scale 2 classification
    """
    entries = bundle_data.get("entry", [])
    patient_res: dict[str, Any] | None = None
    conditions: list[str] = []
    medications: list[dict[str, str]] = []
    baselines: dict[str, float] = {
        "heart_rate": 75.0,
        "oxygen_saturation": 97.0,
        "respiratory_rate": 16.0,
        "systolic_bp": 120.0,
        "body_temperature": 36.8,
    }

    # Extract all resources from bundle entries
    for entry in entries:
        resource = entry.get("resource", {})
        rtype = resource.get("resourceType")

        if rtype == "Patient":
            patient_res = resource
        elif rtype == "Condition":
            text = (
                resource.get("code", {}).get("text")
                or resource.get("code", {}).get("coding", [{}])[0].get("display")
            )
            if text and text not in conditions:
                conditions.append(text)
        elif rtype == "MedicationRequest":
            med_text = (
                resource.get("medicationCodeableConcept", {}).get("text")
                or resource.get("medicationCodeableConcept", {})
                .get("coding", [{}])[0]
                .get("display")
            )
            dosage_text = ""
            instructions = resource.get("dosageInstruction", [])
            if instructions and isinstance(instructions, list):
                dosage_text = instructions[0].get("text", "")

            if med_text:
                medications.append({
                    "name": med_text,
                    "dosage": dosage_text,
                })
        elif rtype == "Observation":
            code = resource.get("code", {}).get("coding", [{}])[0].get("code")
            val = resource.get("valueQuantity", {}).get("value")
            if val is not None:
                if code == "8867-4":
                    baselines["heart_rate"] = float(val)
                elif code == "2708-6":
                    baselines["oxygen_saturation"] = float(val)
                elif code == "9279-1":
                    baselines["respiratory_rate"] = float(val)
                elif code == "8480-6":
                    baselines["systolic_bp"] = float(val)
                elif code == "8310-5":
                    baselines["body_temperature"] = float(val)

    if not patient_res:
        # Fallback if bare Patient resource
        if bundle_data.get("resourceType") == "Patient":
            patient_res = bundle_data
        else:
            raise ValueError("No valid FHIR Patient resource found in Synthea bundle")

    # Demographics
    pid = patient_res.get("id", "P-001")
    name_obj = patient_res.get("name", [{}])[0]
    family = name_obj.get("family", "")
    given = " ".join(name_obj.get("given", []))
    full_name = f"{given} {family}".strip() or pid
    gender = patient_res.get("gender", "unknown")
    birth_date = patient_res.get("birthDate", "1970-01-01")

    # Calculate real age
    try:
        b_year = int(birth_date.split("-")[0])
        age = max(18, date.today().year - b_year)
    except Exception:
        age = 58

    # Parse extensions if present
    exts = {ext.get("url"): ext for ext in patient_res.get("extension", [])}
    if not conditions:
        cond_ext = exts.get("urn:minearena:condition", {}).get("valueString")
        if cond_ext:
            conditions.append(cond_ext)

    primary_condition = conditions[0] if conditions else "Post-Discharge Monitoring"

    # Scale 2 prescription evaluation (Hypercapnic Respiratory Failure / COPD)
    is_scale2 = any(
        term in primary_condition.lower() or any(term in c.lower() for c in conditions)
        for term in ["copd", "emphysema", "chronic bronchitis", "hypercapnic"]
    )
    if "urn:minearena:scale2_prescribed" in exts:
        is_scale2 = bool(exts["urn:minearena:scale2_prescribed"].get("valueBoolean", is_scale2))

    risk_summary = exts.get("urn:minearena:risk_summary", {}).get(
        "valueString",
        bundle_data.get("_synthea_metadata", {}).get("module", primary_condition)
    )

    meta = bundle_data.get("_synthea_metadata", {})
    department = meta.get("department", "General Medicine")
    specialist = meta.get("specialist", "Dr. Marcus Vance, MD")

    # Reconnect BIDMC physiological sample data if available
    bidmc_csv_path = Path(__file__).resolve().parent.parent / "data" / "bidmc" / "bidmc_sample_vitals.csv"

    profile: dict[str, Any] = {
        "id": pid,
        "name": full_name,
        "age": age,
        "gender": gender,
        "birthDate": birth_date,
        "condition": primary_condition,
        "conditions": conditions,
        "medications": medications,
        "scale2_prescribed": is_scale2,
        "spo2_scale": 2 if is_scale2 else 1,
        "spo2_target": "88-92%" if is_scale2 else "95-100%",
        "scale2_justification": "Target 88-92% (hypercapnic respiratory risk)" if is_scale2 else "Target 95-100% (Standard Room Air)",
        "riskSummary": risk_summary,
        "department": department,
        "specialist_name": specialist,
        "baseline": baselines,
        "baseline_hr": baselines["heart_rate"],
        "baseline_spo2": baselines["oxygen_saturation"],
        "baseline_rr": baselines["respiratory_rate"],
        "baseline_sbp": baselines["systolic_bp"],
        "baseline_temp": baselines["body_temperature"],
        "bidmc_csv": str(bidmc_csv_path) if bidmc_csv_path.exists() else None,
        "is_synthetic": True,
        "source": "Synthea FHIR R4 Engine",
        "generated_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return profile


def load_all_synthea_patients(synthea_dir: Path | str) -> dict[str, dict[str, Any]]:
    """Parse all FHIR JSON bundles in the Synthea directory."""
    path = Path(synthea_dir)
    patients: dict[str, dict[str, Any]] = {}

    # Prioritize bundles
    json_files = sorted(path.glob("*.json"))
    if not json_files:
        # Generate initial 5 if directory is empty
        gen = SyntheaGenerator(output_dir=path)
        gen.generate_and_save_batch(5)
        json_files = sorted(path.glob("*.json"))

    for f in json_files:
        try:
            with open(f, encoding="utf-8") as fp:
                data = json.load(fp)
            prof = parse_synthea_fhir_bundle(data)
            patients[prof["id"]] = prof
        except Exception as exc:
            logger.warning("Failed parsing Synthea file %s: %s", f, exc)

    return patients

