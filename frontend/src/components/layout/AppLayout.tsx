import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';
import { TopNavBar } from '../navigation/TopNavBar';
import { News2ScorePanel } from '../patient-detail/News2ScorePanel';
import { PersonalizedPanel } from '../patient-detail/PersonalizedPanel';
import { ArtifactBanner } from '../patient-detail/ArtifactBanner';
import { VitalsChart } from '../patient-detail/VitalsChart';
import { clearScenario, fetchPendingStaff } from '../../lib/api';
import { StaffApprovalModal } from '../admin/StaffApprovalModal';

interface AppLayoutProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  telemetryHistory: Record<string, TelemetryTick[]>;
  connected: boolean;
  speedFactor: number;
  onSpeedChange: (speed: number) => void;
  selectedPatientModal: PatientProfile | null;
  onClosePatientModal: () => void;
}

export function AppLayout({
  patients,
  latestTicks,
  telemetryHistory,
  connected,
  speedFactor,
  onSpeedChange,
  selectedPatientModal,
  onClosePatientModal,
}: AppLayoutProps) {
  const { staff } = useAuth();
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [pendingStaffCount, setPendingStaffCount] = useState(0);

  const refreshPendingCount = async () => {
    if (staff?.role === 'HOSPITAL_ADMIN') {
      try {
        const pending = await fetchPendingStaff();
        setPendingStaffCount(pending.length);
      } catch {}
    }
  };

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 15000);
    return () => clearInterval(interval);
  }, [staff?.role]);

  const handleClearScenario = async (pid: string) => {
    try {
      await clearScenario(pid);
      setResetToast(`Reset scenario for Patient ${pid}`);
      setTimeout(() => setResetToast(null), 3000);
    } catch (e: any) {
      setResetToast(`Error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F4FBF9] text-[#131E3A] font-sans antialiased selection:bg-[#00A896] selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. HEALTHRAY-STYLE TOP HORIZONTAL NAVIGATION (WITH MEGA MENUS)
      ───────────────────────────────────────────────────────────── */}
      <TopNavBar
        patients={patients}
        latestTicks={latestTicks}
        connected={connected}
        speedFactor={speedFactor}
        onSpeedChange={onSpeedChange}
        pendingStaffCount={pendingStaffCount}
        onOpenStaffModal={() => setStaffModalOpen(true)}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN HEALTHCARE VIEWPORT (FULL-WIDTH SCROLLABLE)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Global Reset Toast Notification */}
        {resetToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in shadow-sm">
            <span>✓ {resetToast}</span>
            <button onClick={() => setResetToast(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
          </div>
        )}

        {/* Dynamic Route Content (Dashboard, Patients, Vitals, etc.) */}
        <Outlet />

        {/* Global Healthcare Footer & Standards */}
        <footer className="pt-8 pb-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#131E3A]">CarePulse Healthcare Platform</span>
            <span>&bull;</span>
            <span className="font-medium text-[#00A896]">"Always Watching. Always Caring."</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-[#64748B]">
            <span>HL7 FHIR R4 Compliant</span>
            <span>&bull;</span>
            <span>NEWS2 Standard (Royal College of Physicians)</span>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()} CarePulse Health Systems</span>
          </div>
        </footer>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. GLOBAL PATIENT DEEP-DIVE MODAL (Opens on click from ANY page)
      ───────────────────────────────────────────────────────────── */}
      {selectedPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#E8E4DA] bg-white p-6 shadow-2xl text-[#111827] space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8E4DA] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#111111] text-white font-bold">
                    #{selectedPatientModal.id}
                  </span>
                  <h2 className="text-lg font-black text-[#111827]">{selectedPatientModal.name}</h2>
                  <span className="text-xs text-[#6B7280]">
                    ({selectedPatientModal.gender}, {selectedPatientModal.birthDate})
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  Diagnosis: <strong className="text-[#111827]">{selectedPatientModal.condition}</strong> &bull; {selectedPatientModal.riskSummary}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleClearScenario(selectedPatientModal.id)}
                  className="px-3 py-1.5 rounded-full border border-[#E8E4DA] bg-[#EFECE4] text-xs hover:bg-[#E4DFD5] text-[#111111] font-semibold"
                >
                  Reset Telemetry
                </button>
                <button
                  onClick={onClosePatientModal}
                  className="h-8 w-8 rounded-full bg-[#EFECE4] text-[#6B7280] hover:text-[#111827] flex items-center justify-center border border-[#E8E4DA]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Artifact Status */}
            <ArtifactBanner sqi={latestTicks[selectedPatientModal.id]?.signal_quality} />

            {/* Dual Clinical Engines Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <News2ScorePanel
                news2={latestTicks[selectedPatientModal.id]?.news2}
                sqiStatus={latestTicks[selectedPatientModal.id]?.signal_quality?.status}
                suggestedSpecialty={
                  latestTicks[selectedPatientModal.id]?.suggested_specialty ||
                  latestTicks[selectedPatientModal.id]?.news2?.suggested_specialty
                }
              />
              <PersonalizedPanel
                personalized={latestTicks[selectedPatientModal.id]?.personalized}
                mlAnomaly={latestTicks[selectedPatientModal.id]?.ml_anomaly}
                patient={selectedPatientModal}
              />
            </div>

            {/* Live Synchronized Vitals Charts */}
            <VitalsChart
              patient={selectedPatientModal}
              history={telemetryHistory[selectedPatientModal.id] || []}
            />
          </div>
        </div>
      )}

      {/* Staff Approvals Admin Modal */}
      <StaffApprovalModal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        onStaffUpdated={refreshPendingCount}
      />
    </div>
  );
}
