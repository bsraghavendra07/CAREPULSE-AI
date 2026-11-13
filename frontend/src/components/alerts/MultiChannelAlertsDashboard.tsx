import React, { useState, useEffect } from 'react';
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
  Phone,
  Loader2,
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

/**
 * Generates dynamic, clinical decision-support SMS text adhering strictly to medical safety wording.
 */
function generateSmsText(
  vitals: { hr: number; spo2: number; rr?: number; temp?: number },
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
  isSimulatedHighRisk?: boolean,
  language: 'English' | 'Kannada' | 'Hindi' = 'English'
): string {
  const { hr, spo2 } = vitals;

  // Case 1: High Risk with both rising HR and falling SpO2 (or simulated high-risk demo)
  if (
    isSimulatedHighRisk ||
    (hr >= 120 && spo2 <= 90) ||
    (riskLevel === 'HIGH' && (hr >= 115 || spo2 <= 91))
  ) {
    if (language === 'Kannada') {
      return `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ಹೃದಯ ಬಡಿತ ${hr} bpm, SpO₂ ${spo2}%. ಹೆಚ್ಚುತ್ತಿರುವ ಹೃದಯ ಬಡಿತ ಮತ್ತು ಕುಸಿಯುತ್ತಿರುವ ಆಮ್ಲಜನಕ ಪತ್ತೆಯಾಗಿದೆ. ಅಪಾಯ: HIGH. ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    }
    if (language === 'Hindi') {
      return `🚨 मरीज की चेतावनी: हृदय गति ${hr} bpm, SpO₂ ${spo2}%। बढ़ती हृदय गति और गिरता ऑक्सीजन स्तर मिला है। जोखिम: HIGH। तत्काल चिकित्सकीय समीक्षा आवश्यक है।`;
    }
    return `🚨 Patient Alert: HR ${hr} bpm, SpO₂ ${spo2}%. Rising heart rate and falling oxygen detected. Risk: HIGH. Immediate clinical review required.`;
  }

  // Case 2: Falling SpO2 / Respiratory Concern
  if (spo2 <= 89) {
    if (language === 'Kannada') {
      return `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: SpO₂ ${spo2}% ಮತ್ತು ಸತತವಾಗಿ ಕಡಿಮೆಯಾಗುತ್ತಿದೆ. ಉಸಿರಾಟದ ಕ್ಷೀಣಿಸುವಿಕೆ ಮಾದರಿ ಪತ್ತೆಯಾಗಿದೆ. ಅಪಾಯ: HIGH. ತುರ್ತು ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    }
    if (language === 'Hindi') {
      return `🚨 मरीज की चेतावनी: SpO₂ ${spo2}% और लगातार गिर रहा है। श्वसन गिरावट पैटर्न का पता चला है। जोखिम: HIGH। तत्काल चिकित्सकीय समीक्षा आवश्यक है।`;
    }
    return `🚨 Patient Alert: SpO₂ ${spo2}% and continuing to fall. Respiratory deterioration pattern detected. Risk: HIGH. Urgent clinical review required.`;
  }

  // Case 3: Rising Heart Rate / Cardiac Concern
  if (hr >= 125) {
    if (language === 'Kannada') {
      return `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ನಿರಂತರ ಅಸಹಜ ಪ್ರವೃತ್ತಿಯೊಂದಿಗೆ ಹೃದಯ ಬಡಿತ ${hr} bpm. ಹೃದಯ ಸಂಬಂಧಿತ ಎಚ್ಚರಿಕೆ ಮಾದರಿ ಪತ್ತೆಯಾಗಿದೆ. ಅಪಾಯ: HIGH. ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    }
    if (language === 'Hindi') {
      return `🚨 मरीज की चेतावनी: निरंतर असामान्य प्रवृत्ति के साथ हृदय गति ${hr} bpm। हृदय संबंधी चेतावनी पैटर्न मिला है। जोखिम: HIGH। चिकित्सकीय समीक्षा आवश्यक है।`;
    }
    return `🚨 Patient Alert: HR ${hr} bpm with a sustained abnormal trend. Cardiac-related warning pattern detected. Risk: HIGH. Clinical review required.`;
  }

  // Case 4: Medium Risk
  if (riskLevel === 'MEDIUM' || hr > 100 || spo2 < 95) {
    if (language === 'Kannada') {
      return `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ಹೃದಯ ಬಡಿತ ${hr} bpm, SpO₂ ${spo2}%. ಮಧ್ಯಮ ಪ್ರಮುಖ ಚಿಹ್ನೆ ಬದಲಾವಣೆ ಪತ್ತೆಯಾಗಿದೆ. ಅಪಾಯ: MEDIUM. ವೈದ್ಯಕೀಯ ಮೇಲ್ವಿಚಾರಣೆ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.`;
    }
    if (language === 'Hindi') {
      return `🚨 मरीज की चेतावनी: हृदय गति ${hr} bpm, SpO₂ ${spo2}%। मध्यम महत्वपूर्ण संकेत विचलन मिला है। जोखिम: MEDIUM। चिकित्सकीय निगरानी की सलाह दी जाती है।`;
    }
    return `🚨 Patient Alert: HR ${hr} bpm, SpO₂ ${spo2}%. Moderate vital sign variation detected. Risk: MEDIUM. Clinical monitoring advised.`;
  }

  // Case 5: Normal / Stable
  if (language === 'Kannada') {
    return `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ಹೃದಯ ಬಡಿತ ${hr} bpm, SpO₂ ${spo2}%. ಪ್ರಮುಖ ನಿಯತಾಂಕಗಳು ಸ್ಥಿರವಾಗಿವೆ. ಅಪಾಯ: LOW. ನಿಯಮಿತ ಮೇಲ್ವಿಚಾರಣೆ ನಡೆಯುತ್ತಿದೆ.`;
  }
  if (language === 'Hindi') {
    return `🚨 मरीज की चेतावनी: हृदय गति ${hr} bpm, SpO₂ ${spo2}%। महत्वपूर्ण संकेत स्थिर हैं। जोखिम: LOW। नियमित निगरानी जारी है।`;
  }
  return `🚨 Patient Alert: HR ${hr} bpm, SpO₂ ${spo2}%. Vitals within stable parameters. Risk: LOW. Routine monitoring ongoing.`;
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
  // Active selected SMS recipient tab index
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);

  // SMS Alert Card State (Clickable Demo Interaction)
  const [isGeneratingSms, setIsGeneratingSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState<string>('Standby');
  const [smsSentTime, setSmsSentTime] = useState<string | null>(null);
  const [simulatedSmsMessage, setSimulatedSmsMessage] = useState<string | null>(null);

  const activeSmsList = currentAlert?.dispatchedSms || [];
  const activeEmailList = currentAlert?.dispatchedEmails || [];

  const currentSmsRecord: DispatchedSmsRecord | undefined =
    activeSmsList[selectedRecipientIndex] || activeSmsList[0];

  const emailCount = contacts.filter((c) => c.emailAlerts).length;
  const smsCount = contacts.filter((c) => c.smsAlerts).length;

  // Active contact for SMS card (defaults to Parent / Caregiver)
  const activeContact: AlertContact =
    contacts[selectedRecipientIndex] ||
    contacts.find((c) => c.role === 'Parent / Caregiver') ||
    contacts[0] || {
      id: 'default-parent',
      patientId: 'P-001',
      name: 'Anitha Sharma',
      role: 'Parent / Caregiver',
      email: 'anitha.sharma@example.com',
      phone: '+91 98450 12345',
      language: 'English',
      emailAlerts: true,
      smsAlerts: true,
    };

  // Sync high-risk simulation or reset
  useEffect(() => {
    if (isSimulatedHighRisk) {
      const highRiskText = generateSmsText(
        { hr: 132, spo2: 87 },
        'HIGH',
        true,
        activeContact.language
      );
      setSimulatedSmsMessage(highRiskText);
      setSmsStatus('Alert Generated — High Risk');
      setSmsSentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (currentAlert && currentAlert.dispatchedSms.length > 0) {
      setSimulatedSmsMessage(currentSmsRecord?.message || null);
    }
  }, [isSimulatedHighRisk, currentAlert, activeContact.language]);

  // Handle clickable "Send SMS Alert" interaction
  const handleSendSmsAlert = () => {
    setIsGeneratingSms(true);
    setSmsStatus('Generating alert…');

    // Realistic generation delay
    setTimeout(() => {
      const generated = generateSmsText(
        currentVitals,
        currentRiskLevel,
        isSimulatedHighRisk,
        activeContact.language
      );
      setSimulatedSmsMessage(generated);
      setSmsStatus('✅ SMS Alert Sent');
      setSmsSentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setIsGeneratingSms(false);
    }, 650);
  };

  const displayedMessage =
    simulatedSmsMessage ||
    currentSmsRecord?.message ||
    generateSmsText(currentVitals, currentRiskLevel, isSimulatedHighRisk, activeContact.language);

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
              onClick={() => {
                onResetNominal();
                setSimulatedSmsMessage(null);
                setSmsStatus('Standby');
              }}
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
            {smsStatus !== 'Standby' ? smsStatus : (activeSmsList.length > 0 ? 'Alert Generated' : 'Standby')}
          </span>
        </div>
      </div>

      {/* ── SECTION 9 & 10: SMS ALERT CARD & EMAIL PREVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* ──────── LEFT: FULLY CLICKABLE SMS ALERT CARD ──────── */}
        <div className="rounded-3xl border border-[#CBD5E1] bg-slate-900 text-white p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            
            {/* 1. Header: SMS ALERT title + Simulation Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-[#00A896]/20 border border-[#00A896]/40 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-[#00D2C4]" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-wider uppercase text-white">
                    SMS Alert
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Continuous vital sign early-warning dispatch
                  </span>
                </div>
              </div>

              {/* Recipient Language Badge */}
              <div className="flex items-center space-x-1 text-[11px] font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                <Globe className="h-3 w-3 text-[#00D2C4]" />
                <span>{activeContact.language || 'English'}</span>
              </div>
            </div>

            {/* 2. Recipient Switcher Tabs (Parent / Caregiver default) */}
            {contacts.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Recipient:</span>
                {contacts.map((contact, idx) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setSelectedRecipientIndex(idx);
                      setSimulatedSmsMessage(null);
                      setSmsStatus('Standby');
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      selectedRecipientIndex === idx
                        ? 'bg-[#00A896] text-white shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {contact.name} ({contact.role.split('/')[0].trim()})
                  </button>
                ))}
              </div>
            )}

            {/* 3. SMS Alert Meta Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Recipient</span>
                <strong className="text-white truncate block" title={activeContact.name}>
                  {activeContact.name}
                </strong>
                <span className="text-[10px] text-slate-400">({activeContact.role})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Phone</span>
                <strong className="text-white font-mono truncate block" title={activeContact.phone}>
                  {activeContact.phone}
                </strong>
                <span className="text-[10px] text-emerald-400">Verified Contact</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Alert Status</span>
                <strong
                  className={`truncate block font-bold ${
                    smsStatus.includes('✅')
                      ? 'text-emerald-400'
                      : smsStatus.includes('Generating')
                      ? 'text-amber-400 animate-pulse'
                      : smsStatus.includes('High Risk')
                      ? 'text-red-400'
                      : 'text-slate-300'
                  }`}
                >
                  {smsStatus}
                </strong>
                <span className="text-[10px] text-slate-400">
                  {smsStatus.includes('✅') ? 'Delivered to SIM' : 'Ready to Send'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Alert Time</span>
                <strong className="text-white block font-mono">
                  {smsSentTime || currentSmsRecord?.timestamp || 'Ready'}
                </strong>
                <span className="text-[10px] text-slate-400">Local Telemetry</span>
              </div>
            </div>

            {/* 4. Message Preview inside SMS Phone-Style Bubble */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-300">Message Preview</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  HR: {currentVitals.hr} bpm | SpO₂: {currentVitals.spo2}%
                </span>
              </div>

              {/* Phone Message Bubble */}
              <div className="relative bg-gradient-to-br from-[#064E3B] to-[#047857] text-white p-4 rounded-2xl rounded-tl-sm shadow-md border border-emerald-400/30 text-sm leading-relaxed font-sans font-medium">
                {displayedMessage}
              </div>

              {/* Demo Mode Label & Simulation Disclaimer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-bold text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Demo Mode — SMS delivery simulated</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Prototype Simulation — No real SMS was sent.
                </span>
              </div>
            </div>
          </div>

          {/* 5. Prominent Button: "Send SMS Alert" */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSendSmsAlert}
              disabled={isGeneratingSms}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#00A896] via-[#028090] to-[#00A896] hover:from-[#009686] hover:to-[#02707e] text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isGeneratingSms ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Generating alert…</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-white" />
                  <span>Send SMS Alert</span>
                </>
              )}
            </button>
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
export default MultiChannelAlertsDashboard;

