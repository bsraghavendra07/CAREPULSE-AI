import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdmissionChart() {
  const data = [
    { day: 'Mon', emergency: 38, scheduled: 24 },
    { day: 'Tue', emergency: 48, scheduled: 32 },
    { day: 'Wed', emergency: 35, scheduled: 21 },
    { day: 'Thu', emergency: 55, scheduled: 41 },
    { day: 'Fri', emergency: 46, scheduled: 34 }
  ];

  return (
    <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 shadow-sm space-y-3">
      {/* Header with Title and Top-Right Legend */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Weekly Telemetry & Acute Ingestion</h3>
          <p className="text-[11px] text-[#64748B]">Emergency vs Scheduled post-discharge check-ins</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
            <span className="text-[#94A3B8]">Emergency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
            <span className="text-[#94A3B8]">Scheduled</span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2633" vertical={false} />
            <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                borderColor: '#252D38',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#F8FAFC'
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            {/* Left Bar (Emergency) */}
            <Bar 
              dataKey="emergency" 
              name="Emergency"
              fill="#475569" 
              radius={[4, 4, 0, 0]} 
              barSize={18}
            />
            {/* Right Bar (Scheduled) */}
            <Bar 
              dataKey="scheduled" 
              name="Scheduled"
              fill="#3B82F6" 
              radius={[4, 4, 0, 0]} 
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
