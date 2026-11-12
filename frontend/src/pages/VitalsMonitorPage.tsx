import React, { useState, useMemo } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  HeartPulse,
  Activity,
  Wind,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Clock,
  Waves,
} from 'lucide-react';
import { ProvenanceBadge } from '../components/patient-detail/ProvenanceBadge';

interface VitalsMonitorPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  telemetryHistory: Record<string, TelemetryTick[]>;
  connected: boolean;
  onSelectPatient: (patient: PatientProfile) => void;
}

export function VitalsMonitorPage({
  patients,
  latestTicks,
  telemetryHistory,
  connected,
  onSelectPatient,
}: VitalsMonitorPageProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0]?.id || 'P-001'
  );
  const [visibleChannels, setVisibleChannels] = useState<{
    hr: boolean;
    spo2: boolean;
    rr: boolean;
    temp: boolean;
    sbp: boolean;
  }>({
    hr: true,
    spo2: true,
    rr: true,
    temp: true,
    sbp: true,
  });

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const tick = latestTicks[selectedPatientId];
  const vitals = tick?.vitals;
  const sqi = tick?.signal_quality;
  const history = telemetryHistory[selectedPatientId] || [];

  // Chart data from actual streaming history buffer
  const chartData = useMemo(() => {
    if (history.length === 0) {
      // Seed initial points if just connected
      return Array.from({ length: 15 }, (_, i) => ({
        time: `${i + 1}s`,
        heart_rate: selectedPatient?.baseline.heart_rate ?? 75,
        oxygen_saturation: selectedPatient?.baseline.oxygen_saturation ?? 97,
        respiratory_rate: selectedPatient?.baseline.respiratory_rate ?? 16,
        body_temperature: selectedPatient?.baseline.body_temperature ?? 36.8,
        systolic_bp: selectedPatient?.baseline.systolic_bp ?? 120,
      }));
    }

    return history.slice(-40).map((h, idx) => {
      const v = h.vitals;
      const t = new Date(h.timestamp);
      return {
        time: `${t.getMinutes()}:${t.getSeconds().toString().padStart(2, '0')}`,
        heart_rate: v.heart_rate?.value ?? selectedPatient?.baseline.heart_rate,
        oxygen_saturation: v.oxygen_saturation?.value ?? selectedPatient?.baseline.oxygen_saturation,
        respiratory_rate: v.respiratory_rate?.value ?? selectedPatient?.baseline.respiratory_rate,
        body_temperature: v.body_temperature?.value ?? selectedPatient?.baseline.body_temperature,
        systolic_bp: v.systolic_bp?.value ?? selectedPatient?.baseline.systolic_bp,
      };
    });
  }, [history, selectedPatient]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with Patient Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <HeartPulse className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Multi-Parameter Telemetry Hub</h2>
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#13231c] text-[#4ade80] border border-[#1b4332]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <span>{connected ? 'WS LIVE' : 'CONNECTING'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-channel waveform streaming with BIDMC PhysioNet source attribution
          </p>
        </div>

        {/* Patient Tabs */}
        <div className="flex items-center space-x-1 bg-[#11151f] border border-[#1e2433] p-1 rounded-xl">
          {patients.map((p) => {
            const isSel = p.id === selectedPatientId;
            const pTick = latestTicks[p.id];
            const hasCrit = pTick?.news2?.risk_level === 'HIGH' || pTick?.news2?.has_red_score;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSel
                    ? 'bg-emerald-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a202c]'
                }`}
              >
                <span>{p.name.split(' ')[0]}</span>
                <span className={`text-[10px] font-mono ${isSel ? 'text-black/70' : 'text-slate-500'}`}>
                  ({p.id})
                </span>
                {hasCrit && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Header Banner */}
      {selectedPatient && (
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-[#142820] border border-[#1b4332] flex items-center justify-center font-bold text-emerald-400 text-base">
              {selectedPatient.id}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-white">{selectedPatient.name}</span>
                <span className="text-xs text-slate-400">({selectedPatient.gender}, {selectedPatient.birthDate})</span>
                {selectedPatient.scale2_prescribed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    Scale 2
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Primary Diagnosis: <span className="font-semibold text-emerald-400">{selectedPatient.condition}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectPatient(selectedPatient)}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors"
          >
            Launch Clinical Deep-Dive Modal →
          </button>
        </div>
      )}

      {/* Signal Quality & Artifact Advisory Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
        sqi?.artifact_detected
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
          : 'bg-[#10141e] border-[#1a1f2c] text-slate-300'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            sqi?.artifact_detected ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {sqi?.artifact_detected ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </div>
          <div>
            <div className="text-xs font-bold">
              Signal Quality Index (SQI): {sqi?.status || 'GOOD'} ({sqi?.sqi !== undefined ? `${(sqi.sqi * 100).toFixed(0)}%` : '100%'})
            </div>
            <div className="text-[11px] text-slate-400">
              {sqi?.note || 'All biological telemetry channels within acceptable physiological tolerance.'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-500">Motion Injection:</span>
          <span className={sqi?.motion_injected ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
            {sqi?.motion_injected ? 'ACTIVE' : 'NONE'}
          </span>
        </div>
      </div>

      {/* Real-time 5-Vital Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Vital 1: Heart Rate */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Heart Rate</span>
            <ProvenanceBadge source={vitals?.heart_rate?.source || 'BIDMC'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#10b981]">
              {vitals?.heart_rate?.value ?? selectedPatient?.baseline.heart_rate}
            </span>
            <span className="text-xs text-slate-400 font-mono">/min</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Baseline: {selectedPatient?.baseline.heart_rate} bpm (LOINC 8867-4)
          </div>
        </div>

        {/* Vital 2: SpO2 */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Oxygen Saturation</span>
            <ProvenanceBadge source={vitals?.oxygen_saturation?.source || 'BIDMC'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#2dd4bf]">
              {vitals?.oxygen_saturation?.value ?? selectedPatient?.baseline.oxygen_saturation}
            </span>
            <span className="text-xs text-slate-400 font-mono">%</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Target: {selectedPatient?.scale2_prescribed ? '88–92% (Scale 2)' : '≥96% (Scale 1)'}
          </div>
        </div>

        {/* Vital 3: Respiratory Rate */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Respiration</span>
            <ProvenanceBadge source={vitals?.respiratory_rate?.source || 'BIDMC'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#38bdf8]">
              {vitals?.respiratory_rate?.value ?? selectedPatient?.baseline.respiratory_rate}
            </span>
            <span className="text-xs text-slate-400 font-mono">/min</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Baseline: {selectedPatient?.baseline.respiratory_rate} /min (LOINC 9279-1)
          </div>
        </div>

        {/* Vital 4: Systolic BP */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Systolic BP</span>
            <ProvenanceBadge source={vitals?.systolic_bp?.source || 'SIMULATED'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#818cf8]">
              {vitals?.systolic_bp?.value ?? selectedPatient?.baseline.systolic_bp}
            </span>
            <span className="text-xs text-slate-400 font-mono">mm[Hg]</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Baseline: {selectedPatient?.baseline.systolic_bp} mmHg (LOINC 8480-6)
          </div>
        </div>

        {/* Vital 5: Temperature */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Body Temperature</span>
            <ProvenanceBadge source={vitals?.body_temperature?.source || 'SIMULATED'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#f59e0b]">
              {vitals?.body_temperature?.value ?? selectedPatient?.baseline.body_temperature}
            </span>
            <span className="text-xs text-slate-400 font-mono">°C</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Baseline: {selectedPatient?.baseline.body_temperature}°C (LOINC 8310-5)
          </div>
        </div>
      </div>

      {/* Main Real-Time Telemetry Graph */}
      <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live Time-Series Waveforms</h3>
            <p className="text-[11px] text-slate-400">Continuous sliding window telemetry buffer ({history.length} samples)</p>
          </div>

          {/* Channel Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              onClick={() => setVisibleChannels((c) => ({ ...c, hr: !c.hr }))}
              className={`px-2 py-1 rounded-md border flex items-center space-x-1 transition-colors ${
                visibleChannels.hr
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#151a24] border-[#222a3a] text-slate-500'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span>HR</span>
            </button>
            <button
              onClick={() => setVisibleChannels((c) => ({ ...c, spo2: !c.spo2 }))}
              className={`px-2 py-1 rounded-md border flex items-center space-x-1 transition-colors ${
                visibleChannels.spo2
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-[#151a24] border-[#222a3a] text-slate-500'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
              <span>SpO₂</span>
            </button>
            <button
              onClick={() => setVisibleChannels((c) => ({ ...c, rr: !c.rr }))}
              className={`px-2 py-1 rounded-md border flex items-center space-x-1 transition-colors ${
                visibleChannels.rr
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-[#151a24] border-[#222a3a] text-slate-500'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#38bdf8]" />
              <span>RR</span>
            </button>
            <button
              onClick={() => setVisibleChannels((c) => ({ ...c, sbp: !c.sbp }))}
              className={`px-2 py-1 rounded-md border flex items-center space-x-1 transition-colors ${
                visibleChannels.sbp
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-[#151a24] border-[#222a3a] text-slate-500'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#818cf8]" />
              <span>SBP</span>
            </button>
            <button
              onClick={() => setVisibleChannels((c) => ({ ...c, temp: !c.temp }))}
              className={`px-2 py-1 rounded-md border flex items-center space-x-1 transition-colors ${
                visibleChannels.temp
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#151a24] border-[#222a3a] text-slate-500'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              <span>Temp</span>
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2533" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" domain={[10, 180]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c1017',
                  borderColor: '#232b3b',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}
              />
              {visibleChannels.hr && (
                <Line type="monotone" dataKey="heart_rate" name="Heart Rate (bpm)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {visibleChannels.spo2 && (
                <Line type="monotone" dataKey="oxygen_saturation" name="SpO2 (%)" stroke="#2dd4bf" strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {visibleChannels.rr && (
                <Line type="monotone" dataKey="respiratory_rate" name="Resp Rate (/min)" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {visibleChannels.sbp && (
                <Line type="monotone" dataKey="systolic_bp" name="Systolic BP (mmHg)" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
              {visibleChannels.temp && (
                <Line type="monotone" dataKey="body_temperature" name="Temp (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
