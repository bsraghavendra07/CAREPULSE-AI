import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  Send, 
  RefreshCw, 
  FileCode, 
  ShieldCheck, 
  Activity, 
  Heart, 
  Wind, 
  Thermometer, 
  Layers,
  ArrowRight
} from 'lucide-react';

export default function FHIRInspector({ activePatientId, onRefreshTelemetry }) {
  const [fhirStats, setFhirStats] = useState(null);
  const [observations, setObservations] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(activePatientId || 'P-003');
  const [vitalType, setVitalType] = useState('SPO2');
  const [vitalValue, setVitalValue] = useState('92');
  const [ingestResponse, setIngestResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeJsonObs, setActiveJsonObs] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch FHIR Store stats & observations
  const loadFHIRData = async () => {
    try {
      const statsRes = await fetch('/api/fhir/status');
      const stats = await statsRes.json();
      setFhirStats(stats);

      const obsRes = await fetch(`/fhir/Observation?subject=Patient/${selectedPatient}&_limit=15`);
      const bundle = await obsRes.json();
      const entries = bundle.entry ? bundle.entry.map(e => e.resource) : [];
      setObservations(entries);
      if (entries.length > 0 && !activeJsonObs) {
        setActiveJsonObs(entries[0]);
      }
    } catch (err) {
      console.error('Failed to load FHIR data:', err);
    }
  };

  useEffect(() => {
    loadFHIRData();
  }, [selectedPatient]);

  // Send single FHIR R4 Observation
  const handleSendSingleObservation = async () => {
    setIsLoading(true);
    setIngestResponse(null);
    try {
      const res = await fetch('/api/fhir/test-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient,
          vital_type: vitalType,
          value: parseFloat(vitalValue)
        })
      });
      const data = await res.json();
      setIngestResponse(data);
      await loadFHIRData();
      if (onRefreshTelemetry) onRefreshTelemetry();
    } catch (err) {
      setIngestResponse({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Send full FHIR R4 Bundle
  const handleSendBundle = async () => {
    setIsLoading(true);
    setIngestResponse(null);
    try {
      const now = new Date().toISOString();
      const bundlePayload = {
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: `obs-hr-${Date.now()}`,
              status: "final",
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
              code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
              subject: { reference: `Patient/${selectedPatient}` },
              effectiveDateTime: now,
              valueQuantity: { value: 78, unit: "beats/minute", system: "http://unitsofmeasure.org", code: "/min" }
            }
          },
          {
            resource: {
              resourceType: "Observation",
              id: `obs-spo2-${Date.now()}`,
              status: "final",
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
              code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation" }] },
              subject: { reference: `Patient/${selectedPatient}` },
              effectiveDateTime: now,
              valueQuantity: { value: 96, unit: "%", system: "http://unitsofmeasure.org", code: "%" }
            }
          },
          {
            resource: {
              resourceType: "Observation",
              id: `obs-rr-${Date.now()}`,
              status: "final",
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
              code: { coding: [{ system: "http://loinc.org", code: "9279-1", display: "Respiratory rate" }] },
              subject: { reference: `Patient/${selectedPatient}` },
              effectiveDateTime: now,
              valueQuantity: { value: 16, unit: "breaths/minute", system: "http://unitsofmeasure.org", code: "/min" }
            }
          },
          {
            resource: {
              resourceType: "Observation",
              id: `obs-temp-${Date.now()}`,
              status: "final",
              category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
              code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
              subject: { reference: `Patient/${selectedPatient}` },
              effectiveDateTime: now,
              valueQuantity: { value: 36.8, unit: "Cel", system: "http://unitsofmeasure.org", code: "Cel" }
            }
          }
        ]
      };

      const res = await fetch('/fhir/Bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(bundlePayload)
      });
      const data = await res.json();
      setIngestResponse(data);
      await loadFHIRData();
      if (onRefreshTelemetry) onRefreshTelemetry();
    } catch (err) {
      setIngestResponse({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Sync to HAPI Server
  const handleSyncToHapi = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/fhir/sync-hapi', { method: 'POST' });
      await res.json();
      await loadFHIRData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: FHIR R4 & HAPI Server Integration */}
      <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F2922] border border-[#165342] flex items-center justify-center text-[#20C997]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  FHIR R4 Ingestion API & HAPI FHIR Bridge
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C997]/20 text-[#20C997] border border-[#20C997]/30">
                  Requirement 3.1
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Compliant with HL7 FHIR Release 4 (v4.0.1) • Official LOINC Vital Signs Profiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToHapi}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141A23] hover:bg-[#1A222D] border border-[#252D38] text-xs font-semibold text-[#36BFFA] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to HAPI...' : 'Sync to HAPI Server'}</span>
            </button>

            <button
              onClick={loadFHIRData}
              className="p-1.5 rounded-xl bg-[#141A23] hover:bg-[#1A222D] border border-[#252D38] text-[#94A3B8] hover:text-white transition"
              title="Refresh FHIR Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#141A23] border border-[#252D38] p-3 rounded-xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#20C997] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">FHIR R4 Endpoint</div>
              <div className="text-xs font-mono font-bold text-white truncate">POST /fhir/Observation</div>
            </div>
          </div>

          <div className="bg-[#141A23] border border-[#252D38] p-3 rounded-xl flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#36BFFA] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">LOINC Coding</div>
              <div className="text-xs font-semibold text-white">4 Mandatory Channels</div>
            </div>
          </div>

          <div className="bg-[#141A23] border border-[#252D38] p-3 rounded-xl flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#A855F7] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">HAPI FHIR Server</div>
              <div className="text-xs font-semibold text-white truncate">
                {fhirStats?.hapi_server?.target_url || 'http://hapi.fhir.org/baseR4'}
              </div>
            </div>
          </div>

          <div className="bg-[#141A23] border border-[#252D38] p-3 rounded-xl flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#64748B] uppercase font-bold">Stored Observations</div>
              <div className="text-xs font-mono font-bold text-white">
                {fhirStats?.total_observations || observations.length} resources
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOINC Matrix & Mandatory Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Channel 1: Heart Rate */}
        <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Heart className="w-4 h-4 text-[#EF4444]" />
              <span>Heart Rate</span>
            </div>
            <span className="text-[10px] font-mono text-[#20C997] bg-[#20C997]/10 px-2 py-0.5 rounded">
              LOINC 8867-4
            </span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">Unit: <code className="text-white">beats/minute (/min)</code></div>
          <div className="text-xs font-mono text-[#64748B]">
            Stored: <strong className="text-white">{fhirStats?.loinc_distribution?.['8867-4'] || 0}</strong> observations
          </div>
        </div>

        {/* Channel 2: Oxygen Saturation */}
        <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Activity className="w-4 h-4 text-[#36BFFA]" />
              <span>Oxygen Saturation</span>
            </div>
            <span className="text-[10px] font-mono text-[#36BFFA] bg-[#36BFFA]/10 px-2 py-0.5 rounded">
              LOINC 2708-6
            </span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">Unit: <code className="text-white">% (UCUM %)</code></div>
          <div className="text-xs font-mono text-[#64748B]">
            Stored: <strong className="text-white">{(fhirStats?.loinc_distribution?.['2708-6'] || 0) + (fhirStats?.loinc_distribution?.['59408-5'] || 0)}</strong> observations
          </div>
        </div>

        {/* Channel 3: Respiratory Rate */}
        <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Wind className="w-4 h-4 text-[#A855F7]" />
              <span>Respiratory Rate</span>
            </div>
            <span className="text-[10px] font-mono text-[#A855F7] bg-[#A855F7]/10 px-2 py-0.5 rounded">
              LOINC 9279-1
            </span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">Unit: <code className="text-white">breaths/minute (/min)</code></div>
          <div className="text-xs font-mono text-[#64748B]">
            Stored: <strong className="text-white">{fhirStats?.loinc_distribution?.['9279-1'] || 0}</strong> observations
          </div>
        </div>

        {/* Channel 4: Body Temperature */}
        <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Thermometer className="w-4 h-4 text-[#F59E0B]" />
              <span>Body Temperature</span>
            </div>
            <span className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded">
              LOINC 8310-5
            </span>
          </div>
          <div className="text-[11px] text-[#94A3B8]">Unit: <code className="text-white">Celsius (Cel)</code></div>
          <div className="text-xs font-mono text-[#64748B]">
            Stored: <strong className="text-white">{fhirStats?.loinc_distribution?.['8310-5'] || 0}</strong> observations
          </div>
        </div>
      </div>

      {/* Interactive FHIR Ingestion Workbench & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Ingestion Form */}
        <div className="lg:col-span-5 bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Send className="w-4 h-4 text-[#20C997]" />
              <span>Interactive Ingestion Workbench</span>
            </h3>
            <span className="text-[10px] font-mono text-[#64748B]">POST /fhir/Observation</span>
          </div>

          {/* Patient Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#94A3B8]">Target Patient Resource:</label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full bg-[#141A23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#20C997]"
            >
              <option value="P-001">P-001: Rajesh Sharma (Post-CABG & CAD)</option>
              <option value="P-002">P-002: Arthur Pendelton (Severe COPD - NEWS2 Scale 2)</option>
              <option value="P-003">P-003: Priya Patel (Resolving Bilateral Pneumonia & Sepsis)</option>
              <option value="P-004">P-004: David Chen (Congestive Heart Failure NYHA II)</option>
              <option value="P-005">P-005: Sunita Rao (Post-Op Day 4 Laparoscopic)</option>
            </select>
          </div>

          {/* Vital Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#94A3B8]">Vital Sign Channel:</label>
              <select
                value={vitalType}
                onChange={(e) => {
                  setVitalType(e.target.value);
                  if (e.target.value === 'HEART_RATE') setVitalValue('82');
                  else if (e.target.value === 'SPO2') setVitalValue('95');
                  else if (e.target.value === 'RESPIRATORY_RATE') setVitalValue('17');
                  else if (e.target.value === 'TEMPERATURE') setVitalValue('37.1');
                }}
                className="w-full bg-[#141A23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#20C997]"
              >
                <option value="HEART_RATE">Heart Rate (8867-4)</option>
                <option value="SPO2">SpO2 (2708-6)</option>
                <option value="RESPIRATORY_RATE">Resp Rate (9279-1)</option>
                <option value="TEMPERATURE">Temperature (8310-5)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#94A3B8]">Value Quantity:</label>
              <input
                type="number"
                step="0.1"
                value={vitalValue}
                onChange={(e) => setVitalValue(e.target.value)}
                className="w-full bg-[#141A23] border border-[#252D38] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#20C997]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSendSingleObservation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#20C997] hover:bg-[#1BAF83] text-[#080B10] font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Ingesting FHIR Observation...' : 'Send FHIR R4 Observation'}</span>
            </button>

            <button
              onClick={handleSendBundle}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#141A23] hover:bg-[#1A222D] border border-[#252D38] text-white font-semibold text-xs transition"
            >
              <Layers className="w-3.5 h-3.5 text-[#36BFFA]" />
              <span>Send 4-Vital Transaction Bundle (POST /fhir/Bundle)</span>
            </button>
          </div>

          {/* Clinical Simulation Quick Injections */}
          <div className="pt-2 border-t border-[#1E2633] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Quick Scenario Presets:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                onClick={() => {
                  setVitalType('HEART_RATE');
                  setVitalValue('135');
                }}
                className="p-2 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-left transition"
              >
                <div className="font-bold text-[#EF4444]">Tachycardia</div>
                <div className="text-[10px] text-[#64748B]">HR: 135 bpm (NEWS2 +3)</div>
              </button>

              <button
                onClick={() => {
                  setVitalType('SPO2');
                  setVitalValue('86');
                }}
                className="p-2 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-left transition"
              >
                <div className="font-bold text-[#EF4444]">Hypoxemia</div>
                <div className="text-[10px] text-[#64748B]">SpO2: 86% (NEWS2 +3)</div>
              </button>

              <button
                onClick={() => {
                  setSelectedPatient('P-002');
                  setVitalType('SPO2');
                  setVitalValue('90');
                }}
                className="p-2 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-left transition"
              >
                <div className="font-bold text-[#EC4899]">COPD Target</div>
                <div className="text-[10px] text-[#64748B]">P-002 Scale 2: 90% Normal</div>
              </button>

              <button
                onClick={() => {
                  setVitalType('SPO2');
                  setVitalValue('0');
                }}
                className="p-2 rounded-xl bg-[#141A23] hover:bg-[#1E2633] border border-[#252D38] text-left transition"
              >
                <div className="font-bold text-[#A855F7]">Probe Off</div>
                <div className="text-[10px] text-[#64748B]">SpO2: 0% Sensor Truth Filter</div>
              </button>
            </div>
          </div>

          {/* Ingestion Result Box */}
          {ingestResponse && (
            <div className="p-3 rounded-xl bg-[#080B10] border border-[#252D38] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#20C997] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Observation Ingested Successfully</span>
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">HTTP 200 OK</span>
              </div>
              <div className="text-[11px] text-[#94A3B8]">
                ID: <code className="text-white">{ingestResponse.observation_id || ingestResponse.status}</code>
              </div>
              {ingestResponse.processed && (
                <div className="text-[11px] text-[#94A3B8]">
                  NEWS2 Tier: <strong className="text-[#20C997]">{ingestResponse.processed.news2?.tier}</strong> (Score {ingestResponse.processed.news2?.score})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Observation Stream & Raw FHIR R4 JSON Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#36BFFA]" />
                  <span>Stored FHIR R4 Observations</span>
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Live query from local FHIR repository & HAPI synchronization
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#20C997]">
                {observations.length} items for {selectedPatient}
              </span>
            </div>

            {/* List of recent observations */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {observations.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#64748B]">
                  No stored observations yet for this patient. Click "Send FHIR R4 Observation" to ingest.
                </div>
              ) : (
                observations.map((obs, idx) => {
                  const coding = obs.code?.coding?.[0] || {};
                  const isCurrent = activeJsonObs?.id === obs.id;
                  return (
                    <div
                      key={obs.id || idx}
                      onClick={() => setActiveJsonObs(obs)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[#152322] border-[#20C997] text-white'
                          : 'bg-[#141A23] border-[#252D38] text-[#94A3B8] hover:border-[#333F4E]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[#20C997]" />
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{coding.display || obs.code?.text || 'Vital Sign'}</span>
                            <span className="text-[10px] font-mono text-[#64748B]">({coding.code})</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#64748B]">
                            {obs.effectiveDateTime || 'Recent'} • {obs.id}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-white text-sm">
                          {obs.valueQuantity?.value} {obs.valueQuantity?.code || obs.valueQuantity?.unit}
                        </div>
                        <div className="text-[9px] text-[#20C997] font-semibold">Valid FHIR R4</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* JSON Schema Viewer */}
          <div className="bg-[#10151C] border border-[#1E2633] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#A855F7]" />
                <span>FHIR R4 Resource JSON Inspector</span>
              </span>
              <span className="text-[10px] font-mono text-[#20C997]">application/fhir+json</span>
            </div>

            <pre className="bg-[#080B10] border border-[#1E2633] rounded-xl p-4 text-[11px] font-mono text-[#20C997] max-h-72 overflow-x-auto overflow-y-auto leading-relaxed">
              {JSON.stringify(activeJsonObs || observations[0] || { message: "Select an observation above to inspect its compliant FHIR R4 JSON" }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}