/**
 * CarePulse — Multi-Channel Alert & Decision Support Engine.
 *
 * Implements risk-based early warning detection, multilingual alert generation
 * (English, Kannada, Hindi), contact preference evaluation, and simulation-mode
 * multi-channel dispatch (Email + SMS).
 *
 * SAFETY & MEDICAL WORDING COMPLIANCE:
 * - Decision-support early warning system only — never claims confirmed disease diagnosis.
 * - Recommends clinical review rather than prescribing.
 */

import { PatientProfile } from '../types/patient';

export type AlertRole = 'Parent / Caregiver' | 'Doctor' | 'Emergency Contact';
export type NotificationLanguage = 'English' | 'Kannada' | 'Hindi';
export type AlertRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AlertContact {
  id: string;
  patientId: string;
  name: string;
  role: AlertRole;
  email: string;
  phone: string;
  language: NotificationLanguage;
  emailAlerts: boolean;
  smsAlerts: boolean;
}

export interface DispatchedSmsRecord {
  id: string;
  contactId: string;
  recipientName: string;
  recipientRole: AlertRole;
  recipientPhone: string;
  language: NotificationLanguage;
  message: string;
  status: 'Alert Generated — Simulation Mode';
  timestamp: string;
}

export interface DispatchedEmailRecord {
  id: string;
  contactId: string;
  recipientName: string;
  recipientRole: AlertRole;
  recipientEmail: string;
  language: NotificationLanguage;
  subject: string;
  body: string;
  status: 'Generated & Queued (Prototype Simulation)';
  timestamp: string;
}

export interface MultiChannelAlert {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  riskLevel: AlertRiskLevel;
  vitals: {
    hr: number;
    spo2: number;
    rr?: number;
    temp?: number;
  };
  warningPattern: string;
  clinicalConcern: string;
  recommendedAction: string;
  messages: {
    English: string;
    Kannada: string;
    Hindi: string;
  };
  emailSubject: string;
  dispatchedSms: DispatchedSmsRecord[];
  dispatchedEmails: DispatchedEmailRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFAULT REGISTERED CONTACTS (PER PATIENT)
// ─────────────────────────────────────────────────────────────────────────────

export function getDefaultContacts(patientId: string, patientName?: string): AlertContact[] {
  const pName = patientName || 'Patient';
  const lastName = pName.split(' ').slice(-1)[0] || 'Family';

  return [
    {
      id: `contact-parent-${patientId}`,
      patientId,
      name: `Anitha ${lastName}`,
      role: 'Parent / Caregiver',
      email: `anitha.${lastName.toLowerCase()}@example.com`,
      phone: '+91 98450 12345',
      language: 'Kannada',
      emailAlerts: true,
      smsAlerts: true,
    },
    {
      id: `contact-doctor-${patientId}`,
      patientId,
      name: 'Dr. Marcus Rivera',
      role: 'Doctor',
      email: 'dr.rivera@hospital.carepulse.org',
      phone: '+1 (555) 019-2041',
      language: 'English',
      emailAlerts: true,
      smsAlerts: true,
    },
    {
      id: `contact-emergency-${patientId}`,
      patientId,
      name: `Vikram ${lastName}`,
      role: 'Emergency Contact',
      email: `vikram.${lastName.toLowerCase()}@example.com`,
      phone: '+91 98860 54321',
      language: 'Hindi',
      emailAlerts: true,
      smsAlerts: false,
    },
  ];
}

export function loadPatientContacts(patientId: string, patientName?: string): AlertContact[] {
  const storageKey = `carepulse_alert_contacts_${patientId}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached alert contacts:', e);
  }

  const defaults = getDefaultContacts(patientId, patientName);
  try {
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

export function savePatientContacts(patientId: string, contacts: AlertContact[]): void {
  const storageKey = `carepulse_alert_contacts_${patientId}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save alert contacts:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DYNAMIC MULTILINGUAL ALERT GENERATION (SAFETY & MEDICAL WORDING)
// ─────────────────────────────────────────────────────────────────────────────

interface VitalSignsInput {
  hr: number;
  spo2: number;
  rr?: number;
  temp?: number;
  trend?: string; // 'falling_spo2' | 'rising_hr' | 'abnormal_both' | 'nominal'
}

export function evaluateRiskAndGenerateAlert(
  patientId: string,
  patientName: string,
  vitals: VitalSignsInput,
  contacts: AlertContact[]
): MultiChannelAlert | null {
  const { hr, spo2, rr = 16, temp = 36.7, trend } = vitals;

  // Determine Risk Level
  let riskLevel: AlertRiskLevel = 'LOW';
  let patternType: 'respiratory' | 'cardiac' | 'multiple' | 'high_risk' | 'nominal' = 'nominal';

  const isHrCritical = hr > 130 || hr < 45;
  const isSpo2Critical = spo2 < 90;
  const isHrWarning = hr > 105 || hr < 50;
  const isSpo2Warning = spo2 < 94;

  if (
    isHrCritical ||
    isSpo2Critical ||
    (isSpo2Warning && trend === 'falling_spo2') ||
    (isHrWarning && isSpo2Warning)
  ) {
    riskLevel = 'HIGH';
  } else if (isHrWarning || isSpo2Warning || (temp && temp > 38.3) || (rr && (rr > 22 || rr < 10))) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // Normal readings -> strictly do not generate unnecessary notifications
  if (riskLevel === 'LOW' && trend !== 'falling_spo2' && !isHrWarning) {
    return null;
  }

  // Categorize specific deterioration pattern for medical decision-support
  if (isHrCritical && isSpo2Critical) {
    patternType = 'multiple';
  } else if (isSpo2Critical || trend === 'falling_spo2' || spo2 <= 89) {
    patternType = 'respiratory';
  } else if (isHrCritical || (hr >= 130 && trend === 'rising_hr')) {
    patternType = 'cardiac';
  } else {
    patternType = 'high_risk';
  }

  // Construct Dynamic Multilingual Alert Text
  let englishMsg = '';
  let kannadaMsg = '';
  let hindiMsg = '';
  let warningDesc = '';
  let clinicalConcern = '';

  if (patternType === 'respiratory') {
    warningDesc = 'Oxygen level is falling.';
    clinicalConcern = 'Respiratory deterioration pattern detected.';
    englishMsg = `🚨 Patient Alert: SpO₂ ${spo2}% and continuing to fall. Respiratory deterioration pattern detected. Risk: HIGH. Urgent clinical review required.`;
    kannadaMsg = `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: SpO₂ ${spo2}% ಮತ್ತು ಸತತವಾಗಿ ಕಡಿಮೆಯಾಗುತ್ತಿದೆ. ಉಸಿರಾಟದ ಕ್ಷೀಣಿಸುವಿಕೆ ಮಾದರಿ ಪತ್ತೆಯಾಗಿದೆ. ಅಪಾಯ: HIGH. ತುರ್ತು ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    hindiMsg = `🚨 मरीज की चेतावनी: SpO₂ ${spo2}% और लगातार गिर रहा है। श्वसन गिरावट पैटर्न का पता चला है। जोखिम: HIGH। तत्काल चिकित्सकीय समीक्षा आवश्यक है।`;
  } else if (patternType === 'cardiac') {
    warningDesc = 'Sustained abnormal heart rate trend.';
    clinicalConcern = 'Cardiac-related abnormal vital-sign pattern detected.';
    englishMsg = `🚨 Patient Alert: HR ${hr} bpm with a sustained abnormal trend. Cardiac-related warning pattern detected. Risk: HIGH. Clinical review required.`;
    kannadaMsg = `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ನಿರಂತರ ಅಸಹಜ ಪ್ರವೃತ್ತಿಯೊಂದಿಗೆ ಹೃದಯ ಬಡಿತ ${hr} bpm. ಹೃದಯ ಸಂಬಂಧಿತ ಎಚ್ಚರಿಕೆ ಮಾದರಿ ಪತ್ತೆಯಾಗಿದೆ. ಅಪಾಯ: HIGH. ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    hindiMsg = `🚨 मरीज की चेतावनी: निरंतर असामान्य प्रवृत्ति के साथ हृदय गति ${hr} bpm। हृदय संबंधी चेतावनी पैटर्न का पता चला है। जोखिम: HIGH। चिकित्सकीय समीक्षा आवश्यक है।`;
  } else if (patternType === 'multiple') {
    warningDesc = 'Multiple vital signs deviating simultaneously.';
    clinicalConcern = 'Multiple abnormal vital signs detected.';
    englishMsg = `🚨 Patient Alert: HR ${hr} bpm, SpO₂ ${spo2}%. Multiple abnormal vital signs detected. Risk: HIGH. Immediate clinical review required.`;
    kannadaMsg = `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ಹೃದಯ ಬಡಿತ ${hr} bpm, SpO₂ ${spo2}%. ಬಹು ಅಸಹಜ ಪ್ರಮುಖ ಚಿಹ್ನೆಗಳು ಪತ್ತೆಯಾಗಿವೆ. ಅಪಾಯ: HIGH. ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    hindiMsg = `🚨 मरीज की चेतावनी: हृदय गति ${hr} bpm, SpO₂ ${spo2}%। कई असामान्य महत्वपूर्ण संकेत मिले हैं। जोखिम: HIGH। तुरंत चिकित्सकीय जांच आवश्यक है।`;
  } else {
    warningDesc = 'Oxygen level is falling.';
    clinicalConcern = 'High-risk vital-sign pattern detected.';
    englishMsg = `🚨 Patient Alert: HR ${hr} bpm, SpO₂ ${spo2}%. Oxygen level is falling. High-risk warning detected. Immediate clinical review required.`;
    kannadaMsg = `🚨 ರೋಗಿಯ ಎಚ್ಚರಿಕೆ: ಹೃದಯ ಬಡಿತ ${hr} bpm, SpO₂ ${spo2}%. ಆಮ್ಲಜನಕದ ಮಟ್ಟ ಕಡಿಮೆಯಾಗುತ್ತಿದೆ. ಹೆಚ್ಚಿನ ಅಪಾಯದ ಎಚ್ಚರಿಕೆ ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
    hindiMsg = `🚨 मरीज की चेतावनी: हृदय गति ${hr} bpm, SpO₂ ${spo2}%। ऑक्सीजन का स्तर कम हो रहा है। उच्च जोखिम की चेतावनी मिली है। तुरंत चिकित्सकीय जांच आवश्यक है।`;
  }

  const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Generate Multi-Channel Dispatches based on registered contact preferences
  const dispatchedSms: DispatchedSmsRecord[] = [];
  const dispatchedEmails: DispatchedEmailRecord[] = [];

  contacts.forEach((contact) => {
    const lang = contact.language || 'English';
    const chosenMsg = lang === 'Kannada' ? kannadaMsg : lang === 'Hindi' ? hindiMsg : englishMsg;

    // SMS Channel
    if (contact.smsAlerts) {
      dispatchedSms.push({
        id: `sms-${contact.id}-${Date.now()}`,
        contactId: contact.id,
        recipientName: contact.name,
        recipientRole: contact.role,
        recipientPhone: contact.phone,
        language: lang,
        message: chosenMsg,
        status: 'Alert Generated — Simulation Mode',
        timestamp: timestampStr,
      });
    }

    // Email Channel
    if (contact.emailAlerts) {
      let emailBody = '';
      if (lang === 'Kannada') {
        emailBody = `ರೋಗಿಯ ಎಚ್ಚರಿಕೆ\n\nರೋಗಿ: ${patientName} (${patientId})\nಹೃದಯ ಬಡಿತ: ${hr} bpm\nSpO₂: ${spo2}%\nಎಚ್ಚರಿಕೆ: ಆಮ್ಲಜನಕದ ಮಟ್ಟ ಕಡಿಮೆಯಾಗುತ್ತಿದೆ.\nಅಪಾಯದ ಮಟ್ಟ: ${riskLevel}\nಉಸಿರಾಟದ ಕ್ಷೀಣಿಸುವಿಕೆ ಮಾದರಿ ಪತ್ತೆಯಾಗಿದೆ.\nತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.`;
      } else if (lang === 'Hindi') {
        emailBody = `मरीज की चेतावनी\n\nमरीज: ${patientName} (${patientId})\nहृदय गति: ${hr} bpm\nSpO₂: ${spo2}%\nचेतावनी: ऑक्सीजन का स्तर कम हो रहा है।\nजोखिम स्तर: ${riskLevel}\nअसामान्य गिरावट पैटर्न का पता चला है।\nतुरंत चिकित्सकीय समीक्षा आवश्यक है।`;
      } else {
        emailBody = `Patient Alert\n\nPatient: ${patientName} (${patientId})\nHR: ${hr} bpm\nSpO₂: ${spo2}%\nWarning: ${warningDesc}\nRisk: ${riskLevel}\n${clinicalConcern}\nImmediate clinical review required.`;
      }

      dispatchedEmails.push({
        id: `email-${contact.id}-${Date.now()}`,
        contactId: contact.id,
        recipientName: contact.name,
        recipientRole: contact.role,
        recipientEmail: contact.email,
        language: lang,
        subject: `🚨 ${riskLevel === 'HIGH' ? 'High-Risk' : 'Priority'} Patient Alert: ${patientName} (${patientId})`,
        body: emailBody,
        status: 'Generated & Queued (Prototype Simulation)',
        timestamp: timestampStr,
      });
    }
  });

  return {
    id: `alert-${patientId}-${Date.now()}`,
    patientId,
    patientName,
    timestamp: timestampStr,
    riskLevel,
    vitals: { hr, spo2, rr, temp },
    warningPattern: patternType,
    clinicalConcern,
    recommendedAction: 'Immediate clinical review required.',
    messages: {
      English: englishMsg,
      Kannada: kannadaMsg,
      Hindi: hindiMsg,
    },
    emailSubject: `🚨 ${riskLevel === 'HIGH' ? 'High-Risk' : 'Priority'} Patient Alert: ${patientName}`,
    dispatchedSms,
    dispatchedEmails,
  };
}

