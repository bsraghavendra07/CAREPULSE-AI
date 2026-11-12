import React from 'react';
import { NEWS2Score, SuggestedSpecialty } from '../../types/telemetry';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SuggestedSpecialtyCard } from './SuggestedSpecialtyCard';

interface News2ScorePanelProps {
  news2?: NEWS2Score;
  sqiStatus?: string;
  suggestedSpecialty?: SuggestedSpecialty;
}

export function News2ScorePanel({ news2, sqiStatus, suggestedSpecialty }: News2ScorePanelProps) {
  if (!news2) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Awaiting live NEWS2 telemetry...
        </CardContent>
      </Card>
    );
  }

  // Risk styling
  let riskBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let riskIcon = CheckCircle2;
  let actionText = 'Minimum 12-hourly routine ward monitoring response.';

  if (news2.risk_level === 'HIGH') {
    riskBg = 'bg-rose-500/20 text-rose-400 border-rose-500/40 risk-glow-red animate-pulse';
    riskIcon = ShieldAlert;
    actionText = 'URGENT OR EMERGENCY RESPONSE: Immediate critical care review & continuous monitoring.';
  } else if (news2.risk_level === 'MEDIUM') {
    riskBg = 'bg-amber-500/20 text-amber-400 border-amber-500/40 risk-glow-amber';
    riskIcon = AlertTriangle;
    actionText = 'URGENT WARD REVIEW: Urgent assessment by acute care competency clinician (min 1-hourly).';
  } else if (news2.risk_level === 'LOW_MEDIUM') {
    riskBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    riskIcon = AlertCircle;
    actionText = 'SINGLE RED PARAMETER (Score 3): Urgent clinician review to determine escalation.';
  }

  const RiskIcon = riskIcon;

  // Parameter labels
  const paramRows = [
    { key: 'respiration_rate', label: 'Respiration Rate', code: 'RR' },
    { key: 'oxygen_saturation', label: `Oxygen Saturation (${news2.scale_used === 'SCALE_2' ? 'Scale 2' : 'Scale 1'})`, code: 'SpO₂' },
    { key: 'air_or_oxygen', label: 'Air or Oxygen', code: 'O₂' },
    { key: 'systolic_bp', label: 'Systolic Blood Pressure', code: 'BP' },
    { key: 'pulse', label: 'Pulse / Heart Rate', code: 'HR' },
    { key: 'consciousness', label: 'Consciousness (ACVPU)', code: 'ACVPU' },
    { key: 'temperature', label: 'Body Temperature', code: 'Temp' },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-2 border-b border-border bg-card/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold">
                PRIMARY CLINICAL SCORE: NEWS2
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Official Royal College of Physicians (RCP) Dec 2017 Early Warning Score
              </p>
            </div>
          </div>

          <Badge variant="outline" className="font-mono text-xs">
            {news2.scale_used === 'SCALE_2' ? 'SCALE 2 (COPD)' : 'SCALE 1 (STANDARD)'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Main Score Banner */}
        <div className={cn('p-4 rounded-xl border flex items-center justify-between', riskBg)}>
          <div className="flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-card/80 border border-border shadow-inner">
              <span className="text-3xl font-black font-mono tracking-tight">
                {news2.total_score}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <RiskIcon className="h-5 w-5" />
                <span className="text-lg font-bold tracking-tight">
                  {news2.risk_level} RISK
                </span>
                {/* Explicit Triage Tier Badge per Problem Statement */}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wide border',
                    (news2.triage_tier === 'URGENT' || news2.total_score >= 7)
                      ? 'bg-rose-500/30 text-rose-200 border-rose-500/50 animate-pulse'
                      : (news2.triage_tier === 'REVIEW' || news2.total_score >= 5)
                        ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
                        : (news2.triage_tier === 'WATCH' || news2.has_red_score)
                          ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
                  )}
                >
                  TIER: {news2.triage_tier || (news2.total_score >= 7 ? 'URGENT' : (news2.total_score >= 5 ? 'REVIEW' : (news2.has_red_score ? 'WATCH' : 'ROUTINE')))}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-1 max-w-md font-medium">
                {news2.alert_reason || actionText}
              </p>
              <p className="text-[11px] opacity-75 mt-0.5">
                Action: {news2.clinical_action || actionText}
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-semibold opacity-70">
              Aggregate Scale
            </div>
            <div className="text-xs font-mono font-medium">0 to 20 Points</div>
          </div>
        </div>

        {/* Scale 2 Justification Notice */}
        {news2.scale2_prescribed && (
          <div className="bg-sky-500/10 border border-sky-500/30 p-2.5 rounded-lg text-xs text-sky-300 flex items-start space-x-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-400" />
            <div>
              <span className="font-semibold">Documented Scale 2 Prescribed: </span>
              <span>{news2.scale2_justification || 'Hypercapnic respiratory drive (target SpO₂ 88-92%)'}</span>
            </div>
          </div>
        )}

        {/* Red Score Alert Banner */}
        {news2.has_red_score && (
          <div className="bg-rose-500/15 border border-rose-500/40 p-2.5 rounded-lg text-xs text-rose-300 flex items-center space-x-2 animate-pulse">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span>
              <strong>RED SCORE TRIGGER:</strong> Parameter <strong>{news2.red_score_parameter}</strong> scored 3 points. Prompts urgent review regardless of total score.
            </span>
          </div>
        )}

        {/* Advisory Caveat when SQI is low - strictly NOT suppressing */}
        {sqiStatus === 'LOW' && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-300 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">⚠ Signal Quality Concern: </span>
              <span>Sensor telemetry quality is degraded. Clinically significant NEWS2 score is preserved and NOT suppressed. Verify sensor attachment.</span>
            </div>
          </div>
        )}

        {/* Clinical Decision Support: Suggested Specialty for Review */}
        <SuggestedSpecialtyCard
          specialty={suggestedSpecialty || news2.suggested_specialty}
          triageTier={news2.triage_tier}
          sqiStatus={sqiStatus}
        />

        {/* Detailed Sub-Score Breakdown Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground grid grid-cols-12">
            <span className="col-span-8">RCP Physiological Parameter</span>
            <span className="col-span-4 text-right">Sub-Score (0-3)</span>
          </div>
          <div className="divide-y divide-border">
            {paramRows.map((row) => {
              const val = news2.sub_scores[row.key] ?? 0;
              let badgeColor = 'text-emerald-400 bg-emerald-500/10';
              if (val === 3) badgeColor = 'text-rose-400 bg-rose-500/20 font-bold';
              else if (val === 2) badgeColor = 'text-amber-400 bg-amber-500/15';
              else if (val === 1) badgeColor = 'text-amber-300 bg-amber-500/10';

              return (
                <div key={row.key} className="px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <span className="text-foreground font-medium">{row.label}</span>
                  <span className={cn('px-2 py-0.5 rounded font-mono text-xs', badgeColor)}>
                    Score {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

