import React, { useState } from 'react';
import { PatientProfile } from '../../types/patient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  triggerScenario,
  clearScenario,
  setSimulationSpeed,
} from '../../lib/api';
import {
  FlaskConical,
  Flame,
  Wind,
  HeartCrack,
  Activity,
  Unplug,
  RotateCcw,
  Zap,
  Gauge,
  CheckCircle,
} from 'lucide-react';

interface ScenarioControllerProps {
  patients: PatientProfile[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  activeScenarios: Record<string, string | null>;
  onScenarioUpdated: () => void;
  currentSpeed: number;
  onSpeedUpdated: (speed: number) => void;
}

export function ScenarioController({
  patients,
  selectedPatientId,
  onSelectPatient,
  activeScenarios,
  onScenarioUpdated,
  currentSpeed,
  onSpeedUpdated,
}: ScenarioControllerProps) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const activeScenario = selectedPatient ? activeScenarios[selectedPatient.id] : null;

  const scenarios = [
    {
      id: 'sepsis',
      name: 'Acute Septic Shock',
      icon: Flame,
      color: 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10',
      description: 'Temp ramps to 39.5°C, HR rises to 125 bpm, BP drops to 85 mmHg systolic, RR escalates to 28 /min.',
      expected: 'Escalates NEWS2 to HIGH (≥7). Tests emergency escalation.',
    },
    {
      id: 'copd_exacerbation',
      name: 'COPD Hypoxic Exacerbation',
      icon: Wind,
      color: 'border-sky-500/40 text-sky-400 hover:bg-sky-500/10',
      description: 'SpO₂ drops progressively to 84%, RR increases to 26 /min.',
      expected: 'Evaluates Scale 2 vs Scale 1 differentiation on Margaret Chen (P-002).',
    },
    {
      id: 'cardiac_decompensation',
      name: 'Acute Heart Failure Decompensation',
      icon: HeartCrack,
      color: 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10',
      description: 'Tachycardia (HR 135 bpm), progressive hypotension (BP 88 mmHg), tachypnea (RR 24 /min).',
      expected: 'Triggers dual Red Score triggers (HR ≥131 and SBP ≤90).',
    },
    {
      id: 'motion_artifact',
      name: 'Severe Motion Artifact Storm',
      icon: Activity,
      color: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10',
      description: 'Injects high-frequency mechanical vibration and erratic optical sensor noise for 60 seconds.',
      expected: 'Tests SQI filter. Advisory flagged; genuine deterioration NOT suppressed.',
    },
    {
      id: 'sensor_disconnect',
      name: 'Lead Detachment / Flatline',
      icon: Unplug,
      color: 'border-slate-500/40 text-slate-400 hover:bg-slate-500/10',
      description: 'Telemetry values freeze at constant reading, then drop to zero.',
      expected: 'Flags sensor disconnect in SQI panel without triggering clinical code alarm.',
    },
    {
      id: 'normal_recovery',
      name: 'Return to Baseline Recovery',
      icon: RotateCcw,
      color: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10',
      description: 'Gradually relaxes all vital signs back to patient-specific resting baseline values.',
      expected: 'Confirms stability, NEWS2 drops back to 0.',
    },
  ];

  const handleTrigger = async (scenarioId: string) => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      await triggerScenario(selectedPatient.id, scenarioId);
      setStatusMsg(`Triggered "${scenarioId}" on ${selectedPatient.name}`);
      onScenarioUpdated();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      await clearScenario(selectedPatient.id);
      setStatusMsg(`Cleared active scenario on ${selectedPatient.name}`);
      onScenarioUpdated();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeed = async (factor: number) => {
    try {
      await setSimulationSpeed(factor);
      onSpeedUpdated(factor);
      setStatusMsg(`Simulation speed set to ${factor}x`);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Patient Selector */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center space-x-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                <span>Clinical Deterioration Simulator & Replay Deck</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select a patient to inject physiological stressors, exacerbations, or sensor faults
              </CardDescription>
            </div>

            {/* Speed Controls */}
            <div className="flex items-center space-x-2 bg-muted/50 p-1.5 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground flex items-center space-x-1 pl-1">
                <Gauge className="h-3.5 w-3.5" />
                <span>Replay:</span>
              </span>
              {[1, 2, 5, 10].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={currentSpeed === s ? 'default' : 'ghost'}
                  onClick={() => handleSpeed(s)}
                  className="h-7 px-2.5 text-xs font-mono font-bold"
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {patients.map((p) => {
              const active = activeScenarios[p.id];
              const isSel = p.id === selectedPatient?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id)}
                  className={`px-3 py-2 rounded-lg text-left border transition-all text-xs flex items-center space-x-2 ${
                    isSel
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                      : 'border-border bg-card/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center space-x-1.5">
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] opacity-70">({p.id})</span>
                    </div>
                    <div className="text-[10px] opacity-75 truncate max-w-[140px]">
                      {p.condition}
                    </div>
                  </div>
                  {active && (
                    <Badge variant="risk-medium" className="text-[9px] uppercase tracking-wider ml-1">
                      {active}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPatient && (
            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-foreground">Target: {selectedPatient.name}</span>
                <span>•</span>
                <span className="text-muted-foreground">{selectedPatient.condition}</span>
                <span>•</span>
                <span className="text-muted-foreground">
                  {selectedPatient.scale2_prescribed ? 'Prescribed Scale 2' : 'Scale 1 Standard'}
                </span>
                {activeScenario && (
                  <Badge variant="risk-medium" className="text-xs">
                    ACTIVE: {activeScenario.toUpperCase()}
                  </Badge>
                )}
              </div>

              {activeScenario && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClear}
                  disabled={loading}
                  className="h-7 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                >
                  Clear Active Scenario
                </Button>
              )}
            </div>
          )}

          {statusMsg && (
            <div className="mt-2 text-xs text-emerald-400 font-mono">
              ✓ {statusMsg}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isCurrentlyActive = activeScenario === sc.id;

          return (
            <Card
              key={sc.id}
              className={`border transition-all flex flex-col justify-between ${
                isCurrentlyActive
                  ? 'ring-2 ring-amber-400 border-transparent bg-amber-500/10'
                  : 'hover:border-primary/40'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-bold">{sc.name}</CardTitle>
                  </div>
                  {isCurrentlyActive && (
                    <Badge variant="risk-medium" className="text-[10px]">
                      RUNNING
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-2 text-foreground/80 leading-relaxed">
                  {sc.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                <div className="rounded bg-muted/60 p-2 text-[11px] text-muted-foreground border border-border">
                  <strong className="text-foreground">Clinical Goal: </strong>
                  {sc.expected}
                </div>

                <Button
                  onClick={() => handleTrigger(sc.id)}
                  disabled={loading || isCurrentlyActive}
                  variant={isCurrentlyActive ? 'secondary' : 'default'}
                  className="w-full text-xs font-semibold"
                >
                  {isCurrentlyActive ? 'Scenario Running...' : `Inject ${sc.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

