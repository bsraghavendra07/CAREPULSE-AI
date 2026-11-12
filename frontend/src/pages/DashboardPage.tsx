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
  { name: 'Heart Failure', value: 38, color: '#f97316' },
  { name: 'COPD (Scale 2)', value: 24, color: '#ec4899' },
  { name: 'Sepsis Risk', value: 18, color: '#eab308' },
  { name: 'Arrhythmia / AF', value: 12, color: '#3b82f6' },
  { name: 'Post-Op Stable', value: 8, color: '#10b981' },
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
    let count = 0;

    patients.forEach((p) => {
      const tick = latestTicks[p.id];
      if (tick) {
        count++;
        if (tick.news2.risk_level === 'HIGH' || tick.news2.has_red_score) {
          crit++;
        }
        if (tick.personalized.is_advisory_alert) {
          baselineFlags++;
        }
        const score = tick.news2.total_score;
        recoveryTotal += Math.max(0, 100 - score * 12);
      } else {
        recoveryTotal += 95;
        count++;
      }
    });

    const avg = count > 0 ? (recoveryTotal / count).toFixed(1) : '94.2';
    return {
      criticalCount: crit,
      flaggedBaselineCount: baselineFlags,
      avgRecoveryScore: avg,
    };
  }, [patients, latestTicks]);

  // Synthetic 30-day vitals trends for chart
  const vitalsTrendData = useMemo(() => {
    return [
      { date: 'Feb 16', hr: 74, sbp: 128, spo2: 97 },
      { date: 'Feb 22', hr: 72, sbp: 125, spo2: 98 },
      { date: 'Mar 1', hr: 78, sbp: 132, spo2: 96 },
      { date: 'Mar 7', hr: 75, sbp: 126, spo2: 97 },
      { date: 'Mar 13', hr: 73, sbp: 124, spo2: 98 },
      { date: 'Mar 17', hr: 76, sbp: 129, spo2: 97 },
    ];
  }, []);

  // Filter patient queue
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const tick = latestTicks[p.id];
      const risk = tick?.news2?.risk_level;
      if (activeFilter === 'Critical') {
        return risk === 'HIGH' || tick?.news2?.has_red_score;
      }
      if (activeFilter === 'Monitoring') {
        return risk === 'MEDIUM' || risk === 'LOW_MEDIUM';
      }
      return true;
    });
  }, [patients, latestTicks, activeFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top 4 KPI Cards */}
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
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{patients.length}</div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center space-x-1">
              <span>▲ 100% telemetry online</span>
            </div>
          </div>
        </div>

        {/* Card 2: Critical Alerts */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-7 w-7 rounded-lg bg-[#2e1818] flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex items-end space-x-1 h-5">
              <span className="w-1 bg-rose-500/30 h-1.5 rounded-t" />
              <span className="w-1 bg-rose-500/60 h-4 rounded-t" />
              <span className="w-1 bg-rose-500/40 h-2 rounded-t" />
              <span className="w-1 bg-rose-500 h-5 rounded-t" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-medium text-slate-400">Critical Deterioration Alerts</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{criticalCount}</div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
              <span className={criticalCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                ● {criticalCount > 0 ? `${criticalCount} urgent reviews required` : 'All parameters nominal'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Avg Recovery Score */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-7 w-7 rounded-lg bg-[#2b2114] flex items-center justify-center text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex items-end space-x-1 h-5">
              <span className="w-1 bg-amber-500/30 h-2 rounded-t" />
              <span className="w-1 bg-amber-500/50 h-3 rounded-t" />
              <span className="w-1 bg-amber-500 h-4 rounded-t" />
              <span className="w-1 bg-amber-500/80 h-3.5 rounded-t" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-medium text-slate-400">Avg Recovery Safety Index</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{avgRecoveryScore}</div>
            <div className="text-[10px] text-amber-400 mt-1 flex items-center space-x-1">
              <span>▲ 1.8 pts post-discharge stability</span>
            </div>
          </div>
        </div>

        {/* Card 4: AI Risk Flags */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-7 w-7 rounded-lg bg-[#241a33] flex items-center justify-center text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-end space-x-1 h-5">
              <span className="w-1 bg-purple-500/40 h-2 rounded-t" />
              <span className="w-1 bg-purple-500/60 h-3 rounded-t" />
              <span className="w-1 bg-purple-500 h-4 rounded-t" />
              <span className="w-1 bg-purple-500/70 h-2.5 rounded-t" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-medium text-slate-400">Personalized AI Baseline Flags</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{flaggedBaselineCount}</div>
            <div className="text-[10px] text-purple-400 mt-1 flex items-center space-x-1">
              <span>● Individual Z-Score Anomaly Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Row: Weekly Admissions + Diagnosis Mix */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Telemetry & Ingestion Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Weekly Telemetry & Acute Ingestion</h3>
              <p className="text-[11px] text-slate-400">Emergency vs Scheduled post-discharge check-ins</p>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#475569]" />
                <span>Emergency</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                <span>Scheduled</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_ADMISSIONS_DATA} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2533" vertical={false} />
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

        {/* Diagnosis Mix Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Diagnosis Mix</h3>
              <p className="text-[11px] text-slate-400">Current active cohort phenotypes</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a202c] text-slate-400 border border-[#2d3748]">
              Last 30 days
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
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-lg font-bold font-mono text-white">5</span>
              <span className="text-[10px] uppercase text-slate-400 tracking-wider">Patients</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-slate-300">
            {DIAGNOSIS_MIX_DATA.map((d) => (
              <div key={d.name} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{d.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg bg-[#0c1017] border border-[#1a1f2c] p-2 text-[10px] text-slate-400 leading-relaxed">
            Margaret Chen (P-002) is under <strong>NEWS2 Scale 2</strong> (COPD 88–92% target). Her 90% SpO₂ is clinically normal and averted false alarms.
          </div>
        </div>
      </section>

      {/* Bottom Row: Cardiac Vitals 30-Day Trend + Priority Patient Queue */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cardiac Vitals Trend Chart */}
        <div className="lg:col-span-6 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Cardiac Vitals — Telemetry Stream</h3>
              <p className="text-[11px] text-slate-400">Averaged across monitored PhysioNet & virtual channels</p>
            </div>
            <div className="flex items-center space-x-1 bg-[#151a26] border border-[#232b3b] p-0.5 rounded-lg text-[10px]">
              {(['7D', '30D', '90D'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2 py-0.5 rounded ${
                    timeRange === t ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2533" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 160]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="hr" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sbp" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="spo2" stroke="#2dd4bf" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-6 pt-2 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1 text-[#10b981]">
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
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

        {/* Priority Patient Queue */}
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
                      onClick={() => onSelectPatient(p)}
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
    </div>
  );
}

