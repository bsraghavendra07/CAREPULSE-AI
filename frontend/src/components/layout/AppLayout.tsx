import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  FileJson,
  BarChart3,
  Flame,
  Gauge,
  Search,
  Heart,
  Activity,
  LogOut,
  UserCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { News2ScorePanel } from '../patient-detail/News2ScorePanel';
import { PersonalizedPanel } from '../patient-detail/PersonalizedPanel';
import { ArtifactBanner } from '../patient-detail/ArtifactBanner';
import { VitalsChart } from '../patient-detail/VitalsChart';
import { clearScenario } from '../../lib/api';

export interface ClinicianProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  ward: string;
  initials: string;
  avatarColor: string;
}

export const CLINICIANS: ClinicianProfile[] = [
  {
    id: 'dr-rivera',
    name: 'Dr. Rivera',
    role: 'Cardiologist',
    department: 'Cardiology & Heart Failure Post-Discharge',
    ward: 'Ward 4B',
    initials: 'DR',
    avatarColor: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'dr-thorne',
    name: 'Dr. Aris Thorne',
    role: 'Pulmonologist',
    department: 'Respiratory Medicine & COPD Surveillance',
    ward: 'Ward 3A',
    initials: 'AT',
    avatarColor: 'from-sky-600 to-blue-500',
  },
  {
    id: 'dr-jenkins',
    name: 'Dr. Sarah Jenkins',
    role: 'Critical Care Specialist',
    department: 'Acute Deterioration & Outreach Team',
    ward: 'ICU Stepdown',
    initials: 'SJ',
    avatarColor: 'from-purple-600 to-indigo-500',
  },
  {
    id: 'dr-vance',
    name: 'Dr. Marcus Vance',
    role: 'General Physician',
    department: 'Post-Surgical Inpatient & Step-Down Care',
    ward: 'Ward 5C',
    initials: 'MV',
    avatarColor: 'from-amber-600 to-orange-500',
  },
];

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
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [currentClinician, setCurrentClinician] = useState<ClinicianProfile>(CLINICIANS[0]);
  const [showClinicianModal, setShowClinicianModal] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const handleClearScenario = async (pid: string) => {
    try {
      await clearScenario(pid);
      setResetToast(`Reset scenario for Patient ${pid}`);
      setTimeout(() => setResetToast(null), 3000);
    } catch (e: any) {
      setResetToast(`Error: ${e.message}`);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981] shadow-sm font-semibold'
        : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
    }`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT EXECUTIVE OBSIDIAN SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-[#1a1f2c] bg-[#0c1017] p-5">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 shadow-inner">
              <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center space-x-1.5">
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">CAREPULSE</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">1.0</span>
              </div>
              <div className="text-[10px] text-emerald-400/80 font-medium tracking-tight">Smarter Monitoring. Earlier Awareness.</div>
            </div>
          </div>

          {/* Section: OVERVIEW */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Overview
            </div>

            <NavLink to="/" end className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </NavLink>

            <NavLink to="/patients" className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <Users className="h-4 w-4" />
                <span>Patients</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#ea580c] text-white">
                {patients.length}
              </span>
            </NavLink>

            <NavLink to="/vitals" className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <HeartPulse className="h-4 w-4" />
                <span>Vitals Monitor</span>
              </div>
            </NavLink>

            <NavLink to="/fhir" className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <FileJson className="h-4 w-4 text-emerald-400" />
                <span>FHIR R4 / HAPI</span>
              </div>
            </NavLink>
          </div>

          {/* Section: ANALYTICS */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Analytics
            </div>

            <NavLink to="/report" className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <BarChart3 className="h-4 w-4" />
                <span>Performance Report</span>
              </div>
            </NavLink>

            <NavLink to="/scenarios" className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <Flame className="h-4 w-4 text-orange-400" />
                <span>Deterioration Tests</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                6
              </span>
            </NavLink>
          </div>

          {/* Replay Speed Toggle */}
          <div className="rounded-xl border border-[#1e2433] bg-[#11151f] p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center space-x-1.5">
                <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                <span>Simulation Speed</span>
              </span>
              <span className="font-mono text-emerald-400">{speedFactor}x</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`py-1 rounded text-[11px] font-mono font-bold transition-colors ${
                    speedFactor === s
                      ? 'bg-emerald-500 text-black'
                      : 'bg-[#1a202c] text-slate-300 hover:bg-[#252d3d]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Profile Bar & Clinician Switcher */}
        <div className="border-t border-[#1a1f2c] pt-4 px-1">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowClinicianModal(true)}
              className="flex items-center space-x-3 text-left hover:opacity-85 transition-opacity group"
              title="Click to Switch Clinician"
            >
              <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${currentClinician.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/10`}>
                {currentClinician.initials}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-slate-100 flex items-center space-x-1 group-hover:text-emerald-300">
                  <span>{currentClinician.name}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-400">{currentClinician.role} · Switch</div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsLoggedOut(true);
                setShowClinicianModal(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Log Out / Change Doctor"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN EXECUTIVE VIEWPORT
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#0a0d14] p-6 lg:p-7 space-y-5">
        {/* Top Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Good afternoon, {currentClinician.name}</span>
                <span className="text-emerald-400">✳</span>
              </h1>
              <div className="flex items-center space-x-1.5 rounded-full bg-[#122b1f] border border-[#1b4332] px-3 py-1 text-[11px] font-medium text-[#4ade80]">
                <span className="h-2 w-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span>Live Monitoring ({connected ? 'WS Active' : 'Connecting...'})</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Thursday, 12 November 2026 · {currentClinician.ward} — {currentClinician.department}
            </p>
          </div>

          {/* Search bar & notification */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients, reports..."
                className="h-9 w-64 rounded-xl border border-[#1e2433] bg-[#11151f] pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="h-9 w-9 rounded-xl border border-[#1e2433] bg-[#11151f] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer">
              <Heart className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Global Reset Toast */}
        {resetToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>✓ {resetToast}</span>
            <button onClick={() => setResetToast(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Dynamic Route Content */}
        <Outlet />

        {/* Global Footer & Branding */}
        <footer className="pt-6 pb-2 border-t border-[#1a1f2c] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">CAREPULSE 1.0</span>
            <span>•</span>
            <span className="text-slate-400 italic">"Smarter Monitoring. Earlier Awareness. Safer Recovery."</span>
          </div>
          <div className="text-[11px] text-slate-500">
            © 2026 CAREPULSE Health Systems. All rights reserved.
          </div>
        </footer>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. GLOBAL PATIENT DEEP-DIVE MODAL (Opens on click from ANY page)
      ───────────────────────────────────────────────────────────── */}
      {selectedPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#232b3b] bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1a1f2c] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1e2533] text-emerald-400 font-bold">
                    #{selectedPatientModal.id}
                  </span>
                  <h2 className="text-lg font-bold text-white">{selectedPatientModal.name}</h2>
                  <span className="text-xs text-slate-400">
                    ({selectedPatientModal.gender}, {selectedPatientModal.birthDate})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Diagnosis: <strong>{selectedPatientModal.condition}</strong> • {selectedPatientModal.riskSummary}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleClearScenario(selectedPatientModal.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs hover:bg-slate-700 text-slate-200"
                >
                  Reset Telemetry
                </button>
                <button
                  onClick={onClosePatientModal}
                  className="h-8 w-8 rounded-lg bg-[#151a26] text-slate-400 hover:text-white flex items-center justify-center"
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

      {/* ─────────────────────────────────────────────────────────────
          4. CAREPULSE CLINICIAN LOGIN / SWITCH MODAL
      ───────────────────────────────────────────────────────────── */}
      {showClinicianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#232b3b] bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1a1f2c] pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30">
                  <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>CAREPULSE 1.0</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">AUTH</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isLoggedOut ? 'Clinician Logged Out · Select an authorized doctor to sign in' : 'Switch Active Clinician & Specialty'}
                  </p>
                </div>
              </div>

              {!isLoggedOut && (
                <button
                  onClick={() => setShowClinicianModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1a202c] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Clinician Profile Selector Cards */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Authorized Hospital Clinicians ({CLINICIANS.length})
              </div>

              {CLINICIANS.map((doc) => {
                const isCurrent = doc.id === currentClinician.id && !isLoggedOut;

                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setCurrentClinician(doc);
                      setIsLoggedOut(false);
                      setShowClinicianModal(false);
                      setResetToast(`Successfully authenticated as ${doc.name} (${doc.role})`);
                      setTimeout(() => setResetToast(null), 3500);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-inner'
                        : 'bg-[#11151f] border-[#1e2433] hover:border-slate-600 hover:bg-[#151a26]'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`h-10 w-10 rounded-full bg-gradient-to-tr ${doc.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                        {doc.initials}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center space-x-2">
                          <span>{doc.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-emerald-400 font-medium">{doc.role}</div>
                        <div className="text-[11px] text-slate-400">{doc.department} · {doc.ward}</div>
                      </div>
                    </div>

                    <div className="text-right flex items-center space-x-1.5 text-xs font-semibold">
                      <span className={isCurrent ? 'text-emerald-400' : 'text-slate-400'}>
                        {isCurrent ? 'Signed In' : 'Sign In'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom info */}
            <div className="pt-2 border-t border-[#1a1f2c] flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Ward 4B, 3A & Step-Down Access Granted</span>
              </span>
              <span>CAREPULSE Security v1.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

