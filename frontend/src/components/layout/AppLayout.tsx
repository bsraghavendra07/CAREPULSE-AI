import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';
import { useAuth } from '../../context/AuthContext';
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
  ChevronRight,
  X,
  ShieldAlert,
  BellRing,
  Smartphone,
  Radio,
} from 'lucide-react';
import { News2ScorePanel } from '../patient-detail/News2ScorePanel';
import { PersonalizedPanel } from '../patient-detail/PersonalizedPanel';
import { ArtifactBanner } from '../patient-detail/ArtifactBanner';
import { VitalsChart } from '../patient-detail/VitalsChart';
import { EmergencySMSModal } from '../alerts/EmergencySMSModal';
import { clearScenario } from '../../lib/api';

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
  const { staff, logout } = useAuth();
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [showSmsModal, setShowSmsModal] = useState<boolean>(false);
  const [latestAutoSms, setLatestAutoSms] = useState<any | null>(null);
  const seenSmsIdsRef = useRef<Set<string>>(new Set());

  // Watch continuous telemetry stream for automatically analyzed critical situations
  useEffect(() => {
    Object.values(latestTicks).forEach((tick) => {
      if (tick.dispatched_sms && !seenSmsIdsRef.current.has(tick.dispatched_sms.id)) {
        seenSmsIdsRef.current.add(tick.dispatched_sms.id);
        setLatestAutoSms(tick.dispatched_sms);
      }
    });
  }, [latestTicks]);

  const handleClearScenario = async (pid: string) => {
    try {
      await clearScenario(pid);
      setResetToast(`Reset scenario for Patient ${pid}`);
      setTimeout(() => setResetToast(null), 3000);
    } catch (e: any) {
      setResetToast(`Error: ${e.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
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

            {/* Feature 3: Specialist Alert Center */}
            <NavLink to="/alerts" className={navLinkClass}>
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="h-4 w-4 text-emerald-400" />
                <span>Specialist Alert Center</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE
              </span>
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
                7
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

        {/* Bottom Profile Bar & Clinician Sign Out */}
        <div className="border-t border-[#1a1f2c] pt-4 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-left overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/10">
                {staff?.initials || 'CP'}
              </div>
              <div className="leading-tight overflow-hidden">
                <div className="text-xs font-semibold text-slate-100 flex items-center space-x-1.5 truncate">
                  <span className="truncate">{staff?.name || 'Staff Clinician'}</span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {staff?.role || 'Attending Clinician'} · {staff?.department || 'Ward 4B'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 shrink-0 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Sign Out"
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
                <span>Good afternoon, {staff?.name || 'Doctor'}</span>
                <span className="text-emerald-400">✳</span>
              </h1>
              <div className="flex items-center space-x-1.5 rounded-full bg-[#122b1f] border border-[#1b4332] px-3 py-1 text-[11px] font-medium text-[#4ade80]">
                <span className="h-2 w-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span>Live Monitoring ({connected ? 'WS Active' : 'Connecting...'})</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Thursday, 12 November 2026 · {staff?.department || 'Ward 4B — Post-Discharge Continuous Telemetry'}
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
            {/* Emergency SMS Gateway Dispatch Button */}
            <button
              onClick={() => setShowSmsModal(true)}
              className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center space-x-2 text-xs font-semibold shadow-sm transition-all"
              title="Emergency Cellular SMS Gateway & Clinical Report Dispatch"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <Smartphone className="h-4 w-4 text-rose-400" />
              <span className="hidden sm:inline">Emergency SMS</span>
            </button>

            <div className="h-9 w-9 rounded-xl border border-[#1e2433] bg-[#11151f] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer">
              <Heart className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Autonomous Critical Emergency SMS Toast */}
        {latestAutoSms && (
          <div className="p-4 bg-gradient-to-r from-rose-950/70 via-red-950/60 to-[#120709] border-2 border-rose-500/70 rounded-2xl text-rose-200 text-xs shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-start md:items-center space-x-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center">
                <Radio className="h-5 w-5 animate-pulse text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    🚨 CRITICAL SITUATION DETECTED — EMERGENCY SMS AUTO-DISPATCHED
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(latestAutoSms.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-rose-100 font-medium">
                  Patient <strong className="text-white underline">{latestAutoSms.patient_name}</strong> entered critical threshold: {latestAutoSms.full_report?.trigger_reason || latestAutoSms.message_body?.split('\n')[5] || 'Acute clinical deterioration'}.
                  Routed to <strong className="text-white">{latestAutoSms.recipient_name}</strong> ({latestAutoSms.full_report?.specialist_department || 'Specialist Queue'}).
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => setShowSmsModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Inspect Dispatched SMS</span>
              </button>
              <button
                onClick={() => setLatestAutoSms(null)}
                className="p-1 rounded-lg hover:bg-rose-900/40 text-slate-400 hover:text-white"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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

      {/* Emergency SMS Dispatch & Audit Modal */}
      <EmergencySMSModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        patients={patients}
      />
    </div>
  );
}

