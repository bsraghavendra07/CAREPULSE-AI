import React from 'react';
import { PerformanceReport } from '../components/simulation/PerformanceReport';
import { BarChart3, ShieldCheck } from 'lucide-react';

export function PerformanceReportPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <span>Clinical Verification & Performance Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live-computed comparative metrics: Fixed-threshold vs Personalized Post-Discharge Monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#11231a] text-[#4ade80] border border-[#1b4332] text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" />
          <span>Real Runtime Counters (Zero Hardcoded Metrics)</span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-6">
        <PerformanceReport />
      </div>
    </div>
  );
}
