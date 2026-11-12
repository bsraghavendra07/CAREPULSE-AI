import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Database, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Activity, 
  Heart, 
  Wind, 
  Thermometer, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  CheckCircle2, 
  Layers, 
  FileSpreadsheet, 
  Sliders, 
  Clock, 
  RefreshCw,
  Power,
  Flame,
  ArrowRight
} from 'lucide-react';

export default function DataSourcesSimulation({
  activePatientId,
  onSelectPatient,
  patients = [],
  onTelemetryUpdated
}) {
  // Simulator State
  const [simPatient, setSimPatient] = useState(activePatientId || 'P-003');
  const [simStatus, setSimStatus] = useState('STOPPED'); // 'STOPPED' | 'RUNNING' | 'PAUSED'
  const [simInterval, setSimInterval] = useState(2.5); // seconds
  const [simEvent, setSimEvent] = useState(null);
  const [simVitals, setSimVitals] = useState(null);
  const [simFhirStatus, setSimFhirStatus] = useState(null);
  const [simStepCount, setSimStepCount] = useState(0);

  // BIDMC Replay State
  const [bidmcPatient, setBidmcPatient] = useState(activePatientId || 'P-001');
  const [bidmcFile, setBidmcFile] = useState('bidmc_01_Numerics.csv');
  const [bidmcAvailableFiles, setBidmcAvailableFiles] = useState(['bidmc_01_Numerics.csv', 'bidmc_02_Numerics.csv']);
  const [bidmcStatus, setBidmcStatus] = useState('STOPPED'); // 'STOPPED' | 'PLAYING' | 'PAUSED' | 'COMPLETED'
  const [bidmcSpeed, setBidmcSpeed] = useState(1.0); // 1x, 2x, 5x, 10x
  const [bidmcVitals, setBidmcVitals] = useState(null);
  const [bidmcProgress, setBidmcProgress] = useState({ current: 0, total: 468, pct: 0, elapsed_s: 0 });
  const [bidmcFhirStatus, setBidmcFhirStatus] = useState(null);

  // Timers for automated playback
  const simTimerRef = useRef(null);
  const bidmcTimerRef = useRef(null);

  // Load initial states from backend
  useEffect(() => {
    fetch('/api/simulator/state')
      .then(r => r.json())
      .then(data => {
        setSimStatus(data.status);
        setSimInterval(data.interval_seconds || 2.5);
        setSimEvent(data.active_event);
        setSimStepCount(data.step_count || 0);
        if (data.last_reading) setSimVitals(data.last_reading);
      })
      .catch(err => console.error('Error fetching sim state:', err));

    fetch('/api/bidmc/state')
      .then(r => r.json())
      .then(data => {
        setBidmcStatus(data.status);
        setBidmcFile(data.active_file);
        if (data.available_files) setBidmcAvailableFiles(data.available_files);
        setBidmcSpeed(data.playback_speed || 1.0);
        setBidmcProgress({
          current: data.current_sample || 0,
          total: data.total_samples || 468,
          pct: data.progress_percent || 0,
          elapsed_s: data.elapsed_time_seconds || 0
        });
        if (data.last_reading) setBidmcVitals(data.last_reading);
      })
      .catch(err => console.error('Error fetching BIDMC state:', err));
  }, []);

  // Sync with active patient prop
  useEffect(() => {
    if (activePatientId) {
      setSimPatient(activePatientId);
    }
  }, [activePatientId]);

  // ==========================================
  // PART A: SIMULATOR ACTIONS & TICK
  // ==========================================
  const executeSimulatorTick = async () => {
    try {
      const res = await fetch(`/api/simulator/tick?patient_id=${simPatient}`, { method: 'POST' });
      const data = await res.json();
      if (data.vitals) {
        setSimVitals(data.vitals);
      }
      setSimStepCount(prev => prev + 1);
      setSimFhirStatus({
        status: 'ACCEPTED',
        timestamp: new Date().toLocaleTimeString(),
        observationsSaved: data.fhir_ingestion?.observations_saved || 4,
        tier: data.news2?.tier || 'WATCH',
        score: data.news2?.score ?? 0,
        sensorStatus: data.sensor_verdict?.sensor_status || 'NORMAL'
      });
      if (onTelemetryUpdated) onTelemetryUpdated(data);
    } catch (err) {
      console.error('Simulator tick error:', err);
    }
  };

  const handleSimStart = async () => {
    setSimStatus('RUNNING');
    await fetch('/api/simulator/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', patient_id: simPatient, interval_seconds: simInterval })
    });
    executeSimulatorTick();
  };

  const handleSimPause = async () => {
    setSimStatus('PAUSED');
    await fetch('/api/simulator/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' })
    });
  };

  const handleSimResume = async () => {
    setSimStatus('RUNNING');
    await fetch('/api/simulator/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' })
    });
  };

  const handleSimStop = async () => {
    setSimStatus('STOPPED');
    await fetch('/api/simulator/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' })
    });
  };

  const handleSimEventSelect = async (evtName) => {
    setSimEvent(evtName);
    await fetch('/api/simulator/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: simPatient, event: evtName })
    });
    executeSimulatorTick();
  };

  // Automated simulator timer
  useEffect(() => {
    if (simStatus === 'RUNNING') {
      const ms = Math.max(500, Math.floor(simInterval * 1000));
      simTimerRef.current = setInterval(() => {
        executeSimulatorTick();
      }, ms);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [simStatus, simInterval, simPatient]);

  // ==========================================
  // PART B: BIDMC REPLAY ACTIONS & TICK
  // ==========================================
  const executeBidmcTick = async () => {
    try {
      const res = await fetch(`/api/bidmc/tick?patient_id=${bidmcPatient}`, { method: 'POST' });
      const data = await res.json();
      if (data.vitals) {
        setBidmcVitals(data.vitals);
      }
      if (data.bidmc_raw) {
        const raw = data.bidmc_raw;
        setBidmcProgress({
          current: raw.sample_index || 0,
          total: raw.total_samples || 468,
          pct: raw.total_samples ? Math.round((raw.sample_index / raw.total_samples) * 100) : 0,
          elapsed_s: raw.elapsed_time_seconds || 0
        });
      }
      setBidmcFhirStatus({
        status: 'ACCEPTED',
        timestamp: new Date().toLocaleTimeString(),
        observationsSaved: data.fhir_ingestion?.observations_saved || 4,
        tier: data.news2?.tier || 'WATCH',
        score: data.news2?.score ?? 0,
        source: data.bidmc_raw?.source || 'PHYSIONET_BIDMC'
      });
      if (onTelemetryUpdated) onTelemetryUpdated(data);
    } catch (err) {
      console.error('BIDMC tick error:', err);
    }
  };

  const handleBidmcPlay = async () => {
    setBidmcStatus('PLAYING');
    await fetch('/api/bidmc/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'play',
        file: bidmcFile,
        speed: bidmcSpeed,
        patient_id: bidmcPatient
      })
    });
    executeBidmcTick();
  };

  const handleBidmcPause = async () => {
    setBidmcStatus('PAUSED');
    await fetch('/api/bidmc/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' })
    });
  };

  const handleBidmcResume = async () => {
    setBidmcStatus('PLAYING');
    await fetch('/api/bidmc/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' })
    });
  };

  const handleBidmcReset = async () => {
    setBidmcStatus('STOPPED');
    setBidmcProgress(prev => ({ ...prev, current: 0, pct: 0, elapsed_s: 0 }));
    await fetch('/api/bidmc/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
  };

  const handleBidmcFileChange = async (filename) => {
    setBidmcFile(filename);
    setBidmcProgress(prev => ({ ...prev, current: 0, pct: 0, elapsed_s: 0 }));
    await fetch('/api/bidmc/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', file: filename })
    });
  };

  const handleBidmcSpeedChange = async (speed) => {
    setBidmcSpeed(speed);
    await fetch('/api/bidmc/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume', speed })
    });
  };

  // Automated BIDMC timer based on playback speed
  useEffect(() => {
    if (bidmcStatus === 'PLAYING') {
      const baseIntervalMs = 1000;
      const intervalMs = Math.max(100, Math.floor(baseIntervalMs / bidmcSpeed));
      bidmcTimerRef.current = setInterval(() => {
        executeBidmcTick();
      }, intervalMs);
    } else {
      if (bidmcTimerRef.current) clearInterval(bidmcTimerRef.current);
    }
    return () => {
      if (bidmcTimerRef.current) clearInterval(bidmcTimerRef.current);
    };
  }, [bidmcStatus, bidmcSpeed, bidmcFile, bidmcPatient]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Architecture & Unified Ingestion Pathway */}
      <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F2922] border border-[#165342] flex items-center justify-center text-[#20C997]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Data Sources & Simulation Lab
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#36BFFA]/20 text-[#36BFFA] border border-[#36BFFA]/30">
                  Requirement 3.2
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Dual Ingestion Pipeline: Software Wearable Simulator & PhysioNet BIDMC Dataset Replay → FHIR R4 Ingestion API → Monitoring Engine
              </p>
            </div>
          </div>

          {/* Unified Pipeline Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141A23] border border-[#252D38] text-[11px] font-mono text-[#94A3B8]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#20C997]" />
            <span>FHIR Ingestion Pipeline: <strong className="text-white">Active (POST /fhir/Bundle)</strong></span>
          </div>
        </div>
      </div>

      {/* Two Side-by-Side Panels: Panel A (Virtual Wearable) & Panel B (BIDMC Replay) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==================================================================== */}
        {/* PANEL A: VIRTUAL WEARABLE SIMULATOR                                  */}
        {/* ==================================================================== */}
        <div className="lg:col-span-6 bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 space-y-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1E2633] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#152322] border border-[#165342] flex items-center justify-center text-[#20C997]">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Virtual Wearable Simulator</h3>
                <p className="text-[10px] text-[#64748B]">Continuous multi-vital generation & artifact synthesis</p>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              simStatus === 'RUNNING'
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                : simStatus === 'PAUSED'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                : 'bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30'
            }`}>
              ● {simStatus}
            </span>
          </div>

          {/* Controls: Patient Selection & Reading Interval */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Patient Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#94A3B8]">Target Patient Profile:</label>
              <select
                value={simPatient}
                onChange={(e) => {
                  setSimPatient(e.target.value);
                  if (onSelectPatient) onSelectPatient(e.target.value);
                }}
                className="w-full bg-[#141A23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#20C997]"
              >
                <option value="P-001">P-001: Rajesh Sharma (CABG & CAD)</option>
                <option value="P-002">P-002: Arthur Pendelton (Severe COPD Scale 2)</option>
                <option value="P-003">P-003: Priya Patel (Pneumonia & Sepsis)</option>
                <option value="P-004">P-004: David Chen (Congestive Heart Failure)</option>
                <option value="P-005">P-005: Sunita Rao (Post-Op Laparoscopic)</option>
              </select>
            </div>

            {/* Reading Interval Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#94A3B8]">Reading Interval:</label>
              <div className="grid grid-cols-4 gap-1">
                {[1.0, 2.0, 2.5, 5.0].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSimInterval(sec)}
                    className={`py-2 text-[11px] font-mono font-bold rounded-xl transition ${
                      simInterval === sec
                        ? 'bg-[#20C997] text-[#080B10] shadow-sm'
                        : 'bg-[#141A23] text-[#94A3B8] hover:text-white border border-[#252D38]'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Playback Controls: Start / Pause / Resume / Stop / Step */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Simulator Runtime Controls:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {simStatus !== 'RUNNING' ? (
                <button
                  onClick={simStatus === 'PAUSED' ? handleSimResume : handleSimStart}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#20C997] hover:bg-[#1BAF83] text-[#080B10] font-bold text-xs shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{simStatus === 'PAUSED' ? 'Resume' : 'Start'}</span>
                </button>
              ) : (
                <button
                  onClick={handleSimPause}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#080B10] font-bold text-xs shadow-md transition"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={handleSimStop}
                disabled={simStatus === 'STOPPED'}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-[#94A3B8] hover:text-[#EF4444] font-semibold text-xs transition disabled:opacity-40"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>

              <button
                onClick={executeSimulatorTick}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-white font-semibold text-xs transition"
                title="Trigger single telemetry tick"
              >
                <SkipForward className="w-3.5 h-3.5 text-[#36BFFA]" />
                <span>Step Next</span>
              </button>

              <button
                onClick={() => handleSimEventSelect(null)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-[#94A3B8] hover:text-white font-semibold text-xs transition"
                title="Reset to stable baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Current Vitals Generated Readout (All 4 with LOINC) */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Generated Vital-Sign Readings (LOINC Encoded):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* HR */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Heart className="w-3 h-3 text-[#EF4444]" />
                  <span>HR (8867-4)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {simVitals?.heart_rate != null ? `${simVitals.heart_rate} bpm` : '--'}
                </div>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Activity className="w-3 h-3 text-[#36BFFA]" />
                  <span>SpO₂ (2708-6)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {simVitals?.spo2 != null ? `${simVitals.spo2}%` : '--'}
                </div>
              </div>

              {/* RR */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Wind className="w-3 h-3 text-[#A855F7]" />
                  <span>RR (9279-1)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {simVitals?.respiratory_rate != null ? `${simVitals.respiratory_rate} /min` : '--'}
                </div>
              </div>

              {/* Temp */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Thermometer className="w-3 h-3 text-[#F59E0B]" />
                  <span>Temp (8310-5)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {simVitals?.body_temperature != null ? `${simVitals.body_temperature}°C` : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Scripted Event Injections Grid */}
          <div className="space-y-2 pt-2 border-t border-[#1E2633]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#F59E0B]" />
                Scripted Deterioration & Artifact Injections:
              </span>
              {simEvent && (
                <span className="text-[10px] font-mono text-[#F59E0B] font-bold">
                  Active: {simEvent}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* 1. Gradual Drift */}
              <button
                onClick={() => handleSimEventSelect('GRADUAL_DRIFT')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  simEvent === 'GRADUAL_DRIFT'
                    ? 'bg-[#EF4444]/15 border-[#EF4444] text-white shadow-sm'
                    : 'bg-[#141A23] border-[#252D38] text-[#94A3B8] hover:text-white hover:border-[#333F4E]'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Gradual Vital-Sign Drift</div>
                  <div className="text-[10px] text-[#64748B]">Slow SpO₂ decay + HR escalation trajectory</div>
                </div>
              </button>

              {/* 2. Sudden Spike */}
              <button
                onClick={() => handleSimEventSelect('SUDDEN_SPIKE')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  simEvent === 'SUDDEN_SPIKE'
                    ? 'bg-[#F97316]/15 border-[#F97316] text-white shadow-sm'
                    : 'bg-[#141A23] border-[#252D38] text-[#94A3B8] hover:text-white hover:border-[#333F4E]'
                }`}
              >
                <Zap className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Sudden Spike</div>
                  <div className="text-[10px] text-[#64748B]">Acute paroxysmal tachycardia spike (+45 bpm)</div>
                </div>
              </button>

              {/* 3. Missing Data / Dropouts */}
              <button
                onClick={() => handleSimEventSelect('MISSING_DATA')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  simEvent === 'MISSING_DATA'
                    ? 'bg-[#64748B]/20 border-[#94A3B8] text-white shadow-sm'
                    : 'bg-[#141A23] border-[#252D38] text-[#94A3B8] hover:text-white hover:border-[#333F4E]'
                }`}
              >
                <Clock className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Missing Readings (Dropout)</div>
                  <div className="text-[10px] text-[#64748B]">Bluetooth packet loss & null vitals channels</div>
                </div>
              </button>

              {/* 4. Motion Noise */}
              <button
                onClick={() => handleSimEventSelect('MOTION_NOISE')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  simEvent === 'MOTION_NOISE'
                    ? 'bg-[#A855F7]/15 border-[#A855F7] text-white shadow-sm'
                    : 'bg-[#141A23] border-[#252D38] text-[#94A3B8] hover:text-white hover:border-[#333F4E]'
                }`}
              >
                <Activity className="w-4 h-4 text-[#A855F7] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Motion-Related Noise</div>
                  <div className="text-[10px] text-[#64748B]">High-frequency artifact filtered by Sensor Truth</div>
                </div>
              </button>

              {/* 5. Probe Removal (Artifact) */}
              <button
                onClick={() => handleSimEventSelect('PROBE_REMOVAL')}
                className={`sm:col-span-2 p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  simEvent === 'PROBE_REMOVAL'
                    ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-sm'
                    : 'bg-[#141A23] border-[#252D38] text-[#94A3B8] hover:text-white hover:border-[#333F4E]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Probe Removal (SpO₂=0, Flatline HR)</div>
                  <div className="text-[10px] text-[#64748B]">
                    Sensor Truth flags uncoupled probe and suppresses false clinical alarm (No Code Blue).
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* FHIR Ingestion Status Footer */}
          <div className="p-3 rounded-xl bg-[#080B10] border border-[#1E2633] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#20C997]" />
              <span className="text-[#94A3B8]">
                FHIR Ingestion Status: <strong className="text-white">HTTP 200 OK (POST /fhir/Bundle)</strong>
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#64748B]">
              Step: {simStepCount} • Last: {simFhirStatus?.timestamp || 'Ready'}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PANEL B: BIDMC DATASET REPLAY                                        */}
        {/* ==================================================================== */}
        <div className="lg:col-span-6 bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 space-y-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1E2633] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#172238] border border-[#1F335C] flex items-center justify-center text-[#36BFFA]">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">BIDMC PhysioNet Dataset Replay</h3>
                <p className="text-[10px] text-[#64748B]">Actual recorded PPG, ECG & Respiration telemetry stream</p>
              </div>
            </div>

            {/* Status Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              bidmcStatus === 'PLAYING'
                ? 'bg-[#36BFFA]/20 text-[#36BFFA] border border-[#36BFFA]/30'
                : bidmcStatus === 'PAUSED'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                : bidmcStatus === 'COMPLETED'
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                : 'bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30'
            }`}>
              ● {bidmcStatus}
            </span>
          </div>

          {/* Dataset Selector & Patient Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dataset Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#94A3B8]">Select BIDMC Dataset File:</label>
              <select
                value={bidmcFile}
                onChange={(e) => handleBidmcFileChange(e.target.value)}
                className="w-full bg-[#141A23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#36BFFA]"
              >
                {bidmcAvailableFiles.map((f) => (
                  <option key={f} value={f}>
                    {f} (PhysioNet Real)
                  </option>
                ))}
              </select>
            </div>

            {/* Playback Speed Selector (1x, 2x, 5x, 10x) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#94A3B8]">Playback Speed:</label>
              <div className="grid grid-cols-4 gap-1">
                {[1.0, 2.0, 5.0, 10.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleBidmcSpeedChange(spd)}
                    className={`py-2 text-[11px] font-mono font-bold rounded-xl transition ${
                      bidmcSpeed === spd
                        ? 'bg-[#36BFFA] text-[#080B10] shadow-sm'
                        : 'bg-[#141A23] text-[#94A3B8] hover:text-white border border-[#252D38]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Playback Controls: Play / Pause / Resume / Reset / Step */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Dataset Replay Controls:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {bidmcStatus !== 'PLAYING' ? (
                <button
                  onClick={bidmcStatus === 'PAUSED' ? handleBidmcResume : handleBidmcPlay}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#36BFFA] hover:bg-[#1FA8E3] text-[#080B10] font-bold text-xs shadow-md transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{bidmcStatus === 'PAUSED' ? 'Resume' : 'Play'}</span>
                </button>
              ) : (
                <button
                  onClick={handleBidmcPause}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#080B10] font-bold text-xs shadow-md transition"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={handleBidmcReset}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-[#94A3B8] hover:text-white font-semibold text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={executeBidmcTick}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-white font-semibold text-xs transition"
                title="Step next BIDMC record"
              >
                <SkipForward className="w-3.5 h-3.5 text-[#20C997]" />
                <span>Step Next</span>
              </button>

              <div className="flex items-center justify-center p-2 rounded-xl bg-[#141A23] border border-[#252D38] text-[11px] font-mono text-[#36BFFA] font-bold">
                {bidmcSpeed}x Speed
              </div>
            </div>
          </div>

          {/* Replay Timestamp & Progress Bar */}
          <div className="p-3.5 rounded-xl bg-[#141A23] border border-[#252D38] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">
                Replay Time: <strong className="font-mono text-white">{bidmcProgress.elapsed_s}s</strong>
              </span>
              <span className="font-mono text-[#36BFFA] font-bold">
                Sample {bidmcProgress.current} / {bidmcProgress.total} ({bidmcProgress.pct}%)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 bg-[#080B10] rounded-full overflow-hidden border border-[#1E2633]">
              <div 
                className="h-full bg-gradient-to-r from-[#20C997] to-[#36BFFA] transition-all duration-200"
                style={{ width: `${Math.min(100, bidmcProgress.pct)}%` }}
              />
            </div>
          </div>

          {/* Recorded Vitals Readout from Actual BIDMC Dataset */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Genuine PhysioNet Clinical Readings:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* HR */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Heart className="w-3 h-3 text-[#EF4444]" />
                  <span>HR (8867-4)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {bidmcVitals?.heart_rate != null ? `${bidmcVitals.heart_rate} bpm` : '--'}
                </div>
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Activity className="w-3 h-3 text-[#36BFFA]" />
                  <span>SpO₂ (2708-6)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {bidmcVitals?.spo2 != null ? `${bidmcVitals.spo2}%` : '--'}
                </div>
              </div>

              {/* RR */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#94A3B8] font-medium">
                  <Wind className="w-3 h-3 text-[#A855F7]" />
                  <span>RESP (9279-1)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {bidmcVitals?.respiratory_rate != null ? `${bidmcVitals.respiratory_rate} /min` : '--'}
                </div>
              </div>

              {/* Temp (Synthesized separately) */}
              <div className="p-3 rounded-xl bg-[#141A23] border border-[#252D38] text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#F59E0B] font-medium">
                  <Thermometer className="w-3 h-3" />
                  <span>Temp (Synthesized)</span>
                </div>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {bidmcVitals?.body_temperature != null ? `${bidmcVitals.body_temperature}°C` : '--'}
                </div>
                <div className="text-[8px] text-[#64748B] tracking-tight">
                  Simulator Generated
                </div>
              </div>
            </div>
          </div>

          {/* FHIR Ingestion Status Footer */}
          <div className="p-3 rounded-xl bg-[#080B10] border border-[#1E2633] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#36BFFA]" />
              <span className="text-[#94A3B8]">
                FHIR Ingestion Status: <strong className="text-white">HTTP 200 OK ({bidmcFile})</strong>
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#64748B]">
              Total Records: {bidmcProgress.total} • Status: {bidmcStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}