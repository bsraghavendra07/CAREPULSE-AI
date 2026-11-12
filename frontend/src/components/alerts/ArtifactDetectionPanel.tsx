import React, { useState } from 'react';
import { SignalQuality, CDSAlert, TelemetryTick } from '../../types/telemetry';
import { triggerScenario, clearScenario } from '../../lib/api';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  History,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  Stethoscope,
  Siren,
  HelpCircle,
  Info,
} from 'lucide-react';

interface ArtifactDetectionPanelProps {
  patientId: string;
  patientName: string;
  tick?: TelemetryTick;
}

export function ArtifactDetectionPanel({
  patientId,
  patientName,
  tick,
}: ArtifactDetectionPanelProps) {
  const [isSimulatingDip, setIsSimulatingDip] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  const sqi: SignalQuality | undefined = tick?.signal_quality;
  const cds: CDSAlert | undefined | null = tick?.cds_alert;
  const isUnreliable = Boolean(sqi?.is_unreliable);
  const artifactType = sqi?.artifact_type || 'NONE';

  const handleTriggerIsolatedDip = async () => {
    try {
      setIsSimulatingDip(true);
      setTestStatusMsg('Injecting isolated SpO₂ drop (98% → 70% → 98%)...');
      await triggerScenario(patientId, 'isolated_spo2_dip');
      setTimeout(async () => {
        setTestStatusMsg('Transient artifact cleared. Resuming normal baseline telemetry.');
        await clearScenario(patientId);
        setIsSimulatingDip(false);
        setTimeout(() => setTestStatusMsg(null), 4000);
      }, 7000);
    } catch (err: any) {
      setTestStatusMsg(`Simulation error: ${err.message}`);
      setIsSimulatingDip(false);
    }
  };

  // Color & Badge for CDS Alert Level
  const getAlertLevelBadge = (level?: string) => {
    switch (level) {
      case 'URGENT':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          indicator: 'bg-rose-500',
          icon: <Siren className="h-4 w-4 text-rose-400 animate-bounce" />,
          title: 'URGENT ALERT',
        };
      case 'REVIEW':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          indicator: 'bg-amber-500',
          icon: <Stethoscope className="h-4 w-4 text-amber-400" />,
          title: 'CLINICAL REVIEW',
        };
      case 'WATCH':
        return {
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          indicator: 'bg-sky-500',
          icon: <Eye className="h-4 w-4 text-sky-400" />,
          title: 'WATCH ADVISORY',
        };
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          indicator: 'bg-emerald-500',
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
          title: 'ROUTINE MONITORING',
        };
    }
  };

  const alertBadge = getAlertLevelBadge(cds?.alert_level);

  return (
    <div className="rounded-2xl border border-[#1a1f2c] bg-[#0c1017] p-5 space-y-5">
      {/* ── STEP 7: ARTIFACT DETECTION HEADER ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#161d2b] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-teal-400" />
              <span>Step 7 — Vital Sign Artifact Detection & Traceability</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Live Filter
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time screening for missing readings, flatlined signals, motion noise, and invalid sensor ranges.
          </p>
        </div>

        {/* Live One-Click Isolated Drop Tester */}
        <button
          onClick={handleTriggerIsolatedDip}
          disabled={isSimulatingDip}
          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
        >
          <Zap className="h-3.5 w-3.5 text-teal-400" />
          <span>{isSimulatingDip ? 'Replaying 70% SpO₂ Dip...' : 'Test Isolated SpO₂ Dip (98→70→98)'}</span>
        </button>
      </div>

      {testStatusMsg && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-200 flex items-center space-x-2 animate-in fade-in">
          <Info className="h-4 w-4 shrink-0 text-teal-400" />
          <span>{testStatusMsg}</span>
        </div>
      )}

      {/* ── 4 ARTIFACT DETECTORS STATUS GRID ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Artifact 1: Missing Readings */}
        <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
          artifactType === 'MISSING_READING'
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-sm'
            : 'bg-[#11151f] border-[#1e2433] text-slate-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>Missing Reading</span>
            {artifactType === 'MISSING_READING' ? (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {artifactType === 'MISSING_READING' ? 'TRIGGERED: Null/Omitted' : 'Normal: Continuous Feed'}
          </div>
        </div>

        {/* Artifact 2: Flatlined Signals */}
        <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
          artifactType === 'FLATLINE'
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
            : 'bg-[#11151f] border-[#1e2433] text-slate-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>Flatlined Signal</span>
            {artifactType === 'FLATLINE' ? (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {artifactType === 'FLATLINE' ? 'TRIGGERED: Frozen signal' : 'Normal: HRV Present'}
          </div>
        </div>

        {/* Artifact 3: Motion-Related Noise */}
        <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
          artifactType === 'MOTION_NOISE' || sqi?.motion_injected
            ? 'bg-teal-500/20 border-teal-500/50 text-teal-200 shadow-sm'
            : 'bg-[#11151f] border-[#1e2433] text-slate-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>Motion Noise</span>
            {artifactType === 'MOTION_NOISE' || sqi?.motion_injected ? (
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {artifactType === 'MOTION_NOISE' ? 'FILTERED: Isolated Spike' : 'Normal: Stable Sensor'}
          </div>
        </div>

        {/* Artifact 4: Invalid Sensor Values */}
        <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
          artifactType === 'INVALID_VALUE'
            ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-sm'
            : 'bg-[#11151f] border-[#1e2433] text-slate-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>Invalid Sensor Val</span>
            {artifactType === 'INVALID_VALUE' ? (
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {artifactType === 'INVALID_VALUE' ? 'TRIGGERED: Out of bounds' : 'Normal: In Bounds'}
          </div>
        </div>
      </div>

      {/* ── ARTIFACT STATUS & AUDIT TRAIL BANNER ──────────────────────── */}
      <div className={`rounded-xl border p-4 transition-all ${
        isUnreliable
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          : 'bg-[#111622] border-[#1e2536] text-slate-300'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg mt-0.5 ${
              isUnreliable ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {isUnreliable ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">
                  Telemetry Integrity:{' '}
                  <span className={isUnreliable ? 'text-amber-400' : 'text-emerald-400'}>
                    {isUnreliable ? `UNRELIABLE (${artifactType})` : 'RELIABLE (Signal Quality High)'}
                  </span>
                </span>
                {isUnreliable && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Critical Alert Quarantined
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {sqi?.note || 'Continuous stream within normal biological bounds.'}
              </p>
            </div>
          </div>

          {/* Traceability Audit Value */}
          <div className="rounded-lg bg-[#090d14] border border-[#1e2433] p-2.5 text-right font-mono text-[11px] space-y-0.5 shrink-0">
            <div className="text-slate-500 text-[10px]">Original Sensor Reading (Auditable):</div>
            <div className="text-slate-200">
              SpO₂:{' '}
              <span className={isUnreliable ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {sqi?.original_reading?.oxygen_saturation?.value ?? sqi?.original_reading?.oxygen_saturation ?? 98}%
              </span>{' '}
              | HR:{' '}
              <span className="text-slate-300">
                {sqi?.original_reading?.heart_rate?.value ?? sqi?.original_reading?.heart_rate ?? 75} bpm
              </span>
            </div>
            {sqi?.traceable_history && sqi.traceable_history.length > 0 && (
              <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1">
                <History className="h-3 w-3 text-slate-500" />
                <span>Sequence: {sqi.traceable_history.join(' → ')}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STEP 8: CLINICAL DECISION SUPPORT ALERT CARD ────────────────── */}
      <div className="rounded-xl border border-[#1e2536] bg-[#10141e] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#182030] pb-3">
          <div className="flex items-center space-x-2.5">
            {alertBadge.icon}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Step 8 — Clinical Decision-Support Alert:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${alertBadge.bg}`}>
                  {alertBadge.title}
                </span>
                {cds?.is_artifact_suppressed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    False Alarm Prevented
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                Vital Sign Involved: <span className="font-semibold text-slate-200">{cds?.vital_sign || 'Vital Signs Normal'}</span>
                {' • '}
                Current Value: <span className="font-mono text-emerald-400 font-bold">{cds?.current_value || 'Within Target Range'}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 shrink-0">
            {cds?.timestamp ? new Date(cds.timestamp).toLocaleTimeString() : 'Active'}
          </div>
        </div>

        {/* Trend & Pattern Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-[#090d14] border border-[#1a202c] p-3 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Activity className="h-3 w-3 text-teal-400" />
              <span>Observed Physiological Trend</span>
            </span>
            <p className="text-slate-200 text-xs font-medium">
              {cds?.trend_pattern || 'Steady vitals trajectory across consecutive observation ticks.'}
            </p>
          </div>

          <div className="rounded-lg bg-[#090d14] border border-[#1a202c] p-3 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Info className="h-3 w-3 text-emerald-400" />
              <span>Clinical Rationale & Action</span>
            </span>
            <p className="text-slate-200 text-xs font-medium">
              {cds?.explanation || 'All parameters stable. Continue standard 12-hourly post-discharge protocol.'}
            </p>
          </div>
        </div>

        {/* Regulatory & Diagnostic Disclaimer */}
        <div className="flex items-center space-x-2 pt-1 text-[10px] text-slate-500 border-t border-[#161c28]">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            <strong className="text-slate-400">Decision-Support Notice:</strong> CarePulse AI provides decision-support telemetry analytics. It does NOT formulate autonomous medical diagnoses.
          </span>
        </div>
      </div>
    </div>
  );
}
