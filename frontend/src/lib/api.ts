import { PatientProfile } from '../types/patient';
import { PerformanceReport, PerformanceBenchmarkReport, CDSAlert } from '../types/telemetry';
import { FHIRBundle } from '../types/fhir';
import { RoutedAlert, AlertStats } from '../types/alert';
import { SMSAlertRecord, SMSGatewayConfig, SendTestSMSPayload } from '../types/sms';

const API_BASE = '/api';

export async function fetchPatients(): Promise<PatientProfile[]> {
  const res = await fetch(`${API_BASE}/patients/`);
  if (!res.ok) throw new Error(`Failed to fetch patients: ${res.statusText}`);
  return res.json();
}

export async function fetchPatient(id: string): Promise<PatientProfile> {
  const res = await fetch(`${API_BASE}/patients/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch patient ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchPatientNews2(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/patients/${id}/news2`);
  if (!res.ok) throw new Error(`Failed to fetch patient NEWS2 data for ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchPatientSignalQuality(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/patients/${id}/signal-quality`);
  if (!res.ok) throw new Error(`Failed to fetch signal quality for ${id}: ${res.statusText}`);
  return res.json();
}

export async function triggerScenario(patientId: string, scenario: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId, scenario }),
  });
  if (!res.ok) throw new Error(`Failed to trigger scenario: ${res.statusText}`);
  return res.json();
}

export async function clearScenario(patientId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) throw new Error(`Failed to clear scenario: ${res.statusText}`);
  return res.json();
}

export async function setSimulationSpeed(factor: number): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factor }),
  });
  if (!res.ok) throw new Error(`Failed to set simulation speed: ${res.statusText}`);
  return res.json();
}

export async function fetchPerformanceReport(): Promise<PerformanceReport> {
  const res = await fetch(`${API_BASE}/report/performance`);
  if (!res.ok) throw new Error(`Failed to fetch performance report: ${res.statusText}`);
  return res.json();
}

export async function fetchFhirBundle(patientId: string): Promise<FHIRBundle> {
  const res = await fetch(`${API_BASE}/fhir/patient/${patientId}/bundle`);
  if (!res.ok) throw new Error(`Failed to fetch FHIR bundle for ${patientId}: ${res.statusText}`);
  return res.json();
}

export async function fetchActiveScenarios(): Promise<Record<string, string | null>> {
  const res = await fetch(`${API_BASE}/scenarios/active`);
  if (!res.ok) return {};
  return res.json();
}

export async function startSimulationEvent(
  patientId: string,
  eventType: string,
  duration: number = 30,
  params: Record<string, any> = {}
): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/event/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: patientId,
      event_type: eventType,
      duration,
      params,
    }),
  });
  if (!res.ok) throw new Error(`Failed to start simulation event: ${res.statusText}`);
  return res.json();
}

export async function stopSimulationEvent(patientId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/event/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) throw new Error(`Failed to stop simulation event: ${res.statusText}`);
  return res.json();
}

export async function restoreProbe(patientId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/event/restore_probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) throw new Error(`Failed to restore probe: ${res.statusText}`);
  return res.json();
}

export async function fetchSimulationEventStatus(patientId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/event/status?patient_id=${patientId}`);
  if (!res.ok) return { active_event: null };
  return res.json();
}

export async function pauseSimulation(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to pause simulation: ${res.statusText}`);
  return res.json();
}

export async function resumeSimulation(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/resume`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to resume simulation: ${res.statusText}`);
  return res.json();
}

export async function resetSimulation(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to reset simulation: ${res.statusText}`);
  return res.json();
}

export async function fetchSimulationState(): Promise<{ is_paused: boolean; speed_factor: number; tick_number: number }> {
  const res = await fetch(`${API_BASE}/simulation/state`);
  if (!res.ok) return { is_paused: false, speed_factor: 1, tick_number: 0 };
  return res.json();
}

export async function ingestFhirObservation(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/fhir/observation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to ingest FHIR observation: ${res.statusText}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────
// SMART SPECIALIST ALERTS API
// ─────────────────────────────────────────────────────────────────────

export async function fetchRoutedAlerts(params?: {
  department?: string;
  status?: string;
  severity?: string;
  patient_id?: string;
}): Promise<RoutedAlert[]> {
  const query = new URLSearchParams();
  if (params?.department && params.department !== 'all') query.set('department', params.department);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);
  if (params?.patient_id) query.set('patient_id', params.patient_id);

  const url = `${API_BASE}/alerts/?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch routed alerts: ${res.statusText}`);
  return res.json();
}

export async function fetchAlertStats(): Promise<AlertStats> {
  const res = await fetch(`${API_BASE}/alerts/stats`);
  if (!res.ok) throw new Error(`Failed to fetch alert stats: ${res.statusText}`);
  return res.json();
}

export async function acknowledgeAlert(alertId: string, clinicianName: string = 'Dr. Rivera'): Promise<RoutedAlert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinician_name: clinicianName }),
  });
  if (!res.ok) throw new Error(`Failed to acknowledge alert ${alertId}: ${res.statusText}`);
  return res.json();
}

export async function reviewAlert(alertId: string, clinicianName: string = 'Dr. Rivera'): Promise<RoutedAlert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinician_name: clinicianName }),
  });
  if (!res.ok) throw new Error(`Failed to review alert ${alertId}: ${res.statusText}`);
  return res.json();
}

export async function resolveAlert(alertId: string, clinicianName: string = 'Dr. Rivera'): Promise<RoutedAlert> {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinician_name: clinicianName }),
  });
  if (!res.ok) throw new Error(`Failed to resolve alert ${alertId}: ${res.statusText}`);
  return res.json();
}

// ─── Staff Registration & Hospital Administration APIs ───────────────────────

export interface StaffRegistrationData {
  full_name: string;
  hospital_name: string;
  email: string;
  employee_id: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

export interface StaffUserRecord {
  uid: string;
  email: string;
  full_name: string;
  hospital_name: string;
  employee_id: string;
  phone_number: string;
  role: 'DOCTOR' | 'NURSE' | 'HOSPITAL_ADMIN' | 'STAFF_PENDING';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  department?: string;
}

export async function registerStaffAccount(data: StaffRegistrationData): Promise<{ success: boolean; message: string; user: StaffUserRecord }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.detail || 'Registration failed.');
  }
  return json;
}

export async function loginStaffAccount(email: string, pass: string): Promise<{ success: boolean; token: string; user: StaffUserRecord }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.detail || 'Invalid hospital email or password.');
  }
  return json;
}

export async function fetchPendingStaff(): Promise<StaffUserRecord[]> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-admin-001';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/admin/pending-staff`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`Failed to fetch pending staff: ${res.statusText}`);
  return res.json();
}

export async function fetchAllStaff(): Promise<StaffUserRecord[]> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-admin-001';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/admin/staff`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`Failed to fetch all staff: ${res.statusText}`);
  return res.json();
}

export async function approveStaff(uid: string, role: string, department?: string): Promise<any> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-admin-001';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/admin/approve-staff/${uid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ role, department }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || 'Failed to approve staff member.');
  return json;
}

export async function rejectStaff(uid: string): Promise<any> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-admin-001';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/admin/reject-staff/${uid}`, {
    method: 'POST',
    headers: { Authorization: token },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || 'Failed to reject staff member.');
  return json;
}

// ─── Patient Portal API Functions ──────────────────────────────────────────

export interface PatientUserRecord {
  uid: string;
  email: string;
  full_name: string;
  patient_id: string;
  phone_number: string;
  created_at: string;
}

export async function registerPatientAccount(data: {
  full_name: string;
  email: string;
  phone_number: string;
  patient_id: string;
  password: string;
  confirm_password: string;
}): Promise<{ success: boolean; message: string; user: PatientUserRecord }> {
  const res = await fetch(`${API_BASE}/patient/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.detail || 'Patient registration failed.');
  }
  return json;
}

export async function loginPatientAccount(email: string, pass: string): Promise<{ success: boolean; token: string; user: PatientUserRecord }> {
  const res = await fetch(`${API_BASE}/patient/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.detail || 'Invalid patient email or password.');
  }
  return json;
}

export async function fetchPatientPortalData(): Promise<any> {
  const session = localStorage.getItem('carepulse_patient_session');
  let token = '';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.token) token = `Bearer ${parsed.token}`;
      else if (parsed.uid) token = `Bearer carepulse-patient-${parsed.uid}`;
    } catch {}
  }
  if (!token) {
    token = 'Bearer carepulse-patient-P-001';
  }

  const res = await fetch(`${API_BASE}/patient/portal/my-data`, {
    headers: { Authorization: token },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to retrieve patient portal data');
  }
  return res.json();
}

// ─── Hospital Billing & Accounting API Functions ─────────────────────────────

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  patient_id: string;
  patient_name: string;
  service: string;
  amount: number;
  insurance_covered: number;
  patient_due: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'PROCESSED';
  created_at: string;
  payment_method: string;
  accountant_notes?: string;
}

export async function fetchBillingSummary(): Promise<any> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-acct-davis';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/billing/summary`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error('Failed to retrieve billing summary');
  return res.json();
}

export async function fetchBillingInvoices(): Promise<InvoiceItem[]> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-acct-davis';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/billing/invoices`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error('Failed to retrieve invoices');
  return res.json();
}

export async function processBillingInvoice(invoiceId: string, action: string = 'PROCESSED', notes?: string): Promise<any> {
  const session = localStorage.getItem('carepulse_staff_session');
  let token = 'Bearer carepulse-staff-staff-acct-davis';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed.uid) token = `Bearer carepulse-staff-${parsed.uid}`;
    } catch {}
  }
  const res = await fetch(`${API_BASE}/billing/process-invoice/${invoiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ action, notes }),
  });
  if (!res.ok) throw new Error('Failed to process invoice');
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────
// EMERGENCY CELLULAR SMS & BENCHMARK API
// ─────────────────────────────────────────────────────────────────────

export async function fetchDispatchedSMS(patientId?: string): Promise<SMSAlertRecord[]> {
  const query = patientId ? `?patient_id=${patientId}` : '';
  const res = await fetch(`${API_BASE}/sms/alerts${query}`);
  if (!res.ok) throw new Error(`Failed to fetch SMS records: ${res.statusText}`);
  return res.json();
}

export async function fetchLatestSMS(): Promise<SMSAlertRecord | null> {
  const res = await fetch(`${API_BASE}/sms/alerts/latest`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSMSById(smsId: string): Promise<SMSAlertRecord> {
  const res = await fetch(`${API_BASE}/sms/alerts/${smsId}`);
  if (!res.ok) throw new Error(`Failed to fetch SMS ${smsId}: ${res.statusText}`);
  return res.json();
}

export async function sendTestEmergencySMS(payload: SendTestSMSPayload): Promise<SMSAlertRecord> {
  const res = await fetch(`${API_BASE}/sms/send-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to send test emergency SMS: ${res.statusText}`);
  return res.json();
}

export async function fetchSMSConfig(): Promise<SMSGatewayConfig> {
  const res = await fetch(`${API_BASE}/sms/config`);
  if (!res.ok) throw new Error(`Failed to fetch SMS config: ${res.statusText}`);
  return res.json();
}

export async function simulateCriticalDeterioration(payload: {
  patient_id: string;
  condition_type: string;
  recipient_phone?: string;
}): Promise<{
  criticality_analysis: any;
  dispatched_sms: SMSAlertRecord;
}> {
  const res = await fetch(`${API_BASE}/sms/simulate-critical-deterioration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to simulate critical deterioration: ${res.statusText}`);
  return res.json();
}

export async function fetchBenchmarkReport(): Promise<PerformanceBenchmarkReport> {
  const res = await fetch(`${API_BASE}/evaluation/benchmark`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark report: ${res.statusText}`);
  return res.json();
}

export async function rerunBenchmark(): Promise<PerformanceBenchmarkReport> {
  const res = await fetch(`${API_BASE}/evaluation/run-benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to rerun benchmark: ${res.statusText}`);
  return res.json();
}

export async function fetchCdsAlerts(patientId?: string): Promise<CDSAlert[]> {
  const url = patientId ? `${API_BASE}/evaluation/cds-alerts?patient_id=${patientId}` : `${API_BASE}/evaluation/cds-alerts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CDS alerts: ${res.statusText}`);
  return res.json();
}



