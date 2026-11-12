import React from 'react';
import { Dna, Pill, HeartPulse, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RecoveryDNACard({ profile, personalizedEval }) {
  if (!profile) return null;

  const rolling = profile.rolling_stats || {};
  const hasHypercapnic = profile.has_hypercapnic_failure;

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3.5">
      
      {/* Card Header & Scale Badge */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Dna className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Recovery DNA™ Profile
            </h3>
            <p className="text-[11px] text-slate-400">Individual Baseline & Trajectory</p>
          </div>
        </div>

        {/* Rule 1 Badge */}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
          hasHypercapnic
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        }`}>
          {hasHypercapnic ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{hasHypercapnic ? 'NEWS2 Scale 2 (Target 88-92%)' : 'NEWS2 Scale 1 (Target ≥96%)'}</span>
        </span>
      </div>

      {/* Patient Key Medical Profile */}
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between items-baseline">
          <span className="font-bold text-sm text-white">{profile.name}</span>
          <span className="text-[11px] text-slate-400">{profile.age}y • {profile.gender} • ID: {profile.patient_id}</span>
        </div>

        {/* Discharge Diagnosis */}
        <div className="text-[11px] text-slate-300 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium">Dx: </span>
          {profile.discharge_diagnosis || profile.conditions?.[0] || 'Post-discharge recovery'}
        </div>

        {/* Conditions & Medications Pills */}
        <div className="flex flex-wrap gap-1 pt-1">
          {profile.conditions?.slice(0, 2).map((c, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 text-[10px]">
              {c}
            </span>
          ))}
          {profile.medications?.slice(0, 2).map((m, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800/80 text-teal-300 border border-teal-800/30 text-[10px]">
              {m.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Rolling Statistical Baseline Chips (Rule 2) */}
      <div className="pt-1">
        <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Individual Rolling Baseline (Mean ± SD):</span>
          <span className="text-sky-400">Rule 2</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">SpO2</span>
            <span className="font-bold text-sky-400">{rolling.spo2?.mean ?? profile.discharge_baseline?.spo2}%</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">HR</span>
            <span className="font-bold text-rose-300">{rolling.heart_rate?.mean ?? profile.discharge_baseline?.heart_rate}</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">RR</span>
            <span className="font-bold text-teal-300">{rolling.respiratory_rate?.mean ?? profile.discharge_baseline?.respiratory_rate}</span>
          </div>
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Temp</span>
            <span className="font-bold text-amber-300">{rolling.temperature?.mean ?? profile.discharge_baseline?.temperature}°</span>
          </div>
        </div>
      </div>

      {/* Baseline Departure Trigger Alert */}
      {personalizedEval?.has_personalized_alert && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-0.5">
          <span className="font-semibold block">Personal Baseline Deviation (Rule 2):</span>
          {personalizedEval.baseline_flags?.slice(0, 1).map((f, i) => (
            <span key={i} className="text-slate-300 block text-[10px]">{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}
