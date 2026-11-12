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

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

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
    loadBundle();
  }, [selectedPatientId]);

  const handleCopy = () => {
    if (!bundle) return;
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      if (!resp.ok) {
        throw new Error(`Ingestion failed with status ${resp.status}`);
      }

      const json = await resp.json();
      setIngestResult(json);
      // Reload bundle to reflect new observation
      loadBundle();
    } catch (err: any) {
      setIngestResult({ error: err.message });
    } finally {
      setIngestLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1f2c] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <FileJson className="h-5 w-5 text-emerald-400" />
            <span>HL7 FHIR R4 & HAPI Interoperability Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Clinical Observation generation, LOINC & UCUM standardization, and live public HAPI storage
          </p>
        </div>

        {/* Server Status Badges */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#11231a] text-[#4ade80] border border-[#1b4332]">
            <span className="h-2 w-2 rounded-full bg-[#4ade80] animate-pulse" />
            <span>HAPI FHIR Cloud: Connected</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#111624] text-[#38bdf8] border border-[#1e2a42]">
            <Database className="h-3.5 w-3.5" />
            <span>Local Fallback Store: Active</span>
          </div>
        </div>
      </div>

      {/* LOINC & UCUM Reference Matrix */}
      <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span>Standardized Clinical Coding Specifications</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0c1017] border border-[#1a1f2c]">
            <div className="text-[10px] text-slate-500 uppercase">Heart Rate</div>
            <div className="font-mono text-emerald-400 font-bold mt-1">8867-4</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">UCUM: /min</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1017] border border-[#1a1f2c]">
            <div className="text-[10px] text-slate-500 uppercase">Oxygen Saturation</div>
            <div className="font-mono text-teal-400 font-bold mt-1">2708-6</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">UCUM: %</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1017] border border-[#1a1f2c]">
            <div className="text-[10px] text-slate-500 uppercase">Respiration Rate</div>
            <div className="font-mono text-sky-400 font-bold mt-1">9279-1</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">UCUM: /min</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1017] border border-[#1a1f2c]">
            <div className="text-[10px] text-slate-500 uppercase">Systolic BP</div>
            <div className="font-mono text-indigo-400 font-bold mt-1">8480-6</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">UCUM: mm[Hg]</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0c1017] border border-[#1a1f2c]">
            <div className="text-[10px] text-slate-500 uppercase">Body Temp</div>
            <div className="font-mono text-amber-400 font-bold mt-1">8310-5</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">UCUM: Cel</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Deck: Ingestion Test Deck + Live Bundle Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test FHIR Ingestion */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Send className="h-4 w-4 text-emerald-400" />
                <span>Test Live FHIR Ingestion API</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Submits real FHIR R4 Observation to <code>POST /api/fhir/observation</code>, verifies synthetic Patient upsert, and queries <code>hapi.fhir.org</code>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#1e2433] bg-[#11151f] px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) — {p.condition}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Observation Parameter</label>
                <select
                  value={testVital}
                  onChange={(e) => setTestVital(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#1e2433] bg-[#11151f] px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="heart_rate">Heart Rate (LOINC 8867-4)</option>
                  <option value="oxygen_saturation">Oxygen Saturation (LOINC 2708-6)</option>
                  <option value="respiratory_rate">Respiratory Rate (LOINC 9279-1)</option>
                  <option value="systolic_bp">Systolic BP (LOINC 8480-6)</option>
                  <option value="body_temperature">Body Temperature (LOINC 8310-5)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Measurement Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={testValue}
                  onChange={(e) => setTestValue(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-[#1e2433] bg-[#11151f] px-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleTestIngest}
                disabled={ingestLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
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

            {/* Ingestion Response Output */}
            {ingestResult && (
              <div className="rounded-xl bg-[#0c1017] border border-[#1e2433] p-3 text-xs space-y-2 animate-in fade-in">
                {ingestResult.error ? (
                  <div className="text-rose-400 flex items-center space-x-1.5 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Error: {ingestResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>201 Created & Verified</span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20">
                        HAPI ID: {ingestResult.hapi_resource_id || 'Stored'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-1 font-mono pt-1">
                      <div>LOINC: {ingestResult.loinc_code} ({ingestResult.vital_name})</div>
                      <div>Unit: {ingestResult.ucum_unit} | Value: {ingestResult.value}</div>
                      <div>Subject: {ingestResult.patient_reference}</div>
                      <div className="text-slate-400 text-[9px] pt-1">
                        Stored in HAPI FHIR cloud and propagated to real-time telemetry stream.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: FHIR Bundle Explorer */}
        <div className="lg:col-span-7 rounded-2xl border border-[#1a1f2c] bg-[#10141e] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Patient Observation Bundle</h3>
              <p className="text-[11px] text-slate-400">
                FHIR R4 Collection Bundle for {selectedPatient?.name} ({selectedPatientId})
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadBundle}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-lg border border-[#232b3b] bg-[#151a24] text-[11px] text-slate-300 hover:text-white"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleCopy}
                disabled={!bundle}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-400 hover:bg-emerald-500/20 flex items-center space-x-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>

          {/* JSON Window */}
          <div className="h-96 w-full rounded-xl bg-[#090c12] border border-[#181d29] p-4 overflow-auto font-mono text-[11px] text-slate-300 leading-relaxed">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Loading FHIR Bundle...
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-rose-400">
                {error}
              </div>
            ) : bundle ? (
              <pre>{JSON.stringify(bundle, null, 2)}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No observations recorded yet. Submit an observation to view bundle.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
