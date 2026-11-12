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

