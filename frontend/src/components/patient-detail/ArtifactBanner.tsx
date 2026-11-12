import React from 'react';
import { SignalQuality } from '../../types/telemetry';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Radio, AlertTriangle, ShieldCheck, CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
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

  const signals = sqi.signals || {};
  const channelList = [
    { key: 'spo2', label: 'SpO₂', fallback: sqi.probe_removed ? 'PROBE_REMOVED' : 'VALID' },
    { key: 'heart_rate', label: 'Heart Rate', fallback: 'VALID' },
    { key: 'respiratory_rate', label: 'Resp. Rate', fallback: 'VALID' },
    { key: 'body_temperature', label: 'Temperature', fallback: 'VALID' },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        {/* Header Bar: SQI Score & Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-foreground">
                  Vital-Sign Reliability & Signal Quality
                </span>
                <Badge variant={statusBadgeVariant} className="text-[10px] font-mono">
                  {sqi.status} ({sqiPercent}%)
                </Badge>
                {sqi.motion_injected && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-300">
                    Motion Simulated
                  </Badge>
                )}
                {sqi.probe_removed && (
                  <Badge variant="secondary" className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Probe Detached
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

        {/* ── Per-Vital Signal Quality Matrix (Requirement 18) ── */}
        <div className="rounded-xl border border-border/70 bg-[#0d121c] p-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/40 text-[11px] font-semibold text-slate-400">
            <span>SIGNAL QUALITY CHANNELS</span>
            <span className="font-mono text-[10px]">Real-Time Telemetry Reliability</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            {channelList.map((ch) => {
              const sig = signals[ch.key];
              const st = sig?.status || ch.fallback;
              const isRel = sig ? sig.reliable : st === 'VALID';

              let badgeText = '● Reliable';
              let badgeStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

              if (st === 'PROBE_REMOVED') {
                badgeText = '⚠ Probe Removed';
                badgeStyle = 'text-rose-400 bg-rose-500/15 border-rose-500/30 animate-pulse';
              } else if (st === 'FLATLINE') {
                badgeText = '⚠ Flatline Signal';
                badgeStyle = 'text-rose-300 bg-rose-500/10 border-rose-500/20';
              } else if (st === 'ARTIFACT' || !isRel) {
                badgeText = '⚠ Possible Artifact';
                badgeStyle = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
              } else if (st === 'SUSPECT') {
                badgeText = '▲ Suspect Signal';
                badgeStyle = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
              } else if (st === 'MISSING') {
                badgeText = '○ Missing Sensor';
                badgeStyle = 'text-slate-400 bg-slate-800 border-slate-700';
              }

              return (
                <div key={ch.key} className="p-2 rounded-lg bg-black/40 border border-border/50 flex flex-col justify-between space-y-1">
                  <span className="font-medium text-slate-300 text-[11px]">{ch.label}</span>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono border font-semibold flex items-center justify-center', badgeStyle)}>
                    {badgeText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SENSOR QUALITY ALERT (Requirement 19: Alert Suppression Banner) ── */}
        {(sqi.clinical_alert_suppressed || sqi.probe_removed || sqi.sensor_alert) && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>⚠ SENSOR QUALITY ALERT</span>
            </div>
            <div className="font-semibold text-white">
              {sqi.probe_removed ? 'SpO₂ signal appears unavailable (Probe removal detected).' : 'Sensor signal anomaly / optical artifact detected.'}
            </div>
            <p className="text-[11px] text-amber-200/90">
              {sqi.suppression_reason || 'Clinical hypoxia deterioration alert suppressed because the signal is currently unreliable. Verify sensor probe attachment on patient.'}
            </p>
            <div className="text-[10px] text-amber-400/80 pt-1 border-t border-amber-500/20 font-mono">
              Status: Clinical deterioration alert suppressed until reliable readings resume.
            </div>
          </div>
        )}

        {/* ── GENUINE DETERIORATION CONFIRMATION (Requirement 19) ── */}
        {sqi.is_genuine_deterioration && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              <Activity className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>⚠ PHYSIOLOGICAL DETERIORATION DETECTED</span>
            </div>
            <p className="text-[11px] text-emerald-100">
              {sqi.genuine_deterioration_note || 'Multi-vital cross-check confirms genuine patient deterioration: signals are consistent and reliable.'}
            </p>
            <div className="text-[10px] text-emerald-400/90 pt-1 border-t border-emerald-500/20 font-mono">
              Status: Validated by multi-vital concordance — existing clinical risk pipeline continues without suppression.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

