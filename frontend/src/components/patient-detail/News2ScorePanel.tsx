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

  // Parameter rows mapped to standard NEWS2 components
  const paramRows = [
    { key: 'respiration_rate', compKey: 'respiratory_rate', label: 'Respiratory Rate', code: 'RR' },
    { key: 'spo2', compKey: 'spo2', label: 'Oxygen Saturation', code: 'SpO₂' },
    { key: 'pulse', compKey: 'heart_rate', label: 'Heart Rate', code: 'HR' },
    { key: 'temperature', compKey: 'temperature', label: 'Body Temperature', code: 'Temp' },
    { key: 'systolic_bp', compKey: 'systolic_bp', label: 'Systolic Blood Pressure', code: 'BP' },
    { key: 'consciousness', compKey: 'consciousness', label: 'Consciousness (ACVPU)', code: 'ACVPU' },
    { key: 'supplemental_oxygen', compKey: 'supplemental_oxygen', label: 'Supplemental Oxygen', code: 'Oxygen' },
  ];

  const isScale2 = news2.scale_used === 'SCALE_2' || news2.scale2_prescribed;
  const targetRange = news2.target_spo2_range || (isScale2 ? '88–92%' : '≥96%');

  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-2 border-b border-border bg-card/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold">
                NEWS2 EARLY WARNING SCORE
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Official Royal College of Physicians (RCP) Dec 2017 Baseline Scoring Engine
              </p>
            </div>
          </div>

          <div className="text-right">
            <Badge
              variant="outline"
              className={cn(
                'font-mono text-xs font-bold',
                isScale2
                  ? 'bg-pink-500/15 text-pink-300 border-pink-500/40'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              )}
            >
              {isScale2 ? 'SpO₂ SCALE: 2' : 'SpO₂ SCALE: 1'}
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Target: {targetRange}
            </div>
          </div>
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

        {/* Personalization Rule 1 — SpO2 Scale 2 Display Card */}
        <div className={cn(
          'p-3 rounded-xl border text-xs space-y-1',
          isScale2
            ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
            : 'bg-muted/40 border-border text-slate-300'
        )}>
          <div className="flex items-center justify-between font-semibold">
            <div className="flex items-center space-x-1.5">
              <Info className={cn('h-4 w-4', isScale2 ? 'text-sky-400' : 'text-slate-400')} />
              <span>Personalization Rule 1: SpO₂ Scale</span>
            </div>
            <span className="font-mono px-2 py-0.5 rounded bg-black/40 border border-border">
              {isScale2 ? 'SpO₂ Scale: Scale 2' : 'SpO₂ Scale: Scale 1'}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-border/40">
            <span>Target: <strong className="text-white font-mono">{targetRange}</strong></span>
            <span>
              {isScale2
                ? 'Reason: Hypercapnic respiratory failure documented'
                : 'Reason: Standard post-discharge recovery target'}
            </span>
          </div>
        </div>

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

        {/* 1. Alert Explanation: "Why did it alert?" Section */}
        {(news2.total_score > 0 || news2.has_red_score || news2.triage_tier !== 'ROUTINE') && (
          <div className="rounded-xl border border-[#252F40] bg-[#151C2B] p-4 text-[#F1F5F9] space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#252F40] pb-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Why did it alert? (NEWS2 Score: {news2.total_score})
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {news2.triage_tier || 'REVIEW'} TRIGGER
              </span>
            </div>

            {/* Primary Contributors List */}
            {news2.primary_contributors && news2.primary_contributors.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">Primary contributors:</div>
                <ul className="text-xs text-slate-200 list-disc list-inside space-y-0.5 pl-1">
                  {news2.primary_contributors.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Personalization Applied Explanation */}
            {isScale2 && (
              <div className="p-2 rounded bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                <strong>Personalization applied:</strong> SpO₂ Scale 2 selected because hypercapnic respiratory failure is documented for this patient (target range 88–92%).
              </div>
            )}

            <div className="pt-2 border-t border-[#252F40]/60 text-[11px] text-[#94A3B8] flex items-center justify-between">
              <span>Required Clinical Action: <strong className="text-slate-200 font-medium">{news2.clinical_action || actionText}</strong></span>
              <span className="font-mono text-slate-400">Score: {news2.total_score}</span>
            </div>
          </div>
        )}

        {/* 2. Suggested Specialty for Review — placed DIRECTLY BELOW "Why did it alert?" */}
        <SuggestedSpecialtyCard
          specialty={suggestedSpecialty || news2.suggested_specialty}
          triageTier={news2.triage_tier}
          sqiStatus={sqiStatus}
        />

        {/* Detailed 7-Component Sub-Score Breakdown Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground grid grid-cols-12">
            <span className="col-span-8">NEWS2 Component Parameter</span>
            <span className="col-span-4 text-right">Sub-Score (0-3)</span>
          </div>
          <div className="divide-y divide-border">
            {paramRows.map((row) => {
              // Try components map first, then sub_scores map
              let val: number | null | undefined = undefined;
              if (news2.components && row.compKey in news2.components) {
                val = news2.components[row.compKey];
              } else if (news2.sub_scores) {
                val = news2.sub_scores[row.key] ?? news2.sub_scores[row.code.toLowerCase()];
              }

              const isMissing = val === null || val === undefined;
              let badgeColor = 'text-emerald-400 bg-emerald-500/10';
              if (val === 3) badgeColor = 'text-rose-400 bg-rose-500/20 font-bold';
              else if (val === 2) badgeColor = 'text-amber-400 bg-amber-500/15';
              else if (val === 1) badgeColor = 'text-amber-300 bg-amber-500/10';

              return (
                <div key={row.key} className="px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-foreground font-medium">{row.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">({row.code})</span>
                  </div>
                  {isMissing ? (
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                      No observation available
                    </span>
                  ) : (
                    <span className={cn('px-2 py-0.5 rounded font-mono text-xs', badgeColor)}>
                      {val}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

