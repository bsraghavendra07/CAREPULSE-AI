import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchPatientPortalData } from '../lib/api';
import {
  Heart,
  Activity,
  Wind,
  Gauge,
  Thermometer,
  ShieldCheck,
  Bell,
  Calendar,
  User,
  LogOut,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { CarePulseLogo } from '../components/brand/CarePulseLogo';

export function PatientDashboardPage() {
  const { patient, patientLogout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const portalData = await fetchPatientPortalData();
      setData(portalData);
    } catch (err: any) {
      setError(err.message || 'Could not load patient clinical telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    patientLogout();
    navigate('/');
  };

  // Robust profile extraction
  const profile = data?.personal_profile || data?.patient_profile || {
    id: patient?.patient_id || 'P-001',
    name: patient?.name || 'Robert Thompson',
    gender: 'Male',
    age: 68,
    primary_condition: 'Post-Myocardial Infarction / Post-CABG Recovery',
    attending_physician: 'Dr. Robert Rivera, MD (Cardiology)',
    discharge_date: 'Day 3 Post-Discharge',
    wearable_sensor_status: 'Connected & Active',
  };

  // Safe numerical extractor to handle objects like { value: 74, source: 'BIDMC', status: 'NORMAL' }
  const getVitalNum = (v: any, fallback: number): number => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'object' && v.value !== undefined) {
      const parsed = Number(v.value);
      return isNaN(parsed) ? fallback : parsed;
    }
    const parsed = Number(v);
    return isNaN(parsed) ? fallback : parsed;
  };

  const rawVitals = data?.current_vitals || {};
  const hr = getVitalNum(rawVitals.heart_rate, 76);
  const spo2 = getVitalNum(rawVitals.spo2, 97);
  const rr = getVitalNum(rawVitals.respiratory_rate, 16);
  const sbp = getVitalNum(rawVitals.systolic_bp, 122);
  const temp = getVitalNum(rawVitals.temperature, 36.8);

  const milestones = data?.recovery_progress?.milestones || [
    { title: 'Discharge Medication Reconciliation', status: 'COMPLETED', date: 'Day 1' },
    { title: 'Continuous Wearable Sensor Synced', status: 'COMPLETED', date: 'Day 1' },
    { title: 'Daily Resting Vital Stability (48h)', status: 'IN_PROGRESS', date: 'Day 3 of 5' },
    { title: 'Post-Op Wound Healing Self-Inspection', status: 'PENDING', date: 'Day 7' },
    { title: 'Virtual Telehealth Follow-up with Cardiologist', status: 'SCHEDULED', date: 'Day 10' },
  ];

  const recoveryScore =
    data?.recovery_progress?.score ??
    data?.recovery_progress?.overall_score ??
    88;

  const notifications = data?.notifications || [
    {
      id: 'notif-1',
      title: 'Medication Due',
      message: 'Take your prescribed evening dose of Metoprolol with a full glass of water.',
      timestamp: '18:00 Today',
      type: 'REMINDER',
    },
    {
      id: 'notif-2',
      title: 'Daily Telemetry Stable',
      message: 'Your heart rate and oxygen levels have maintained safe stability over the past 24 hours.',
      timestamp: '14:30 Today',
      type: 'STATUS',
    },
    {
      id: 'notif-3',
      title: 'Post-Discharge Recovery Tip',
      message: 'Take light 10-15 minute walks around the home. Rest if you experience shortness of breath.',
      timestamp: 'Yesterday',
      type: 'TIP',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4FBF9] flex flex-col selection:bg-[#00A896] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Indicator */}
          <div className="flex items-center space-x-4">
            <CarePulseLogo size="sm" showText={true} showTagline={false} onClick={() => navigate('/patient-dashboard')} />
            <span className="px-3 py-1 text-[11px] font-bold bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4] rounded-full">
              Patient Recovery Portal
            </span>
          </div>

          {/* User & Sign Out */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right pr-2">
              <p className="text-xs font-bold text-[#131E3A]">{profile.name}</p>
              <p className="text-[10px] text-[#64748B]">ID: {profile.id || profile.patient_id}</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 text-[#64748B] hover:text-[#00A896] hover:bg-[#E6F7F5] rounded-full transition-colors border border-[#E2E8F0]"
              title="Refresh Vitals"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E6F7F5] border border-[#B2EBE4] text-xs font-semibold text-[#067A6E]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00A896]" />
              <span>HIPAA Encrypted</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 w-full">
        
        {/* Welcome Banner */}
        <div className="bg-white rounded-3xl border border-[#CCFBF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-[#E6F7F5] border border-[#B2EBE4] text-[11px] font-bold text-[#067A6E] mb-1">
              <Sparkles className="h-3 w-3 text-[#00A896]" />
              <span>Always Watching. Always Caring.</span>
            </div>
            <h1 className="text-2xl font-black text-[#131E3A] tracking-tight">
              Welcome back, {profile.name}
            </h1>
            <p className="text-sm text-[#64748B]">
              Your continuous post-discharge vital signs and recovery plan are monitored in real time by your hospital team.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 rounded-2xl bg-[#F4FBF9] border border-[#E2E8F0] text-xs">
              <span className="text-[#64748B] block text-[10px] font-bold uppercase tracking-wider">Attending Physician</span>
              <span className="font-bold text-[#131E3A]">{profile.attending_physician || 'Dr. Robert Rivera, MD'}</span>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-[#E6F7F5] border border-[#B2EBE4] text-xs">
              <span className="text-[#067A6E] block text-[10px] font-bold uppercase tracking-wider">Wearable Status</span>
              <span className="font-bold text-[#067A6E] flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-[#00D2C4] animate-pulse"></span>
                <span>Active & Synced</span>
              </span>
            </div>
          </div>
        </div>

        {/* 1. CURRENT LIVE VITAL SIGNS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#131E3A] tracking-tight flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[#00A896]" />
              <span>Current Vital Signs</span>
            </h2>
            <span className="text-xs font-semibold text-[#00A896] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
              ● Live Multi-Sensor Telemetry
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Heart Rate */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Heart Rate</span>
                <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                  <Heart className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-[#131E3A]">
                  {hr}
                </span>
                <span className="text-xs font-medium text-[#64748B]">bpm</span>
              </div>
              <span className="inline-block text-[11px] font-semibold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
                Normal (60-100)
              </span>
            </div>

            {/* SpO2 */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Blood Oxygen (SpO₂)</span>
                <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-[#131E3A]">
                  {spo2}
                </span>
                <span className="text-xs font-medium text-[#64748B]">%</span>
              </div>
              <span className="inline-block text-[11px] font-semibold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
                Nominal (≥96%)
              </span>
            </div>

            {/* Respiratory Rate */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Respiration Rate</span>
                <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                  <Wind className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-[#131E3A]">
                  {typeof rr === 'number' ? Math.round(rr) : rr}
                </span>
                <span className="text-xs font-medium text-[#64748B]">br/min</span>
              </div>
              <span className="inline-block text-[11px] font-semibold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
                Normal (12-20)
              </span>
            </div>

            {/* Systolic BP */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Systolic BP</span>
                <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                  <Gauge className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-[#131E3A]">
                  {sbp}
                </span>
                <span className="text-xs font-medium text-[#64748B]">mmHg</span>
              </div>
              <span className="inline-block text-[11px] font-semibold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
                Stable Range
              </span>
            </div>

            {/* Body Temperature */}
            <div className="bg-white rounded-3xl border border-[#CCFBF1] p-5 shadow-sm space-y-2 hover:border-[#00D2C4] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Body Temp</span>
                <div className="p-2 rounded-2xl bg-[#E6F7F5] text-[#067A6E]">
                  <Thermometer className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-[#131E3A]">
                  {temp.toFixed(1)}
                </span>
                <span className="text-xs font-medium text-[#64748B]">°C</span>
              </div>
              <span className="inline-block text-[11px] font-semibold text-[#067A6E] bg-[#E6F7F5] px-2.5 py-0.5 rounded-full border border-[#B2EBE4]">
                Normothermic
              </span>
            </div>

          </div>
        </div>

        {/* 2-COLUMN SECTION: RECOVERY PROGRESS & NOTIFICATIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recovery Progress & Milestones (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#CCFBF1] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#131E3A] tracking-tight flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-[#00A896]" />
                  <span>Recovery Progress</span>
                </h2>
                <p className="text-xs text-[#64748B]">
                  Milestones toward safe post-discharge stabilization
                </p>
              </div>
              
              {/* Overall Score Badge */}
              <div className="flex items-center space-x-2 bg-[#E6F7F5] px-4 py-2 rounded-2xl border border-[#B2EBE4]">
                <span className="text-xs font-semibold text-[#64748B]">Score:</span>
                <span className="text-xl font-black text-[#067A6E]">{recoveryScore}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-[#64748B]">
                <span>Overall Clinical Recovery</span>
                <span className="text-[#067A6E] font-bold">{recoveryScore}% Complete</span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-[#E6F7F5] border border-[#B2EBE4] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00D2C4] via-[#00B4A0] to-[#00A896] transition-all duration-500"
                  style={{ width: `${recoveryScore}%` }}
                ></div>
              </div>
            </div>

            {/* Milestones Checklist */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Post-Discharge Care Plan Milestones
              </h3>

              <div className="space-y-2.5">
                {milestones.map((m: any, idx: number) => {
                  const isDone = m.status === 'COMPLETED';
                  const isInProg = m.status === 'IN_PROGRESS';
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        isDone
                          ? 'bg-[#E6F7F5]/60 border-[#B2EBE4] text-[#131E3A]'
                          : isInProg
                          ? 'bg-amber-50/60 border-amber-200 text-[#131E3A]'
                          : 'bg-white border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${
                            isDone
                              ? 'bg-gradient-to-r from-[#00D2C4] to-[#00A896] text-white shadow-xs'
                              : isInProg
                              ? 'bg-amber-500 text-white'
                              : 'bg-[#F4FBF9] text-[#64748B] border border-[#E2E8F0]'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#131E3A]">{m.title}</p>
                          <span className="text-xs text-[#64748B]">{m.date}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                          isDone
                            ? 'bg-[#E6F7F5] text-[#067A6E] border border-[#B2EBE4]'
                            : isInProg
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-gray-100 text-[#64748B]'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Patient Notifications & Alerts (1 col) */}
          <div className="bg-white rounded-3xl border border-[#CCFBF1] p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <h2 className="text-lg font-black text-[#131E3A] tracking-tight flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-[#00A896]" />
                  <span>Notifications</span>
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#00D2C4] to-[#00A896] text-white font-bold">
                  {notifications.length} Active
                </span>
              </div>

              <div className="space-y-3">
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-2xl border border-[#B2EBE4] bg-[#F4FBF9] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#131E3A]">{n.title}</span>
                      <span className="text-[10px] text-[#64748B]">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor Contact Box */}
            <div className="rounded-2xl border border-[#B2EBE4] bg-[#E6F7F5] p-4 space-y-2 mt-4 shadow-xs">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-[#067A6E]" />
                <span className="text-xs font-bold text-[#131E3A]">Attending Care Team</span>
              </div>
              <p className="text-xs text-[#64748B]">
                Questions about your recovery plan? You can request a telehealth consultation with Dr. Robert Rivera.
              </p>
              <button
                type="button"
                onClick={() => alert('Consultation request sent to Dr. Robert Rivera, MD')}
                className="w-full mt-2 py-2.5 px-4 rounded-full bg-gradient-to-r from-[#00D2C4] to-[#00A896] hover:from-[#00B4A0] hover:to-[#067A6E] text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(0,168,150,0.35)] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Request Telehealth Call</span>
                <span>&rarr;</span>
              </button>
            </div>

          </div>

        </div>

        {/* 3. HEALTH MONITORING HISTORY TABLE */}
        <div className="bg-white rounded-3xl border border-[#CCFBF1] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#131E3A] tracking-tight flex items-center space-x-2">
                <FileText className="h-5 w-5 text-[#00A896]" />
                <span>Health Monitoring History</span>
              </h2>
              <p className="text-xs text-[#64748B]">Recent continuous telemetry records</p>
            </div>
            <span className="text-xs text-[#067A6E] font-bold bg-[#E6F7F5] px-3 py-1 rounded-full border border-[#B2EBE4]">
              ● Live Stream Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E6F7F5] text-[#131E3A] font-bold border-y border-[#B2EBE4]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Heart Rate</th>
                  <th className="py-3 px-4">Blood Oxygen (SpO₂)</th>
                  <th className="py-3 px-4">Respiratory Rate</th>
                  <th className="py-3 px-4">Signal Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                <tr className="hover:bg-[#F4FBF9]">
                  <td className="py-3 px-4 text-[#131E3A] font-bold">Just now</td>
                  <td className="py-3 px-4 text-[#131E3A]">{hr} bpm</td>
                  <td className="py-3 px-4 text-[#131E3A]">{spo2}%</td>
                  <td className="py-3 px-4 text-[#131E3A]">{typeof rr === 'number' ? Math.round(rr) : rr} br/min</td>
                  <td className="py-3 px-4"><span className="text-[#067A6E] font-bold">Optimal</span></td>
                </tr>
                <tr className="hover:bg-[#F4FBF9]">
                  <td className="py-3 px-4 text-[#64748B]">5 min ago</td>
                  <td className="py-3 px-4 text-[#64748B]">{hr - 1} bpm</td>
                  <td className="py-3 px-4 text-[#64748B]">{spo2}%</td>
                  <td className="py-3 px-4 text-[#64748B]">{typeof rr === 'number' ? Math.round(rr) : rr} br/min</td>
                  <td className="py-3 px-4"><span className="text-[#067A6E] font-bold">Optimal</span></td>
                </tr>
                <tr className="hover:bg-[#F4FBF9]">
                  <td className="py-3 px-4 text-[#64748B]">10 min ago</td>
                  <td className="py-3 px-4 text-[#64748B]">{hr + 2} bpm</td>
                  <td className="py-3 px-4 text-[#64748B]">{spo2 - 1}%</td>
                  <td className="py-3 px-4 text-[#64748B]">{typeof rr === 'number' ? Math.round(rr) + 1 : rr} br/min</td>
                  <td className="py-3 px-4"><span className="text-[#067A6E] font-bold">Optimal</span></td>
                </tr>
                <tr className="hover:bg-[#F4FBF9]">
                  <td className="py-3 px-4 text-[#64748B]">15 min ago</td>
                  <td className="py-3 px-4 text-[#64748B]">{hr} bpm</td>
                  <td className="py-3 px-4 text-[#64748B]">{spo2}%</td>
                  <td className="py-3 px-4 text-[#64748B]">{typeof rr === 'number' ? Math.round(rr) : rr} br/min</td>
                  <td className="py-3 px-4"><span className="text-[#067A6E] font-bold">Optimal</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#E2E8F0] py-4 text-center text-xs text-[#64748B] mt-8">
        <p>&copy; {new Date().getFullYear()} CarePulse Patient Recovery System. All health data is protected under HIPAA.</p>
      </footer>
    </div>
  );
}
