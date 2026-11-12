import { PatientProfile } from '../types/patient';
import { PerformanceReport } from '../types/telemetry';
import { FHIRBundle } from '../types/fhir';

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

