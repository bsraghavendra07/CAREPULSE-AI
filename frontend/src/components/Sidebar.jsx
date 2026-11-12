import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Database, 
  BarChart2, 
  Flame, 
  Gauge
} from 'lucide-react';

export default function Sidebar({ 
  activeView, 
  setActiveView, 
  patientCount = 5, 
  urgentCount = 0,
  simSpeed = 1,
  setSimSpeed = () => {}
}) {
  return (
    <aside className="w-64 bg-[#080B10] border-r border-[#1B222C] flex flex-col justify-between select-none shrink-0 min-h-screen">
      <div>
        {/* Brand Squircle Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-[#141A23]">
          <div className="w-10 h-10 rounded-2xl bg-[#141A23] border border-[#252D38] flex items-center justify-center shadow-inner">
            <div className="w-4 h-4 rounded-full border-2 border-[#20C997] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#20C997]" />
            </div>
          </div>
          <div>
            <div className="font-extrabold text-xs text-white tracking-tight flex items-center gap-1.5">
              <span>MINEARENA</span> 
              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-[#20C997]/20 text-[#20C997] border border-[#20C997]/30">1.0</span>
            </div>
            <div className="text-[10px] text-[#64748B] font-medium leading-tight">
              CardioVascular & Deterioration
            </div>
          </div>
        </div>

        {/* Section 1: OVERVIEW */}
        <div className="px-3 py-3 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#475569] tracking-wider px-3 mb-1.5">
            Overview
          </div>

          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeView === 'dashboard'
                ? 'bg-[#152322] text-[#20C997] border-l-2 border-[#20C997] shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#141A23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => setActiveView('patients')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeView === 'patients'
                ? 'bg-[#152322] text-[#20C997] border-l-2 border-[#20C997]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#141A23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Patients</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#F97316] text-[#080B10]">
              {patientCount}
            </span>
          </button>

          <button
            onClick={() => setActiveView('monitor')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeView === 'monitor'
                ? 'bg-[#152322] text-[#20C997] border-l-2 border-[#20C997]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#141A23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4" />
              <span>Vitals Monitor</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#20C997] animate-pulse" />
          </button>

          <button
            onClick={() => setActiveView('fhir')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeView === 'fhir'
                ? 'bg-[#152322] text-[#20C997] border-l-2 border-[#20C997]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#141A23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-[#20C997]" />
              <span>FHIR R4 / HAPI</span>
            </div>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#20C997]/15 text-[#20C997]">
              API
            </span>
          </button>
        </div>

        {/* Section 2: ANALYTICS */}
        <div className="px-3 py-2 space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#475569] tracking-wider px-3 mb-1.5">
            Analytics
          </div>

          <button
            onClick={() => setActiveView('benchmark')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeView === 'benchmark'
                ? 'bg-[#152322] text-[#20C997] border-l-2 border-[#20C997]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#141A23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-4 h-4" />
              <span>Performance Report</span>
            </div>
          </button>

          <button
            onClick={() => setActiveView('simulator')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeView === 'simulator'
                ? 'bg-[#152322] text-[#20C997] border-l-2 border-[#20C997]'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#141A23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-[#F97316]" />
              <span>Simulator & BIDMC</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#8B5CF6] text-white">
              3.2
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Controls & Clinician Profile */}
      <div className="p-3 space-y-3">
        {/* Simulation Speed Card */}
        <div className="bg-[#10151C] border border-[#1E2633] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-medium">
              <Gauge className="w-3.5 h-3.5 text-[#20C997]" />
              <span>Simulation Speed</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#20C997]">{simSpeed}x</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`py-1 text-[11px] font-mono font-bold rounded-lg transition ${
                  simSpeed === s
                    ? 'bg-[#20C997] text-[#080B10]'
                    : 'bg-[#141A23] text-[#94A3B8] hover:text-white border border-[#252D38]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Clinician Profile */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-[#10151C] border border-[#1E2633]">
          <div className="w-8 h-8 rounded-full bg-[#0284C7] text-white font-bold text-xs flex items-center justify-center shrink-0">
            DR
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">Dr. Rivera</span>
            <span className="text-[10px] text-[#64748B] truncate">Cardiologist · Ward 4B</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
