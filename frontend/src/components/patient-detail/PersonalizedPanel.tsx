import React from 'react';
import { PersonalizedInsight, MLAnomalyPrediction } from '../../types/telemetry';
import { PatientProfile } from '../../types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Sparkles, Info, AlertTriangle, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PersonalizedPanelProps {
  personalized?: PersonalizedInsight;
  mlAnomaly?: MLAnomalyPrediction;
  patient: PatientProfile;
}

export function PersonalizedPanel({ personalized, mlAnomaly, patient }: PersonalizedPanelProps) {
  if (!personalized) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          Calibrating patient baseline...
        </CardContent>
      </Card>
    );
  }

  const zScores = personalized.z_scores || {};
  const baseline = personalized.baseline || {};
  const trends = personalized.trends || {};
  const gradualAlert = personalized.gradual_deterioration;

  const getTrendColor = (trend?: string, isDeteriorating?: boolean) => {
    if (isDeteriorating) return 'text-rose-400 font-bold';
    if (!trend || trend.includes('Insufficient')) return 'text-slate-500';
    if (trend.includes('↓')) return 'text-amber-400';
    if (trend.includes('↑')) return 'text-sky-400';
    return 'text-emerald-400';
  };

  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-2 border-b border-border bg-card/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <div>
              <CardTitle className="text-base font-bold">
                PATIENT BASELINE & PERSONALIZATION
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Personalization Rule 2: Individual rolling baseline & gradual trend detection
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
            Personalization Layer
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5">
        {/* Important Clinical Notice distinguishing NEWS2 from Personalized Baseline */}
        <div className="bg-muted/40 p-2.5 rounded-lg border border-border text-[11px] text-muted-foreground flex items-start space-x-2">
          <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
          <span>
            This engine tracks each patient's individual rolling baseline. It identifies <strong>gradual deterioration</strong> over time, distinct from acute NEWS2 scores, and <strong>never suppresses clinical safety alerts</strong>.
          </span>
        </div>

        {/* Gradual Deterioration Alert Banner */}
        {gradualAlert?.detected ? (
          <div className="bg-rose-500/15 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-200 space-y-1.5 animate-pulse">
            <div className="flex items-center space-x-2 text-rose-300 font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{gradualAlert.alert_message}</span>
            </div>
            <p className="text-[11px] text-slate-300">
              {gradualAlert.clinical_explanation}
            </p>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-rose-500/30 italic">
              {gradualAlert.distinction_disclaimer}
            </div>
          </div>
        ) : personalized.is_advisory_alert ? (
          <div className="bg-amber-500/15 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">Personalized Anomaly Alert: </span>
              <span>Significant multi-sigma baseline shift detected in {personalized.alert_parameters.join(', ')}.</span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Vital trajectories conform to this patient's documented recovery baseline.</span>
          </div>
        )}

        {/* Narrative Clinical Advisory Note */}
        {personalized.advisory_note && !gradualAlert?.detected && (
          <div className="p-2.5 bg-card rounded-lg border border-border text-xs italic text-foreground">
            "{personalized.advisory_note}"
          </div>
        )}

        {/* ── Section: PATIENT BASELINE (Requirement 14) ── */}
        <div className="rounded-xl border border-border bg-[#0f141f] p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <span>PATIENT BASELINE</span>
              <span className="text-[10px] text-slate-400 font-normal">(Rolling Window)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Sliding Analysis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* SpO2 Baseline Card */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-border/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-400 text-xs">SpO₂</span>
                <span className={cn('text-[11px] font-mono font-semibold', getTrendColor(trends.spo2?.trend_direction, trends.spo2?.is_deteriorating))}>
                  Trend: {trends.spo2?.trend_direction || '→ Stable'}
                </span>
              </div>
              {trends.spo2 && trends.spo2.status !== 'Insufficient historical data' ? (
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Baseline:</span>
                    <span className="font-mono text-white">{trends.spo2.baseline_mean?.toFixed(1) || patient.baseline.oxygen_saturation}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current:</span>
                    <span className="font-mono text-white font-bold">{trends.spo2.current_value?.toFixed(1) || '—'}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic py-1">
                  Baseline: {patient.baseline.oxygen_saturation}% • Insufficient historical data
                </div>
              )}
            </div>

            {/* HR Baseline Card */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-border/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs">HR</span>
                <span className={cn('text-[11px] font-mono font-semibold', getTrendColor(trends.hr?.trend_direction, trends.hr?.is_deteriorating))}>
                  Trend: {trends.hr?.trend_direction || '→ Stable'}
                </span>
              </div>
              {trends.hr && trends.hr.status !== 'Insufficient historical data' ? (
                <div className="text-[11px] text-slate-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Baseline:</span>
                    <span className="font-mono text-white">{trends.hr.baseline_mean?.toFixed(0) || patient.baseline.heart_rate} bpm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current:</span>
                    <span className="font-mono text-white font-bold">{trends.hr.current_value?.toFixed(0) || '—'} bpm</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic py-1">
                  Baseline: {patient.baseline.heart_rate} bpm • Insufficient historical data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Z-Score & Statistical Baseline Matrix */}
        <div className="rounded-lg border border-border overflow-hidden text-xs">
          <div className="bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground grid grid-cols-12">
            <span className="col-span-5">Parameter</span>
            <span className="col-span-4 text-center">Baseline (μ)</span>
            <span className="col-span-3 text-right">Z-Score</span>
          </div>
          <div className="divide-y divide-border">
            {/* Heart Rate */}
            <div className="px-3 py-2 grid grid-cols-12 items-center">
              <span className="col-span-5 font-medium">Heart Rate</span>
              <span className="col-span-4 text-center font-mono">
                {baseline.heart_rate?.toFixed(1) || patient.baseline.heart_rate} bpm
              </span>
              <span className={cn('col-span-3 text-right font-mono font-bold', getZColor(zScores.heart_rate))}>
                {formatZ(zScores.heart_rate)}
              </span>
            </div>

            {/* SpO2 */}
            <div className="px-3 py-2 grid grid-cols-12 items-center">
              <span className="col-span-5 font-medium">Oxygen Saturation</span>
              <span className="col-span-4 text-center font-mono">
                {baseline.oxygen_saturation?.toFixed(1) || patient.baseline.oxygen_saturation}%
              </span>
              <span className={cn('col-span-3 text-right font-mono font-bold', getZColor(zScores.oxygen_saturation))}>
                {formatZ(zScores.oxygen_saturation)}
              </span>
            </div>

            {/* Respiratory Rate */}
            <div className="px-3 py-2 grid grid-cols-12 items-center">
              <span className="col-span-5 font-medium">Respiration Rate</span>
              <span className="col-span-4 text-center font-mono">
                {baseline.respiratory_rate?.toFixed(1) || patient.baseline.respiratory_rate} /min
              </span>
              <span className={cn('col-span-3 text-right font-mono font-bold', getZColor(zScores.respiratory_rate))}>
                {formatZ(zScores.respiratory_rate)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Unsupervised ML Model: Isolation Forest ── */}
        <div className="rounded-xl border border-[#222a3d] bg-[#0c1017] p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>ML Isolation Forest</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">v1.0</span>
                </div>
                <div className="text-[10px] text-slate-400">Trained on BIDMC Continuous Physiological Observations</div>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                mlAnomaly?.is_anomaly
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {mlAnomaly?.anomaly_level || 'NORMAL'}
              </span>
            </div>
          </div>

          {/* Anomaly Score Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Multivariate Anomaly Score:</span>
              <span className="font-mono font-bold text-white">
                {mlAnomaly?.anomaly_score !== undefined ? mlAnomaly.anomaly_score.toFixed(3) : '0.250'} / 1.000
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#161c28] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (mlAnomaly?.anomaly_score ?? 0.25) > 0.65
                    ? 'bg-rose-500'
                    : (mlAnomaly?.anomaly_score ?? 0.25) > 0.40
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, ((mlAnomaly?.anomaly_score ?? 0.25) * 100))}%` }}
              />
            </div>
          </div>

          {/* Deviating Features if any */}
          {mlAnomaly?.top_deviating_features && mlAnomaly.top_deviating_features.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-semibold text-slate-400">Multivariate Deviations:</div>
              <div className="flex flex-wrap gap-1">
                {mlAnomaly.top_deviating_features.map((f, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-[#161d2a] text-amber-300 border border-[#232f47]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strict Clinical Safety Disclaimer */}
          <div className="text-[10px] text-slate-400 bg-[#090d14] p-2 rounded-lg border border-[#182030] leading-relaxed">
            <span className="text-slate-300 font-semibold">Honest AI Note: </span>
            <span>
              Unsupervised Anomaly Score measures multivariate statistical distance from physiological baseline patterns.
              This is <strong>NOT a clinical deterioration probability or diagnosis</strong> and never modifies NEWS2.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatZ(val?: number): string {
  if (val === undefined || isNaN(val)) return '0.00σ';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}σ`;
}

function getZColor(val?: number): string {
  if (val === undefined || isNaN(val)) return 'text-muted-foreground';
  if (Math.abs(val) >= 2.0) return 'text-amber-400';
  return 'text-emerald-400';
}

