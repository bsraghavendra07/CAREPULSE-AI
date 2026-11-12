import React from 'react';
import { Users, AlertTriangle, Gauge, Sparkles } from 'lucide-react';

export default function KPICards({ 
  patientCount = 5, 
  urgentCount = 0,
  reviewCount = 0,
  leadTimeMinutes = 35 
}) {
  const recoverySafetyIndex = urgentCount > 0 ? (100 - urgentCount * 12.5).toFixed(1) : "100.0";
  const baselineFlags = reviewCount + (urgentCount > 0 ? 1 : 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI Card 1: Active Monitored Patients */}
      <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 shadow-sm flex justify-between items-start transition hover:border-[#333F4E]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F2922] border border-[#165342] flex items-center justify-center text-[#20C997]">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#94A3B8]">Active Monitored Patients</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {patientCount}
          </div>
          <div className="text-[11px] font-semibold text-[#20C997] flex items-center gap-1">
            <span>▲ 100% telemetry online</span>
          </div>
        </div>

        {/* Mini Green Bar Sparkline */}
        <div className="flex items-end gap-1 h-10 pt-2">
          <span className="w-1.5 h-3 bg-[#20C997]/30 rounded-sm" />
          <span className="w-1.5 h-5 bg-[#20C997]/50 rounded-sm" />
          <span className="w-1.5 h-4 bg-[#20C997]/40 rounded-sm" />
          <span className="w-1.5 h-7 bg-[#20C997]/80 rounded-sm" />
          <span className="w-1.5 h-9 bg-[#20C997] rounded-sm shadow-[0_0_8px_rgba(32,201,151,0.5)]" />
        </div>
      </div>

      {/* KPI Card 2: Critical Deterioration Alerts */}
      <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 shadow-sm flex justify-between items-start transition hover:border-[#333F4E]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              urgentCount > 0 
                ? 'bg-[#2D1A16] border border-[#EF4444] text-[#EF4444]' 
                : 'bg-[#2D1A16] border border-[#52251D] text-[#F97316]'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#94A3B8]">Critical Deterioration Alerts</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {urgentCount}
          </div>
          <div className={`text-[11px] font-semibold flex items-center gap-1 ${
            urgentCount > 0 ? 'text-[#EF4444]' : 'text-[#64748B]'
          }`}>
            <span>{urgentCount > 0 ? `▲ ${urgentCount} active deterioration` : '● All parameters nominal'}</span>
          </div>
        </div>

        {/* Mini Red Bar Sparkline */}
        <div className="flex items-end gap-1 h-10 pt-2">
          <span className="w-1.5 h-6 bg-[#EF4444]/30 rounded-sm" />
          <span className="w-1.5 h-4 bg-[#EF4444]/40 rounded-sm" />
          <span className="w-1.5 h-7 bg-[#EF4444]/60 rounded-sm" />
          <span className="w-1.5 h-3 bg-[#EF4444]/30 rounded-sm" />
          <span className="w-1.5 h-8 bg-[#EF4444] rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        </div>
      </div>

      {/* KPI Card 3: Avg Recovery Safety Index */}
      <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 shadow-sm flex justify-between items-start transition hover:border-[#333F4E]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#292212] border border-[#53431F] flex items-center justify-center text-[#F59E0B]">
              <Gauge className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#94A3B8]">Avg Recovery Safety Index</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {recoverySafetyIndex}
          </div>
          <div className="text-[11px] font-semibold text-[#F59E0B] flex items-center gap-1">
            <span>▲ 1.8 pts post-discharge stability</span>
          </div>
        </div>

        {/* Mini Amber Bar Sparkline */}
        <div className="flex items-end gap-1 h-10 pt-2">
          <span className="w-1.5 h-4 bg-[#F59E0B]/30 rounded-sm" />
          <span className="w-1.5 h-6 bg-[#F59E0B]/50 rounded-sm" />
          <span className="w-1.5 h-5 bg-[#F59E0B]/40 rounded-sm" />
          <span className="w-1.5 h-8 bg-[#F59E0B]/80 rounded-sm" />
          <span className="w-1.5 h-7 bg-[#F59E0B] rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        </div>
      </div>

      {/* KPI Card 4: Personalized AI Baseline Flags */}
      <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 shadow-sm flex justify-between items-start transition hover:border-[#333F4E]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#231734] border border-[#48286E] flex items-center justify-center text-[#A78BFA]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#94A3B8]">Personalized AI Baseline Flags</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {baselineFlags}
          </div>
          <div className="text-[11px] font-semibold text-[#A78BFA] flex items-center gap-1">
            <span>● Individual Z-Score Anomaly Engine</span>
          </div>
        </div>

        {/* Mini Purple Bar Sparkline */}
        <div className="flex items-end gap-1 h-10 pt-2">
          <span className="w-1.5 h-3 bg-[#8B5CF6]/30 rounded-sm" />
          <span className="w-1.5 h-6 bg-[#8B5CF6]/50 rounded-sm" />
          <span className="w-1.5 h-4 bg-[#8B5CF6]/40 rounded-sm" />
          <span className="w-1.5 h-7 bg-[#8B5CF6]/80 rounded-sm" />
          <span className="w-1.5 h-9 bg-[#8B5CF6] rounded-sm shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
        </div>
      </div>
    </div>
  );
}
