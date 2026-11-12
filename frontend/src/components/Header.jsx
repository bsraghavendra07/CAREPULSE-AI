import React from 'react';
import { 
  Activity, 
  Wifi, 
  Globe, 
  BarChart3, 
  UserPlus, 
  ChevronDown,
  Sparkles,
  ShieldCheck,
  BellRing
} from 'lucide-react';

export default function Header({ 
  isConnected, 
  lang, 
  setLang, 
  onOpenBenchmark, 
  onOpenCheckin,
  alertCounts,
  patients,
  activePatientId,
  onSelectPatient
}) {
  const activePatient = patients?.find(p => p.patient_id === activePatientId);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">CarePulse</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                AI • PS-03
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
              Personalized Post-Discharge Monitor
            </span>
          </div>
        </div>

        {/* Patient Switcher (Clean Dropdown / Pills) */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">Patient:</span>
          <select
            value={activePatientId}
            onChange={(e) => onSelectPatient(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2"
          >
            {patients?.map((p) => (
              <option key={p.patient_id} value={p.patient_id} className="bg-slate-900 text-slate-200">
                {p.patient_id}: {p.name} {p.has_hypercapnic_failure ? '• Scale 2' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Right Action Tools: Language, Check-in, Benchmark */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Live WebSocket Connection Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 hidden sm:inline">{isConnected ? 'Live Telemetry' : 'Offline'}</span>
          </div>

          {/* Multilingual Selector (EN, KN, HI) */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
            {['en', 'kn', 'hi'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-md font-medium transition uppercase ${
                  lang === l
                    ? 'bg-sky-500 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Daily Check-in Button */}
          <button
            onClick={onOpenCheckin}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-teal-400" />
            <span>Check-in</span>
          </button>

          {/* PS-03 Benchmark Report Button */}
          <button
            onClick={onOpenBenchmark}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold transition shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">PS-03 Benchmark</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>

      </div>
    </header>
  );
}
