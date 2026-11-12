import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function CardiacVitalsChart({ currentVitals }) {
  const [timeframe, setTimeframe] = useState('30D');

  // Realistic trajectory curve data matching reference image
  const data = [
    { date: 'Feb 16', hr: 68, bp: 118, spo2: 97 },
    { date: 'Feb 22', hr: 72, bp: 122, spo2: 96 },
    { date: 'Mar 1', hr: 70, bp: 119, spo2: 98 },
    { date: 'Mar 7', hr: 75, bp: 125, spo2: 96 },
    { date: 'Mar 13', hr: 73, bp: 120, spo2: 97 },
    { 
      date: 'Mar 17', 
      hr: currentVitals?.heart_rate ?? 74, 
      bp: 121, 
      spo2: currentVitals?.spo2 ?? 96 
    }
  ];

  return (
    <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 shadow-sm space-y-3">
      {/* Header with 7D / 30D / 90D Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Cardiac Vitals — Telemetry Stream</h3>
          <p className="text-[11px] text-[#64748B]">Averaged across monitored PhysioNet & virtual channels</p>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center bg-[#141A23] border border-[#252D38] rounded-xl p-0.5 text-[11px]">
          {['7D', '30D', '90D'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                timeframe === t
                  ? 'bg-[#20C997] text-[#080B10] shadow-sm'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Line Chart */}
      <div className="h-52 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2633" vertical={false} />
            <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[20, 140]} ticks={[20, 60, 100, 140]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                borderColor: '#252D38',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#F8FAFC'
              }}
            />
            {/* Heart Rate (Teal) */}
            <Line 
              type="monotone" 
              dataKey="hr" 
              name="Heart Rate" 
              stroke="#20C997" 
              strokeWidth={2.2} 
              dot={{ r: 3, fill: '#20C997' }} 
              isAnimationActive={false} 
            />
            {/* BP Systolic (Purple/Rose) */}
            <Line 
              type="monotone" 
              dataKey="bp" 
              name="BP Systolic" 
              stroke="#A855F7" 
              strokeWidth={2.2} 
              dot={{ r: 3, fill: '#A855F7' }} 
              isAnimationActive={false} 
            />
            {/* SpO2 (Sky Blue) */}
            <Line 
              type="monotone" 
              dataKey="spo2" 
              name="SpO2" 
              stroke="#36BFFA" 
              strokeWidth={2.2} 
              dot={{ r: 3, fill: '#36BFFA' }} 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#20C997]" />
          <span className="text-[#94A3B8] font-medium text-[11px]">Heart Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
          <span className="text-[#94A3B8] font-medium text-[11px]">BP Systolic</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#36BFFA]" />
          <span className="text-[#94A3B8] font-medium text-[11px]">SpO2</span>
        </div>
      </div>
    </div>
  );
}
