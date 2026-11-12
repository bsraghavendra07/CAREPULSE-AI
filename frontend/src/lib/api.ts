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

// ─────────────────────────────────────────────────────────────────────
// EMERGENCY CELLULAR SMS API
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



