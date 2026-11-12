# MINEARENA 1.0 (PS-03) — Round 1 Evaluation Guide (3:00 PM)

## Live URLs (Running Right Now)
- **Frontend Dashboard:** http://localhost:5173
- **Backend API & Docs:** http://localhost:8000/docs
- **WebSocket Stream:** `ws://localhost:8000/ws/telemetry`

---

## 3-Minute Winning Demo Script for Judges

### Minute 1: The Problem & Ward Overview (View: Ward Census)
1. **Open http://localhost:5173** in your browser in full screen.
2. **Hook:** *"Judges, in post-discharge care, sending patients home with smart wearables usually creates two major clinical failures: severe false-alarm fatigue from static population rules, and noisy sensor motion artifacts triggering fake emergencies. We built MINEARENA 1.0 to solve both."*
3. **Show Ward Census:** Point out the 5 Synthea patient cards:
   - Point out **P-002 (Margaret Chen)**: *"Notice she has chronic COPD with documented hypercapnic respiratory failure. Her badge shows **Scale 2 (COPD Target 88–92%)**. If we used standard NEWS2 Scale 1, her baseline 90% SpO₂ would constantly trigger false Code-level alarms."*
   - Point out data provenance badges: *"Notice the **🔵 BIDMC** vs **🟣 SIM** tags. We never mix or fake dataset channels — real BIDMC telemetry is preserved, and wearable simulated parameters are explicitly demarcated."*

### Minute 2: Dual-Engine Innovation & Patient Deep-Dive (View: Patient Detail)
1. **Click on P-003 (James Walker - Sepsis Risk) or P-002**:
   - Show the **PRIMARY CLINICAL SCORE (NEWS2)** panel: *"We strictly adhere to the official Royal College of Physicians (RCP) Dec 2017 chart with all 7 physiological parameters, sub-scores, and Red Score triggers."*
   - Show the **ADVISORY: Personalized Insights** panel: *"This is our core innovation. It tracks each patient's individual rolling Gaussian baseline ($\mu, \sigma$) and Z-score deviation. Crucially, as a medical safety principle, it is an **additive advisory layer** that **never silences or modifies** standard NEWS2."*
   - Show the **Artifact Banner (SQI)**: *"Our Signal Quality Index uses conservative asymmetric rules — progressive desaturation is never thrown away as noise."*

### Minute 3: Live Deterioration Scenario & Performance Report (View: Scenarios & Report)
1. **Switch to 'Scenario Controller' in the sidebar:**
   - Select **P-003 (James Walker)**.
   - Click **"Inject Acute Septic Shock"**.
   - Show the speed toggle (set to **2x** or **5x** so judges see deterioration in seconds).
2. **Switch back to Patient Detail or Ward Census:**
   - Watch the live Recharts graph ramp up: Heart Rate spikes, Blood Pressure drops, Temperature climbs.
   - Watch NEWS2 escalate from **LOW (0)** to **MEDIUM (5)** to **HIGH (8)** with the Red glowing alarm banner.
3. **Switch to 'Performance Report':**
   - Show the live runtime analytics:
     - *"Every metric here is computed from actual runtime telemetry counters, zero hardcoded values."*
     - Point out the detection latency and how many ticks it took to catch the septic shock.
4. **Switch to 'FHIR Inspector':**
   - Click **"Load P-001 FHIR Bundle"**:
   - Show the HL7 FHIR R4 Bundle with LOINC codes (`8867-4`, `2708-6`, `9279-1`, `8480-6`, `8310-5`).
   - *"Our architecture is 100% interoperable with hospital EHR systems and HAPI FHIR."*

---

## Quick Answers to Tough Judge Questions

| Expected Question | Bulletproof Answer |
|---|---|
| **"Why not just train a deep learning black-box model to predict deterioration?"** | *"In clinical post-discharge care, explainability and standard-of-care compliance are non-negotiable. Doctors cannot act on an opaque black-box probability. We anchored our primary scoring on the NHS-mandated RCP NEWS2 standard, while using statistical baseline personalization ($\mu, \sigma$) and SQI as explainable advisory layers."* |
| **"How do you prevent missing a real emergency when motion occurs?"** | *"We use an asymmetric safety policy: we never auto-reject gradual desaturation or sustained tachycardia. If SQI drops due to movement, the NEWS2 score is **still calculated and displayed** with a visual caveat ('Verify sensor'), ensuring no deterioration is ever swept under the rug."* |
| **"How do you handle patient data privacy with HAPI FHIR?"** | *"Only 100% synthetic Synthea patient identities and simulated telemetry are transmitted to the public HAPI FHIR server. Real BIDMC patient identifiers are never transmitted externally."* |
| **"Is NEWS2 Scale 2 automatically assigned?"** | *"No! That would be clinically unsafe. NEWS2 Scale 2 is strictly gated behind an explicit clinical prescription flag (`scale2_prescribed: true`), activated only when a physician has documented hypercapnic respiratory failure."* |

