import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { usePatients } from './hooks/usePatients';
import { PatientProfile } from './types/patient';
import { setSimulationSpeed } from './lib/api';

import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { VitalsMonitorPage } from './pages/VitalsMonitorPage';
import { FhirPage } from './pages/FhirPage';
import { PerformanceReportPage } from './pages/PerformanceReportPage';
import { DeteriorationTestsPage } from './pages/DeteriorationTestsPage';

export function App() {
  const { connected, latestTicks, telemetryHistory } = useWebSocket();
  const { patients } = usePatients();

  const [selectedPatientModal, setSelectedPatientModal] = useState<PatientProfile | null>(null);
  const [speedFactor, setSpeedFactor] = useState<number>(1);

  // Fallback patient list if fetching
  const patientList: PatientProfile[] = patients.length > 0 ? patients : [
    {
      id: 'P-001',
      name: 'Robert Thompson',
      gender: 'male',
      birthDate: '1958-03-15',
      condition: 'Post-Myocardial Infarction / Heart Failure',
      scale2_prescribed: false,
      riskSummary: 'Elevated cardiac risk, fluid overload monitoring',
      baseline: { heart_rate: 85, oxygen_saturation: 96, respiratory_rate: 18, systolic_bp: 135, body_temperature: 36.8 },
    },
    {
      id: 'P-002',
      name: 'Margaret Chen',
      gender: 'female',
      birthDate: '1954-07-22',
      condition: 'Post-COPD Exacerbation',
      scale2_prescribed: true,
      riskSummary: 'COPD with hypercapnic respiratory failure risk — Scale 2 prescribed',
      baseline: { heart_rate: 78, oxygen_saturation: 90, respiratory_rate: 20, systolic_bp: 125, body_temperature: 36.6 },
    },
    {
      id: 'P-003',
      name: 'James Walker',
      gender: 'male',
      birthDate: '1971-11-03',
      condition: 'Post-Abdominal Surgery / Sepsis Risk',
      scale2_prescribed: false,
      riskSummary: 'Post-surgical sepsis risk, monitor for rising temperature',
      baseline: { heart_rate: 72, oxygen_saturation: 97, respiratory_rate: 16, systolic_bp: 130, body_temperature: 36.9 },
    },
    {
      id: 'P-004',
      name: 'Dorothy Mitchell',
      gender: 'female',
      birthDate: '1946-02-10',
      condition: 'Paroxysmal Atrial Fibrillation & Tremors',
      scale2_prescribed: false,
      riskSummary: 'Paroxysmal AF with tremors — expect HR variability and motion artifact',
      baseline: { heart_rate: 82, oxygen_saturation: 95, respiratory_rate: 17, systolic_bp: 140, body_temperature: 36.7 },
    },
    {
      id: 'P-005',
      name: 'David Kim',
      gender: 'male',
      birthDate: '1981-09-28',
      condition: 'Post-Knee Arthroplasty / Stable',
      scale2_prescribed: false,
      riskSummary: 'Stable post-operative patient, low deterioration risk',
      baseline: { heart_rate: 68, oxygen_saturation: 98, respiratory_rate: 14, systolic_bp: 122, body_temperature: 36.5 },
    },
  ];

  const handleSpeedChange = async (factor: number) => {
    try {
      await setSimulationSpeed(factor);
      setSpeedFactor(factor);
    } catch {}
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppLayout
              patients={patientList}
              latestTicks={latestTicks}
              telemetryHistory={telemetryHistory}
              connected={connected}
              speedFactor={speedFactor}
              onSpeedChange={handleSpeedChange}
              selectedPatientModal={selectedPatientModal}
              onClosePatientModal={() => setSelectedPatientModal(null)}
            />
          }
        >
          {/* 1. DASHBOARD */}
          <Route
            path="/"
            element={
              <DashboardPage
                patients={patientList}
                latestTicks={latestTicks}
                onSelectPatient={(p) => setSelectedPatientModal(p)}
              />
            }
          />

          {/* 2. PATIENTS */}
          <Route
            path="/patients"
            element={
              <PatientsPage
                patients={patientList}
                latestTicks={latestTicks}
                onSelectPatient={(p) => setSelectedPatientModal(p)}
              />
            }
          />

          {/* 3. VITALS MONITOR */}
          <Route
            path="/vitals"
            element={
              <VitalsMonitorPage
                patients={patientList}
                latestTicks={latestTicks}
                telemetryHistory={telemetryHistory}
                connected={connected}
                onSelectPatient={(p) => setSelectedPatientModal(p)}
              />
            }
          />

          {/* 4. FHIR R4 / HAPI */}
          <Route
            path="/fhir"
            element={<FhirPage patients={patientList} />}
          />

          {/* 5. PERFORMANCE REPORT */}
          <Route
            path="/report"
            element={<PerformanceReportPage />}
          />

          {/* 6. DETERIORATION TESTS */}
          <Route
            path="/scenarios"
            element={
              <DeteriorationTestsPage
                patients={patientList}
                latestTicks={latestTicks}
                speedFactor={speedFactor}
                onSpeedChange={handleSpeedChange}
                onSelectPatient={(p) => setSelectedPatientModal(p)}
              />
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;
