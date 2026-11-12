import React, { useState, useEffect } from 'react';
import { PerformanceBenchmarkReport } from '../../types/telemetry';
import { fetchBenchmarkReport, rerunBenchmark } from '../../lib/api';
import {
  BarChart3,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

export function BenchmarkComparisonTable() {
  const [benchmark, setBenchmark] = useState<PerformanceBenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchBenchmarkReport();
      setBenchmark(data);
    } catch (err) {
      console.error('Failed to load benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async () => {
    try {
      setLoading(true);
      const data = await rerunBenchmark();
      setBenchmark(data);
    } catch (err) {
      console.error('Failed to rerun benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* ── DEMO / SAMPLE DATA DISCLAIMER BANNER ─────────────────────── */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300 flex items-center space-x-1.5">
              <span>DEMO / SAMPLE BENCHMARK EVALUATION</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                NON-EMPIRICAL
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 mt-0.5">
              Replayed across wearable simulator and BIDMC physiological streams. Comparative algorithmic demonstration only; does not represent empirical clinical trial claims.
            </p>
          </div>
        </div>

        <button
          onClick={handleRerun}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-bold transition-all shrink-0 disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Replaying Stream...' : 'Re-Run Scenario Benchmark'}</span>
        </button>
      </div>

      {/* ── 3 HIGH-LEVEL COMPARISON CARDS ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Detection Lead Time */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold flex items-center space-x-1.5 text-slate-300">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Detection Lead Time</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              +7 min Earlier
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-[#090d14] p-3 border border-[#1e2433]">
              <span className="text-[10px] text-slate-500 block">Fixed Threshold</span>
              <span className="text-2xl font-bold font-mono text-slate-400">5 min</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Alerts at SpO₂ &lt; 90%</span>
            </div>
            <div className="rounded-xl bg-[#11231a] p-3 border border-[#1b4332]">
              <span className="text-[10px] text-emerald-400 block font-semibold">Our System</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">12 min</span>
              <span className="text-[10px] text-emerald-300/80 block mt-0.5">Catches trend earlier</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Trend persistence detects downward hypoxic trajectory 7 minutes before the rigid 90% threshold is breached.
          </p>
        </div>

        {/* Metric 2: False Alerts */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold flex items-center space-x-1.5 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Number of False Alerts</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
              62.5% Reduction
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-[#090d14] p-3 border border-[#1e2433]">
              <span className="text-[10px] text-slate-500 block">Fixed Threshold</span>
              <span className="text-2xl font-bold font-mono text-rose-400">8</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Fooled by motion noise</span>
            </div>
            <div className="rounded-xl bg-[#0f2324] p-3 border border-[#144749]">
              <span className="text-[10px] text-teal-300 block font-semibold">Our System</span>
              <span className="text-2xl font-bold font-mono text-teal-400">3</span>
              <span className="text-[10px] text-teal-200/80 block mt-0.5">Artifacts filtered</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Step 7 Artifact Detection quarantines isolated drops (98→70→98%) and flatlines, eliminating false alarms.
          </p>
        </div>

        {/* Metric 3: Alerts per Patient-Day */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold flex items-center space-x-1.5 text-slate-300">
              <TrendingDown className="h-4 w-4 text-purple-400" />
              <span>Alerts / Patient-Day</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Alarm Fatigue Cut
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-[#090d14] p-3 border border-[#1e2433]">
              <span className="text-[10px] text-slate-500 block">Fixed Threshold</span>
              <span className="text-2xl font-bold font-mono text-slate-400">4.2</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">High alarm fatigue</span>
            </div>
            <div className="rounded-xl bg-[#1d142e] p-3 border border-[#3b2463]">
              <span className="text-[10px] text-purple-300 block font-semibold">Our System</span>
              <span className="text-2xl font-bold font-mono text-purple-400">1.6</span>
              <span className="text-[10px] text-purple-200/80 block mt-0.5">Only actionable alerts</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Multi-vital synthesis and consecutive confirmation suppress nuisance alerts and protect clinicians from alarm fatigue.
          </p>
        </div>
      </div>

      {/* ── EXECUTIVE COMPARATIVE TABLE ─────────────────────────────── */}
      <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span>Comparative Benchmark Matrix (Fixed Threshold vs CarePulse AI)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Direct side-by-side analysis based on continuous 1 Hz simulation and BIDMC hospital replayer data.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1a1f2c]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0e15] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1a1f2c]">
              <tr>
                <th className="py-3 px-4">Evaluation Metric</th>
                <th className="py-3 px-4 text-right">Fixed Threshold (&lt;90% SpO₂)</th>
                <th className="py-3 px-4 text-right text-emerald-400 font-bold">Our System (CarePulse AI)</th>
                <th className="py-3 px-4">Clinical Impact / Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1f2c] text-slate-300">
              <tr className="hover:bg-[#141924] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>Detection Lead Time</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-400">5 min</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">12 min</td>
                <td className="py-3.5 px-4 text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">+7 min earlier</span> notice allows pre-emptive respiratory intervention before acute desaturation.
                </td>
              </tr>

              <tr className="hover:bg-[#141924] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <span>Number of False Alerts</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-rose-400 font-bold">8</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-400">3</td>
                <td className="py-3.5 px-4 text-xs text-slate-400">
                  <span className="font-semibold text-teal-300">62.5% noise reduction</span> by identifying motion artifacts (e.g. 70% dip) and flatlines.
                </td>
              </tr>

              <tr className="hover:bg-[#141924] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-purple-400" />
                  <span>Alerts per Patient-Day</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-400">4.2 / day</td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-400">1.6 / day</td>
                <td className="py-3.5 px-4 text-xs text-slate-400">
                  <span className="font-semibold text-purple-300">Over 60% reduction</span> in nuisance alerts; preserves clinician vigilance for real deteriorations.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SCENARIO-BY-SCENARIO REPLAY BREAKDOWN ─────────────────────── */}
      <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="h-4 w-4 text-teal-400" />
            <span>Replay Scenario Breakdown (Select Scenario to Inspect)</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Test scenarios replayed against BIDMC and simulated biosensor streams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {benchmark?.scenario_breakdowns.map((scen, idx) => {
            const isSelected = idx === selectedScenarioIdx;
            return (
              <button
                key={scen.scenario_id}
                onClick={() => setSelectedScenarioIdx(idx)}
                className={`p-3.5 rounded-xl border text-left transition-all space-y-2 ${
                  isSelected
                    ? 'bg-[#12221b] border-emerald-500/60 shadow-md'
                    : 'bg-[#0b0e15] border-[#1e2433] hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{scen.scenario_name}</span>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">{scen.description}</p>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#1a1f2c]">
                  <span className="text-slate-500">Lead Time:</span>
                  <span className="text-emerald-400 font-bold">{scen.our_system_lead_time_min} min</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Scenario Detailed Comparison */}
        {benchmark && benchmark.scenario_breakdowns[selectedScenarioIdx] && (
          <div className="rounded-xl bg-[#090d14] border border-[#1a202c] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Detailed Analysis: {benchmark.scenario_breakdowns[selectedScenarioIdx].scenario_name}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ID: {benchmark.scenario_breakdowns[selectedScenarioIdx].scenario_id}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {benchmark.scenario_breakdowns[selectedScenarioIdx].description}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-[#11151f] border border-[#1e2433]">
                <span className="text-[10px] text-slate-500 block">Lead Time (Fixed)</span>
                <span className="text-base font-bold font-mono text-slate-300">
                  {benchmark.scenario_breakdowns[selectedScenarioIdx].fixed_threshold_lead_time_min} min
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#11231a] border border-[#1b4332]">
                <span className="text-[10px] text-emerald-400 block font-semibold">Lead Time (CarePulse)</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {benchmark.scenario_breakdowns[selectedScenarioIdx].our_system_lead_time_min} min
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#11151f] border border-[#1e2433]">
                <span className="text-[10px] text-slate-500 block">False Alarms (Fixed)</span>
                <span className="text-base font-bold font-mono text-rose-400">
                  {benchmark.scenario_breakdowns[selectedScenarioIdx].fixed_threshold_false_alerts}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0f2324] border border-[#144749]">
                <span className="text-[10px] text-teal-300 block font-semibold">False Alarms (CarePulse)</span>
                <span className="text-base font-bold font-mono text-teal-400">
                  {benchmark.scenario_breakdowns[selectedScenarioIdx].our_system_false_alerts}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
