import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ChevronDown, Info } from 'lucide-react';

export default function DiagnosisMixChart({ patients = [] }) {
  // Cohort phenotypes matching Synthea profiles and screenshot
  const data = [
    { name: 'Heart Failure', value: 1, color: '#F97316' },     // Orange
    { name: 'Sepsis Risk', value: 1, color: '#EAB308' },       // Yellow
    { name: 'Post-Op Stable', value: 1, color: '#10B981' },    // Green
    { name: 'COPD (Scale 2)', value: 1, color: '#EC4899' },    // Pink
    { name: 'Arrhythmia / AF', value: 1, color: '#3B82F6' }    // Blue
  ];

  return (
    <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 shadow-sm space-y-3">
      {/* Header with Timeframe Dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Diagnosis Mix</h3>
          <p className="text-[11px] text-[#64748B]">Current active cohort phenotypes</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141A23] border border-[#252D38] text-[11px] text-[#94A3B8] cursor-pointer hover:border-[#333F4E]">
          <span>Last 30 days</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
        </div>
      </div>

      {/* Donut Chart & Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        {/* Donut Chart with Center Label */}
        <div className="sm:col-span-6 h-48 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#252D38',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  color: '#F8FAFC'
                }}
              />
              <Pie
                data={data}
                innerRadius={54}
                outerRadius={74}
                paddingAngle={4}
                dataKey="value"
                stroke="#10151C"
                strokeWidth={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Number in Donut Hole */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-white tracking-tight">5</span>
            <span className="text-[9px] text-[#94A3B8] font-bold tracking-widest uppercase">PATIENTS</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="sm:col-span-6 space-y-2 text-xs pl-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[#94A3B8] font-medium">{item.name}</span>
              </div>
              <span className="font-mono text-[#64748B] text-[10px]">
                20%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Informational Callout Box matching screenshot */}
      <div className="p-3 rounded-xl bg-[#141A23] border border-[#1E2633] text-[11px] text-[#94A3B8] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#20C997] shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong className="text-white">Margaret Chen (P-002)</strong> is under <strong className="text-[#EC4899]">NEWS2 Scale 2</strong> (COPD 88–92% target). Her 90% SpO₂ is clinically normal and averted false alarms.
        </p>
      </div>
    </div>
  );
}
