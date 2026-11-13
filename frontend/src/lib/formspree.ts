/**
 * CarePulse AI — Formspree Clinical Email Alert Service
 *
 * Implements automated, rate-limited clinical deterioration email dispatches
 * through Formspree (endpoint: https://formspree.io/f/mdegkpaz).
 *
 * SAFETY & DESIGN RULES:
 * 1. Only sends for genuine REVIEW or URGENT clinical alerts (never LOW, normal, or sensor artifacts).
 * 2. Reuses existing specialist / department routing.
 * 3. Prevents duplicate emails for ongoing alerts, allowing escalation (REVIEW -> URGENT).
 * 4. Fails safely and asynchronously: network or Formspree issues NEVER interrupt live telemetry.
 */

export const FORMSPREE_ENDPOINT =
  import.meta.env.VITE_FORMSPREE_ENDPOINT || 'https://formspree.io/f/mdegkpaz';

export type AlertSeverity = 'REVIEW' | 'URGENT';

export interface ClinicalAlertEmailPayload {
  patientId: string;
  patientName: string;
  assignedDepartment: string;
  heartRate: number | string;
  spo2: number | string;
  respiratoryRate: number | string;
  temperature: number | string;
  severity: AlertSeverity;
  reason: string;
  recommendedAction: string;
  timestamp?: string;
  isTest?: boolean;
}

export interface FormspreeResponse {
  ok: boolean;
  status: 'Email Generated' | 'Email Submitted' | '✅ Email Alert Sent' | 'Delivery Failed';
  statusCode?: number;
  error?: string;
  timestamp: string;
  payload: ClinicalAlertEmailPayload;
  formattedBody: string;
}

/**
 * Generates formatted plain-text email message matching clinical decision-support standards.
 */
export function formatCarePulseAlertBody(payload: ClinicalAlertEmailPayload): string {
  const ts =
    payload.timestamp ||
    new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return [
    'CarePulse AI Alert',
    '',
    `Patient ID: ${payload.patientId}`,
    `Patient Name: ${payload.patientName}`,
    `Assigned Department: ${payload.assignedDepartment}`,
    '',
    `Heart Rate: ${payload.heartRate} bpm`,
    `SpO₂: ${payload.spo2}%`,
    `Respiratory Rate: ${payload.respiratoryRate}/min`,
    `Temperature: ${payload.temperature}°C`,
    '',
    `Severity: ${payload.severity}`,
    '',
    'Reason:',
    payload.reason,
    '',
    'Recommended Action:',
    payload.recommendedAction,
    '',
    'Timestamp:',
    ts,
    ...(payload.isTest
      ? [
          '',
          '---',
          'Notice: Demo/Test Email triggered via CarePulse hackathon manual verification button.',
        ]
      : []),
  ].join('\n');
}

/**
 * Submits clinical email alert to Formspree with timeout and defensive error handling.
 */
export async function sendCarePulseEmailAlert(
  payload: ClinicalAlertEmailPayload
): Promise<FormspreeResponse> {
  const formattedBody = formatCarePulseAlertBody(payload);
  const ts =
    payload.timestamp ||
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const subject = payload.isTest
    ? `[TEST DEMO] 🚨 CarePulse AI Alert [${payload.severity}] - ${payload.patientName} (${payload.patientId})`
    : `🚨 CarePulse AI Alert [${payload.severity}] - ${payload.patientName} (${payload.patientId})`;

  const formspreeBody = {
    email: 'clinical.alerts@hospital.carepulse.org',
    _replyto: 'clinical.alerts@hospital.carepulse.org',
    _subject: subject,
    patient_id: payload.patientId,
    patient_name: payload.patientName,
    department: payload.assignedDepartment,
    assigned_department: payload.assignedDepartment,
    heart_rate: `${payload.heartRate} bpm`,
    spo2: `${payload.spo2}%`,
    respiratory_rate: `${payload.respiratoryRate}/min`,
    temperature: `${payload.temperature}°C`,
    severity: payload.severity,
    reason: payload.reason,
    recommended_action: payload.recommendedAction,
    timestamp: payload.timestamp || ts,
    message: formattedBody,
    is_test_demo: Boolean(payload.isTest),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formspreeBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        status: '✅ Email Alert Sent',
        statusCode: res.status,
        timestamp: ts,
        payload,
        formattedBody,
      };
    } else {
      const errText = await res.text().catch(() => 'Unknown Formspree error');
      console.warn(`[CarePulse Formspree] HTTP ${res.status}:`, errText);
      return {
        ok: false,
        status: 'Delivery Failed',
        statusCode: res.status,
        error: `Formspree HTTP ${res.status}: ${errText.slice(0, 120)}`,
        timestamp: ts,
        payload,
        formattedBody,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    const errMessage = isTimeout ? 'Request timed out after 10s' : (err?.message || 'Network error');
    console.error('[CarePulse Formspree] Non-fatal email dispatch failure:', errMessage);

    return {
      ok: false,
      status: 'Delivery Failed',
      error: errMessage,
      timestamp: ts,
      payload,
      formattedBody,
    };
  }
}

/**
 * Deduplication manager to prevent repeated emails for ongoing identical alerts
 * while allowing legitimate escalations (REVIEW -> URGENT) and fresh alerts.
 */
class AlertEmailDeduplicator {
  private lastAlertMap: Map<string, { severity: AlertSeverity; timestamp: number }> = new Map();

  /**
   * Evaluates whether an alert qualifies for dispatch.
   * Returns true ONLY if:
   * - No alert has been sent yet for this patient, OR
   * - Severity escalated from REVIEW -> URGENT.
   */
  public shouldSend(patientId: string, severity: AlertSeverity): boolean {
    const existing = this.lastAlertMap.get(patientId);
    if (!existing) {
      return true;
    }

    // Escalation: REVIEW -> URGENT is permitted
    if (existing.severity === 'REVIEW' && severity === 'URGENT') {
      return true;
    }

    // Duplicate condition: same severity ongoing -> suppress
    if (existing.severity === severity) {
      return false;
    }

    return true;
  }

  /**
   * Records a successfully submitted alert state.
   */
  public recordSent(patientId: string, severity: AlertSeverity): void {
    this.lastAlertMap.set(patientId, {
      severity,
      timestamp: Date.now(),
    });
  }

  /**
   * Resets alert tracking when patient returns to normal/stable readings.
   */
  public reset(patientId: string): void {
    this.lastAlertMap.delete(patientId);
  }
}

export const alertEmailDeduplicator = new AlertEmailDeduplicator();

/**
 * Reuses existing specialist routing logic: matches patient's assigned department,
 * clinical module, and deteriorating vital pattern to assign appropriate specialty.
 */
export function determineSpecialistDepartment(
  patient?: any,
  vitals?: { hr: number; spo2: number },
  alertTitle?: string
): string {
  if (
    patient?.department &&
    patient.department !== 'General Medicine' &&
    patient.department !== 'Specialty Queue'
  ) {
    return patient.department;
  }

  const condition = (patient?.condition || '').toLowerCase();
  if (
    condition.includes('copd') ||
    condition.includes('asthma') ||
    condition.includes('respiratory') ||
    condition.includes('lung')
  ) {
    return 'Pulmonology';
  }
  if (
    condition.includes('heart') ||
    condition.includes('cardiac') ||
    condition.includes('fibrillation') ||
    condition.includes('mi') ||
    condition.includes('chf')
  ) {
    return 'Cardiology';
  }
  if (
    condition.includes('orthopedic') ||
    condition.includes('arthroplasty') ||
    condition.includes('joint')
  ) {
    return 'Surgical Care / Orthopedics';
  }
  if (
    condition.includes('diabetes') ||
    condition.includes('endocrin') ||
    condition.includes('glycemia')
  ) {
    return 'Endocrinology / Internal Medicine';
  }
  if (condition.includes('sepsis') || condition.includes('infection')) {
    return 'General Medicine / Critical Care';
  }

  const title = (alertTitle || '').toLowerCase();
  if (
    title.includes('spo2') ||
    title.includes('oxygen') ||
    title.includes('respiratory') ||
    (vitals && vitals.spo2 < 92)
  ) {
    return 'Pulmonology';
  }
  if (
    title.includes('heart') ||
    title.includes('tachycardia') ||
    title.includes('cardiac') ||
    (vitals && vitals.hr > 120)
  ) {
    return 'Cardiology';
  }

  return patient?.department || 'Pulmonology';
}

