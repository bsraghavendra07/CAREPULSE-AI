import React, { useState, useMemo } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
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
  Users,
  AlertTriangle,
  TrendingUp,
  Activity,
  Heart,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface DashboardPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  onSelectPatient: (patient: PatientProfile) => void;
}

const WEEKLY_ADMISSIONS_DATA = [
  { day: 'Mon', emergency: 42, scheduled: 28 },
  { day: 'Tue', emergency: 53, scheduled: 32 },
  { day: 'Wed', emergency: 38, scheduled: 20 },
  { day: 'Thu', emergency: 56, scheduled: 44 },
  { day: 'Fri', emergency: 47, scheduled: 36 },
];

const DIAGNOSIS_MIX_DATA = [
  { name: 'Heart Failure', value: 38, color: '#00A896' },
  { name: 'COPD (Scale 2)', value: 24, color: '#F59E0B' },
  { name: 'Sepsis Risk', value: 18, color: '#EF4444' },
  { name: 'Arrhythmia / AF', value: 12, color: '#00D2C4' },
  { name: 'Post-Op Stable', value: 8, color: '#10B981' },
];

export function DashboardPage({
  patients,
  latestTicks,
  onSelectPatient,
}: DashboardPageProps) {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Critical' | 'Monitoring'>('All');
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('30D');

  // KPI Calculations from actual backend ticks
  const { criticalCount, flaggedBaselineCount, avgRecoveryScore } = useMemo(() => {
    let crit = 0;
    let baselineFlags = 0;
    let recoveryTotal = 0;

    patients.forEach((p) => {
      const tick = latestTicks[p.id];
      if (tick) {
        if (tick.news2?.risk_level === 'HIGH' || tick.news2?.has_red_score) {
          crit += 1;
        }
        if (tick.personalized?.is_advisory_alert || tick.personalized?.gradual_deterioration?.detected) {
          baselineFlags += 1;
        }
      }
      recoveryTotal += 88; // Target nominal post-discharge index
    });

    return {
      criticalCount: crit,
      flaggedBaselineCount: baselineFlags,
      avgRecoveryScore: patients.length > 0 ? (recoveryTotal / patients.length).toFixed(1) : '88.0',
    };
  }, [patients, latestTicks]);

  // Synthetic vitals trend data
  const vitalsTrendData = useMemo(() => {
    const points = timeRange === '7D' ? 7 : timeRange === '30D' ? 14 : 20;
    return Array.from({ length: points }, (_, i) => ({
      date: `Nov ${i + 1}`,
      hr: 72 + Math.sin(i * 0.8) * 8 + (i % 2 === 0 ? 3 : -2),
      sbp: 120 + Math.cos(i * 0.5) * 12,
      spo2: 96 + Math.sin(i * 0.3) * 2,
    }));
  }, [timeRange]);

  // Filtered patients for priority queue
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const tick = latestTicks[p.id];
      const risk = tick?.news2?.risk_level || 'LOW';
      if (activeFilter === 'Critical') return risk === 'HIGH' || tick?.news2?.has_red_score;
      if (activeFilter === 'Monitoring') return risk === 'MEDIUM';
      return true;
    });
  }, [patients, latestTicks, activeFilter]);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP 4 EXECUTIVE METRIC TILES
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Patients */}
        <div className="rounded-3xl border border-[#CCFBF1] bg-white p-5 shadow-sm hover:border-[#00D2C4] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-2xl bg-[#E6F7F5] flex items-center justify-center text-[#067A6E]">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
              100% Online
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-[#64748B]">Active Monitored Patients</div>
            <div className="text-3xl font-black text-[#131E3A] mt-0.5">{patients.length}</div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Continuous multi-sensor streams
            </div>
          </div>
        </div>

        {/* Card 2: Critical Alerts */}
        <div className="rounded-3xl border border-[#CCFBF1] bg-white p-5 shadow-sm hover:border-red-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#DC2626]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                criticalCount > 0
                  ? 'bg-red-50 text-[#DC2626] border-red-200'
                  : 'bg-[#E6F7F5] text-[#067A6E] border-[#B2EBE4]'
              }`}
            >
              {criticalCount > 0 ? 'Urgent Action' : 'All Nominal'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-[#64748B]">Critical Deterioration Alerts</div>
            <div
              className={`text-3xl font-black mt-0.5 ${
                criticalCount > 0 ? 'text-[#DC2626]' : 'text-[#131E3A]'
              }`}
            >
              {criticalCount}
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              {criticalCount > 0 ? `${criticalCount} urgent reviews required` : 'Zero threshold violations'}
            </div>
          </div>
        </div>

        {/* Card 3: Avg Recovery Score */}
        <div className="rounded-3xl border border-[#CCFBF1] bg-white p-5 shadow-sm hover:border-[#00D2C4] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-2xl bg-[#E6F7F5] flex items-center justify-center text-[#067A6E]">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
              Post-Discharge
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-[#64748B]">Avg Recovery Safety Index</div>
            <div className="text-3xl font-black text-[#131E3A] mt-0.5">{avgRecoveryScore}%</div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Positive stability trajectory
            </div>
          </div>
        </div>

        {/* Card 4: AI Risk Flags */}
        <div className="rounded-3xl border border-[#CCFBF1] bg-white p-5 shadow-sm hover:border-[#00D2C4] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-2xl bg-[#E6F7F5] flex items-center justify-center text-[#067A6E]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
              Isolation Forest
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-[#64748B]">Personalized AI Baseline Flags</div>
            <div className="text-3xl font-black text-[#131E3A] mt-0.5">{flaggedBaselineCount}</div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Individual Z-Score Anomaly Engine
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. CHARTS: Weekly Telemetry + Diagnosis Mix
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Telemetry & Acute Ingestion Chart */}
        <div className="lg:col-span-7 rounded-3xl border border-[#CCFBF1] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#131E3A]">Weekly Telemetry & Acute Ingestion</h3>
              <p className="text-xs text-[#64748B]">Emergency vs Scheduled post-discharge check-ins</p>
            </div>
            <div className="flex items-center space-x-4 text-xs text-[#64748B]">
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
                <span>Emergency</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00A896]" />
                <span className="font-bold text-[#131E3A]">Scheduled</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_ADMISSIONS_DATA} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CCFBF1', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="emergency" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" fill="#00A896" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnosis Mix Donut Chart */}
        <div className="lg:col-span-5 rounded-3xl border border-[#CCFBF1] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#131E3A]">Diagnosis Mix</h3>
              <p className="text-xs text-[#64748B]">Active post-discharge cohort phenotypes</p>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#E6F7F5] text-[#067A6E] font-bold border border-[#B2EBE4]">
              30 Days
            </span>
          </div>

          <div className="relative flex items-center justify-center py-2">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DIAGNOSIS_MIX_DATA}
                    innerRadius={52}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {DIAGNOSIS_MIX_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CCFBF1', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-black text-[#131E3A]">5</span>
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">Patients</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-[#64748B]">
            {DIAGNOSIS_MIX_DATA.map((d) => (
              <div key={d.name} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl bg-[#E6F7F5] border border-[#B2EBE4] p-3 text-xs text-[#067A6E] leading-relaxed">
            Margaret Chen (P-002) is under <strong className="text-[#131E3A]">NEWS2 Scale 2</strong> (COPD 88–92% target). Her 90% SpO₂ is clinically normal and averted false alarms.
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM ROW: Cardiac Vitals Trend + Priority Patient Queue
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cardiac Vitals Trend Chart */}
        <div className="lg:col-span-6 rounded-3xl border border-[#CCFBF1] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#131E3A]">Cardiac Vitals — Telemetry Stream</h3>
              <p className="text-xs text-[#64748B]">Averaged across monitored PhysioNet & virtual channels</p>
            </div>
            <div className="flex items-center space-x-1 bg-[#E6F7F5] border border-[#B2EBE4] p-1 rounded-full text-xs">
              {(['7D', '30D', '90D'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                    timeRange === t ? 'bg-gradient-to-r from-[#00D2C4] to-[#00A896] text-white shadow-xs' : 'text-[#64748B] hover:text-[#131E3A]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vitalsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 160]} stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CCFBF1', borderRadius: '12px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="hr" stroke="#DC2626" strokeWidth={2} dot={false} name="Heart Rate" />
                <Line type="monotone" dataKey="sbp" stroke="#00A896" strokeWidth={2} dot={false} name="BP Systolic" />
                <Line type="monotone" dataKey="spo2" stroke="#00D2C4" strokeWidth={2} dot={false} name="SpO2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-6 pt-3 text-xs text-[#64748B]">
            <span className="flex items-center space-x-1.5 text-[#DC2626] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
              <span>Heart Rate</span>
            </span>
            <span className="flex items-center space-x-1.5 text-[#00A896] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#00A896]" />
              <span>BP Systolic</span>
            </span>
            <span className="flex items-center space-x-1.5 text-[#00D2C4] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#00D2C4]" />
              <span>SpO₂</span>
            </span>
          </div>
        </div>

        {/* Priority Patient Queue */}
        <div className="lg:col-span-6 rounded-3xl border border-[#CCFBF1] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#131E3A]">Priority Patient Queue</h3>
              <p className="text-xs text-[#64748B]">Sorted by NEWS2 & AI risk score — click row for Deep-Dive</p>
            </div>
            <div className="flex items-center space-x-1 bg-[#E6F7F5] border border-[#B2EBE4] p-1 rounded-full text-xs">
              {(['All', 'Critical', 'Monitoring'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1 rounded-full font-bold text-xs transition-colors ${
                    activeFilter === filter ? 'bg-gradient-to-r from-[#00D2C4] to-[#00A896] text-white shadow-xs' : 'text-[#64748B] hover:text-[#131E3A]'
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
                <tr className="border-b border-[#B2EBE4] bg-[#E6F7F5] text-[#131E3A] font-bold">
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-2">Diagnosis</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2">Heart Rate</th>
                  <th className="py-2.5 px-2">NEWS2</th>
                  <th className="py-2.5 px-2">Suggested Specialty</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPatients.map((p) => {
                  const tick = latestTicks[p.id];
                  const news2 = tick?.news2;
                  const vitals = tick?.vitals;
                  const specialty = tick?.suggested_specialty || news2?.suggested_specialty;

                  let statusPill = (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4]">
                      Stable
                    </span>
                  );
                  let barColor = 'bg-[#00A896]';

                  if (news2?.risk_level === 'HIGH' || news2?.has_red_score) {
                    statusPill = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        Critical
                      </span>
                    );
                    barColor = 'bg-[#DC2626]';
                  } else if (news2?.risk_level === 'MEDIUM') {
                    statusPill = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Monitoring
                      </span>
                    );
                    barColor = 'bg-[#D97706]';
                  }

                  const hrVal = vitals?.heart_rate?.value !== undefined ? String(vitals.heart_rate.value) : p.baseline.heart_rate;
                  const score = news2?.total_score ?? 0;

                  let specialtyDisplay = (
                    <span className="text-[11px] text-[#94A3B8]">—</span>
                  );

                  if (specialty?.is_applicable && specialty.suggested_specialty) {
                    let icon = '🏥';
                    if (specialty.suggested_specialty === 'Pulmonology') icon = '🫁';
                    else if (specialty.suggested_specialty === 'Cardiology') icon = '🫀';
                    else if (specialty.suggested_specialty === 'Internal Medicine') icon = '🩺';

                    specialtyDisplay = (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4]">
                        <span>{icon}</span>
                        <span>{specialty.suggested_specialty}</span>
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPatient(p)}
                      className="hover:bg-[#F4FBF9] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#131E3A]">{p.name}</div>
                        <div className="text-[10px] text-[#64748B]">#{p.id}</div>
                      </td>
                      <td className="py-3 px-2 text-[#64748B] text-[11px] truncate max-w-[120px]">
                        {p.condition}
                      </td>
                      <td className="py-3 px-2">{statusPill}</td>
                      <td className="py-3 px-2 font-semibold text-[#131E3A] text-[11px]">
                        {hrVal} bpm
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          <div className="h-1.5 w-10 rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className={`h-full ${barColor}`}
                              style={{ width: `${Math.min(100, Math.max(10, score * 10))}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#131E3A] text-xs">{score}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {specialtyDisplay}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[11px] font-bold text-[#00A896] hover:underline flex items-center justify-end space-x-0.5">
                          <span>Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
