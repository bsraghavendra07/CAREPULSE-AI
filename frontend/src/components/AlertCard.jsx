import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldAlert, 
  ArrowRight,
  Languages,
  Check
} from 'lucide-react';

export default function AlertCard({ alert, lang = 'en' }) {
  if (!alert) {
    return (
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 text-center text-slate-500 text-xs">
        Streaming telemetry...
      </div>
    );
  }

  const tier = alert.tier || 'WATCH';
  const multilingualBrief = alert.multilingual_briefs?.[lang] || alert.reason;

  const tierStyles = {
    WATCH: {
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      label: 'WATCH — Stable Recovery'
    },
    REVIEW: {
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      border: 'border-amber-500/40',
      icon: AlertTriangle,
      label: 'REVIEW — Concerning Drift'
    },
    URGENT: {
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
      border: 'border-rose-500/50',
      icon: AlertOctagon,
      label: 'URGENT — Action Required'
    },
    SENSOR_WARNING: {
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/40',
      border: 'border-purple-500/50',
      icon: ShieldAlert,
      label: 'DEVICE WARNING — Sensor Issue'
    }
  };

  const style = tierStyles[tier] || tierStyles.WATCH;
  const TierIcon = style.icon;

  return (
    <div className={`bg-slate-900/80 rounded-2xl p-4 border ${style.border} shadow-sm space-y-3.5 transition-all`}>
      
      {/* Alert Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${style.badge}`}>
            <TierIcon className="w-3.5 h-3.5" />
            <span>{style.label}</span>
          </span>
        </div>

        {tier !== 'SENSOR_WARNING' && (
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">NEWS2: </span>
            <span className="text-sm font-extrabold text-white">{alert.news2_total} pts</span>
          </div>
        )}
      </div>

      {/* Main Reason Headline & Localized Briefing */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-white leading-snug">
          {alert.reason}
        </h4>
        <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-1.5">
          <Languages className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <p className="italic">"{multilingualBrief}"</p>
        </div>
      </div>

      {/* Parameter Transitions Table */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400">
          Vital Transitions (Previous → Current):
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {alert.parameters?.map((p, idx) => (
            <div key={idx} className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/70 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block">{p.key.toUpperCase()}</span>
                <span className="font-bold text-white text-xs">{p.current}</span>
              </div>
              <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                p.delta !== 'N/A' && p.delta.startsWith('+') && p.key !== 'spo2'
                  ? 'bg-rose-500/20 text-rose-300'
                  : p.delta !== 'N/A' && p.delta.startsWith('-') && p.key === 'spo2'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-500'
              }`}>
                {p.delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Rationale & Applied Rules */}
      <div className="space-y-1.5 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
        <div className="text-[10px] uppercase font-bold text-slate-400">
          Clinical Reasoning:
        </div>
        <ul className="space-y-1 text-slate-300 text-[11px]">
          {alert.clinical_reasons?.slice(0, 2).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
          {alert.applied_rules?.slice(0, 1).map((rule, i) => (
            <li key={i} className="flex items-start gap-1.5 text-sky-300 font-medium">
              <span className="w-1 h-1 rounded-full bg-teal-400 mt-1.5 shrink-0" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Action Protocol */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
        <span className="text-[10px] uppercase font-bold text-emerald-400 block">
          Recommended Action:
        </span>
        <p className="text-[11px] text-slate-200 font-medium">
          {alert.recommended_action}
        </p>
      </div>

      {/* Statutory Disclaimer */}
      <div className="text-[9px] text-slate-500 border-t border-slate-800/80 pt-2 leading-tight">
        Clinical Decision Support analytical tool for healthcare teams. Not an automated diagnosis.
      </div>
    </div>
  );
}
