import React from 'react';
import { Compass, TrendingDown, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RadarWidget({ radar }) {
  if (!radar) return null;

  const score = radar.radar_score || 0;
  const status = radar.status || 'STABLE_RECOVERY';
  const slopes = radar.rates_of_change || {};
  const isCoupled = radar.is_coupled_decompensation;
  const leadTime = radar.lead_time_minutes_ahead || 0;

  const isDeteriorating = radar.early_warning_active;

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Early Deterioration Radar™
            </h3>
            <p className="text-[11px] text-slate-400">Multi-Vital Velocity & Direction</p>
          </div>
        </div>

        {/* Lead-Time Pill */}
        {leadTime > 0 ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold animate-pulse">
            <Clock className="w-3 h-3" />
            <span>+{leadTime} min Lead Time</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Stable Trajectory</span>
          </span>
        )}
      </div>

      {/* Trajectory Meter */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">Deterioration Threat Velocity</span>
          <span className={`font-bold ${isDeteriorating ? 'text-rose-400' : 'text-emerald-400'}`}>
            {score}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div 
            className={`h-full transition-all duration-500 ${isDeteriorating ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
          />
        </div>
      </div>

      {/* Rates of Change (Velocity) */}
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
        <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">d(SpO2)/dt</span>
          <span className={`font-bold text-xs ${slopes.spo2_slope < -0.3 ? 'text-rose-400' : 'text-slate-300'}`}>
            {slopes.spo2_slope ?? 0}%
          </span>
        </div>
        <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">d(HR)/dt</span>
          <span className={`font-bold text-xs ${slopes.hr_slope > 0.6 ? 'text-rose-400' : 'text-slate-300'}`}>
            {slopes.hr_slope > 0 ? `+${slopes.hr_slope}` : slopes.hr_slope}
          </span>
        </div>
        <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">d(RR)/dt</span>
          <span className={`font-bold text-xs ${slopes.rr_slope > 0.4 ? 'text-rose-400' : 'text-slate-300'}`}>
            {slopes.rr_slope > 0 ? `+${slopes.rr_slope}` : slopes.rr_slope}
          </span>
        </div>
      </div>

      {/* Triad Decompensation Alert Strip */}
      {isCoupled && (
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Triad Decompensation: SpO2 drop with concurrent HR & RR climb.</span>
        </div>
      )}
    </div>
  );
}
