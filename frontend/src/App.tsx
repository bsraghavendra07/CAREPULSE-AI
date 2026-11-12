import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { usePatients } from './hooks/usePatients';
import { PatientProfile } from './types/patient';
import { TelemetryTick } from './types/telemetry';
import { setSimulationSpeed } from './lib/api';
import { AuthProvider, useAuth } from './context/AuthContext';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PatientLoginPage } from './pages/PatientLoginPage';
import { PatientRegisterPage } from './pages/PatientRegisterPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { AccountantBillingPage } from './pages/AccountantBillingPage';

import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { VitalsMonitorPage } from './pages/VitalsMonitorPage';
import { FhirPage } from './pages/FhirPage';
import { PerformanceReportPage } from './pages/PerformanceReportPage';
import { DeteriorationTestsPage } from './pages/DeteriorationTestsPage';
import { SimulationEventsPage } from './pages/SimulationEventsPage';
import { SpecialistAlertCenterPage } from './pages/SpecialistAlertCenterPage';
import { Activity } from 'lucide-react';

interface AuthenticatedRoutesProps {
  patientList: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  telemetryHistory: Record<string, TelemetryTick[]>;
  connected: boolean;
  speedFactor: number;
  handleSpeedChange: (factor: number) => Promise<void>;
  selectedPatientModal: PatientProfile | null;
  setSelectedPatientModal: (p: PatientProfile | null) => void;
}

function AuthenticatedRoutes({
  patientList,
  latestTicks,
  telemetryHistory,
  connected,
  speedFactor,
  handleSpeedChange,
  selectedPatientModal,
  setSelectedPatientModal,
}: AuthenticatedRoutesProps) {
  const { user, staff, patient, loading, isAccountant } = useAuth();

  // Loading Session State (Light SaaS)
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F0F7FF] text-[#111827]">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9F0FF] border border-[#4A90E2]/30 shadow-sm">
            <Activity className="h-6 w-6 text-[#4A90E2] animate-pulse" />
          </div>
          <div className="text-xs font-semibold text-[#4B5563] tracking-wide">
            Authenticating CarePulse Session...
          </div>
        </div>
      </div>
    );
  }

  // 1. Authenticated as PATIENT -> Dedicated Patient Portal
  if (patient) {
    return (
      <Routes>
        <Route path="/patient-dashboard" element={<PatientDashboardPage />} />
        <Route path="*" element={<Navigate to="/patient-dashboard" replace />} />
      </Routes>
    );
  }

  // 2. Authenticated as ACCOUNTANT -> Dedicated Hospital Financial Portal
  if (staff && isAccountant) {
    return (
      <Routes>
        <Route path="/billing" element={<AccountantBillingPage />} />
        <Route path="*" element={<Navigate to="/billing" replace />} />
      </Routes>
    );
  }

  // 3. Unauthenticated -> Show Landing Page & Auth Portals
  if (!user && !staff && !patient) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Hospital Staff Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/staff" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/staff" element={<RegisterPage />} />
        
        {/* Patient Authentication & Portal */}
        <Route path="/login/patient" element={<PatientLoginPage />} />
        <Route path="/register/patient" element={<PatientRegisterPage />} />
        <Route path="/patient-dashboard" element={<PatientDashboardPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 4. Authenticated Clinical Staff -> Full Clinical Telemetry & Monitoring
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login/staff" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register/staff" element={<Navigate to="/dashboard" replace />} />

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
          path="/dashboard"
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

        {/* 5. SPECIALIST ALERT CENTER */}
        <Route
          path="/alerts"
          element={
            <SpecialistAlertCenterPage
              patients={patientList}
              latestTicks={latestTicks}
              onSelectPatient={(p) => setSelectedPatientModal(p)}
            />
          }
        />

        {/* 6. PERFORMANCE REPORT */}
        <Route
          path="/report"
          element={<PerformanceReportPage />}
        />

        {/* 7. DETERIORATION TESTS */}
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

        {/* 8. SIMULATION EVENTS (PS 3.2 Wearable Simulator) */}
        <Route
          path="/simulation-events"
          element={
            <SimulationEventsPage
              patients={patientList}
              latestTicks={latestTicks}
              speedFactor={speedFactor}
              onSpeedChange={handleSpeedChange}
              onSelectPatient={(p) => setSelectedPatientModal(p)}
            />
          }
        />
        <Route
          path="/wearable"
          element={<Navigate to="/simulation-events" replace />}
        />
        <Route
          path="/reports"
          element={<Navigate to="/report" replace />}
        />
        <Route
          path="/tests"
          element={<Navigate to="/scenarios" replace />}
        />
        <Route
          path="/events"
          element={<Navigate to="/simulation-events" replace />}
        />
        <Route
          path="/patient-dashboard"
          element={<PatientDashboardPage />}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

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
      <AuthProvider>
        <AuthenticatedRoutes
          patientList={patientList}
          latestTicks={latestTicks}
          telemetryHistory={telemetryHistory}
          connected={connected}
          speedFactor={speedFactor}
          handleSpeedChange={handleSpeedChange}
          selectedPatientModal={selectedPatientModal}
          setSelectedPatientModal={setSelectedPatientModal}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
