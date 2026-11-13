import React, { useState } from 'react';
import {
  Bell,
  MessageSquare,
  Mail,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Send,
  Globe,
  Radio,
  User,
} from 'lucide-react';
import {
  MultiChannelAlert,
  AlertContact,
  DispatchedSmsRecord,
  DispatchedEmailRecord,
} from '../../lib/multiChannelAlertEngine';

interface MultiChannelAlertsDashboardProps {
  currentAlert: MultiChannelAlert | null;
  contacts: AlertContact[];
  currentVitals: {
    hr: number;
    spo2: number;
    rr?: number;
    temp?: number;
  };
  currentRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  onSimulateHighRisk: () => void;
  onResetNominal: () => void;
  isSimulatedHighRisk?: boolean;
}

export function MultiChannelAlertsDashboard({
  currentAlert,
  contacts,
  currentVitals,
  currentRiskLevel,
  onSimulateHighRisk,
  onResetNominal,
  isSimulatedHighRisk = false,
}: MultiChannelAlertsDashboardProps) {
  // Active selected SMS recipient tab for preview
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);

  const activeSmsList = currentAlert?.dispatchedSms || [];
  const activeEmailList = currentAlert?.dispatchedEmails || [];

  const currentSmsRecord: DispatchedSmsRecord | undefined =
    activeSmsList[selectedRecipientIndex] || activeSmsList[0];

  const emailCount = contacts.filter((c) => c.emailAlerts).length;
  const smsCount = contacts.filter((c) => c.smsAlerts).length;

  return (
    <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 sm:p-7 space-y-6">
      {/* ── TOP SECTION: MULTI-CHANNEL ALERTS OVERVIEW & DEMO BUTTON ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="h-5 w-5 text-[#00A896] animate-pulse" />
            <h3 className="text-lg font-black text-[#131E3A] tracking-tight">
              Multi-Channel Alert System
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                currentRiskLevel === 'HIGH'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : currentRiskLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              Risk: {currentRiskLevel}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time automatic clinical deterioration alerts routed to registered parents and doctors in their preferred language.
          </p>
        </div>

        {/* ── SECTION 13: DEMO FOR JUDGES BUTTON ── */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {isSimulatedHighRisk && (
            <button
              type="button"
              onClick={onResetNominal}
              className="py-2 px-3.5 rounded-full border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold text-[#64748B] transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#94A3B8]" />
              <span>Reset Nominal Vitals</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSimulateHighRisk}
            className="py-2.5 px-5 rounded-full bg-gradient-to-r from-red-500 via-rose-600 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-extrabold text-xs flex items-center space-x-2 shadow-md shadow-red-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <ShieldAlert className="h-4 w-4 animate-bounce" />
            <span>Simulate High-Risk Alert</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 12: STATUS & KPI TILES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Email Alerts */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Email Alerts</span>
          <span className="text-xs font-extrabold text-emerald-700 flex items-center space-x-1 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Enabled ({emailCount})</span>
          </span>
        </div>

        {/* 2. SMS Alerts */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">SMS Alerts</span>
          <span className="text-xs font-extrabold text-blue-700 flex items-center space-x-1 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Simulation Mode</span>
          </span>
        </div>

        {/* 3. Registered Contacts */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Contacts</span>
          <span className="text-xs font-extrabold text-[#131E3A] mt-1 block">
            {contacts.length} Active
          </span>
        </div>

        {/* 4. Current Risk Level */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Risk Level</span>
          <span
            className={`text-xs font-extrabold mt-1 block ${
              currentRiskLevel === 'HIGH'
                ? 'text-red-600'
                : currentRiskLevel === 'MEDIUM'
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`}
          >
            {currentRiskLevel}
          </span>
        </div>

        {/* 5. Email Status */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Email Status</span>
          <span className="text-xs font-extrabold text-[#334155] mt-1 block truncate">
            {activeEmailList.length > 0 ? 'Generated (Queued)' : 'Standby'}
          </span>
        </div>

        {/* 6. SMS Status */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">SMS Status</span>
          <span className="text-xs font-extrabold text-[#334155] mt-1 block truncate">
            {activeSmsList.length > 0 ? 'Alert Generated' : 'Standby'}
          </span>
        </div>
      </div>

      {/* ── SECTION 9 & 10: SMS PHONE-STYLE PREVIEW & EMAIL PREVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* ──────── LEFT: REALISTIC PHONE-STYLE SMS PREVIEW ──────── */}
        <div className="rounded-3xl border border-[#CBD5E1] bg-slate-900 text-white p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div>
            {/* Header: SMS ALERT title + Recipient Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-[#00D2C4]" />
                <span className="text-xs font-extrabold tracking-wider uppercase text-white/90">
                  SMS ALERT
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Simulation Mode
                </span>
              </div>

              {/* Recipient Language Badge */}
              {currentSmsRecord && (
                <div className="flex items-center space-x-1 text-[11px] font-bold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full">
                  <Globe className="h-3 w-3 text-[#00D2C4]" />
                  <span>{currentSmsRecord.language}</span>
                </div>
              )}
            </div>

            {/* Recipient Switch Tabs (Parent vs Doctor) */}
            {activeSmsList.length > 1 && (
              <div className="flex items-center space-x-1.5 pt-3 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Recipient:</span>
                {activeSmsList.map((rec, idx) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedRecipientIndex(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      selectedRecipientIndex === idx
                        ? 'bg-[#00A896] text-white shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {rec.recipientName} ({rec.recipientRole.split('/')[0].trim()})
                  </button>
                ))}
              </div>
            )}

            {/* Current Recipient Meta Header */}
            {currentSmsRecord ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 pb-4 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Recipient:</span>
                  <strong className="text-white">{currentSmsRecord.recipientName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Role:</span>
                  <strong className="text-white">{currentSmsRecord.recipientRole}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Status:</span>
                  <strong className="text-emerald-400">Alert Generated</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Time:</span>
                  <strong className="text-white">{currentSmsRecord.timestamp}</strong>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No active SMS alert generated. Vitals are within normal thresholds.
              </div>
            )}

            {/* Phone Message Bubble */}
            {currentSmsRecord && (
              <div className="mt-2 space-y-2">
                <div className="relative max-w-lg bg-gradient-to-br from-[#064E3B] to-[#047857] text-white p-4 rounded-2xl rounded-tl-sm shadow-md border border-emerald-400/30 text-sm leading-relaxed font-sans font-medium">
                  {currentSmsRecord.message}
                </div>

                {/* Section 9 Disclaimer Requirement */}
                <div className="text-[11px] font-medium text-slate-400 pl-1 flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Prototype Simulation — No real SMS was sent.</span>
                </div>
              </div>
            )}
          </div>

          {/* Phone Footer Status */}
          <div className="pt-2 text-[10px] text-slate-400 border-t border-white/10 flex items-center justify-between">
            <span>Modular SMS Gateway: Standby</span>
            <span>Target: {currentSmsRecord?.recipientPhone || '+91 98450 XXXXX'}</span>
          </div>
        </div>

        {/* ──────── RIGHT: AUTOMATIC EMAIL ALERT PREVIEW ──────── */}
        <div className="rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-[#00A896]" />
                <span className="text-xs font-extrabold tracking-wider uppercase text-[#131E3A]">
                  EMAIL NOTIFICATION
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Auto-Composed
                </span>
              </div>

              {activeEmailList[0] && (
                <span className="text-xs font-bold text-[#64748B]">
                  {activeEmailList[0].timestamp}
                </span>
              )}
            </div>

            {activeEmailList.length > 0 ? (
              <div className="mt-3 space-y-3">
                {/* Subject & Recipient Meta */}
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="font-bold text-[#64748B]">To: </span>
                    <span className="font-mono text-[#131E3A]">
                      {activeEmailList[0].recipientEmail} ({activeEmailList[0].recipientName} · {activeEmailList[0].recipientRole})
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B]">Subject: </span>
                    <span className="font-bold text-red-600">
                      {activeEmailList[0].subject}
                    </span>
                  </div>
                </div>

                {/* Email Body Card */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-xs font-mono text-[#334155] whitespace-pre-line leading-relaxed shadow-2xs">
                  {activeEmailList[0].body}
                </div>

                <div className="text-[11px] text-[#64748B] flex items-center space-x-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Email auto-generated using registered contact address. No manual composition required.</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#94A3B8]">
                No email alert required for nominal readings. Email service ready.
              </div>
            )}
          </div>

          <div className="pt-2 text-[10px] text-[#94A3B8] border-t border-[#E2E8F0] flex items-center justify-between">
            <span>Email Service: Automated Decision Support</span>
            <span>Delivery: Prototype Simulation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
