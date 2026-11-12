import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
import {
  triggerScenario,
  clearScenario,
  setSimulationSpeed,
  fetchActiveScenarios,
} from '../lib/api';
import {
  Flame,
  Play,
  RotateCcw,
  Gauge,
  AlertTriangle,
  Wind,
  Heart,
  Activity,
  CheckCircle2,
  Radio,
  Sliders,
} from 'lucide-react';

interface DeteriorationTestsPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  speedFactor: number;
  onSpeedChange: (speed: number) => void;
  onSelectPatient: (patient: PatientProfile) => void;
}

interface ScenarioDef {
  id: string;
  name: string;
  subtitle: string;
  defaultPatientId: string;
  description: string;
  expectedResponse: string;
  badgeColor: string;
  borderColor: string;
  buttonBg: string;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'sepsis',
    name: 'Sepsis Deterioration',
    subtitle: 'Acute Systemic Inflammatory Response (SIRS)',
    defaultPatientId: 'P-003',
    description:
      'Induces hyperthermia (39.5°C), tachycardia (125 bpm), hypotension (85 mmHg), and tachypnoea (28/min). Triggers NEWS2 Score ≥7 (High Risk).',
    expectedResponse: 'Triggers URGENT clinical escalation and sepsis pathway.',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    borderColor: 'border-rose-500/30 bg-rose-500/5',
    buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
  {
    id: 'copd_exacerbation',
    name: 'COPD Hypoxia',
    subtitle: 'Hypercapnic Respiratory Failure',
    defaultPatientId: 'P-002',
    description:
      'SpO₂ drops progressively to 84% with tachypnoea (26/min). Tests NEWS2 Scale 2 compliance (avoids inappropriate oxygen-overkill scoring).',
    expectedResponse: 'Evaluated under Scale 2 (88-92% target).',
    badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    borderColor: 'border-pink-500/30 bg-pink-500/5',
    buttonBg: 'bg-pink-600 hover:bg-pink-500 text-white',
  },
  {
    id: 'cardiac_decompensation',
    name: 'Slow Deterioration',
    subtitle: 'Post-MI Congestive Heart Failure Decompensation',
    defaultPatientId: 'P-001',
    description:
      'Gradual elevation in heart rate (85 → 115 bpm) and respiratory rate (18 → 24/min) over several minutes. Early anomaly detected by Z-Score engine.',
    expectedResponse: 'Personalized advisory fires ~55 minutes before fixed thresholds.',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    borderColor: 'border-orange-500/30 bg-orange-500/5',
    buttonBg: 'bg-orange-600 hover:bg-orange-500 text-white',
  },
  {
    id: 'motion_artifact',
    name: 'Sensor Artifact',
    subtitle: 'Parkinsonian / Essential Tremor & Motion Storm',
    defaultPatientId: 'P-004',
    description:
      'Injects erratic high-frequency optical motion noise into SpO₂ and HR waveforms. Demonstrates conservative Signal Quality Index (SQI) filtering.',
    expectedResponse: 'SQI drops to POOR; artifact flag raised without suppressing true alerts.',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    borderColor: 'border-amber-500/30 bg-amber-500/5',
    buttonBg: 'bg-amber-600 hover:bg-amber-500 text-black',
  },
  {
    id: 'sensor_disconnect',
    name: 'Sensor Disconnect',
    subtitle: 'Lead Fall-Off / Probe Detachment',
    defaultPatientId: 'P-001',
    description:
      'Sensor readings flatline to zero (HR=0, SpO₂=0). Tests discrimination between genuine cardiac arrest flatline vs mechanical lead detachment.',
    expectedResponse: 'Flags Technical Fault / Probe Detachment (SQI LOW).',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    borderColor: 'border-purple-500/30 bg-purple-500/5',
    buttonBg: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
  {
    id: 'normal_recovery',
    name: 'Stable Recovery',
    subtitle: 'Uncomplicated Post-Arthroplasty Recovery',
    defaultPatientId: 'P-005',
    description:
      'Maintains clean physiological homeostasis (HR ~68, SpO₂ ~98%, Temp ~36.5°C). Demonstrates zero false alarms in a recovering post-op patient.',
    expectedResponse: 'NEWS2 Score = 0 (ROUTINE), Recovery Index = 100%.',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    borderColor: 'border-emerald-500/30 bg-emerald-500/5',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-black font-bold',
  },
];

export function DeteriorationTestsPage({
  patients,
  latestTicks,
  speedFactor,
  onSpeedChange,
  onSelectPatient,
}: DeteriorationTestsPageProps) {
  const [activeScenarios, setActiveScenarios] = useState<Record<string, string | null>>({});
  const [selectedPatients, setSelectedPatients] = useState<Record<string, string>>({
    sepsis: 'P-003',
    copd_exacerbation: 'P-002',
    cardiac_decompensation: 'P-001',
    motion_artifact: 'P-004',
    sensor_disconnect: 'P-001',
    normal_recovery: 'P-005',
  });
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const refreshActive = async () => {
    try {
      const data = await fetchActiveScenarios();
      setActiveScenarios(data);
    } catch {}
  };

  useEffect(() => {
    refreshActive();
    const interval = setInterval(refreshActive, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (scId: string) => {
    const pid = selectedPatients[scId] || 'P-001';
    try {
      await triggerScenario(pid, scId);
      setActionFeedback(`Successfully injected ${scId} onto Patient ${pid}`);
      refreshActive();
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    }
  };

  const handleReset = async (pid: string) => {
    try {
      await clearScenario(pid);
      setActionFeedback(`Cleared all active scenarios for Patient ${pid}`);
      refreshActive();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    }
  };

  const handleResetAll = async () => {
    for (const p of patients) {
      await clearScenario(p.id);
    }
    setActionFeedback('Reset all scenarios across entire ward.');
    refreshActive();
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <Flame className="h-5 w-5 text-orange-400" />
            <span>Clinical Deterioration Simulation Deck</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time acute scenario injection into continuous physiological streams (Requirement 6)
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          {/* Simulation Speed */}
          <div className="flex items-center space-x-2 bg-[#11151f] border border-[#1e2433] px-3 py-1.5 rounded-xl text-xs">
            <Gauge className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400 font-medium">Speed:</span>
            <div className="flex items-center space-x-1">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    speedFactor === s
                      ? 'bg-emerald-500 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Reset All */}
          <button
            onClick={handleResetAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Entire Ward</span>
          </button>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>✓ {actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 6 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SCENARIOS.map((sc) => {
          const targetPid = selectedPatients[sc.id] || sc.defaultPatientId;
          const isActive = activeScenarios[targetPid] === sc.id;
          const targetPatient = patients.find((p) => p.id === targetPid);
          const currentTick = latestTicks[targetPid];
          const score = currentTick?.news2?.total_score ?? 0;

          return (
            <div
              key={sc.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all space-y-4 shadow-sm ${
                isActive
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                  : sc.borderColor
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sc.badgeColor}`}>
                      Scenario {sc.name}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{sc.name}</h3>
                    <div className="text-[11px] text-slate-400 font-medium">{sc.subtitle}</div>
                  </div>

                  {isActive && (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                      <span>RUNNING</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{sc.description}</p>

                <div className="rounded-xl bg-[#0c1017] border border-[#1a1f2c] p-2.5 text-[11px] text-slate-400 space-y-1">
                  <div><strong>Expected:</strong> {sc.expectedResponse}</div>
                  {isActive && (
                    <div className="text-emerald-400 font-mono font-bold pt-1">
                      Active Telemetry NEWS2 Score: {score} pts ({currentTick?.news2?.triage_tier})
                    </div>
                  )}
                </div>

                {/* Target Patient Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Target Patient</label>
                  <select
                    value={targetPid}
                    onChange={(e) =>
                      setSelectedPatients((prev) => ({
                        ...prev,
                        [sc.id]: e.target.value,
                      }))
                    }
                    className="w-full h-8 rounded-lg border border-[#1e2433] bg-[#11151f] px-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id}) — {p.condition}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  onClick={() => handleTrigger(sc.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 ${sc.buttonBg}`}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isActive ? 'Re-Inject' : 'Trigger Scenario'}</span>
                </button>

                {isActive && (
                  <button
                    onClick={() => handleReset(targetPid)}
                    className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    title="Clear Scenario"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
