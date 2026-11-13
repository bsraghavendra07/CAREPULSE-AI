import React, { useState, useEffect } from 'react';
import { PatientProfile } from '../types/patient';
import { fetchFhirBundle } from '../lib/api';
import {
  FileJson,
  Copy,
  Check,
  Download,
  Send,
  Database,
  Cloud,
  Server,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface FhirPageProps {
  patients: PatientProfile[];
}

export function FhirPage({ patients }: FhirPageProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'P-001');
  const [bundle, setBundle] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingestion Test State
  const [testVital, setTestVital] = useState<string>('heart_rate');
  const [testValue, setTestValue] = useState<number>(88);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);

  // Patient Upsert State
  const [patientUpsertLoading, setPatientUpsertLoading] = useState(false);
  const [patientUpsertResult, setPatientUpsertResult] = useState<any | null>(null);

  // Live FHIR Server Health Status
  const [fhirStatus, setFhirStatus] = useState<any | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const checkFhirStatus = async () => {
    try {
      const resp = await fetch('/api/fhir/status');
      if (resp.ok) {
        const data = await resp.json();
        setFhirStatus(data);
      }
    } catch {
      setFhirStatus({ hapi_connected: false, storage_mode: 'LOCAL_FALLBACK' });
    }
  };

  const loadBundle = async () => {
    if (!selectedPatientId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFhirBundle(selectedPatientId);
      setBundle(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch FHIR bundle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFhirStatus();
    loadBundle();
  }, [selectedPatientId]);

  const handleCopy = () => {
    if (!bundle) return;
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpsertPatient = async () => {
    try {
      setPatientUpsertLoading(true);
      setPatientUpsertResult(null);

      const resp = await fetch(`/api/fhir/patient/${selectedPatientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPatientId,
          name: [
            {
              use: 'official',
              text: selectedPatient?.name || `Patient ${selectedPatientId}`,
            },
          ],
          gender: selectedPatient?.gender || 'unknown',
          birthDate: selectedPatient?.birthDate || '1980-01-01',
        }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.detail || `Upsert failed with status ${resp.status}`);
      }
      setPatientUpsertResult(json);
      checkFhirStatus();
    } catch (err: any) {
      setPatientUpsertResult({ error: err.message });
    } finally {
      setPatientUpsertLoading(false);
    }
  };

  const handleTestIngest = async () => {
    try {
      setIngestLoading(true);
      setIngestResult(null);

      const resp = await fetch('/api/fhir/observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          vital_name: testVital,
          value: Number(testValue),
        }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.detail || `Ingestion failed with status ${resp.status}`);
      }

      setIngestResult(json);
      loadBundle();
      checkFhirStatus();
    } catch (err: any) {
      setIngestResult({ error: err.message });
    } finally {
      setIngestLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827] flex items-center space-x-2.5">
            <FileJson className="h-5 w-5 text-[#4A90E2]" />
            <span>HL7 FHIR R4 & HAPI Interoperability Hub</span>
          </h2>
          <p className="text-xs text-[#4B5563] mt-1">
            Clinical Observation generation, LOINC & UCUM standardization, and live public HAPI storage
          </p>
        </div>

        {/* Server Status Badges */}
        <div className="flex items-center space-x-2">
          {fhirStatus?.hapi_connected ? (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>HAPI FHIR Cloud: Connected ({fhirStatus.hapi_fhir_version || 'R4'})</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>HAPI FHIR Cloud: {fhirStatus ? 'Offline / Fallback Active' : 'Checking...'}</span>
            </div>
          )}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <Database className="h-3.5 w-3.5 text-sky-600" />
            <span>Local Fallback Store: Active</span>
          </div>
        </div>
      </div>

      {/* LOINC & UCUM Reference Matrix */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5">
        <h3 className="text-sm font-bold text-[#111827] mb-3 flex items-center space-x-2">
          <Layers className="h-4 w-4 text-[#4A90E2]" />
          <span>Standardized Clinical Coding Specifications</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#E5E7EB]">
            <div className="text-[10px] text-[#4B5563] uppercase">Heart Rate</div>
            <div className="font-mono text-[#4A90E2] font-bold mt-1">8867-4</div>
            <div className="text-[10px] text-[#4B5563] font-mono mt-0.5">UCUM: /min</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#E5E7EB]">
            <div className="text-[10px] text-[#4B5563] uppercase">Oxygen Saturation</div>
            <div className="font-mono text-teal-400 font-bold mt-1">2708-6</div>
            <div className="text-[10px] text-[#4B5563] font-mono mt-0.5">UCUM: %</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#E5E7EB]">
            <div className="text-[10px] text-[#4B5563] uppercase">Respiration Rate</div>
            <div className="font-mono text-sky-400 font-bold mt-1">9279-1</div>
            <div className="text-[10px] text-[#4B5563] font-mono mt-0.5">UCUM: /min</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#E5E7EB]">
            <div className="text-[10px] text-[#4B5563] uppercase">Systolic BP</div>
            <div className="font-mono text-indigo-400 font-bold mt-1">8480-6</div>
            <div className="text-[10px] text-[#4B5563] font-mono mt-0.5">UCUM: mm[Hg]</div>
          </div>
          <div className="p-3 rounded-xl bg-[#F0F7FF] border border-[#E5E7EB]">
            <div className="text-[10px] text-[#4B5563] uppercase">Body Temp</div>
            <div className="font-mono text-amber-400 font-bold mt-1">8310-5</div>
            <div className="text-[10px] text-[#4B5563] font-mono mt-0.5">UCUM: Cel</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Deck: Ingestion Test Deck + Live Bundle Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test FHIR Ingestion & Patient Sync */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Synthetic Patient Upsert */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827] flex items-center space-x-2">
                <Cloud className="h-4 w-4 text-[#4A90E2]" />
                <span>Synthetic Patient HAPI Sync</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                PUT /Patient/:id
              </span>
            </div>
            <p className="text-[11px] text-[#4B5563]">
              Ensures synthetic patient profile exists on public HAPI FHIR before submitting observations.
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={handleUpsertPatient}
                disabled={patientUpsertLoading}
                className="flex-1 py-2 px-3 rounded-xl bg-[#4A90E2] hover:bg-[#3b7ac2] text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {patientUpsertLoading ? (
                  <span>Syncing Patient with HAPI...</span>
                ) : (
                  <>
                    <Server className="h-3.5 w-3.5" />
                    <span>Create / Update Patient on HAPI</span>
                  </>
                )}
              </button>
            </div>

            {patientUpsertResult && (
              <div className="rounded-xl bg-[#F0F7FF] border border-[#E5E7EB] p-3 text-xs space-y-1.5 animate-in fade-in">
                {patientUpsertResult.error ? (
                  <div className="text-rose-600 flex items-center space-x-1.5 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Sync Error: {patientUpsertResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#4A90E2] flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Patient Synced</span>
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          patientUpsertResult.storage_destination === 'HAPI_FHIR_CLOUD'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {patientUpsertResult.storage_destination === 'HAPI_FHIR_CLOUD'
                          ? '✅ Stored in HAPI FHIR Cloud'
                          : '⚠️ Stored in Local Fallback Store'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      <div>Patient ID: {patientUpsertResult.patient_id}</div>
                      <div>Mode: {patientUpsertResult.storage_mode}</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Test FHIR Ingestion */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#111827] flex items-center space-x-2">
                <Send className="h-4 w-4 text-[#4A90E2]" />
                <span>Test Live FHIR Ingestion API</span>
              </h3>
              <p className="text-[11px] text-[#4B5563] mt-1">
                Submits real FHIR R4 Observation to <code>POST /api/fhir/observation</code>, verifies synthetic Patient upsert, and queries <code>hapi.fhir.org</code>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#4B5563] block mb-1">Target Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#E5E7EB] bg-[#F0F7FF] px-3 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) — {p.condition}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#4B5563] block mb-1">Observation Parameter</label>
                <select
                  value={testVital}
                  onChange={(e) => setTestVital(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#E5E7EB] bg-[#F0F7FF] px-3 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="heart_rate">Heart Rate (LOINC 8867-4)</option>
                  <option value="oxygen_saturation">Oxygen Saturation (LOINC 2708-6)</option>
                  <option value="respiratory_rate">Respiratory Rate (LOINC 9279-1)</option>
                  <option value="systolic_bp">Systolic BP (LOINC 8480-6)</option>
                  <option value="body_temperature">Body Temperature (LOINC 8310-5)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#4B5563] block mb-1">Measurement Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={testValue}
                  onChange={(e) => setTestValue(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-[#E5E7EB] bg-[#F0F7FF] px-3 text-xs text-[#111827] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleTestIngest}
                disabled={ingestLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-sm"
              >
                {ingestLoading ? (
                  <span>Submitting to HAPI FHIR...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Live FHIR Observation</span>
                  </>
                )}
              </button>
            </div>

            {/* Ingestion Response Output with explicit storage mode */}
            {ingestResult && (
              <div className="rounded-xl bg-[#F0F7FF] border border-[#E5E7EB] p-3 text-xs space-y-2 animate-in fade-in">
                {ingestResult.error ? (
                  <div className="text-rose-600 flex items-center space-x-1.5 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Error: {ingestResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[#4A90E2] font-bold">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>201 Created</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                          ingestResult.storage_destination === 'HAPI_FHIR_CLOUD'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ingestResult.storage_destination === 'HAPI_FHIR_CLOUD'
                          ? '✅ HAPI FHIR Cloud (Live)'
                          : '⚠️ Local Fallback Store'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-700 space-y-1 font-mono pt-1">
                      <div>LOINC: {ingestResult.loinc_code} ({ingestResult.vital_name})</div>
                      <div>Unit: {ingestResult.ucum_unit} | Value: {ingestResult.value}</div>
                      <div>Subject: {ingestResult.patient_reference}</div>
                      {ingestResult.hapi_resource_id && (
                        <div className="text-emerald-700 font-semibold">
                          HAPI Cloud ID: {ingestResult.hapi_resource_id} (Verified)
                        </div>
                      )}
                      {ingestResult.hapi_error && (
                        <div className="text-amber-700">
                          HAPI Server Notice: {ingestResult.hapi_error}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: FHIR Bundle Explorer */}
        <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Patient Observation Bundle</h3>
              <p className="text-[11px] text-[#4B5563]">
                FHIR R4 Collection Bundle for {selectedPatient?.name} ({selectedPatientId})
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadBundle}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-lg border border-[#232b3b] bg-[#151a24] text-[11px] text-[#4B5563] hover:text-[#111827]"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleCopy}
                disabled={!bundle}
                className="px-2.5 py-1.5 rounded-lg border border-[#4A90E2]/30 bg-[#D9F0FF] text-[#4A90E2] text-[11px] text-[#4A90E2] hover:bg-[#D9F0FF] text-[#4A90E2] flex items-center space-x-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>

          {/* JSON Window */}
          <div className="h-96 w-full rounded-xl bg-[#090c12] border border-[#181d29] p-4 overflow-auto font-mono text-[11px] text-[#4B5563] leading-relaxed">
            {loading ? (
              <div className="h-full flex items-center justify-center text-[#4B5563]">
                Loading FHIR Bundle...
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-rose-400">
                {error}
              </div>
            ) : bundle ? (
              <pre>{JSON.stringify(bundle, null, 2)}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-[#4B5563]">
                No observations recorded yet. Submit an observation to view bundle.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
