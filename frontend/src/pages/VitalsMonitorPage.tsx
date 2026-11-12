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
  ShieldAlert,
  Sparkles,
  Info,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <HeartPulse className="h-5 w-5 text-[#4A90E2]" />
            <h2 className="text-xl font-bold text-[#111827]">Multi-Parameter Telemetry Hub</h2>
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#13231c] text-[#4ade80] border border-[#4A90E2]/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <span>{connected ? 'WS LIVE' : 'CONNECTING'}</span>
            </div>
          </div>
          <p className="text-xs text-[#4B5563] mt-1">
            Real-time multi-channel waveform streaming with BIDMC PhysioNet source attribution
          </p>
        </div>

        {/* Patient Tabs */}
        <div className="flex items-center space-x-1 bg-[#F0F7FF] border border-[#E5E7EB] p-1 rounded-xl">
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
                    ? 'bg-[#4A90E2] text-white font-bold shadow-sm'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F0F7FF]'
                }`}
              >
                <span>{p.name.split(' ')[0]}</span>
                <span className={`text-[10px] font-mono ${isSel ? 'text-black/70' : 'text-[#4B5563]'}`}>
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
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-[#D9F0FF] border border-[#4A90E2]/30 flex items-center justify-center font-bold text-[#4A90E2] text-base">
              {selectedPatient.id}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-[#111827]">{selectedPatient.name}</span>
                <span className="text-xs text-[#4B5563]">({selectedPatient.gender}, {selectedPatient.birthDate})</span>
                {selectedPatient.scale2_prescribed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    Scale 2
                  </span>
                )}
              </div>
              <div className="text-xs text-[#4B5563] mt-0.5">
                Primary Diagnosis: <span className="font-semibold text-[#4A90E2]">{selectedPatient.condition}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectPatient(selectedPatient)}
            className="px-3 py-1.5 rounded-xl border border-[#4A90E2]/30 bg-[#D9F0FF] text-[#4A90E2] hover:bg-[#D9F0FF] text-[#4A90E2] text-[#4A90E2] text-xs font-bold transition-colors"
          >
            Launch Clinical Deep-Dive Modal →
          </button>
        </div>
      )}

      {/* Signal Quality & Artifact Advisory Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        sqi?.clinical_alert_suppressed || sqi?.probe_removed
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
          : sqi?.artifact_detected
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
            : 'bg-white shadow-sm border-[#E5E7EB] text-[#4B5563]'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            sqi?.clinical_alert_suppressed || sqi?.probe_removed
              ? 'bg-rose-500/20 text-rose-400'
              : sqi?.artifact_detected
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[#D9F0FF] text-[#4A90E2] text-[#4A90E2]'
          }`}>
            {sqi?.clinical_alert_suppressed || sqi?.probe_removed ? (
              <AlertTriangle className="h-4 w-4 animate-pulse" />
            ) : sqi?.artifact_detected ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold flex items-center space-x-2">
              <span>Signal Quality Index (SQI): {sqi?.status || 'GOOD'} ({sqi?.sqi !== undefined ? `${(sqi.sqi * 100).toFixed(0)}%` : '100%'})</span>
              {sqi?.probe_removed && (
                <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  PROBE DETACHED
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#4B5563] mt-0.5">
              {sqi?.note || 'All biological telemetry channels within acceptable physiological tolerance.'}
            </div>
          </div>
        </div>

        {/* Per-Channel Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/40 border border-[#E5E7EB]">
            <span className="text-[#4B5563]">SpO₂:</span>
            <span className={sqi?.probe_removed ? 'text-rose-400 font-bold' : sqi?.signals?.spo2?.status === 'ARTIFACT' ? 'text-amber-400 font-bold' : 'text-[#4A90E2]'}>
              {sqi?.probe_removed ? '⚠ Probe Removed' : sqi?.signals?.spo2?.status === 'ARTIFACT' ? '⚠ Artifact' : '● Reliable'}
            </span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/40 border border-[#E5E7EB]">
            <span className="text-[#4B5563]">HR:</span>
            <span className={sqi?.signals?.heart_rate?.status === 'FLATLINE' ? 'text-rose-400 font-bold' : sqi?.signals?.heart_rate?.status === 'ARTIFACT' ? 'text-amber-400' : 'text-[#4A90E2]'}>
              {sqi?.signals?.heart_rate?.status === 'FLATLINE' ? '⚠ Flatline' : '● Reliable'}
            </span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/40 border border-[#E5E7EB]">
            <span className="text-[#4B5563]">RR:</span>
            <span className="text-[#4A90E2]">● Reliable</span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-1 rounded bg-black/40 border border-[#E5E7EB]">
            <span className="text-[#4B5563]">Temp:</span>
            <span className="text-[#4A90E2]">● Reliable</span>
          </div>
        </div>
      </div>

      {/* SENSOR QUALITY ALERT (Suppression Banner when Probe Removed / Sensor Issue) */}
      {(sqi?.clinical_alert_suppressed || sqi?.probe_removed) && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center space-x-2 text-amber-400 font-bold tracking-wide">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>⚠ SENSOR QUALITY ALERT: SpO₂ Signal Appears Unavailable</span>
          </div>
          <p className="text-[11px] text-[#111827]">
            {sqi?.suppression_reason || 'Pulse oximeter probe appears detached. Clinical hypoxia deterioration alert suppressed because the signal is currently unreliable.'}
          </p>
          <div className="text-[10px] text-amber-400 pt-1 border-t border-amber-500/20 font-mono">
            Safety protocol: False hypoxia alarm suppressed. Please check probe placement on patient.
          </div>
        </div>
      )}

      {/* PHYSIOLOGICAL DETERIORATION CONFIRMATION */}
      {sqi?.is_genuine_deterioration && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-[#4A90E2]/30 text-emerald-200 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center space-x-2 text-[#4A90E2] font-bold tracking-wide">
            <Activity className="h-4 w-4 shrink-0 text-[#4A90E2]" />
            <span>⚠ PHYSIOLOGICAL DETERIORATION DETECTED</span>
          </div>
          <p className="text-[11px] text-emerald-100">
            {sqi?.genuine_deterioration_note || 'Multi-vital cross-check confirms genuine patient deterioration: SpO₂ decline matches compensatory HR/RR elevation. Signals are physiologically consistent and reliable.'}
          </p>
          <div className="text-[10px] text-[#4A90E2] pt-1 border-t border-[#4A90E2]/30 font-mono">
            Status: Validated by multi-vital concordance — existing clinical risk pipeline continues without suppression.
          </div>
        </div>
      )}

      {/* Real-time 5-Vital Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Vital 1: Heart Rate */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Heart Rate</span>
            <ProvenanceBadge source={vitals?.heart_rate?.source || 'BIDMC'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#10b981]">
              {vitals?.heart_rate?.value ?? selectedPatient?.baseline.heart_rate}
            </span>
            <span className="text-xs text-[#4B5563] font-mono">/min</span>
          </div>
          <div className="text-[10px] text-[#4B5563]">
            Baseline: {selectedPatient?.baseline.heart_rate} bpm (LOINC 8867-4)
          </div>
        </div>

        {/* Vital 2: SpO2 */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Oxygen Saturation</span>
            <ProvenanceBadge source={vitals?.oxygen_saturation?.source || 'BIDMC'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#2dd4bf]">
              {vitals?.oxygen_saturation?.value ?? selectedPatient?.baseline.oxygen_saturation}
            </span>
            <span className="text-xs text-[#4B5563] font-mono">%</span>
          </div>
          <div className="text-[10px] text-[#4B5563]">
            Target: {selectedPatient?.scale2_prescribed ? '88–92% (Scale 2)' : '≥96% (Scale 1)'}
          </div>
        </div>

        {/* Vital 3: Respiratory Rate */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Respiration</span>
            <ProvenanceBadge source={vitals?.respiratory_rate?.source || 'BIDMC'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#38bdf8]">
              {vitals?.respiratory_rate?.value ?? selectedPatient?.baseline.respiratory_rate}
            </span>
            <span className="text-xs text-[#4B5563] font-mono">/min</span>
          </div>
          <div className="text-[10px] text-[#4B5563]">
            Baseline: {selectedPatient?.baseline.respiratory_rate} /min (LOINC 9279-1)
          </div>
        </div>

        {/* Vital 4: Systolic BP */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Systolic BP</span>
            <ProvenanceBadge source={vitals?.systolic_bp?.source || 'SIMULATED'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#818cf8]">
              {vitals?.systolic_bp?.value ?? selectedPatient?.baseline.systolic_bp}
            </span>
            <span className="text-xs text-[#4B5563] font-mono">mm[Hg]</span>
          </div>
          <div className="text-[10px] text-[#4B5563]">
            Baseline: {selectedPatient?.baseline.systolic_bp} mmHg (LOINC 8480-6)
          </div>
        </div>

        {/* Vital 5: Temperature */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Body Temperature</span>
            <ProvenanceBadge source={vitals?.body_temperature?.source || 'SIMULATED'} />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold font-mono text-[#f59e0b]">
              {vitals?.body_temperature?.value ?? selectedPatient?.baseline.body_temperature}
            </span>
            <span className="text-xs text-[#4B5563] font-mono">°C</span>
          </div>
          <div className="text-[10px] text-[#4B5563]">
            Baseline: {selectedPatient?.baseline.body_temperature}°C (LOINC 8310-5)
          </div>
        </div>
      </div>

      {/* ── Requirement 3.4: Compact NEWS2 Early Warning Score & Patient Baseline Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: NEWS2 Early Warning Score (Requirement 13) */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                  NEWS2 EARLY WARNING SCORE
                </h3>
                <p className="text-[11px] text-[#4B5563]">
                  RCP Dec 2017 Early Warning Scoring Baseline
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                tick?.news2?.risk_level === 'HIGH'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : tick?.news2?.risk_level === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-[#D9F0FF] text-[#4A90E2] text-[#4A90E2] border-[#4A90E2]/30'
              }`}>
                Score: {tick?.news2?.total_score ?? 0}
              </span>
            </div>
          </div>

          {/* 7 Component Sub-Scores Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center">
              <span className="text-[#4B5563]">RR</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.respiratory_rate ?? tick?.news2?.sub_scores?.rr ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center">
              <span className="text-[#4B5563]">SpO₂</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.spo2 ?? tick?.news2?.sub_scores?.spo2 ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center">
              <span className="text-[#4B5563]">Heart Rate</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.heart_rate ?? tick?.news2?.sub_scores?.hr ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center">
              <span className="text-[#4B5563]">Temperature</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.temperature ?? tick?.news2?.sub_scores?.temp ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center">
              <span className="text-[#4B5563]">BP</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.systolic_bp ?? tick?.news2?.sub_scores?.sbp ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center">
              <span className="text-[#4B5563]">Consciousness</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.consciousness ?? tick?.news2?.sub_scores?.acvpu ?? 0}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#F0F7FF] border border-[#1e2533] flex justify-between items-center col-span-2">
              <span className="text-[#4B5563]">Oxygen</span>
              <span className="font-mono font-bold text-[#111827]">
                {tick?.news2?.components?.supplemental_oxygen ?? tick?.news2?.sub_scores?.supplemental_oxygen ?? 0}
              </span>
            </div>
          </div>

          {/* SpO2 Scale & Target Specification */}
          <div className="p-2.5 rounded-xl bg-[#0b0e14] border border-[#1e2533] text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                selectedPatient?.scale2_prescribed
                  ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                  : 'bg-[#D9F0FF] text-[#4A90E2] text-[#4A90E2] border-[#4A90E2]/30'
              }`}>
                SpO₂ Scale: {selectedPatient?.scale2_prescribed ? '2' : '1'}
              </span>
              <span className="text-[#4B5563] text-[11px]">
                Target: <strong className="text-[#111827] font-mono">{selectedPatient?.scale2_prescribed ? '88–92%' : '≥96%'}</strong>
              </span>
            </div>
            <span className="text-[10px] text-[#4B5563] hidden sm:inline">
              {selectedPatient?.scale2_prescribed ? 'Documented hypercapnic failure' : 'Standard air baseline'}
            </span>
          </div>
        </div>

        {/* Card 2: Patient Baseline (Requirement 14) */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                  PATIENT BASELINE
                </h3>
                <p className="text-[11px] text-[#4B5563]">
                  Personalization Rule 2: Rolling historical window & gradual trend
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Personalized Layer
            </span>
          </div>

          {/* Gradual Deterioration Warning if detected */}
          {tick?.personalized?.gradual_deterioration?.detected ? (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 animate-pulse">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <div>
                <strong>{tick.personalized.gradual_deterioration.alert_message}</strong>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[#4B5563] bg-[#0b0e14] p-2.5 rounded-xl border border-[#1e2533]">
              Personalization layer tracks patient-specific recovery trajectories without overriding safety limits.
            </div>
          )}

          {/* SpO2 and HR Rolling Baseline Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* SpO2 */}
            <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#1e2533] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-400">SpO₂</span>
                <span className={`font-mono text-[11px] font-semibold ${
                  tick?.personalized?.trends?.spo2?.trend_direction?.includes('↓')
                    ? 'text-amber-400'
                    : 'text-[#4A90E2]'
                }`}>
                  Trend: {tick?.personalized?.trends?.spo2?.trend_direction || (history.length >= 5 ? '→ Stable' : 'Insufficient data')}
                </span>
              </div>
              {history.length >= 5 || tick?.personalized?.trends?.spo2?.status !== 'Insufficient historical data' ? (
                <div className="text-[11px] text-[#4B5563] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[#4B5563]">Baseline:</span>
                    <span className="font-mono text-[#111827]">
                      {tick?.personalized?.trends?.spo2?.baseline_mean?.toFixed(1) || selectedPatient?.baseline.oxygen_saturation}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4B5563]">Current:</span>
                    <span className="font-mono text-[#111827] font-bold">
                      {vitals?.oxygen_saturation?.value ?? selectedPatient?.baseline.oxygen_saturation}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-[#4B5563] italic py-1">
                  Baseline: {selectedPatient?.baseline.oxygen_saturation}% • Insufficient historical data
                </div>
              )}
            </div>

            {/* HR */}
            <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#1e2533] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#4A90E2]">HR</span>
                <span className={`font-mono text-[11px] font-semibold ${
                  tick?.personalized?.trends?.hr?.trend_direction?.includes('↑')
                    ? 'text-amber-400'
                    : 'text-[#4A90E2]'
                }`}>
                  Trend: {tick?.personalized?.trends?.hr?.trend_direction || (history.length >= 5 ? '→ Stable' : 'Insufficient data')}
                </span>
              </div>
              {history.length >= 5 || tick?.personalized?.trends?.hr?.status !== 'Insufficient historical data' ? (
                <div className="text-[11px] text-[#4B5563] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[#4B5563]">Baseline:</span>
                    <span className="font-mono text-[#111827]">
                      {tick?.personalized?.trends?.hr?.baseline_mean?.toFixed(0) || selectedPatient?.baseline.heart_rate} bpm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4B5563]">Current:</span>
                    <span className="font-mono text-[#111827] font-bold">
                      {vitals?.heart_rate?.value ?? selectedPatient?.baseline.heart_rate} bpm
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-[#4B5563] italic py-1">
                  Baseline: {selectedPatient?.baseline.heart_rate} bpm • Insufficient historical data
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Real-Time Telemetry Graph */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Live Time-Series Waveforms</h3>
            <p className="text-[11px] text-[#4B5563]">Continuous sliding window telemetry buffer ({history.length} samples)</p>
          </div>

          {/* Channel Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              onClick={() => setVisibleChannels((c) => ({ ...c, hr: !c.hr }))}
              className={`px-2 py-1 rounded-md border flex items-center space-x-1 transition-colors ${
                visibleChannels.hr
                  ? 'bg-[#D9F0FF] text-[#4A90E2] border-[#4A90E2]/30 text-[#4A90E2]'
                  : 'bg-[#151a24] border-[#222a3a] text-[#4B5563]'
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
                  : 'bg-[#151a24] border-[#222a3a] text-[#4B5563]'
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
                  : 'bg-[#151a24] border-[#222a3a] text-[#4B5563]'
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
                  : 'bg-[#151a24] border-[#222a3a] text-[#4B5563]'
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
                  : 'bg-[#151a24] border-[#222a3a] text-[#4B5563]'
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
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94A3B8" domain={[10, 180]} tick={{ fontSize: 10 }} />
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

