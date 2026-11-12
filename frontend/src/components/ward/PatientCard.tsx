import React from 'react';
import { PatientProfile } from '../../types/patient';
import { TelemetryTick } from '../../types/telemetry';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ProvenanceBadge } from '../patient-detail/ProvenanceBadge';
import { Heart, Activity, AlertTriangle, Wind, Thermometer, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PatientCardProps {
  patient: PatientProfile;
  latestTick?: TelemetryTick;
  isSelected: boolean;
  onSelect: () => void;
  activeScenario?: string | null;
}

export function PatientCard({
  patient,
  latestTick,
  isSelected,
  onSelect,
  activeScenario,
}: PatientCardProps) {
  const news2 = latestTick?.news2;
  const vitals = latestTick?.vitals;
  const sqi = latestTick?.signal_quality;
  const personalized = latestTick?.personalized;

  // Calculate age from birthDate
  const age = patient.birthDate
    ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
    : '--';

  // Determine risk variant
  let riskVariant: 'risk-low' | 'risk-medium' | 'risk-high' = 'risk-low';
  let riskGlow = 'border-border';
  if (news2?.risk_level === 'HIGH') {
    riskVariant = 'risk-high';
    riskGlow = 'border-rose-500/70 risk-glow-red';
  } else if (news2?.risk_level === 'MEDIUM' || news2?.risk_level === 'LOW_MEDIUM') {
    riskVariant = 'risk-medium';
    riskGlow = 'border-amber-500/60 risk-glow-amber';
  } else {
    riskGlow = 'border-emerald-500/30';
  }

  // SQI variant
  let sqiVariant: 'sqi-high' | 'sqi-medium' | 'sqi-low' = 'sqi-high';
  if (sqi?.status === 'LOW') sqiVariant = 'sqi-low';
  else if (sqi?.status === 'MEDIUM') sqiVariant = 'sqi-medium';

  return (
    <Card
      onClick={onSelect}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:border-primary/50 relative overflow-hidden',
        isSelected ? 'ring-2 ring-primary border-transparent' : riskGlow
      )}
    >
      {/* Top Banner for active scenario */}
      {activeScenario && (
        <div className="bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold px-4 py-1 flex items-center justify-between border-b border-amber-500/30">
          <span className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3 animate-pulse" />
            <span>SCENARIO ACTIVE: {activeScenario.toUpperCase()}</span>
          </span>
          <span className="text-[10px] opacity-75">TICK #{latestTick?.tick_number ?? 0}</span>
        </div>
      )}

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {patient.id}
              </span>
              <CardTitle className="text-base font-bold">{patient.name}</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center space-x-2">
              <span>{age} y/o {patient.gender}</span>
              <span>•</span>
              <span className="truncate max-w-[200px]" title={patient.condition}>
                {patient.condition}
              </span>
            </p>
          </div>

          {/* NEWS2 Score Badge */}
          <div className="text-right">
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                NEWS2
              </div>
              <Badge variant={riskVariant} className="text-sm px-2.5 py-0.5 font-bold font-mono">
                {news2 !== undefined ? news2.total_score : '--'}
              </Badge>
              <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                {news2?.risk_level || 'WAITING'}
              </div>
            </div>
          </div>
        </div>

        {/* Indicators Row */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {patient.scale2_prescribed ? (
            <Badge variant="secondary" className="text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
              Scale 2 (COPD Target 88-92%)
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Scale 1 Standard
            </Badge>
          )}

          {news2?.has_red_score && (
            <Badge variant="risk-high" className="text-[10px]">
              Red Score: {news2.red_score_parameter} = 3
            </Badge>
          )}

          {sqi && (
            <Badge variant={sqiVariant} className="text-[10px]">
              SQI: {sqi.status} ({(sqi.sqi * 100).toFixed(0)}%)
            </Badge>
          )}

          {personalized?.is_advisory_alert && (
            <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Advisory Anomaly
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {/* Core Vitals Grid */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border mt-2">
          {/* Heart Rate */}
          <div className="bg-muted/40 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <Heart className="h-3 w-3 text-rose-400" />
              <span className="text-[10px]">HR</span>
            </div>
            <div className="text-base font-bold font-mono">
              {vitals?.heart_rate?.value !== undefined ? String(vitals.heart_rate.value) : '--'}
            </div>
            <div className="mt-1">
              {vitals?.heart_rate?.source && (
                <ProvenanceBadge source={vitals.heart_rate.source} />
              )}
            </div>
          </div>

          {/* SpO2 */}
          <div className="bg-muted/40 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <Activity className="h-3 w-3 text-sky-400" />
              <span className="text-[10px]">SpO₂</span>
            </div>
            <div className="text-base font-bold font-mono">
              {vitals?.oxygen_saturation?.value !== undefined
                ? `${vitals.oxygen_saturation.value}%`
                : '--'}
            </div>
            <div className="mt-1">
              {vitals?.oxygen_saturation?.source && (
                <ProvenanceBadge source={vitals.oxygen_saturation.source} />
              )}
            </div>
          </div>

          {/* Respiratory Rate */}
          <div className="bg-muted/40 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <Wind className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px]">RR</span>
            </div>
            <div className="text-base font-bold font-mono">
              {vitals?.respiratory_rate?.value !== undefined
                ? String(vitals.respiratory_rate.value)
                : '--'}
            </div>
            <div className="mt-1">
              {vitals?.respiratory_rate?.source && (
                <ProvenanceBadge source={vitals.respiratory_rate.source} />
              )}
            </div>
          </div>

          {/* Systolic BP */}
          <div className="bg-muted/40 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <span className="text-[10px] font-bold">BP</span>
            </div>
            <div className="text-base font-bold font-mono">
              {vitals?.systolic_bp?.value !== undefined
                ? String(vitals.systolic_bp.value)
                : '--'}
            </div>
            <div className="mt-1">
              {vitals?.systolic_bp?.source && (
                <ProvenanceBadge source={vitals.systolic_bp.source} />
              )}
            </div>
          </div>
        </div>

        {/* Advisory / Clinical Note */}
        {personalized?.advisory_note && (
          <p className="text-[11px] text-muted-foreground mt-3 italic line-clamp-1">
            "{personalized.advisory_note}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}

