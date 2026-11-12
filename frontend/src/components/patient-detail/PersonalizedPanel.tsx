import React from 'react';
import { PersonalizedInsight } from '../../types/telemetry';
import { PatientProfile } from '../../types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Sparkles, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PersonalizedPanelProps {
  personalized?: PersonalizedInsight;
  patient: PatientProfile;
}

export function PersonalizedPanel({ personalized, patient }: PersonalizedPanelProps) {
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

  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-2 border-b border-border bg-card/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <div>
              <CardTitle className="text-base font-bold">
                ADVISORY: Personalized Insights
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Statistical Z-Score baseline deviation (does NOT suppress NEWS2)
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Advisory Layer
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Important Clinical Notice */}
        <div className="bg-muted/40 p-2.5 rounded-lg border border-border text-[11px] text-muted-foreground flex items-start space-x-2">
          <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
          <span>
            This engine tracks each patient's individual rolling baseline ($\mu, \sigma$). It provides early context on subtle personal deviations but <strong>never modifies, overrides, or silences standard NEWS2 alerts</strong>.
          </span>
        </div>

        {/* Advisory Alert Banner if triggered */}
        {personalized.is_advisory_alert ? (
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
        {personalized.advisory_note && (
          <div className="p-2.5 bg-card rounded-lg border border-border text-xs italic text-foreground">
            "{personalized.advisory_note}"
          </div>
        )}

        {/* Z-Score & Baseline Matrix */}
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

