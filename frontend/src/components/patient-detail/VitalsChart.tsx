import React, { useMemo } from 'react';
import { TelemetryTick } from '../../types/telemetry';
import { PatientProfile } from '../../types/patient';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ProvenanceBadge } from './ProvenanceBadge';
import { Activity, Heart, Wind, Thermometer } from 'lucide-react';

interface VitalsChartProps {
  patient: PatientProfile;
  history: TelemetryTick[];
}

export function VitalsChart({ patient, history }: VitalsChartProps) {
  // Format history for Recharts
  const chartData = useMemo(() => {
    return history.map((tick) => {
      const time = new Date(tick.timestamp);
      const timeStr = `${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

      const hr = typeof tick.vitals.heart_rate?.value === 'number' ? tick.vitals.heart_rate.value : null;
      const spo2 = typeof tick.vitals.oxygen_saturation?.value === 'number' ? tick.vitals.oxygen_saturation.value : null;
      const rr = typeof tick.vitals.respiratory_rate?.value === 'number' ? tick.vitals.respiratory_rate.value : null;
      const sbp = typeof tick.vitals.systolic_bp?.value === 'number' ? tick.vitals.systolic_bp.value : null;
      const temp = typeof tick.vitals.body_temperature?.value === 'number' ? tick.vitals.body_temperature.value : null;

      return {
        time: timeStr,
        tick: tick.tick_number,
        heart_rate: hr,
        oxygen_saturation: spo2,
        respiratory_rate: rr,
        systolic_bp: sbp,
        body_temperature: temp,
        hr_source: tick.vitals.heart_rate?.source || 'SIMULATED',
        spo2_source: tick.vitals.oxygen_saturation?.source || 'SIMULATED',
      };
    });
  }, [history]);

  const latestTick = history[history.length - 1];
  const b = patient.baseline;

  return (
    <div className="space-y-4">
      {/* 1. Heart Rate & SpO2 Joint Overview */}
      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-rose-400" />
            <CardTitle className="text-sm font-semibold">
              Heart Rate (bpm) & Oxygen Saturation (%)
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <ProvenanceBadge source={latestTick?.vitals.heart_rate?.source || 'BIDMC'} />
            <span className="text-muted-foreground text-[11px]">
              Shaded bands = Patient Baseline Range
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" domain={[40, 160]} stroke="#f43f5e" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[75, 100]} stroke="#38bdf8" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />

                {/* Shaded baseline band for HR */}
                <ReferenceArea
                  yAxisId="left"
                  y1={b.heart_rate - 6}
                  y2={b.heart_rate + 6}
                  fill="#f43f5e"
                  fillOpacity={0.08}
                />
                {/* Shaded baseline band for SpO2 */}
                <ReferenceArea
                  yAxisId="right"
                  y1={b.oxygen_saturation - 2}
                  y2={Math.min(100, b.oxygen_saturation + 2)}
                  fill="#38bdf8"
                  fillOpacity={0.08}
                />

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="heart_rate"
                  name="Heart Rate (bpm)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="oxygen_saturation"
                  name="SpO₂ (%)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Respiratory Rate & Systolic BP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Respiratory Rate */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wind className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm font-semibold">Respiration Rate (breaths/min)</CardTitle>
            </div>
            <ProvenanceBadge source={latestTick?.vitals.respiratory_rate?.source || 'BIDMC'} />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis domain={[6, 36]} stroke="#10b981" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                  />
                  <ReferenceArea
                    y1={b.respiratory_rate - 2}
                    y2={b.respiratory_rate + 2}
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="respiratory_rate"
                    name="Respiration Rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Systolic Blood Pressure */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-sm font-semibold">Systolic BP (mmHg)</CardTitle>
            </div>
            <ProvenanceBadge source="SIMULATED" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis domain={[70, 180]} stroke="#a855f7" tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                  />
                  <ReferenceArea
                    y1={b.systolic_bp - 10}
                    y2={b.systolic_bp + 10}
                    fill="#a855f7"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="systolic_bp"
                    name="Systolic BP"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

