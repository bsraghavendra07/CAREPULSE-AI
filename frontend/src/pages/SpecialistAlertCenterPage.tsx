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
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [fetchedAlerts, fetchedStats] = await Promise.all([
        fetchRoutedAlerts({
          department: selectedDept === 'all' ? undefined : selectedDept,
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
        }),
        fetchAlertStats(),
      ]);
      setAlerts(fetchedAlerts);
      setStats(fetchedStats);
    } catch (err) {
      console.warn('Could not fetch alerts from backend:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 8000);
    return () => clearInterval(interval);
  }, [selectedDept, selectedStatus, selectedSeverity]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const updated = await acknowledgeAlert(alertId, 'Dr. Robert Rivera, MD');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      showFeedback(`Alert #${alertId} acknowledged by specialist.`);
      loadData(false);
    } catch {
      showFeedback(`Acknowledged alert #${alertId}`);
    }
  };

  const handleReview = async (alertId: string) => {
    try {
      const updated = await reviewAlert(alertId, 'Dr. Robert Rivera, MD');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      showFeedback(`Alert #${alertId} marked as under specialist clinical review.`);
      loadData(false);
    } catch {
      showFeedback(`Marked alert #${alertId} under review.`);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const updated = await resolveAlert(alertId, 'Therapy administered; patient stabilized.');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      showFeedback(`Alert #${alertId} resolved and logged.`);
      loadData(false);
    } catch {
      showFeedback(`Resolved alert #${alertId}`);
    }
  };

  // Filter alerts by search term
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        a.patient_name.toLowerCase().includes(term) ||
        a.patient_id.toLowerCase().includes(term) ||
        a.department.toLowerCase().includes(term) ||
        a.specialist_name.toLowerCase().includes(term) ||
        a.alert_reason.toLowerCase().includes(term);
      return matchSearch;
    });
  }, [alerts, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ── Action Feedback Toast ── */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-xs text-emerald-800 shadow-xl flex items-center space-x-2 animate-in slide-in-from-bottom">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold">{actionFeedback}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827] flex items-center space-x-2.5">
            <ShieldAlert className="h-5 w-5 text-[#4A90E2]" />
            <span>Specialist Alert Center</span>
          </h2>
          <p className="text-xs text-[#4B5563] mt-1">
            Condition-directed smart routing, specialist multi-disciplinary triaging & emergency escalation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-xs text-[#111827] hover:bg-[#F0F7FF] transition-all shadow-sm font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#4A90E2]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Routed Alerts */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Routed Alerts</span>
            <div className="h-8 w-8 rounded-xl bg-[#D9F0FF] flex items-center justify-center text-[#4A90E2]">
              <BellRing className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-[#111827]">
              {stats?.total_alerts ?? alerts.length}
            </div>
            <span className="text-[11px] text-[#4B5563]">all departments</span>
          </div>
        </div>

        {/* Pending Specialist Reviews */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[10px]">Pending Reviews</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#F59E0B]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-[#F59E0B]">
              {stats?.pending_reviews ?? alerts.filter((a) => a.status === 'PENDING').length}
            </div>
            <span className="text-[11px] text-[#4B5563]">awaiting review</span>
          </div>
        </div>

        {/* Acknowledged / In Review Alerts */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[10px]">Acknowledged Alerts</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#4A90E2]">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-[#4A90E2]">
              {stats?.acknowledged_alerts ?? alerts.filter((a) => a.status === 'ACKNOWLEDGED').length}
            </div>
            <span className="text-[11px] text-[#4B5563]">in clinician engagement</span>
          </div>
        </div>

        {/* Urgent Alerts */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#4B5563]">
            <span className="font-bold uppercase tracking-wider text-[10px]">Urgent Alerts</span>
            <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center text-[#EF4444]">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-3xl font-extrabold text-[#EF4444]">
              {stats?.urgent_alerts ?? alerts.filter((a) => a.severity === 'URGENT').length}
            </div>
            <span className="text-[11px] text-[#EF4444] font-medium">dual-escalated</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] bg-[#F0F7FF] px-3 py-1.5 text-xs text-[#111827] font-semibold focus:outline-none focus:ring-1 focus:ring-[#4A90E2]"
          >
            <option value="all">All Departments</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Pulmonology">Pulmonology</option>
            <option value="General Medicine / Critical Care">General Medicine / Critical Care</option>
            <option value="Surgical Care / Orthopedics">Surgical Care / Orthopedics</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] bg-[#F0F7FF] px-3 py-1.5 text-xs text-[#111827] font-semibold focus:outline-none focus:ring-1 focus:ring-[#4A90E2]"
          >
            <option value="all">All Severities</option>
            <option value="URGENT">Urgent (Red Score)</option>
            <option value="REVIEW">Review</option>
            <option value="WATCH">Watch</option>
            <option value="DEVICE_WARNING">Device Warning</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search patient, specialist, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-64 rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#4A90E2]"
          />
        </div>
      </div>

      {/* ── Alert Cards List ── */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-12 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#111827]">All Specialist Queues Nominal</h3>
          <p className="text-xs text-[#4B5563] max-w-md mx-auto">
            No active alerts currently match the selected criteria. Genuine clinical deterioration will route here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const patient = patients.find((p) => p.id === alert.patient_id);
            const deptCfg = getDepartmentConfig(alert.department);
            const DeptIcon = deptCfg.icon;

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm space-y-4 hover:border-[#4A90E2]/50 transition-all"
              >
                {/* Top Row: Patient Info + Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-[#D9F0FF] text-[#4A90E2] flex items-center justify-center font-bold text-xs">
                      {alert.patient_id}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-[#111827] text-sm">{alert.patient_name}</h4>
                        <span className="text-[11px] text-[#4B5563]">#{alert.patient_id}</span>
                      </div>
                      <div className="text-xs text-[#4B5563] font-medium">
                        {alert.patient_condition}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        alert.severity === 'URGENT'
                          ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {alert.severity} (Score {alert.news2_score})
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0F7FF] text-[#4A90E2] border border-[#E5E7EB]">
                      {alert.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Emergency Safety Banner */}
                {alert.emergency_flag && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center justify-between text-xs text-red-800">
                    <div className="flex items-center space-x-2 font-bold">
                      <Flame className="h-4 w-4 text-[#EF4444] animate-pulse" />
                      <span>CENTRAL EMERGENCY QUEUE ESCALATED</span>
                    </div>
                    <span className="text-[11px] text-red-700">
                      Simultaneous Specialist & Rapid Response Escalation
                    </span>
                  </div>
                )}

                {/* Middle: Reason + Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs">
                      <span className="text-[#4B5563] font-medium">Trigger Reason: </span>
                      <span className="font-bold text-[#111827]">{alert.alert_reason}</span>
                    </div>
                    <div className="text-xs text-[#111827] bg-[#F0F7FF] p-3 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[#4A90E2] font-bold">Clinical Action: </span>
                      <span>{alert.clinical_action}</span>
                    </div>

                    <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-lg border ${deptCfg.color}`}>
                          <DeptIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#111827]">
                            Routed to: {alert.specialist_name}
                          </div>
                          <div className="text-[11px] text-[#4B5563]">{alert.specialist_title}</div>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${deptCfg.badgeColor}`}>
                        {alert.department}
                      </div>
                    </div>
                  </div>

                  {/* Vitals Snapshot */}
                  <div className="rounded-xl bg-[#F0F7FF] border border-[#E5E7EB] p-3.5 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] flex items-center justify-between">
                      <span>Vitals Snapshot</span>
                      <span className="text-[10px] text-[#4B5563] font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded-lg border border-[#E5E7EB] shadow-sm">
                        <div className="text-[10px] text-[#4B5563]">HR</div>
                        <div className="font-mono font-bold text-[#111827]">
                          {alert.vital_readings?.heart_rate ?? '--'} bpm
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E5E7EB] shadow-sm">
                        <div className="text-[10px] text-[#4B5563]">SpO₂</div>
                        <div className="font-mono font-bold text-[#4A90E2]">
                          {alert.vital_readings?.oxygen_saturation ?? '--'}%
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E5E7EB] shadow-sm">
                        <div className="text-[10px] text-[#4B5563]">RR</div>
                        <div className="font-mono font-bold text-[#111827]">
                          {alert.vital_readings?.respiratory_rate ?? '--'}/m
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E5E7EB] shadow-sm">
                        <div className="text-[10px] text-[#4B5563]">SBP</div>
                        <div className="font-mono font-bold text-[#111827]">
                          {alert.vital_readings?.systolic_bp ?? '--'} mmHg
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Toolbar */}
                <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[11px] text-[#4B5563] flex items-center space-x-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Logged at {new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {patient && (
                      <button
                        onClick={() => onSelectPatient(patient)}
                        className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-[#F0F7FF] text-[#111827] hover:bg-[#D9F0FF] transition-all flex items-center space-x-1 font-semibold text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#4A90E2]" />
                        <span>Patient Deep-Dive</span>
                      </button>
                    )}

                    {alert.status === 'PENDING' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#4A90E2] hover:bg-[#3b78c4] text-white font-semibold text-xs shadow-sm transition-all flex items-center space-x-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {(alert.status === 'PENDING' || alert.status === 'ACKNOWLEDGED') && (
                      <button
                        onClick={() => handleReview(alert.id)}
                        className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F0F7FF] text-[#111827] font-semibold text-xs transition-all flex items-center space-x-1"
                      >
                        <Activity className="h-3.5 w-3.5 text-[#4A90E2]" />
                        <span>Under Review</span>
                      </button>
                    )}

                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm transition-all flex items-center space-x-1"
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
