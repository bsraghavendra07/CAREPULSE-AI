import React from 'react';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';
import { PatientCard } from './PatientCard';
import { Badge } from '../ui/badge';
import { Users, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface WardOverviewProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  activeScenarios?: Record<string, string | null>;
}

export function WardOverview({
  patients,
  latestTicks,
  selectedPatientId,
  onSelectPatient,
  activeScenarios = {},
}: WardOverviewProps) {
  // Aggregate stats
  const total = patients.length;
  let highRisk = 0;
  let mediumRisk = 0;
  let lowRisk = 0;

  patients.forEach((p) => {
    const tick = latestTicks[p.id];
    const risk = tick?.news2?.risk_level;
    if (risk === 'HIGH') highRisk++;
    else if (risk === 'MEDIUM' || risk === 'LOW_MEDIUM') mediumRisk++;
    else lowRisk++;
  });

  return (
    <div className="space-y-6">
      {/* Top Ward Census Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Post-Discharge Remote Patient Census</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continuous real-time physiological telemetry & NEWS2 deterioration surveillance
          </p>
        </div>

        {/* Quick Triage Counters */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            <span>{lowRisk} Low Risk</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-amber-400 text-xs font-semibold">
            <AlertCircle className="h-4 w-4" />
            <span>{mediumRisk} Medium</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg text-rose-400 text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 animate-pulse" />
            <span>{highRisk} High Risk</span>
          </div>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            latestTick={latestTicks[patient.id]}
            isSelected={selectedPatientId === patient.id}
            onSelect={() => onSelectPatient(patient.id)}
            activeScenario={activeScenarios[patient.id]}
          />
        ))}
      </div>
    </div>
  );
}

