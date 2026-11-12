import React from 'react';
import { Cpu, ShieldCheck, ShieldAlert, AlertOctagon } from 'lucide-react';

export default function SensorTruthWidget({ verdict }) {
  if (!verdict) return null;

  const isValid = verdict.is_valid;
  const artifactType = verdict.artifact_type || 'NONE';
  const qualityScore = Math.round((verdict.quality_score ?? 1.0) * 100);
  const isSuppressed = verdict.suppress_clinical_alert;

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            isValid 
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Sensor Truth Engine™
            </h3>
            <p className="text-[11px] text-slate-400">Signal Integrity & Artifact Filter</p>
          </div>
        </div>

        {/* Quality Score */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
          isValid
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
        }`}>
          {qualityScore}% Quality
        </span>
      </div>

      {/* Sensor State & Diagnostic Text */}
      <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
        isValid
          ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
          : 'bg-purple-950/30 border-purple-800/40 text-purple-200'
      }`}>
        {isValid ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <div className="font-semibold text-white flex items-center gap-2">
            <span>{isValid ? 'Signal Plausible & Verified' : `Artifact Detected: ${artifactType}`}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            {verdict.explanation}
          </p>
        </div>
      </div>

      {/* Critical Differentiator: Suppressed False Emergency Banner */}
      {isSuppressed && (
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-[11px] font-medium">
            False Code Blue emergency suppressed. Routed to device maintenance.
          </span>
        </div>
      )}
    </div>
  );
}
