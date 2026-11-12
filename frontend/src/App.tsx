import React, { useState, useMemo } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { usePatients } from './hooks/usePatients';
import { PatientProfile } from './types/patient';
import { TelemetryTick } from './types/telemetry';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Users,
  AlertTriangle,
  Heart,
  Search,
  Sparkles,
  LayoutDashboard,
  HeartPulse,
  FileSpreadsheet,
  Stethoscope,
  Dna,
  Bot,
  Calendar,
  Pill,
  Settings,
  Flame,
  Wind,
  ShieldCheck,
  FileJson,
  BarChart3,
  ArrowUpRight,
  TrendingUp,
  X,
  Gauge,
  Info,
  Clock,
} from 'lucide-react';
import { triggerScenario, clearScenario, setSimulationSpeed, fetchFhirBundle } from './lib/api';
import { News2ScorePanel } from './components/patient-detail/News2ScorePanel';
import { PersonalizedPanel } from './components/patient-detail/PersonalizedPanel';
import { ArtifactBanner } from './components/patient-detail/ArtifactBanner';
import { VitalsChart } from './components/patient-detail/VitalsChart';
import { PerformanceReport } from './components/simulation/PerformanceReport';
import { FhirJsonViewer } from './components/fhir/FhirJsonViewer';

export function App() {
  const { connected, latestTicks, telemetryHistory } = useWebSocket();
  const { patients } = usePatients();

  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [selectedPatientModal, setSelectedPatientModal] = useState<PatientProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Critical' | 'Monitoring'>('All');
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [speedFactor, setSpeedFactor] = useState<number>(1);
  const [scenarioToast, setScenarioToast] = useState<string | null>(null);

  // Fallback profiles if loading
  const patientList: PatientProfile[] = patients.length > 0 ? patients : [
    {
      id: 'P-001',
      name: 'Robert Thompson',
      gender: 'male',
      birthDate: '1958-03-15',
      condition: 'Post-Myocardial Infarction / CHF',
      scale2_prescribed: false,
      riskSummary: 'Elevated cardiac risk, fluid overload monitoring',
      baseline: { heart_rate: 85, oxygen_saturation: 96, respiratory_rate: 18, systolic_bp: 135, body_temperature: 36.8 },
    },
    {
      id: 'P-002',
      name: 'Margaret Chen',
      gender: 'female',
      birthDate: '1952-08-22',
      condition: 'Post-COPD Exacerbation',
      scale2_prescribed: true,
      riskSummary: 'Hypercapnic respiratory failure (NEWS2 Scale 2 prescribed)',
      baseline: { heart_rate: 78, oxygen_saturation: 90, respiratory_rate: 20, systolic_bp: 125, body_temperature: 36.6 },
    },
    {
      id: 'P-003',
      name: 'James Walker',
      gender: 'male',
      birthDate: '1969-11-04',
      condition: 'Post-Abdominal Surgery / Sepsis Risk',
      scale2_prescribed: false,
      riskSummary: 'SIRS / Septic shock surveillance',
      baseline: { heart_rate: 72, oxygen_saturation: 97, respiratory_rate: 16, systolic_bp: 130, body_temperature: 36.9 },
    },
    {
      id: 'P-004',
      name: 'Dorothy Mitchell',
      gender: 'female',
      birthDate: '1944-01-30',
      condition: 'Atrial Fibrillation & Tremors',
      scale2_prescribed: false,
      riskSummary: 'Fluctuating pulse, motion artifact prone',
      baseline: { heart_rate: 82, oxygen_saturation: 95, respiratory_rate: 17, systolic_bp: 140, body_temperature: 36.7 },
    },
    {
      id: 'P-005',
      name: 'David Kim',
      gender: 'male',
      birthDate: '1979-05-19',
      condition: 'Elective Knee Arthroplasty',
      scale2_prescribed: false,
      riskSummary: 'Stable recovery baseline control',
      baseline: { heart_rate: 68, oxygen_saturation: 98, respiratory_rate: 14, systolic_bp: 122, body_temperature: 36.5 },
    },
  ];

  // Aggregates
  let criticalCount = 0;
  let totalNews2 = 0;
  let aiRiskFlagsCount = 0;

  patientList.forEach((p) => {
    const tick = latestTicks[p.id];
    if (tick?.news2?.risk_level === 'HIGH' || tick?.news2?.has_red_score) {
      criticalCount++;
    }
    if (tick?.personalized?.is_advisory_alert) {
      aiRiskFlagsCount++;
    }
    if (tick?.news2) {
      totalNews2 += tick.news2.total_score;
    }
  });

  const avgRecoveryScore = (100 - (totalNews2 / Math.max(patientList.length, 1)) * 5).toFixed(1);

  // Bar chart data: Weekly admissions / Telemetry load
  const weeklyData = [
    { day: 'Mon', emergency: 42, scheduled: 28 },
    { day: 'Tue', emergency: 53, scheduled: 32 },
    { day: 'Wed', emergency: 38, scheduled: 20 },
    { day: 'Thu', emergency: 56, scheduled: 44 },
    { day: 'Fri', emergency: 47, scheduled: 36 },
  ];

  // Donut chart: Diagnosis mix
  const diagnosisData = [
    { name: 'Heart Failure', value: 32, color: '#f97316' },
    { name: 'COPD (Scale 2)', value: 24, color: '#ec4899' },
    { name: 'Sepsis Risk', value: 20, color: '#eab308' },
    { name: 'Arrhythmia / AF', value: 14, color: '#3b82f6' },
    { name: 'Post-Op Stable', value: 10, color: '#10b981' },
  ];

  // 30-day vitals trend line data
  const trendData = useMemo(() => {
    const p1History = telemetryHistory['P-001'] || [];
    if (p1History.length > 0) {
      return p1History.slice(-25).map((t, idx) => ({
        label: `T-${25 - idx}`,
        heart_rate: Number(t.vitals.heart_rate?.value) || 82,
        systolic_bp: Number(t.vitals.systolic_bp?.value) || 128,
        spo2: Number(t.vitals.oxygen_saturation?.value) || 96,
      }));
    }
    return [
      { label: 'Feb 16', heart_rate: 76, systolic_bp: 122, spo2: 97 },
      { label: 'Feb 22', heart_rate: 80, systolic_bp: 125, spo2: 96 },
      { label: 'Mar 1',  heart_rate: 78, systolic_bp: 130, spo2: 98 },
      { label: 'Mar 7',  heart_rate: 84, systolic_bp: 128, spo2: 96 },
      { label: 'Mar 13', heart_rate: 82, systolic_bp: 132, spo2: 97 },
      { label: 'Mar 17', heart_rate: 85, systolic_bp: 129, spo2: 96 },
    ];
  }, [telemetryHistory]);

  // Priority queue filtering
  const filteredPatients = patientList.filter((p) => {
    const tick = latestTicks[p.id];
    const isCritical = tick?.news2?.risk_level === 'HIGH' || tick?.news2?.has_red_score;
    if (activeFilter === 'Critical') return isCritical;
    if (activeFilter === 'Monitoring') return !isCritical;
    return true;
  });

  const handleTriggerScenario = async (pid: string, sc: string) => {
    try {
      await triggerScenario(pid, sc);
      setScenarioToast(`Injected "${sc.toUpperCase()}" into Patient ${pid}`);
      setTimeout(() => setScenarioToast(null), 4000);
    } catch (e: any) {
      setScenarioToast(`Error: ${e.message}`);
    }
  };

  const handleClearScenario = async (pid: string) => {
    try {
      await clearScenario(pid);
      setScenarioToast(`Cleared scenario for Patient ${pid}`);
      setTimeout(() => setScenarioToast(null), 3000);
    } catch (e: any) {
      setScenarioToast(`Error: ${e.message}`);
    }
  };

  const handleSpeed = async (f: number) => {
    try {
      await setSimulationSpeed(f);
      setSpeedFactor(f);
    } catch {}
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans antialiased selection:bg-emerald-500/30">
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT SIDEBAR (Identical to reference mockup)
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-[#1a1f2c] bg-[#0c1017] p-5">
        <div className="space-y-6">
          {/* App Brand Logo */}
          <div className="flex items-center space-x-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black border border-slate-700 shadow-inner">
              <div className="h-4 w-4 rounded-md border-2 border-white flex items-center justify-center">
                <div className="h-1 w-1 bg-emerald-400 rounded-full" />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center space-x-1.5">
                <span>MINEARENA</span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">1.0</span>
              </div>
              <div className="text-[10px] text-slate-400">CardioVascular & Deterioration</div>
            </div>
          </div>

          {/* Section: OVERVIEW */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Overview
            </div>
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === 'dashboard'
                  ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981] shadow-sm'
                  : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => setActiveNav('patients')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === 'patients'
                  ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981]'
                  : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Users className="h-4 w-4" />
                <span>Patients</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#ea580c] text-white">
                5
              </span>
            </button>

            <button
              onClick={() => setActiveNav('vitals')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === 'vitals'
                  ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981]'
                  : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <HeartPulse className="h-4 w-4" />
                <span>Vitals Monitor</span>
              </div>
            </button>

            <button
              onClick={() => setActiveNav('fhir')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === 'fhir'
                  ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981]'
                  : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileJson className="h-4 w-4 text-emerald-400" />
                <span>FHIR R4 / HAPI</span>
              </div>
            </button>
          </div>

          {/* Section: ANALYTICS */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Analytics
            </div>
            <button
              onClick={() => setActiveNav('report')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === 'report'
                  ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981]'
                  : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <BarChart3 className="h-4 w-4" />
                <span>Performance Report</span>
              </div>
            </button>

            <button
              onClick={() => setActiveNav('scenarios')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeNav === 'scenarios'
                  ? 'bg-[#13231c] text-[#34d399] border-l-2 border-[#10b981]'
                  : 'text-slate-400 hover:bg-[#141923] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Flame className="h-4 w-4 text-orange-400" />
                <span>Deterioration Tests</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-600 text-white">
                6
              </span>
            </button>
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
                  onClick={() => handleSpeed(s)}
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

        {/* Bottom Profile Bar */}
        <div className="flex items-center space-x-3 border-t border-[#1a1f2c] pt-4 px-1">
          <div className="h-8 w-8 rounded-full bg-[#0284c7] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            DR
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold text-slate-100">Dr. Rivera</div>
            <div className="text-[10px] text-slate-400">Cardiologist · Ward 4B</div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN EXECUTIVE CONTENT VIEWPORT
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#0a0d14] p-6 lg:p-7 space-y-5">
        {/* Top Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Good afternoon, Dr. Rivera ✳
              </h1>
              <div className="flex items-center space-x-1.5 rounded-full bg-[#122b1f] border border-[#1b4332] px-3 py-1 text-[11px] font-medium text-[#4ade80]">
                <span className="h-2 w-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span>Live Monitoring ({connected ? 'WS Active' : 'Connecting...'})</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Thursday, 12 November 2026 · Ward 4B — Post-Discharge Continuous Telemetry
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

        {/* Scenario Toast */}
        {scenarioToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>✓ {scenarioToast}</span>
            <button onClick={() => setScenarioToast(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Top 4 KPI Cards (Exact layout from image) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Patients */}
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-[#142820] flex items-center justify-center text-emerald-400">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex items-end space-x-1 h-5">
                <span className="w-1 bg-emerald-500/40 h-2 rounded-t" />
                <span className="w-1 bg-emerald-500/60 h-3 rounded-t" />
                <span className="w-1 bg-emerald-500 h-4 rounded-t" />
                <span className="w-1 bg-emerald-500 h-5 rounded-t" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium text-slate-400">Active Monitored Patients</div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">5</div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center space-x-1">
                <span>▲ 100% telemetry online</span>
              </div>
            </div>
          </div>

          {/* Card 2: Critical Alerts */}
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-[#2e1919] flex items-center justify-center text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex items-end space-x-1 h-5">
                <span className="w-1 bg-rose-500/40 h-3 rounded-t" />
                <span className="w-1 bg-rose-500/60 h-4 rounded-t" />
                <span className="w-1 bg-rose-500 h-5 rounded-t" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium text-slate-400">Critical Deterioration Alerts</div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">{criticalCount}</div>
              <div className="text-[10px] text-rose-400 mt-1">
                {criticalCount > 0 ? '▲ Active Red Score trigger' : '● All parameters nominal'}
              </div>
            </div>
          </div>

          {/* Card 3: Avg Recovery Score / NEWS2 Safety Index */}
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-[#2d2215] flex items-center justify-center text-amber-400">
                <Gauge className="h-4 w-4" />
              </div>
              <div className="flex items-end space-x-1 h-5">
                <span className="w-1 bg-amber-500/40 h-2 rounded-t" />
                <span className="w-1 bg-amber-500/70 h-4 rounded-t" />
                <span className="w-1 bg-amber-500 h-3 rounded-t" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium text-slate-400">Avg Recovery Safety Index</div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">{avgRecoveryScore}</div>
              <div className="text-[10px] text-amber-400 mt-1">
                ▲ 1.8 pts post-discharge stability
              </div>
            </div>
          </div>

          {/* Card 4: AI Risk Flags / Personalized Anomalies */}
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-lg bg-[#251933] flex items-center justify-center text-purple-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-end space-x-1 h-5">
                <span className="w-1 bg-purple-500/40 h-3 rounded-t" />
                <span className="w-1 bg-purple-500/70 h-5 rounded-t" />
                <span className="w-1 bg-purple-500 h-4 rounded-t" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-medium text-slate-400">Personalized AI Baseline Flags</div>
              <div className="text-2xl font-bold font-mono text-purple-300 mt-0.5">{aiRiskFlagsCount}</div>
              <div className="text-[10px] text-purple-400 mt-1">
                ● Individual Z-Score Anomaly Engine
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. MIDDLE SECTION: Weekly Load & Donut Chart
        ───────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Chart: Weekly Telemetry Replay & Ingestion */}
          <div className="lg:col-span-7 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Weekly Telemetry & Acute Ingestion</h3>
                <p className="text-[11px] text-slate-400">Emergency vs Scheduled post-discharge check-ins</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-slate-500" />
                  <span className="text-[11px] text-slate-400">Emergency</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-[#3b82f6]" />
                  <span className="text-[11px] text-slate-400">Scheduled</span>
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="emergency" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scheduled" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Chart: Diagnosis Mix Donut */}
          <div className="lg:col-span-5 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Diagnosis Mix</h3>
                <p className="text-[11px] text-slate-400">Current active cohort phenotypes</p>
              </div>
              <span className="text-[11px] text-slate-400 bg-[#161c28] border border-[#232b3b] px-2.5 py-1 rounded-lg">
                Last 30 days
              </span>
            </div>

            <div className="flex items-center justify-center my-3 relative">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diagnosisData}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {diagnosisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Centered text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-white">5</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Patients</span>
              </div>
            </div>

            {/* Legend pills */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              {diagnosisData.map((d) => (
                <div key={d.name} className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate">{d.name}</span>
                </div>
              ))}
            </div>

            {/* Footer insight box from image */}
            <div className="mt-4 p-3 rounded-xl bg-[#131722] border border-[#1e2434] text-[10px] text-slate-400 leading-relaxed">
              Margaret Chen (P-002) is under <strong>NEWS2 Scale 2</strong> (COPD 88–92% target). Her 90% SpO₂ is clinically normal and averted false alarms.
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. BOTTOM SECTION: Cardiac Vitals Trend & Priority Queue Table
        ───────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Bottom Left: Cardiac Vitals 30-Day Trend */}
          <div className="lg:col-span-6 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Cardiac Vitals — Telemetry Stream</h3>
                <p className="text-[11px] text-slate-400">Averaged across monitored PhysioNet & virtual channels</p>
              </div>
              <div className="flex items-center space-x-1 bg-[#151a26] border border-[#232b3b] p-0.5 rounded-lg text-[10px]">
                {(['7D', '30D', '90D'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2 py-0.5 rounded font-mono ${timeRange === r ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={[50, 160]} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="heart_rate" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} name="Heart Rate (bpm)" />
                  <Line type="monotone" dataKey="systolic_bp" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name="BP Systolic (mmHg)" />
                  <Line type="monotone" dataKey="spo2" stroke="#2dd4bf" strokeWidth={2} dot={false} isAnimationActive={false} name="SpO₂ (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-2 border-t border-[#1a1f2c] text-[11px]">
              <span className="flex items-center space-x-1 text-[#f43f5e]">
                <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
                <span>Heart Rate</span>
              </span>
              <span className="flex items-center space-x-1 text-[#3b82f6]">
                <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                <span>BP Systolic</span>
              </span>
              <span className="flex items-center space-x-1 text-[#2dd4bf]">
                <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
                <span>SpO₂</span>
              </span>
            </div>
          </div>

          {/* Bottom Right: Priority Patient Queue (Exact table from image) */}
          <div className="lg:col-span-6 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Priority Patient Queue</h3>
                <p className="text-[11px] text-slate-400">Sorted by NEWS2 & AI risk score — click row for Deep-Dive</p>
              </div>
              <div className="flex items-center space-x-1 bg-[#151a26] border border-[#232b3b] p-0.5 rounded-lg text-[10px]">
                {(['All', 'Critical', 'Monitoring'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-2 py-0.5 rounded ${
                      activeFilter === filter ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1f2533] text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="pb-2">Patient</th>
                    <th className="pb-2">Diagnosis</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Heart Rate</th>
                    <th className="pb-2">BP</th>
                    <th className="pb-2">NEWS2 Score</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171c28]">
                  {filteredPatients.map((p) => {
                    const tick = latestTicks[p.id];
                    const news2 = tick?.news2;
                    const vitals = tick?.vitals;

                    let statusPill = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#122b1f] text-[#4ade80] border border-[#1f4a35]">
                        Stable
                      </span>
                    );
                    let barColor = 'bg-[#10b981]';

                    if (news2?.risk_level === 'HIGH' || news2?.has_red_score) {
                      statusPill = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#331414] text-[#f87171] border border-[#521b1b] animate-pulse">
                          Critical
                        </span>
                      );
                      barColor = 'bg-[#ef4444]';
                    } else if (news2?.risk_level === 'MEDIUM') {
                      statusPill = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#332412] text-[#fbbf24] border border-[#543b18]">
                          Monitoring
                        </span>
                      );
                      barColor = 'bg-[#f59e0b]';
                    }

                    const hrVal = vitals?.heart_rate?.value !== undefined ? String(vitals.heart_rate.value) : p.baseline.heart_rate;
                    const bpVal = vitals?.systolic_bp?.value !== undefined ? `${vitals.systolic_bp.value} / 80` : `${p.baseline.systolic_bp} / 80`;
                    const score = news2?.total_score ?? 0;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPatientModal(p)}
                        className="hover:bg-[#151a26] cursor-pointer transition-colors"
                      >
                        <td className="py-2.5">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">#{p.id}</div>
                        </td>
                        <td className="py-2.5 text-slate-300 text-[11px] truncate max-w-[120px]">
                          {p.condition}
                        </td>
                        <td className="py-2.5">{statusPill}</td>
                        <td className="py-2.5 font-mono text-emerald-400 font-semibold text-[11px]">
                          {hrVal} bpm
                        </td>
                        <td className="py-2.5 font-mono text-slate-300 text-[11px]">
                          {bpVal}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center space-x-2">
                            <div className="h-1.5 w-14 rounded-full bg-[#1e2533] overflow-hidden">
                              <div
                                className={`h-full ${barColor}`}
                                style={{ width: `${Math.min(100, Math.max(10, score * 10))}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-white text-xs">{score}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="text-[10px] text-emerald-400 hover:underline">Deep-Dive →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. AUXILIARY VIEWS: Scenarios, FHIR, Performance Report
        ───────────────────────────────────────────────────────────── */}
        {activeNav === 'scenarios' && (
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f2533] pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Flame className="h-5 w-5 text-orange-400" />
                  <span>Deterioration Scenario Injection Deck</span>
                </h2>
                <p className="text-xs text-slate-400">Trigger simulated clinical events into live telemetry</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                <div className="font-bold text-rose-400 text-sm">Acute Septic Shock</div>
                <p className="text-xs text-slate-400">Temp 39.5°C, HR 125 bpm, BP 85 mmHg, RR 28/min.</p>
                <button
                  onClick={() => handleTriggerScenario('P-003', 'sepsis')}
                  className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Inject on James Walker (P-003)
                </button>
              </div>

              <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
                <div className="font-bold text-sky-400 text-sm">COPD Hypoxic Exacerbation</div>
                <p className="text-xs text-slate-400">SpO₂ 84%, RR 26/min. Evaluates Scale 2 response.</p>
                <button
                  onClick={() => handleTriggerScenario('P-002', 'copd_exacerbation')}
                  className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                >
                  Inject on Margaret Chen (P-002)
                </button>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="font-bold text-amber-400 text-sm">Severe Motion Artifact Storm</div>
                <p className="text-xs text-slate-400">Erratic optical sensor noise. Tests SQI filter.</p>
                <button
                  onClick={() => handleTriggerScenario('P-004', 'motion_artifact')}
                  className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs"
                >
                  Inject on Dorothy Mitchell (P-004)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeNav === 'fhir' && (
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-6">
            <FhirJsonViewer
              patients={patientList}
              selectedPatientId="P-001"
              onSelectPatient={() => {}}
            />
          </div>
        )}

        {activeNav === 'report' && (
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-6">
            <PerformanceReport />
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          6. PATIENT DEEP-DIVE MODAL (Opens on click)
      ───────────────────────────────────────────────────────────── */}
      {selectedPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
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
                  onClick={() => setSelectedPatientModal(null)}
                  className="h-8 w-8 rounded-lg bg-[#151a26] text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Artifact Status */}
            <ArtifactBanner sqi={latestTicks[selectedPatientModal.id]?.signal_quality} />

            {/* Dual Engines Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <News2ScorePanel
                news2={latestTicks[selectedPatientModal.id]?.news2}
                sqiStatus={latestTicks[selectedPatientModal.id]?.signal_quality?.status}
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
    </div>
  );
}

export default App;
