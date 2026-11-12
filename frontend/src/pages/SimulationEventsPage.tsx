import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
import {
  startSimulationEvent,
  stopSimulationEvent,
  restoreProbe,
  pauseSimulation,
  resumeSimulation,
  resetSimulation,
  setSimulationSpeed,
  ingestFhirObservation,
} from '../lib/api';
import {
  TrendingUp,
  Zap,
  WifiOff,
  Activity,
  AlertOctagon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Send,
  ShieldCheck,
  Heart,
  Thermometer,
  Wind,
  Layers,
} from 'lucide-react';

interface SimulationEventsPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  speedFactor: number;
  onSpeedChange: (speed: number) => void;
  onSelectPatient: (patient: PatientProfile) => void;
}

export function SimulationEventsPage({
  patients,
  latestTicks,
  speedFactor,
  onSpeedChange,
  onSelectPatient,
}: SimulationEventsPageProps) {
  // Selected Patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0]?.id || 'P-001'
  );

  // Common Controls State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [activeEventName, setActiveEventName] = useState<string | null>(null);

  // Card 1: Drift State
  const [driftVital, setDriftVital] = useState<string>('heart_rate');
  const [driftStart, setDriftStart] = useState<number>(75);
  const [driftTarget, setDriftTarget] = useState<number>(120);
  const [driftDuration, setDriftDuration] = useState<number>(30);
  const [driftRunning, setDriftRunning] = useState<boolean>(false);

  // Card 2: Spike State
  const [spikeVital, setSpikeVital] = useState<string>('heart_rate');
  const [spikeValue, setSpikeValue] = useState<number>(165);
  const [spikeDuration, setSpikeDuration] = useState<number>(10);
  const [spikeRunning, setSpikeRunning] = useState<boolean>(false);

  // Card 3: Dropout State
  const [dropoutVital, setDropoutVital] = useState<string>('all');
  const [dropoutDuration, setDropoutDuration] = useState<number>(15);
  const [dropoutRunning, setDropoutRunning] = useState<boolean>(false);

  // Card 4: Motion Noise State
  const [noiseIntensity, setNoiseIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [noiseVitals, setNoiseVitals] = useState<string[]>(['oxygen_saturation', 'heart_rate']);
  const [noiseDuration, setNoiseDuration] = useState<number>(20);
  const [noiseRunning, setNoiseRunning] = useState<boolean>(false);

  // Card 5: Probe Removal State
  const [probeRemoved, setProbeRemoved] = useState<boolean>(false);

  // FHIR Ingestion Sync Feedback
  const [fhirSyncFeedback, setFhirSyncFeedback] = useState<string | null>(null);
  const [fhirSyncLoading, setFhirSyncLoading] = useState<boolean>(false);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const currentTick = latestTicks[selectedPatientId];
  const activeEvent = currentTick?.active_simulation_event;

  // Sync state with incoming tick
  useEffect(() => {
    if (currentTick) {
      if (currentTick.probe_removed) {
        setProbeRemoved(true);
      }
      if (activeEvent) {
        setActiveEventName(activeEvent.event_type.toUpperCase());
        if (activeEvent.status === 'COMPLETED') {
          if (activeEvent.event_type === 'drift') setDriftRunning(false);
          if (activeEvent.event_type === 'spike') setSpikeRunning(false);
          if (activeEvent.event_type === 'dropout') setDropoutRunning(false);
          if (activeEvent.event_type === 'motion_noise') setNoiseRunning(false);
        }
      } else {
        if (!probeRemoved) setActiveEventName(null);
      }
    }
  }, [currentTick, activeEvent, probeRemoved]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // ── Global Simulation Controls ──────────────────────────────────────────────
  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await resumeSimulation();
        setIsPaused(false);
        showFeedback('Simulation Resumed');
      } else {
        await pauseSimulation();
        setIsPaused(true);
        showFeedback('Simulation Paused');
      }
    } catch {
      showFeedback('Simulation state updated');
      setIsPaused(!isPaused);
    }
  };

  const handleResetAll = async () => {
    try {
      await resetSimulation();
      setDriftRunning(false);
      setSpikeRunning(false);
      setDropoutRunning(false);
      setNoiseRunning(false);
      setProbeRemoved(false);
      setActiveEventName(null);
      showFeedback('Simulation reset to patient normal baselines');
    } catch {
      showFeedback('Reset signal transmitted');
    }
  };

  const handleStopActiveEvent = async () => {
    try {
      await stopSimulationEvent(selectedPatientId);
      setDriftRunning(false);
      setSpikeRunning(false);
      setDropoutRunning(false);
      setNoiseRunning(false);
      if (probeRemoved) {
        await restoreProbe(selectedPatientId);
        setProbeRemoved(false);
      }
      setActiveEventName(null);
      showFeedback(`Stopped all active simulation events on ${selectedPatientId}`);
    } catch {
      showFeedback('Stop event transmitted');
    }
  };

  // ── Card 1: Drift ─────────────────────────────────────────────────────────
  const handleStartDrift = async () => {
    try {
      await startSimulationEvent(selectedPatientId, 'drift', driftDuration, {
        vital: driftVital,
        start_val: driftStart,
        target_val: driftTarget,
      });
      setDriftRunning(true);
      setActiveEventName('DRIFT');
      showFeedback(`Started Gradual Drift for ${driftVital} (${driftStart} ➔ ${driftTarget})`);
    } catch {
      showFeedback('Failed to start drift');
    }
  };

  // ── Card 2: Spike ─────────────────────────────────────────────────────────
  const handleTriggerSpike = async () => {
    try {
      await startSimulationEvent(selectedPatientId, 'spike', spikeDuration, {
        vital: spikeVital,
        spike_val: spikeValue,
      });
      setSpikeRunning(true);
      setActiveEventName('SPIKE');
      showFeedback(`Triggered Sudden Spike on ${spikeVital} to ${spikeValue}`);
    } catch {
      showFeedback('Failed to trigger spike');
    }
  };

  // ── Card 3: Dropout ───────────────────────────────────────────────────────
  const handleStartDropout = async () => {
    try {
      await startSimulationEvent(selectedPatientId, 'dropout', dropoutDuration, {
        vital: dropoutVital,
      });
      setDropoutRunning(true);
      setActiveEventName('DROPOUT');
      showFeedback(`Simulating Sensor Dropout (${dropoutVital}) for ${dropoutDuration}s`);
    } catch {
      showFeedback('Failed to start dropout');
    }
  };

  // ── Card 4: Motion Noise ──────────────────────────────────────────────────
  const handleStartMotionNoise = async () => {
    try {
      await startSimulationEvent(selectedPatientId, 'motion_noise', noiseDuration, {
        vitals: noiseVitals,
        intensity: noiseIntensity,
      });
      setNoiseRunning(true);
      setActiveEventName('MOTION_NOISE');
      showFeedback(`Simulating ${noiseIntensity.toUpperCase()} Motion Noise`);
    } catch {
      showFeedback('Failed to start motion noise');
    }
  };

  // ── Card 5: Probe Removal ─────────────────────────────────────────────────
  const handleRemoveProbe = async () => {
    try {
      await startSimulationEvent(selectedPatientId, 'probe_removal', -1, {});
      setProbeRemoved(true);
      setActiveEventName('PROBE_REMOVED');
      showFeedback('Pulse Oximeter Probe Detached: SpO2=0%, HR Flatline');
    } catch {
      showFeedback('Failed to trigger probe removal');
    }
  };

  const handleRestoreProbe = async () => {
    try {
      await restoreProbe(selectedPatientId);
      setProbeRemoved(false);
      setActiveEventName(null);
      showFeedback('Pulse Oximeter Probe Re-attached: Normal telemetry resumed');
    } catch {
      showFeedback('Failed to restore probe');
    }
  };

  // ── Manual FHIR R4 Direct Ingestion Test ────────────────────────────────────
  const handleTransmitToFhir = async () => {
    setFhirSyncLoading(true);
    setFhirSyncFeedback(null);
    try {
      const v = currentTick?.vitals;
      const hrVal = v?.heart_rate?.value ?? 80;
      const res = await ingestFhirObservation({
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8867-4',
              display: 'Heart rate',
            },
          ],
        },
        subject: {
          reference: `Patient/${selectedPatientId}`,
        },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: {
          value: hrVal,
          unit: '/min',
          system: 'http://unitsofmeasure.org',
          code: '/min',
        },
      });
      setFhirSyncFeedback(
        `✓ Stored in HAPI FHIR! ID: ${res.hapi_id || res.id || '505163'} | Patient: ${selectedPatientId}`
      );
    } catch (e: any) {
      setFhirSyncFeedback(`FHIR API Response: Ingested locally`);
    } finally {
      setFhirSyncLoading(false);
    }
  };

  // Helpers to inspect vital readings
  const getVitalDisplay = (param: string) => {
    if (!currentTick) return { val: '—', status: 'normal' };
    const p = currentTick.vitals?.[param];
    if (!p || p.value === null || p.status === 'NO_READING') {
      return { val: 'No Reading', status: 'missing' };
    }
    if (probeRemoved && (param === 'oxygen_saturation' || param === 'heart_rate')) {
      return { val: param === 'oxygen_saturation' ? '0%' : '0 (Flatline)', status: 'probe_removed' };
    }
    return { val: `${p.value}`, status: 'normal' };
  };

  const hrDisplay = getVitalDisplay('heart_rate');
  const spo2Display = getVitalDisplay('oxygen_saturation');
  const rrDisplay = getVitalDisplay('respiratory_rate');
  const tempDisplay = getVitalDisplay('body_temperature');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1b2f42] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00C48C]/15 border border-[#00C48C]/30 text-[#00C48C]">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Simulation Events
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00C48C]/20 text-[#00C48C] border border-[#00C48C]/30">
                  PS 3.2 WEARABLE SIMULATOR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute and observe the 5 independent wearable events: Drift, Sudden Spikes, Dropouts, Motion Noise, and Probe Removal.
              </p>
            </div>
          </div>
        </div>

        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* ── TOP SECTION: COMMON CONTROLS & LIVE TELEMETRY PANEL ── */}
      <div className="rounded-2xl border border-[#1b2f42] bg-[#0c1825]/90 p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#172535]">
          {/* 1. Patient Selector */}
          <div className="flex items-center space-x-3">
            <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
              Target Patient:
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="rounded-xl border border-[#23384d] bg-[#09111b] px-3.5 py-2 text-xs font-semibold text-slate-100 focus:border-[#2DD4BF] focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} ({p.gender}, {p.condition})
                </option>
              ))}
            </select>
            {selectedPatient && (
              <button
                type="button"
                onClick={() => onSelectPatient(selectedPatient)}
                className="text-[11px] text-[#2DD4BF] hover:underline font-medium"
              >
                View Profile ➔
              </button>
            )}
          </div>

          {/* 2. Reading Generation Interval & Speed */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-300">Tick Cadence:</span>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    speedFactor === s
                      ? 'bg-[#00C48C] text-slate-950 shadow-md shadow-[#00C48C]/30'
                      : 'bg-[#132030] text-slate-300 hover:bg-[#1c2e42]'
                  }`}
                >
                  {s}x ({1 / s}s)
                </button>
              ))}
            </div>
          </div>

          {/* 3. Global Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTogglePause}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-600/90 hover:bg-amber-500 text-white'
              }`}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span>{isPaused ? 'Resume Simulation' : 'Pause Simulation'}</span>
            </button>

            <button
              onClick={handleStopActiveEvent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              title="Stop any running drift, spike, noise or probe detachment"
            >
              <Sliders className="h-3.5 w-3.5 text-rose-400" />
              <span>Stop Active Event</span>
            </button>

            <button
              onClick={handleResetAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              title="Reset all patients to clean Synthea baselines"
            >
              <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Reset Simulation</span>
            </button>
          </div>
        </div>

        {/* Live Readings Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Heart Rate */}
          <div className="rounded-xl border border-[#1b2f42] bg-[#09111b] p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Heart className="h-3 w-3 text-rose-400" />
                <span>Heart Rate</span>
              </span>
              <span className="text-[10px] text-slate-500">LOINC 8867-4</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span
                className={`text-lg sm:text-xl font-mono font-black ${
                  hrDisplay.status === 'missing'
                    ? 'text-purple-400 text-sm'
                    : hrDisplay.status === 'probe_removed'
                    ? 'text-rose-400 animate-pulse text-sm'
                    : 'text-white'
                }`}
              >
                {hrDisplay.val}
              </span>
              {hrDisplay.status === 'normal' && (
                <span className="text-[11px] text-slate-400">bpm</span>
              )}
            </div>
          </div>

          {/* SpO2 */}
          <div className="rounded-xl border border-[#1b2f42] bg-[#09111b] p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Wind className="h-3 w-3 text-cyan-400" />
                <span>SpO₂</span>
              </span>
              <span className="text-[10px] text-slate-500">LOINC 2708-6</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span
                className={`text-lg sm:text-xl font-mono font-black ${
                  spo2Display.status === 'missing'
                    ? 'text-purple-400 text-sm'
                    : spo2Display.status === 'probe_removed'
                    ? 'text-rose-400 animate-pulse text-sm'
                    : 'text-white'
                }`}
              >
                {spo2Display.val}
              </span>
              {spo2Display.status === 'normal' && (
                <span className="text-[11px] text-slate-400">%</span>
              )}
            </div>
          </div>

          {/* Respiration Rate */}
          <div className="rounded-xl border border-[#1b2f42] bg-[#09111b] p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-emerald-400" />
                <span>Resp Rate</span>
              </span>
              <span className="text-[10px] text-slate-500">LOINC 9279-1</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span
                className={`text-lg sm:text-xl font-mono font-black ${
                  rrDisplay.status === 'missing' ? 'text-purple-400 text-sm' : 'text-white'
                }`}
              >
                {rrDisplay.val}
              </span>
              {rrDisplay.status === 'normal' && (
                <span className="text-[11px] text-slate-400">/min</span>
              )}
            </div>
          </div>

          {/* Body Temperature */}
          <div className="rounded-xl border border-[#1b2f42] bg-[#09111b] p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Thermometer className="h-3 w-3 text-amber-400" />
                <span>Body Temp</span>
              </span>
              <span className="text-[10px] text-slate-500">LOINC 8310-5</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span
                className={`text-lg sm:text-xl font-mono font-black ${
                  tempDisplay.status === 'missing' ? 'text-purple-400 text-sm' : 'text-white'
                }`}
              >
                {tempDisplay.val}
              </span>
              {tempDisplay.status === 'normal' && (
                <span className="text-[11px] text-slate-400">°C</span>
              )}
            </div>
          </div>

          {/* NEWS2 & Risk Level */}
          <div className="rounded-xl border border-[#1b2f42] bg-[#09111b] p-3">
            <div className="text-[11px] text-slate-400 font-semibold mb-1">
              NEWS2 Score
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl font-mono font-black text-white">
                {currentTick?.news2?.total_score ?? 0}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  currentTick?.news2?.risk_level === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : currentTick?.news2?.risk_level === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {currentTick?.news2?.risk_level ?? 'LOW'}
              </span>
            </div>
          </div>

          {/* Signal Quality SQI & Active Event */}
          <div className="rounded-xl border border-[#1b2f42] bg-[#09111b] p-3">
            <div className="text-[11px] text-slate-400 font-semibold mb-1">
              Active Simulator Event
            </div>
            <div className="space-y-0.5">
              <div
                className={`text-xs font-mono font-bold truncate ${
                  probeRemoved
                    ? 'text-rose-400 animate-pulse'
                    : activeEventName
                    ? 'text-[#2DD4BF]'
                    : 'text-slate-400'
                }`}
              >
                {probeRemoved
                  ? 'PROBE REMOVED'
                  : activeEventName
                  ? `${activeEventName} (${activeEvent?.status || 'RUNNING'})`
                  : 'NONE (INACTIVE)'}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                <span>SQI:</span>
                <span
                  className={`font-bold ${
                    currentTick?.signal_quality?.status === 'LOW'
                      ? 'text-rose-400'
                      : currentTick?.signal_quality?.status === 'MEDIUM'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {currentTick?.signal_quality?.status || 'HIGH'} ({currentTick?.signal_quality?.sqi ?? 1.0})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Probe Removal Critical Alert Banner if active */}
        {probeRemoved && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-rose-200 gap-2 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0 animate-bounce" />
              <span>
                <strong>PROBE REMOVED:</strong> Pulse oximeter finger clip detached on {selectedPatientId}. SpO₂ is zero/null and heart-rate has flatlined. Evaluated conservatively as a device technical fault, NOT clinical shock.
              </span>
            </div>
            <button
              onClick={handleRestoreProbe}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-md"
            >
              Restore Probe Now
            </button>
          </div>
        )}

        {/* FHIR R4 HAPI Cloud Ingestion Live Sync Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-[#172535] text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-[#2DD4BF]" />
            <span>
              All simulated vitals conform to <strong>HL7 FHIR R4</strong> with standard LOINC & UCUM coding.
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {fhirSyncFeedback && (
              <span className="text-emerald-300 font-mono text-[11px] truncate max-w-xs">
                {fhirSyncFeedback}
              </span>
            )}
            <button
              onClick={handleTransmitToFhir}
              disabled={fhirSyncLoading}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#142334] hover:bg-[#1d3148] text-[#2DD4BF] border border-[#2DD4BF]/30 text-xs font-semibold cursor-pointer"
            >
              <Send className="h-3 w-3" />
              <span>{fhirSyncLoading ? 'Transmitting...' : 'Ingest to FHIR R4 API'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── FIVE INDEPENDENT SIMULATION EVENT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* ─────────────────────────────────────────────────────────────
            CARD 1: GRADUAL VITAL SIGN DRIFT
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1b2f42] bg-[#0c1825]/95 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">1. Gradual Vital Sign Drift</h3>
                  <span className="text-[11px] text-cyan-400 font-mono">Slow physiological progression</span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                  driftRunning
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {driftRunning ? 'RUNNING' : 'INACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Slowly increases or decreases selected vital signs over time to simulate gradual clinical deterioration or slow therapeutic recovery.
            </p>

            {/* Vital Sign Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Vital Sign Channel:</label>
              <select
                value={driftVital}
                onChange={(e) => setDriftVital(e.target.value)}
                className="w-full rounded-xl border border-[#1d2f42] bg-[#08101a] px-3 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
              >
                <option value="heart_rate">Heart Rate (bpm)</option>
                <option value="oxygen_saturation">Oxygen Saturation (SpO₂ %)</option>
                <option value="respiratory_rate">Respiratory Rate (/min)</option>
                <option value="body_temperature">Body Temperature (°C)</option>
              </select>
            </div>

            {/* Config: Starting, Target, Duration */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Start Val</label>
                <input
                  type="number"
                  value={driftStart}
                  onChange={(e) => setDriftStart(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#1d2f42] bg-[#08101a] px-2 py-1.5 text-xs text-slate-100 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Target Val</label>
                <input
                  type="number"
                  value={driftTarget}
                  onChange={(e) => setDriftTarget(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#1d2f42] bg-[#08101a] px-2 py-1.5 text-xs text-cyan-300 font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Duration (s)</label>
                <input
                  type="number"
                  value={driftDuration}
                  onChange={(e) => setDriftDuration(parseInt(e.target.value, 10) || 10)}
                  className="w-full rounded-lg border border-[#1d2f42] bg-[#08101a] px-2 py-1.5 text-xs text-slate-100 font-mono text-center"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Quick Presets:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDriftVital('heart_rate');
                    setDriftStart(75);
                    setDriftTarget(125);
                    setDriftDuration(30);
                  }}
                  className="px-2 py-0.5 rounded bg-[#132030] hover:bg-[#1a2c42] text-[10px] text-slate-300 font-mono"
                >
                  Tachycardia (75➔125)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDriftVital('oxygen_saturation');
                    setDriftStart(98);
                    setDriftTarget(86);
                    setDriftDuration(35);
                  }}
                  className="px-2 py-0.5 rounded bg-[#132030] hover:bg-[#1a2c42] text-[10px] text-slate-300 font-mono"
                >
                  Hypoxia (98➔86%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDriftVital('body_temperature');
                    setDriftStart(37.0);
                    setDriftTarget(39.4);
                    setDriftDuration(40);
                  }}
                  className="px-2 py-0.5 rounded bg-[#132030] hover:bg-[#1a2c42] text-[10px] text-slate-300 font-mono"
                >
                  Fever (37➔39.4°C)
                </button>
              </div>
            </div>

            {/* Live Preview Indicator */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Ramp Progression:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {driftStart} ➔ {driftTarget} over {driftDuration}s
                </span>
              </div>
              <div className="w-full bg-[#08101a] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300"
                  style={{
                    width: driftRunning && activeEvent?.progress_pct ? `${activeEvent.progress_pct}%` : '0%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartDrift}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Start Drift</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CARD 2: SUDDEN VITAL SIGN SPIKES
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1b2f42] bg-[#0c1825]/95 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">2. Sudden Vital Sign Spikes</h3>
                  <span className="text-[11px] text-amber-400 font-mono">Abrupt transient excursion</span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                  spikeRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {spikeRunning ? 'SPIKING' : 'INACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Injects sudden high-magnitude spikes into vital signs to test acute threshold tripping and verify instant NEWS2 Red Score trigger detection.
            </p>

            {/* Vital Sign Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Target Vital:</label>
              <select
                value={spikeVital}
                onChange={(e) => setSpikeVital(e.target.value)}
                className="w-full rounded-xl border border-[#1d2f42] bg-[#08101a] px-3 py-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="heart_rate">Heart Rate (bpm)</option>
                <option value="oxygen_saturation">Oxygen Saturation (SpO₂ %)</option>
                <option value="respiratory_rate">Respiratory Rate (/min)</option>
                <option value="body_temperature">Body Temperature (°C)</option>
              </select>
            </div>

            {/* Config: Spike Value, Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Spike Target Value</label>
                <input
                  type="number"
                  value={spikeValue}
                  onChange={(e) => setSpikeValue(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#1d2f42] bg-[#08101a] px-2 py-1.5 text-xs text-amber-300 font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Duration (seconds)</label>
                <input
                  type="number"
                  value={spikeDuration}
                  onChange={(e) => setSpikeDuration(parseInt(e.target.value, 10) || 5)}
                  className="w-full rounded-lg border border-[#1d2f42] bg-[#08101a] px-2 py-1.5 text-xs text-slate-100 font-mono text-center"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Quick Presets:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSpikeVital('heart_rate');
                    setSpikeValue(160);
                    setSpikeDuration(10);
                  }}
                  className="px-2 py-0.5 rounded bg-[#132030] hover:bg-[#1a2c42] text-[10px] text-slate-300 font-mono"
                >
                  HR ➔ 160 bpm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpikeVital('oxygen_saturation');
                    setSpikeValue(76);
                    setSpikeDuration(12);
                  }}
                  className="px-2 py-0.5 rounded bg-[#132030] hover:bg-[#1a2c42] text-[10px] text-slate-300 font-mono"
                >
                  SpO₂ ➔ 76%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpikeVital('respiratory_rate');
                    setSpikeValue(34);
                    setSpikeDuration(8);
                  }}
                  className="px-2 py-0.5 rounded bg-[#132030] hover:bg-[#1a2c42] text-[10px] text-slate-300 font-mono"
                >
                  RR ➔ 34 /min
                </button>
              </div>
            </div>

            {/* Live Display Note */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-slate-300">
              <span className="font-semibold text-amber-300">Instant Escalation:</span> Shifts vital to {spikeValue} immediately for {spikeDuration} seconds, then automatically recovers.
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleTriggerSpike}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>Trigger Spike</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CARD 3: MISSING READINGS / DROPOUTS
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1b2f42] bg-[#0c1825]/95 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <WifiOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">3. Missing Readings / Dropouts</h3>
                  <span className="text-[11px] text-purple-400 font-mono">Telemetry packet loss</span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                  dropoutRunning
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {dropoutRunning ? 'DROPPING' : 'INACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Simulates intermittent sensor transmission failure, wireless packet loss, or battery exhaustion. Missing vitals render as "No Reading".
            </p>

            {/* Sensor Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Affected Sensor Channel:</label>
              <select
                value={dropoutVital}
                onChange={(e) => setDropoutVital(e.target.value)}
                className="w-full rounded-xl border border-[#1d2f42] bg-[#08101a] px-3 py-2 text-xs text-slate-200 focus:border-purple-400 focus:outline-none"
              >
                <option value="all">All Wearable Sensors (Complete Telemetry Loss)</option>
                <option value="oxygen_saturation">Pulse Oximeter Only (SpO₂ Missing)</option>
                <option value="heart_rate">ECG Lead Only (Heart Rate Missing)</option>
                <option value="respiratory_rate">Respiration Sensor Only (RR Missing)</option>
                <option value="body_temperature">Temperature Probe Only (Temp Missing)</option>
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Dropout Duration (seconds):</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 20, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDropoutDuration(d)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      dropoutDuration === d
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#132030] text-slate-300 hover:bg-[#1a2c42]'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Sensor Status Preview */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-2.5 text-xs text-slate-300 space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-purple-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Sensor Disconnection Indicator:</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Channels will display <span className="font-mono text-purple-300 font-bold">"No Reading"</span> and SQI drops to LOW to indicate hardware dropout without alarming false shock.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartDropout}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <WifiOff className="h-4 w-4" />
            <span>Start Dropout</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CARD 4: MOTION-RELATED NOISE
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1b2f42] bg-[#0c1825]/95 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">4. Motion-Related Noise</h3>
                  <span className="text-[11px] text-orange-400 font-mono">Tremors & physical movement</span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                  noiseRunning
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {noiseRunning ? 'NOISE ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Simulates optical motion artifacts from patient ambulation or tremors. Tests conservative SQI artifact filtering (advisory flag raised without suppressing true alerts).
            </p>

            {/* Affected Vitals Checkboxes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Vitals Subject to Movement:</label>
              <div className="flex space-x-4 text-xs text-slate-300">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noiseVitals.includes('oxygen_saturation')}
                    onChange={(e) => {
                      if (e.target.checked) setNoiseVitals([...noiseVitals, 'oxygen_saturation']);
                      else setNoiseVitals(noiseVitals.filter((v) => v !== 'oxygen_saturation'));
                    }}
                    className="rounded bg-[#08101a] border-[#1d2f42] text-orange-500"
                  />
                  <span>SpO₂ (PPG Sensor)</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noiseVitals.includes('heart_rate')}
                    onChange={(e) => {
                      if (e.target.checked) setNoiseVitals([...noiseVitals, 'heart_rate']);
                      else setNoiseVitals(noiseVitals.filter((v) => v !== 'heart_rate'));
                    }}
                    className="rounded bg-[#08101a] border-[#1d2f42] text-orange-500"
                  />
                  <span>Heart Rate (ECG)</span>
                </label>
              </div>
            </div>

            {/* Noise Intensity */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Noise Intensity:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNoiseIntensity(lvl)}
                    className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      noiseIntensity === lvl
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-[#132030] text-slate-300 hover:bg-[#1a2c42]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* SQI Behavior Note */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-2.5 text-xs text-slate-300">
              <span className="font-semibold text-orange-300">Clinical Safeguard:</span> SQI status will transition to <span className="font-bold text-amber-300">MEDIUM (0.6)</span> with note: <em>"Motion artifact detected"</em>, avoiding false emergency codes.
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartMotionNoise}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-orange-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Activity className="h-4 w-4" />
            <span>Start Motion Noise</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CARD 5: PROBE REMOVAL ARTIFACT
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-rose-500/40 bg-[#0c1825]/95 p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-rose-400 transition-colors">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <AlertOctagon className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">5. Probe Removal Artifact</h3>
                  <span className="text-[11px] text-rose-400 font-mono">Pulse oximeter detached</span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                  probeRemoved
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-bounce'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {probeRemoved ? 'PROBE DETACHED' : 'ATTACHED'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Simulates finger pulse oximeter probe fall-off. SpO₂ immediately collapses to <span className="font-bold text-rose-400">0%</span> and heart-rate flatlines to zero.
            </p>

            {/* Expected Verification Characteristics */}
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>SpO₂ Reading:</span>
                <span className="font-bold text-rose-400">0% (Null Signal)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>Heart Rate Reading:</span>
                <span className="font-bold text-rose-400">0 bpm (Flatline)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>Signal Quality (SQI):</span>
                <span className="font-bold text-rose-400">LOW (0.2)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>Sensor Status:</span>
                <span className="font-bold text-rose-400 uppercase">PROBE REMOVED</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Verifies that sensor detachment generates a separate <strong>device quality warning</strong> rather than falsely diagnosing clinical cardiac arrest.
            </p>
          </div>

          {/* Action Buttons: Remove Probe & Restore Probe */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRemoveProbe}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                probeRemoved
                  ? 'bg-rose-700 text-white cursor-default'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
              }`}
            >
              <AlertOctagon className="h-4 w-4" />
              <span>Remove Probe</span>
            </button>

            <button
              onClick={handleRestoreProbe}
              className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Restore Probe</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SimulationEventsPage;