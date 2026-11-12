import React, { useState } from 'react';
import { PerformanceReport } from '../components/simulation/PerformanceReport';
import { BenchmarkComparisonTable } from '../components/simulation/BenchmarkComparisonTable';
import { BarChart3, ShieldCheck, Scale, Cpu } from 'lucide-react';

export function PerformanceReportPage() {
  const [activeTab, setActiveTab] = useState<'benchmark' | 'runtime'>('benchmark');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <span>Clinical Verification & Performance Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Comparative algorithmic evaluation: Fixed-Threshold (SpO₂ &lt; 90%) vs Intelligent Monitoring (Step 7 & 8)
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-2 bg-[#0d121c] p-1 rounded-xl border border-[#1e2536]">
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'benchmark'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Evaluation Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('runtime')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'runtime'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Live Runtime Counters</span>
          </button>
        </div>
      </div>

      {/* Content Rendering based on Tab */}
      {activeTab === 'benchmark' ? (
        <BenchmarkComparisonTable />
      ) : (
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-6">
          <PerformanceReport />
        </div>
      )}
    </div>
  );
}
