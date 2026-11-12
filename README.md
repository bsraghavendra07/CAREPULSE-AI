# CarePulse — Personalized Post-Discharge Deterioration Monitor
> **"Smarter Monitoring. Earlier Awareness. Safer Recovery."**

A real-time remote patient deterioration monitoring system designed for post-discharge recovery. It combines continuous physiological telemetry with the official **Royal College of Physicians (RCP) NEWS2** standard, **individualized statistical baseline anomaly detection**, **asymmetric signal artifact rejection**, and **Clinical Decision Support (CDS) for Specialist Review**.

---

## Key Features & Clinical Highlights

1. **BIDMC PhysioNet Telemetry Replay:**
   - Replays genuine physiological recordings from the BIDMC dataset (`HR`, `SpO₂`, `RR`).
   - Every reading is tagged with its clinical provenance: `🔵 BIDMC` (recorded) vs. `🟣 SIM` (simulated).

2. **Virtual Wearable Simulator:**
   - Emits parameters not available in the BIDMC dataset (`Systolic BP`, `Body Temperature`, `Consciousness ACVPU`, `Supplemental Oxygen`).
   - Injects realistic physiological fluctuations and supports acute deterioration scenarios.

3. **5 Synthea Synthetic Patient Personas:**
   - **P-001 (Robert Thompson, 68M):** Post-Myocardial Infarction / Heart Failure (elevated cardiac risk).
   - **P-002 (Margaret Chen, 72F):** Post-COPD Exacerbation — **Prescribed NEWS2 Scale 2** (hypercapnic target 88–92%).
   - **P-003 (James Walker, 55M):** Post-Abdominal Surgery / Sepsis Risk (SIRS surveillance).
   - **P-004 (Dorothy Mitchell, 80F):** Paroxysmal Atrial Fibrillation & Tremors (motion artifact prone).
   - **P-005 (David Kim, 45M):** Post-Knee Arthroplasty (healthy recovery control).

4. **Official RCP NEWS2 Scoring Engine (December 2017):**
   - Exact scoring matrices for Respiration Rate, SpO₂ (Scale 1 & Scale 2), Air vs. Oxygen (+2), Systolic BP, Pulse / Heart Rate, Consciousness (ACVPU), and Temperature.
   - **Scale 2 Strict Gating:** Restricted exclusively to patients with explicit documentation (`scale2_prescribed: true`). Never auto-selected.
   - **Red Score Alarm:** Urgent escalation when any single physiological parameter reaches Score 3.

5. **Strictly Separated Dual-Engine Architecture:**
   - **PRIMARY:** Standard NEWS2 Score — always displayed, never modified, never suppressed.
   - **ADVISORY:** Personalized Baseline Engine — tracks rolling EMA ($\mu$) and standard deviation ($\sigma$) per patient, calculating Z-scores to surface early individual deviations without silencing NEWS2.

6. **Conservative Signal Quality Index (SQI) & Artifact Detection:**
   - Asymmetric safety rules: True deterioration (e.g. progressive desaturation or sustained tachycardia) is **never auto-rejected**.
   - Low SQI displays an advisory caveat (`⚠ Signal quality concern — verify sensor`) while preserving the clinical NEWS2 score.

7. **HL7 FHIR R4 & HAPI FHIR Integration:**
   - Vitals mapped to standard LOINC codes (`8867-4`, `2708-6`, `9279-1`, `8480-6`, `8310-5`).
   - Fully synthetic Synthea demographics and Observations.
   - Built-in FHIR Inspector UI with JSON syntax highlighting and one-click copy.

8. **Live-Computed Performance Metrics:**
   - Zero hardcoded statistics. All metrics accumulate live from runtime counters during simulation replay and scenario execution.

---

## Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Launch the Backend (FastAPI + WebSockets)
```powershell
cd "d:\MINE ARENA 1.0\backend"
.\venv\Scripts\Activate.ps1
python run.py
```
*API will run at `http://localhost:8000` with WebSocket at `ws://localhost:8000/ws/telemetry`.*
*Interactive API Docs: `http://localhost:8000/docs`*

### 2. Launch the Frontend Dashboard (React + Vite)
```powershell
cd "d:\MINE ARENA 1.0\frontend"
npm run dev
```
*Dashboard will open at `http://localhost:5173`.*

### 3. Run Automated Engine Verifications
```powershell
cd "d:\MINE ARENA 1.0\backend"
.\venv\Scripts\python test_verification.py
.\venv\Scripts\python test_api_endpoints.py
```

---

## Directory Structure
```
MINE ARENA 1.0/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routes (patients, telemetry, scenarios, report, fhir) & WebSocket manager
│   │   ├── core/            # NEWS2 engine, personalized baseline tracker, SQI artifact detector
│   │   ├── data/            # 5 Synthea patient FHIR profiles & curated BIDMC 600-second sample
│   │   ├── fhir/            # FHIR R4 mapper with LOINC codes & HAPI FHIR client
│   │   ├── simulation/      # BIDMC replayer, wearable simulator & acute scenarios
│   │   ├── config.py        # Centralized thresholds & configuration
│   │   └── main.py          # FastAPI application & lifespan manager
│   ├── requirements.txt
│   └── run.py
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── fhir/        # FHIR R4 Bundle inspector
    │   │   ├── layout/      # Header with clock & WebSocket status, Sidebar
    │   │   ├── patient-detail/ # Recharts vitals charts, NEWS2 panel, Personalized panel, Artifact banner
    │   │   ├── simulation/  # Scenario trigger dock & live Performance report
    │   │   ├── ui/          # Accessible clinical UI components (cards, badges, buttons, progress)
    │   │   └── ward/        # Ward census grid & patient triage cards
    │   ├── hooks/           # useWebSocket & usePatients hooks
    │   ├── lib/             # API client & utility functions
    │   ├── types/           # TypeScript interfaces for patients, telemetry, NEWS2, and FHIR
    │   ├── App.tsx          # Master dashboard with multi-view routing
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

