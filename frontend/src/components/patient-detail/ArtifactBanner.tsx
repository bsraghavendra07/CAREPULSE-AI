import React from 'react';
import { SignalQuality } from '../../types/telemetry';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Radio, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ArtifactBannerProps {
  sqi?: SignalQuality;
}

export function ArtifactBanner({ sqi }: ArtifactBannerProps) {
  if (!sqi) return null;

  const sqiPercent = Math.round(sqi.sqi * 100);

  let statusBadgeVariant: 'sqi-high' | 'sqi-medium' | 'sqi-low' = 'sqi-high';
  let indicatorColor = 'bg-blue-500';
  if (sqi.status === 'LOW') {
    statusBadgeVariant = 'sqi-low';
    indicatorColor = 'bg-rose-500';
  } else if (sqi.status === 'MEDIUM') {
    statusBadgeVariant = 'sqi-medium';
    indicatorColor = 'bg-amber-500';
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-foreground">
                  Signal Quality Index (SQI)
                </span>
                <Badge variant={statusBadgeVariant} className="text-[10px]">
                  {sqi.status} ({sqiPercent}%)
                </Badge>
                {sqi.motion_injected && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-300">
                    Motion Simulated
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sqi.note || 'Sensor contact nominal. Physiological signal waveforms valid.'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Quality Score</span>
              <span className="font-mono font-bold text-foreground">{sqiPercent}%</span>
            </div>
            <Progress value={sqiPercent} indicatorClassName={indicatorColor} />
          </div>
        </div>

        {/* Warning if artifact detected - Safety policy reminder */}
        {sqi.artifact_detected && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong>Sensor Artifact Flagged: </strong>
              <span>
                {sqi.note}. Note: Per clinical protocol, NEWS2 alarms are displayed with an advisory flag and are <strong>not automatically suppressed</strong> to avoid missing real acute deterioration.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

