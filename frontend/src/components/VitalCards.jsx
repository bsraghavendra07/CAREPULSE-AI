import React from 'react';
import { Heart, Wind, Thermometer, Droplets } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

export default function VitalCards({ vitals, history, isScale2 }) {
  const hr = vitals?.heart_rate;
  const spo2 = vitals?.spo2;
  const rr = vitals?.respiratory_rate;
  const temp = vitals?.body_temperature;

  // Chart data formatting
  const chartData = (history || []).slice(-25).map((h, i) => ({
    time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `${i}`,
    spo2: h.spo2 ?? 0,
    hr: h.heart_rate ?? 0,
    rr: h.respiratory_rate ?? 0
  }));

  return (
    <div className="space-y-4">
      {/* 4 Primary LOINC Vital Sign Cards (Modulify Clean Layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* 1. Oxygen Saturation (SpO2) */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">SpO2 (Pulse Ox)</span>
            <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800">
              2708-6
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold tracking-tight ${
              spo2 !== null && spo2 < (isScale2 ? 88 : 92) ? 'text-rose-400' : 'text-sky-400'
            }`}>
              {spo2 !== null && spo2 !== undefined ? `${spo2}` : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{isScale2 ? 'Target: 88–92%' : 'Normal: ≥96%'}</span>
            {isScale2 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                Scale 2
              </span>
            )}
          </div>
        </div>

        {/* 2. Heart Rate */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Heart Rate</span>
            <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800">
              8867-4
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold tracking-tight ${
              hr !== null && (hr > 105 || hr < 50) ? 'text-rose-400' : 'text-rose-300'
            }`}>
              {hr !== null && hr !== undefined ? hr : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">bpm</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Normal: 51–90 bpm</span>
          </div>
        </div>

        {/* 3. Respiratory Rate */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Respiratory Rate</span>
            <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800">
              9279-1
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-extrabold tracking-tight ${
              rr !== null && (rr > 22 || rr < 10) ? 'text-teal-400' : 'text-teal-300'
            }`}>
              {rr !== null && rr !== undefined ? rr : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">bpm</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Normal: 12–20 bpm</span>
          </div>
        </div>

        {/* 4. Body Temperature */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Temperature</span>
            <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 border border-slate-800">
              8310-5
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-amber-300 tracking-tight">
              {temp !== null && temp !== undefined ? temp : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-500">°C</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Normal: 36.1–38.0°C</span>
          </div>
        </div>

      </div>

      {/* Smooth Recharts Trend Area Chart (60fps Aesthetic) */}
      <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-200">
            Continuous Telemetry Trajectory
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400" /> SpO2 (%)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> HR (bpm)
            </span>
            <span className="flex items-center gap-1.5 text-teal-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-teal-400" /> RR (bpm)
            </span>
          </div>
        </div>

        <div className="h-44 w-full pt-1">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientSpo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientRr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 130]} stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '0.75rem', 
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ padding: '1px 0' }}
                />
                <ReferenceLine y={92} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.6} />
                <Area type="monotone" dataKey="spo2" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientSpo2)" isAnimationActive={false} />
                <Area type="monotone" dataKey="hr" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#gradientHr)" isAnimationActive={false} />
                <Area type="monotone" dataKey="rr" stroke="#2dd4bf" strokeWidth={1.8} fillOpacity={1} fill="url(#gradientRr)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Connecting telemetry stream...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
