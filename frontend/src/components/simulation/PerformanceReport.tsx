import React, { useEffect, useState } from 'react';
import { PerformanceReport as PerformanceReportType } from '../../types/telemetry';
import { fetchPerformanceReport } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  BarChart3,
  RotateCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export function PerformanceReport() {
  const [report, setReport] = useState<PerformanceReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchPerformanceReport();
      setReport(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !report) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Querying runtime performance counters...
        </CardContent>
      </Card>
    );
  }

  if (!report || report.total_ticks === 0) {
    return (
      <Card>
        <CardHeader className="p-6">
          <CardTitle className="text-lg font-bold flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Scenario Performance & Validation Report</span>
          </CardTitle>
          <CardDescription>
            Live-computed analytics derived strictly from real-time simulation counters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="bg-muted/40 p-6 rounded-xl border border-border text-center space-y-2">
            <Info className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-semibold text-foreground">No telemetry processed yet</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The telemetry streaming loop is active. Start running simulation ticks or trigger a scenario in the Scenario Controller to accumulate live benchmark metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format per-patient data for chart
  const chartData = Object.entries(report.per_patient || {}).map(([pid, stats]) => ({
    patientId: pid,
    'NEWS2 Alerts': stats.news2_alerts_fired,
    'Red Scores': stats.news2_red_scores,
    'Personalized Advisories': stats.personalized_advisories,
    'Artifact Flags': stats.artifact_flags,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Scenario Performance & Validation Report</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Strictly runtime computed metrics • Zero hardcoded values • RCP NEWS2 vs Personalized Benchmark
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="text-xs space-x-1.5"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Counters</span>
        </Button>
      </div>

      {/* Aggregate Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Ticks & Days */}
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Monitored Patient Time
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {report.total_ticks.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">ticks</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {report.total_monitored_patient_days !== undefined ? `${report.total_monitored_patient_days} patient-days` : 'Continuous stream'}
            </p>
          </CardContent>
        </Card>

        {/* NEWS2 Alerts Fired */}
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Alerts Fired
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {report.news2_alerts_fired}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {report.news2_alert_rate}% tick alert rate
            </p>
          </CardContent>
        </Card>

        {/* Normalized Alerts Per Patient-Day */}
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Alerts / Patient-Day
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {report.alerts_per_patient_day !== undefined ? report.alerts_per_patient_day : '--'}
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-1">
              Normalized 24h Clinical Load
            </p>
          </CardContent>
        </Card>

        {/* Personalized Advisories */}
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Personalized Advisories
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
              {report.personalized_advisories}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Individual baseline shifts
            </p>
          </CardContent>
        </Card>

        {/* Artifacts Flagged */}
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Artifacts Flagged
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
              {report.artifact_flags}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {report.artifact_flag_rate}% noise detection rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">
            Per-Patient Event Distribution (Live Accumulated)
          </CardTitle>
          <CardDescription className="text-xs">
            Comparison of Standard NEWS2 Alerts, Urgent Red Scores, Personalized Advisories, and Sensor Artifacts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="patientId" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="NEWS2 Alerts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Red Scores" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Personalized Advisories" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Artifact Flags" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-Patient Table */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">
            Per-Patient Clinical Telemetry Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="rounded-lg border border-border overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Ticks</th>
                  <th className="p-3">NEWS2 Alerts</th>
                  <th className="p-3">Red Scores</th>
                  <th className="p-3">Personalized</th>
                  <th className="p-3">Artifacts</th>
                  <th className="p-3">Alert Rate</th>
                  <th className="p-3 text-emerald-400">Alerts / Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {Object.entries(report.per_patient || {}).map(([pid, st]) => (
                  <tr key={pid} className="hover:bg-muted/20">
                    <td className="p-3 font-sans font-semibold text-foreground">{pid}</td>
                    <td className="p-3">{st.total_ticks}</td>
                    <td className="p-3 text-amber-400 font-bold">{st.news2_alerts_fired}</td>
                    <td className="p-3 text-rose-400 font-bold">{st.news2_red_scores}</td>
                    <td className="p-3 text-indigo-400">{st.personalized_advisories}</td>
                    <td className="p-3 text-sky-400">{st.artifact_flags}</td>
                    <td className="p-3 font-sans">{st.news2_alert_rate}%</td>
                    <td className="p-3 text-emerald-400 font-bold">{st.alerts_per_patient_day !== undefined ? st.alerts_per_patient_day : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Detection Latency Log */}
      {report.scenario_events && report.scenario_events.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Deterioration Scenario Replay Log & Latency</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {report.scenario_events.map((evt, idx) => {
                const key = `${evt.patient_id}:${evt.scenario}`;
                const latency = report.detection_latency ? report.detection_latency[key] : null;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground flex items-center space-x-2">
                        <span className="font-mono text-muted-foreground">{evt.patient_id}</span>
                        <span>•</span>
                        <span className="uppercase text-amber-400">{evt.scenario}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Tick #{evt.tick}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Triggered at: {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="text-right">
                      {latency !== null && latency !== undefined ? (
                        <div className="text-emerald-400 font-bold font-mono">
                          Detected in {latency} ticks
                        </div>
                      ) : (
                        <div className="text-muted-foreground italic">
                          Monitoring escalation...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

