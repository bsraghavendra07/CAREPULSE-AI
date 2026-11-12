import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Send,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Flame,
  ExternalLink,
  RefreshCw,
  PhoneCall,
  UserCheck,
  Activity,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { SMSAlertRecord, SMSGatewayConfig } from '../../types/sms';
import { PatientProfile } from '../../types/patient';
import {
  fetchDispatchedSMS,
  sendTestEmergencySMS,
  fetchSMSConfig,
} from '../../lib/api';

interface EmergencySMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: PatientProfile[];
  initialPatientId?: string;
}

export function EmergencySMSModal({
  isOpen,
  onClose,
  patients,
  initialPatientId,
}: EmergencySMSModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'test'>('history');
  const [smsList, setSmsList] = useState<SMSAlertRecord[]>([]);
  const [selectedSMS, setSelectedSMS] = useState<SMSAlertRecord | null>(null);
  const [config, setConfig] = useState<SMSGatewayConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for test SMS dispatch
  const [testPatientId, setTestPatientId] = useState<string>(initialPatientId || patients[0]?.id || 'P-001');
  const [recipientPhone, setRecipientPhone] = useState<string>('+1 (555) 911-0000');
  const [customNote, setCustomNote] = useState<string>('Simulated critical clinical deterioration: Acute hypoxemic respiratory event');

  const loadSMSHistory = async () => {
    setLoading(true);
    try {
      const [records, cfg] = await Promise.all([
        fetchDispatchedSMS(),
        fetchSMSConfig(),
      ]);
      setSmsList(records);
      setConfig(cfg);
      if (records.length > 0 && !selectedSMS) {
        setSelectedSMS(records[0]);
      }
    } catch (err: any) {
      console.error('Failed to load SMS history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSMSHistory();
      if (initialPatientId) {
        setTestPatientId(initialPatientId);
      }
    }
  }, [isOpen, initialPatientId]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const record = await sendTestEmergencySMS({
        patient_id: testPatientId,
        recipient_phone: recipientPhone,
        custom_note: customNote,
        force_urgent: true,
      });
      setFeedback({
        type: 'success',
        message: `Emergency SMS successfully sent to ${record.recipient_phone}! (Carrier: ${record.carrier_route})`,
      });
      setSmsList((prev) => [record, ...prev]);
      setSelectedSMS(record);
      setActiveTab('history');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Dispatch failed: ${err.message || 'Check gateway connectivity'}`,
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-[#1e2738] bg-[#0c1017] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#1b2230] px-6 py-4 bg-[#0e131d]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Emergency Cellular SMS Dispatch Gateway</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                  <Radio className="h-3 w-3 animate-pulse" />
                  <span>TIER-1 HEALTHCARE CARRIER</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated cellular alerts with embedded clinical report snapshots dispatched to on-call specialists
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tabs */}
            <div className="flex rounded-lg bg-[#141a26] p-1 border border-[#20293d]">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dispatched SMS Logs ({smsList.length})
              </button>
              <button
                onClick={() => setActiveTab('test')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'test'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Send Test Emergency SMS
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-[#1b2230] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: SMS Log List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Recent Dispatches
                  </span>
                  <button
                    onClick={loadSMSHistory}
                    className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {smsList.length === 0 ? (
                  <div className="rounded-xl border border-[#1a202c] bg-[#10141e] p-8 text-center text-xs text-slate-400 space-y-2">
                    <Smartphone className="h-8 w-8 mx-auto text-slate-600" />
                    <div>No emergency SMS alerts logged yet.</div>
                    <p className="text-[11px] text-slate-500">
                      Emergency SMS is dispatched automatically when NEWS2 ≥ 7, Red Score = 3, or via Test Dispatch.
                    </p>
                    <button
                      onClick={() => setActiveTab('test')}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-semibold"
                    >
                      Trigger Test Alert
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {smsList.map((sms) => (
                      <div
                        key={sms.id}
                        onClick={() => setSelectedSMS(sms)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                          selectedSMS?.id === sms.id
                            ? 'border-emerald-500/50 bg-[#141d27] ring-1 ring-emerald-500/30'
                            : 'border-[#1b2230] bg-[#10151f] hover:border-[#2b364c]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="font-bold text-white">{sms.patient_name}</span>
                            <span className="text-[10px] font-mono text-slate-400">#{sms.patient_id}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {sms.delivery_status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 truncate">
                          To: {sms.recipient_name} ({sms.recipient_phone})
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-mono">
                            NEWS2: {sms.full_report.news2_total_score} pts
                            {sms.full_report.has_red_score ? ' [RED]' : ''}
                          </span>
                          <span>{new Date(sms.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Mobile Phone Preview & Full Clinical Report */}
              <div className="lg:col-span-7 space-y-4">
                {selectedSMS ? (
                  <div className="space-y-4">
                    {/* Cellular Smartphone Frame Preview */}
                    <div className="rounded-2xl border-2 border-[#2b354a] bg-[#07090e] p-4 shadow-xl space-y-3">
                      {/* Phone status bar */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 border-b border-[#1b2230] pb-2">
                        <span className="font-semibold text-slate-300">CarePulse Critical Alert Dispatch</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400">5G LTE</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Recipient Header */}
                      <div className="flex items-center justify-between bg-[#121722] p-2.5 rounded-xl border border-[#1f283a]">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center font-bold text-xs">
                            <PhoneCall className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                              <span>{selectedSMS.recipient_name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                {selectedSMS.recipient_role}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Mobile: {selectedSMS.recipient_phone}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[10px]">
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{selectedSMS.delivery_status}</span>
                          </span>
                          <span className="text-slate-500 text-[9px] block">
                            {selectedSMS.carrier_route}
                          </span>
                        </div>
                      </div>

                      {/* SMS Chat Bubble */}
                      <div className="rounded-xl bg-[#151c28] border border-[#232e42] p-4 text-xs font-mono text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {selectedSMS.message_body}
                      </div>

                      {/* Web Link to Full Clinical Report */}
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-300">
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-4 w-4 shrink-0 text-emerald-400" />
                          <span className="truncate">Report URL: {selectedSMS.report_url}</span>
                        </div>
                        <a
                          href={selectedSMS.report_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-emerald-500 text-black font-sans font-bold hover:bg-emerald-400 text-[11px] shrink-0 ml-2"
                        >
                          Open Report
                        </a>
                      </div>
                    </div>

                    {/* Complete Multi-Parameter Clinical Report Snapshot */}
                    <div className="rounded-xl border border-[#1b2230] bg-[#10141e] p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1b2230] pb-2">
                        <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <Activity className="h-4 w-4 text-emerald-400" />
                          <span>Clinical Report Snapshot #{selectedSMS.full_report.report_id}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Generated: {new Date(selectedSMS.full_report.generated_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Vitals Summary Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                        <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1b2333]">
                          <div className="text-[10px] text-slate-400">Heart Rate</div>
                          <div className="font-mono font-bold text-emerald-400 text-sm">
                            {selectedSMS.full_report.vital_signs?.heart_rate ?? '--'} <span className="text-[10px]">bpm</span>
                          </div>
                        </div>
                        <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1b2333]">
                          <div className="text-[10px] text-slate-400">SpO₂</div>
                          <div className="font-mono font-bold text-teal-400 text-sm">
                            {selectedSMS.full_report.vital_signs?.oxygen_saturation ?? '--'} <span className="text-[10px]">%</span>
                          </div>
                        </div>
                        <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1b2333]">
                          <div className="text-[10px] text-slate-400">Resp Rate</div>
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            {selectedSMS.full_report.vital_signs?.respiratory_rate ?? '--'} <span className="text-[10px]">/m</span>
                          </div>
                        </div>
                        <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1b2333]">
                          <div className="text-[10px] text-slate-400">Systolic BP</div>
                          <div className="font-mono font-bold text-slate-200 text-sm">
                            {selectedSMS.full_report.vital_signs?.systolic_bp ?? '--'} <span className="text-[10px]">mmHg</span>
                          </div>
                        </div>
                        <div className="bg-[#0b0e14] p-2 rounded-lg border border-[#1b2333]">
                          <div className="text-[10px] text-slate-400">Body Temp</div>
                          <div className="font-mono font-bold text-amber-400 text-sm">
                            {selectedSMS.full_report.vital_signs?.body_temperature ?? '--'} <span className="text-[10px]">°C</span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Parameters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-[#1b2333] space-y-1">
                          <span className="text-[10px] text-slate-400">Assigned Care Team</span>
                          <div className="font-semibold text-white">
                            {selectedSMS.full_report.assigned_specialist}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Department: {selectedSMS.full_report.specialist_department}
                          </div>
                        </div>

                        <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-[#1b2333] space-y-1">
                          <span className="text-[10px] text-slate-400">Signal Verification & ML Anomaly</span>
                          <div className="font-semibold text-emerald-400 text-[11px]">
                            {selectedSMS.full_report.signal_quality_status}
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono">
                            Isolation Forest Score: {selectedSMS.full_report.isolation_forest_anomaly_score ?? 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    Select an SMS log from the left to view cellular message preview and clinical report.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab: Send Test Emergency SMS */
            <form onSubmit={handleSendTest} className="max-w-2xl mx-auto space-y-5 py-4">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-rose-200">
                  <Flame className="h-4 w-4 text-rose-400" />
                  <span>Interactive Real-World Emergency SMS Dispatch</span>
                </div>
                <p>
                  This triggers the real CarePulse emergency escalation pipeline: formats the cellular emergency message, embeds the full physiological report snapshot, and dispatches via Twilio Cellular Gateway / certified healthcare simulated carrier.
                </p>
              </div>

              {/* Patient Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Patient:
                </label>
                <select
                  value={testPatientId}
                  onChange={(e) => setTestPatientId(e.target.value)}
                  className="w-full rounded-xl border border-[#1f283a] bg-[#121722] p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} ({p.condition || 'Post-Discharge Monitoring'}) · {p.department || 'Specialty Queue'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Mobile Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Recipient Mobile Phone Number:</span>
                  <span className="text-[11px] text-slate-500">E.164 format (e.g. +1 555-911-0000)</span>
                </label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+1 (555) 911-0000"
                  className="w-full rounded-xl border border-[#1f283a] bg-[#121722] p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Custom Clinical Alert Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Clinical Deterioration Reason / Custom Directive:
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#1f283a] bg-[#121722] p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Describe acute clinical presentation..."
                  required
                />
              </div>

              {/* Gateway Configuration Info */}
              <div className="rounded-xl bg-[#10141e] border border-[#1b2230] p-3 text-[11px] text-slate-400 space-y-1 font-mono">
                <div>Provider: {config?.provider || 'Twilio Healthcare Cellular Gateway'}</div>
                <div>Anti-flood Cooldown: {config?.cooldown_seconds || 30} seconds per patient</div>
                <div>Status: Verified Carrier Webhook Active</div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 rounded-xl border border-[#222a3d] bg-[#121722] text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Dispatching Cellular SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Dispatch Emergency SMS Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
