import React, { useState, useEffect, useMemo } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
import { RoutedAlert, AlertStats, AlertStatus, AlertSeverity } from '../types/alert';
import {
  fetchRoutedAlerts,
  fetchAlertStats,
  acknowledgeAlert,
  reviewAlert,
  resolveAlert,
} from '../lib/api';
import {
  ShieldAlert,
  BellRing,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Heart,
  Wind,
  Brain,
  Droplets,
  Stethoscope,
  Activity,
  UserCheck,
  Building2,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { getDepartmentConfig } from './PatientsPage';

interface SpecialistAlertCenterPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  onSelectPatient: (patient: PatientProfile) => void;
}

export function SpecialistAlertCenterPage({
  patients,
  latestTicks,
  onSelectPatient,
}: SpecialistAlertCenterPageProps) {
  const [alerts, setAlerts] = useState<RoutedAlert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load alerts and statistics from backend
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [alertsData, statsData] = await Promise.all([
        fetchRoutedAlerts({
          department: selectedDept !== 'all' ? selectedDept : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        }),
        fetchAlertStats(),
      ]);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching specialist alerts:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 3000);
    return () => clearInterval(interval);
  }, [selectedDept, selectedStatus, selectedSeverity]);

  // Handle Action Buttons
  const handleAcknowledge = async (alertId: string) => {
    try {
      const updated = await acknowledgeAlert(alertId, 'Dr. Rivera');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      setActionFeedback(`Alert #${alertId.slice(-6)} acknowledged`);
      setTimeout(() => setActionFeedback(null), 3000);
      loadData();
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    }
  };

  const handleReview = async (alertId: string) => {
    try {
      const updated = await reviewAlert(alertId, 'Dr. Rivera');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      setActionFeedback(`Alert #${alertId.slice(-6)} marked Under Review`);
      setTimeout(() => setActionFeedback(null), 3000);
      loadData();
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const updated = await resolveAlert(alertId, 'Dr. Rivera');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      setActionFeedback(`Alert #${alertId.slice(-6)} marked Resolved`);
      setTimeout(() => setActionFeedback(null), 3000);
      loadData();
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        a.patient_name.toLowerCase().includes(term) ||
        a.patient_id.toLowerCase().includes(term) ||
        a.patient_condition.toLowerCase().includes(term) ||
        a.department.toLowerCase().includes(term) ||
        a.specialist_name.toLowerCase().includes(term) ||
        a.alert_reason.toLowerCase().includes(term);

      return matchSearch;
    });
  }, [alerts, searchTerm]);

  const departmentsList = [
    { id: 'all', label: 'All Departments' },
    { id: 'Cardiology', label: 'Cardiology', icon: Heart },
    { id: 'Pulmonology', label: 'Pulmonology', icon: Wind },
    { id: 'General Medicine / Critical Care', label: 'General / Critical Care', icon: Activity },
    { id: 'Surgical Care / Orthopedics', label: 'Surgical / Orthopedic', icon: Stethoscope },
    { id: 'Neurology', label: 'Neurology', icon: Brain },
    { id: 'Nephrology', label: 'Nephrology', icon: Droplets },
    { id: 'Endocrinology', label: 'Endocrinology', icon: Stethoscope },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Action Feedback Toast ── */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/40 bg-[#0d161d] px-4 py-2.5 text-xs text-emerald-300 shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
            <span>Specialist Alert Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Condition-directed smart routing, specialist multi-disciplinary triaging & emergency escalation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#1e2433] bg-[#11151f] text-xs text-slate-300 hover:text-white hover:bg-[#161c28] transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI Metric Cards (Feature 3) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Routed Alerts */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Routed Alerts</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BellRing className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-extrabold font-mono text-white">
              {stats?.total_alerts ?? alerts.length}
            </div>
            <span className="text-[10px] text-slate-400">all departments</span>
          </div>
        </div>

        {/* Pending Specialist Reviews */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Specialist Reviews</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-extrabold font-mono text-amber-400">
              {stats?.pending_reviews ?? alerts.filter((a) => a.status === 'PENDING').length}
            </div>
            <span className="text-[10px] text-amber-300/70">awaiting review</span>
          </div>
        </div>

        {/* Acknowledged / In Review Alerts */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Acknowledged Alerts</span>
            <div className="h-7 w-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-extrabold font-mono text-sky-400">
              {stats?.acknowledged_alerts ?? alerts.filter((a) => a.status === 'ACKNOWLEDGED').length}
            </div>
            <span className="text-[10px] text-slate-400">active specialist engagement</span>
          </div>
        </div>

        {/* Urgent Alerts */}
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Urgent Alerts</span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 animate-pulse">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-extrabold font-mono text-rose-400">
              {stats?.urgent_alerts ?? alerts.filter((a) => a.severity === 'URGENT').length}
            </div>
            <span className="text-[10px] text-rose-300/80">⚡ dual-escalated</span>
          </div>
        </div>
      </div>

      {/* ── Department-Wise Alert Distribution (Feature 3) ── */}
      <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Department-Wise Alert Distribution</h3>
          </div>
          <span className="text-[11px] text-slate-400">Smart Condition & CDS Mapped</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {departmentsList.slice(1).map((dept) => {
            const count = stats?.department_distribution?.[dept.id] ?? alerts.filter((a) => a.department === dept.id).length;
            const Icon = dept.icon || Stethoscope;
            const isSelected = selectedDept === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(isSelected ? 'all' : dept.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm ring-1 ring-emerald-500/30'
                    : 'border-[#1b2230] bg-[#0c1017] text-slate-300 hover:border-[#2a3449] hover:bg-[#111722]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-white px-1.5 py-0.2 rounded bg-[#17202e]">
                    {count}
                  </span>
                </div>
                <div className="text-[11px] font-bold truncate text-white">{dept.label}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                  {count > 0 ? `${count} active alerts` : 'Nominal'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar & Search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d111a] border border-[#1a1f2c] p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter Selector */}
          <div className="flex items-center space-x-1 bg-[#131924] border border-[#1f283a] p-1 rounded-xl text-xs">
            <span className="text-[10px] text-slate-400 font-semibold px-2 uppercase">Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              {departmentsList.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#10141e] text-slate-200">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-[#131924] border border-[#1f283a] p-1 rounded-xl text-xs">
            <span className="text-[10px] text-slate-400 font-semibold px-2 uppercase">Status:</span>
            {['all', 'PENDING', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                  selectedStatus === st
                    ? 'bg-emerald-500 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center space-x-1 bg-[#131924] border border-[#1f283a] p-1 rounded-xl text-xs">
            <span className="text-[10px] text-slate-400 font-semibold px-2 uppercase">Severity:</span>
            {['all', 'URGENT', 'REVIEW', 'WATCH', 'DEVICE_WARNING'].map((sv) => (
              <button
                key={sv}
                onClick={() => setSelectedSeverity(sv)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                  selectedSeverity === sv
                    ? 'bg-emerald-500 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sv === 'all' ? 'All' : sv.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, specialist, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-60 rounded-xl border border-[#1f283a] bg-[#131924] pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* ── Alert Cards List (Feature 3, 4, 5, 6) ── */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">All Specialist Queues Nominal</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No active alerts currently match the selected criteria. Genuine clinical deterioration will route here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const patient = patients.find((p) => p.id === alert.patient_id);
            const deptCfg = getDepartmentConfig(alert.department);
            const DeptIcon = deptCfg.icon;

            // Severity badge
            let severityBadge = (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#292212] text-[#eab308] border border-[#4d3e18]">
                WATCH
              </span>
            );
            if (alert.severity === 'URGENT') {
              severityBadge = (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#331414] text-[#f87171] border border-[#521b1b] animate-pulse">
                  URGENT (SCORE {alert.news2_score})
                </span>
              );
            } else if (alert.severity === 'REVIEW') {
              severityBadge = (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#332412] text-[#fbbf24] border border-[#543b18]">
                  REVIEW (SCORE {alert.news2_score})
                </span>
              );
            } else if (alert.severity === 'DEVICE_WARNING' || alert.is_artifact) {
              severityBadge = (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#2a1d2e] text-[#d8b4fe] border border-[#4c2d58]">
                  DEVICE WARNING
                </span>
              );
            }

            // Status badge
            let statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PENDING REVIEW
              </span>
            );
            if (alert.status === 'ACKNOWLEDGED') {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  ACKNOWLEDGED
                </span>
              );
            } else if (alert.status === 'UNDER_REVIEW') {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  UNDER REVIEW
                </span>
              );
            } else if (alert.status === 'RESOLVED') {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RESOLVED
                </span>
              );
            }

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border bg-[#10141e] p-5 transition-all shadow-sm space-y-4 ${
                  alert.severity === 'URGENT'
                    ? 'border-rose-500/50 bg-[#141217]'
                    : alert.is_artifact
                    ? 'border-purple-500/30'
                    : 'border-[#1a1f2c] hover:border-[#2b354a]'
                }`}
              >
                {/* ── Top Row: Patient Info + Badges ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b2230] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-[#151c2a] border border-[#232f47] flex items-center justify-center font-bold text-white text-xs">
                      {alert.patient_id}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-sm">{alert.patient_name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">#{alert.patient_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {alert.patient_condition}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {severityBadge}
                    {statusBadge}
                  </div>
                </div>

                {/* ── Feature 6: Emergency Safety Banner ── */}
                {alert.emergency_flag && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 flex items-center justify-between text-xs text-rose-300">
                    <div className="flex items-center space-x-2 font-semibold">
                      <Flame className="h-4 w-4 text-rose-400 animate-pulse" />
                      <span>CENTRAL EMERGENCY QUEUE ESCALATED</span>
                    </div>
                    <span className="text-[10px] text-rose-300/80">
                      Simultaneous Specialist & Rapid Response Escalation
                    </span>
                  </div>
                )}

                {/* ── Feature 6: Sensor Artifact Notice ── */}
                {alert.is_artifact && (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-2.5 flex items-center space-x-2 text-xs text-purple-300">
                    <AlertTriangle className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>
                      <strong>Signal Quality Warning:</strong> Telemetry flagged as motion artifact or probe disconnect. Technical verification required before initiating clinical therapy.
                    </span>
                  </div>
                )}

                {/* ── Middle: Reason + Vitals Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left: Alert Reason & Clinical Guidance */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs">
                      <span className="text-slate-400 font-medium">Trigger Reason: </span>
                      <span className="font-semibold text-white">{alert.alert_reason}</span>
                    </div>
                    <div className="text-xs text-slate-300 bg-[#0c1017] p-2.5 rounded-xl border border-[#1a1f2c]">
                      <span className="text-emerald-400 font-semibold">Clinical Action: </span>
                      <span>{alert.clinical_action}</span>
                    </div>

                    {/* Assigned Specialist & Department */}
                    <div className="rounded-xl bg-[#0c1017] border border-[#1b2333] p-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-lg border ${deptCfg.color}`}>
                          <DeptIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white flex items-center space-x-1.5">
                            <span>Routed to: {alert.specialist_name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{alert.specialist_title}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${deptCfg.badgeColor}`}>
                        {alert.department}
                      </div>
                    </div>
                  </div>

                  {/* Right: Vitals at Alert */}
                  <div className="rounded-xl bg-[#0c1017] border border-[#1a1f2c] p-3 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Vitals Snapshot</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-[#141924] p-1.5 rounded-lg border border-[#1f2638]">
                        <div className="text-[9px] text-slate-400">HR</div>
                        <div className="font-mono font-bold text-emerald-400">
                          {alert.vital_readings?.heart_rate ?? '--'} bpm
                        </div>
                      </div>
                      <div className="bg-[#141924] p-1.5 rounded-lg border border-[#1f2638]">
                        <div className="text-[9px] text-slate-400">SpO₂</div>
                        <div className="font-mono font-bold text-teal-400">
                          {alert.vital_readings?.oxygen_saturation ?? '--'}%
                        </div>
                      </div>
                      <div className="bg-[#141924] p-1.5 rounded-lg border border-[#1f2638]">
                        <div className="text-[9px] text-slate-400">RR</div>
                        <div className="font-mono font-bold text-sky-400">
                          {alert.vital_readings?.respiratory_rate ?? '--'}/m
                        </div>
                      </div>
                      <div className="bg-[#141924] p-1.5 rounded-lg border border-[#1f2638]">
                        <div className="text-[9px] text-slate-400">SBP</div>
                        <div className="font-mono font-bold text-slate-200">
                          {alert.vital_readings?.systolic_bp ?? '--'} mmHg
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Bottom: Specialist Action Toolbar (Feature 5) ── */}
                <div className="pt-2 border-t border-[#1b2230] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span>Logged at {new Date(alert.timestamp).toLocaleTimeString()}</span>
                    {alert.acknowledged_by && (
                      <span className="text-emerald-400 font-semibold">
                        • Handled by {alert.acknowledged_by}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* View Patient History button */}
                    {patient && (
                      <button
                        onClick={() => onSelectPatient(patient)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#222a3d] bg-[#121722] hover:bg-[#1a2130] text-slate-300 hover:text-white transition-all flex items-center space-x-1 font-medium"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Patient Deep-Dive</span>
                      </button>
                    )}

                    {/* Acknowledge Action */}
                    {alert.status === 'PENDING' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-bold transition-all flex items-center space-x-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {/* Under Review Action */}
                    {(alert.status === 'PENDING' || alert.status === 'ACKNOWLEDGED') && (
                      <button
                        onClick={() => handleReview(alert.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold transition-all flex items-center space-x-1"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        <span>Mark Under Review</span>
                      </button>
                    )}

                    {/* Resolve Action */}
                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold transition-all flex items-center space-x-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Resolve Alert</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SpecialistAlertCenterPage;
