import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ClinicianHeader from './components/ClinicianHeader';
import KPICards from './components/KPICards';
import AdmissionChart from './components/AdmissionChart';
import DiagnosisMixChart from './components/DiagnosisMixChart';
import CardiacVitalsChart from './components/CardiacVitalsChart';
import PriorityPatientQueue from './components/PriorityPatientQueue';
import FHIRInspector from './components/FHIRInspector';

// Patient deep-dive components
import ScenarioControls from './components/ScenarioControls';
import RecoveryDNACard from './components/RecoveryDNACard';
import VitalCards from './components/VitalCards';
import RadarWidget from './components/RadarWidget';
import SensorTruthWidget from './components/SensorTruthWidget';
import AlertCard from './components/AlertCard';
import BenchmarkReport from './components/BenchmarkReport';
import SymptomCheckinModal from './components/SymptomCheckinModal';

import { Play, Pause, Activity, AlertTriangle, ShieldAlert, Sliders } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'monitor' | 'patients' | 'simulator' | 'benchmark'
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState('P-003');
  const [dataSource, setDataSource] = useState('SIMULATOR'); // 'SIMULATOR' | 'BIDMC'
  const [isPlaying, setIsPlaying] = useState(true); // Default to live streaming!
  const [activeScenario, setActiveScenario] = useState('SCENARIO_A'); // 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C'
  const [activeEvent, setActiveEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [simSpeed, setSimSpeed] = useState(1);
  
  // Intelligence State
  const [currentVitals, setCurrentVitals] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [sensorVerdict, setSensorVerdict] = useState(null);
  const [radarResult, setRadarResult] = useState(null);
  const [personalizedEval, setPersonalizedEval] = useState(null);
  const [activeAlertCard, setActiveAlertCard] = useState(null);
  
  // UI State
  const [isConnected, setIsConnected] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' | 'kn' | 'hi'
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [alertCounts, setAlertCounts] = useState({ urgent: 1, review: 1, sensor: 0 });

  const wsRef = useRef(null);
  const playTimerRef = useRef(null);

  // 1. Fetch initial patients
  useEffect(() => {
    fetch('/api/patients')
      .then((res) => res.json())
      .then((data) => {
        setPatients(data);
        if (data.length > 0 && !data.some(p => p.patient_id === activePatientId)) {
          setActivePatientId(data[0].patient_id);
        }
      })
      .catch((err) => console.error('Error fetching patients:', err));
  }, []);

  // 2. Establish WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Telemetry WebSocket connected.');
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'VITAL_UPDATE' && msg.data) {
          handleIncomingTelemetry(msg.data);
        } else if (msg.type === 'INITIAL_SNAPSHOT') {
          if (msg.recent_alerts && msg.recent_alerts.length > 0) {
            setActiveAlertCard(msg.recent_alerts[0]);
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Telemetry WebSocket disconnected.');
    };

    wsRef.current = socket;
    return () => socket.close();
  }, [activePatientId]);

  // Handle incoming telemetry payload
  const handleIncomingTelemetry = (data) => {
    if (data.patient_id !== activePatientId) return;

    setCurrentVitals(data.vitals);
    setSensorVerdict(data.sensor_verdict);
    setRadarResult(data.radar);
    setPersonalizedEval(data.personalized);
    
    if (data.alert_card) {
      setActiveAlertCard(data.alert_card);
      const tier = data.alert_card.tier;
      setAlertCounts(prev => ({
        urgent: tier === 'URGENT' ? prev.urgent + 1 : prev.urgent,
        review: tier === 'REVIEW' ? prev.review + 1 : prev.review,
        sensor: tier === 'SENSOR_WARNING' ? prev.sensor + 1 : prev.sensor
      }));
    }

    setVitalsHistory(prev => {
      const next = [...prev, data.vitals];
      return next.length > 40 ? next.slice(-40) : next;
    });
  };

  // 3. Step Tick (Simulator or BIDMC)
  const executeTick = async () => {
    try {
      const endpoint = dataSource === 'BIDMC'
        ? `/api/bidmc/next?patient_id=${activePatientId}`
        : `/api/simulator/next?patient_id=${activePatientId}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      handleIncomingTelemetry(data);
    } catch (err) {
      console.error('Failed to execute telemetry tick:', err);
    }
  };

  // 4. Play / Pause Stream Ticker
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(400, Math.floor(2500 / simSpeed));
      playTimerRef.current = setInterval(() => {
        executeTick();
      }, intervalMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, dataSource, activePatientId, simSpeed]);

  // Initial tick when patient changes
  useEffect(() => {
    setVitalsHistory([]);
    executeTick();
  }, [activePatientId]);

  // Scenario selection handler
  const handleSelectScenario = async (scenario) => {
    setActiveScenario(scenario);
    let eventName = null;
    if (scenario === 'SCENARIO_A') {
      eventName = null;
    } else if (scenario === 'SCENARIO_B') {
      eventName = 'GRADUAL_DRIFT';
    } else if (scenario === 'SCENARIO_C') {
      eventName = 'PROBE_REMOVAL';
    }
    setActiveEvent(eventName);

    await fetch('/api/simulator/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: activePatientId, event: eventName })
    });

    executeTick();
  };

  // Granular event injection handler
  const handleInjectEvent = async (event) => {
    setActiveEvent(event);
    await fetch('/api/simulator/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: activePatientId, event })
    });
    executeTick();
  };

  const activePatient = patients.find(p => p.patient_id === activePatientId);
  const isScale2 = activePatient?.has_hypercapnic_failure;

  return (
    <div className="flex bg-[#080B10] text-[#F8FAFC] min-h-screen font-sans antialiased selection:bg-[#20C997] selection:text-[#080B10]">
      {/* 1. Left Fixed Sidebar */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={(view) => {
          if (view === 'benchmark') {
            setShowBenchmark(true);
          } else {
            setActiveView(view);
          }
        }} 
        patientCount={patients.length || 5}
        urgentCount={alertCounts.urgent}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
      />

      {/* 2. Main Content View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clinician Header */}
        <ClinicianHeader 
          isConnected={isConnected}
          lang={lang}
          setLang={setLang}
          onOpenCheckin={() => setShowCheckin(true)}
          onOpenBenchmark={() => setShowBenchmark(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          urgentAlerts={alertCounts.urgent}
        />

        {/* Scrollable Dashboard View */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Quick Scenario & Live Stream Action Dock */}
          <div className="bg-[#141A23] border border-[#252D38] rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                What-If Scenario:
              </span>
              <div className="flex items-center gap-1.5 bg-[#080B10] p-1 rounded-xl border border-[#1E2633] text-xs">
                <button
                  onClick={() => handleSelectScenario('SCENARIO_A')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition text-xs ${
                    activeScenario === 'SCENARIO_A' && !activeEvent
                      ? 'bg-[#20C997] text-[#080B10] shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>A: Stable</span>
                </button>

                <button
                  onClick={() => handleSelectScenario('SCENARIO_B')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition text-xs ${
                    activeScenario === 'SCENARIO_B' || activeEvent === 'GRADUAL_DRIFT'
                      ? 'bg-[#EF4444] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>B: Deterioration (+35 min)</span>
                </button>

                <button
                  onClick={() => handleSelectScenario('SCENARIO_C')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition text-xs ${
                    activeScenario === 'SCENARIO_C' || activeEvent === 'PROBE_REMOVAL'
                      ? 'bg-[#8B5CF6] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>C: Sensor Artifact</span>
                </button>
              </div>
            </div>

            {/* Right: Stream Toggle & Active Patient Tag */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#94A3B8] font-medium hidden sm:inline">
                Active Telemetry: <strong className="text-white">{activePatient?.name || 'Priya Patel'}</strong>
              </span>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  isPlaying 
                    ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#080B10]' 
                    : 'bg-[#20C997] hover:bg-[#1BAF83] text-[#080B10]'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause Stream' : 'Live Stream'}</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: EXECUTIVE DASHBOARD (Exact Match to User Reference Image!) */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Row 1: Four Executive KPI Cards */}
              <KPICards 
                patientCount={patients.length || 5}
                urgentCount={alertCounts.urgent}
                reviewCount={alertCounts.review}
                leadTimeMinutes={35}
              />

              {/* Row 2: Weekly Admissions + Diagnosis Mix Donut Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <AdmissionChart />
                </div>
                <div className="lg:col-span-6">
                  <DiagnosisMixChart patients={patients} />
                </div>
              </div>

              {/* Row 3: Cardiac Vitals Trend + Priority Patient Queue Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <CardiacVitalsChart currentVitals={currentVitals} />
                </div>
                <div className="lg:col-span-6">
                  <PriorityPatientQueue 
                    patients={patients}
                    activePatientId={activePatientId}
                    onSelectPatient={(id) => {
                      setActivePatientId(id);
                      setActiveView('monitor');
                    }}
                    onOpenPatientMonitor={() => setActiveView('monitor')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: INDIVIDUAL PATIENT MONITOR & RECOVERY INTELLIGENCE */}
          {(activeView === 'monitor' || activeView === 'patients' || activeView === 'genomics') && (
            <div className="space-y-6">
              {/* Back to Overview Banner */}
              <div className="flex items-center justify-between bg-[#141A23] border border-[#252D38] p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94A3B8]">Viewing Individual Patient Console:</span>
                  <span className="text-xs font-bold text-white">{activePatient?.name} ({activePatient?.patient_id})</span>
                  {isScale2 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                      NEWS2 Scale 2 (COPD Target 88-92%)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-3 py-1 rounded-lg bg-[#1E2633] text-xs font-bold text-[#94A3B8] hover:text-white transition"
                >
                  ← Back to Executive Dashboard
                </button>
              </div>

              {/* 4 LOINC Vitals & Continuous Trend Area Chart */}
              <VitalCards 
                vitals={currentVitals}
                history={vitalsHistory}
                isScale2={isScale2}
              />

              {/* Intelligence Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-6">
                  <RecoveryDNACard 
                    profile={activePatient}
                    personalizedEval={personalizedEval}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <RadarWidget radar={radarResult} />
                    <SensorTruthWidget verdict={sensorVerdict} />
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <AlertCard alert={activeAlertCard} lang={lang} />
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: DEDICATED WHAT-IF SIMULATOR LAB */}
          {activeView === 'simulator' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#141A23] border border-[#252D38] p-3 rounded-xl">
                <span className="text-xs font-bold text-white">What-If Recovery Simulator & BIDMC Replay Lab</span>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-3 py-1 rounded-lg bg-[#1E2633] text-xs font-bold text-[#94A3B8] hover:text-white transition"
                >
                  ← Back to Dashboard
                </button>
              </div>
              <ScenarioControls 
                dataSource={dataSource}
                onSelectDataSource={setDataSource}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onStepNext={executeTick}
                activeScenario={activeScenario}
                onSelectScenario={handleSelectScenario}
                onInjectEvent={handleInjectEvent}
                activeEvent={activeEvent}
              />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <RadarWidget radar={radarResult} />
                </div>
                <div className="lg:col-span-6">
                  <SensorTruthWidget verdict={sensorVerdict} />
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: FHIR R4 INGESTION API & HAPI INSPECTOR */}
          {activeView === 'fhir' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#141A23] border border-[#252D38] p-3 rounded-xl">
                <span className="text-xs font-bold text-white">HL7 FHIR Release 4 & HAPI FHIR Ingestion Inspector</span>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-3 py-1 rounded-lg bg-[#1E2633] text-xs font-bold text-[#94A3B8] hover:text-white transition"
                >
                  ← Back to Dashboard
                </button>
              </div>
              <FHIRInspector 
                activePatientId={activePatientId} 
                onRefreshTelemetry={executeTick} 
              />
            </div>
          )}
        </main>
      </div>

      {/* PS-03 Benchmark Report Modal */}
      {showBenchmark && (
        <BenchmarkReport onClose={() => setShowBenchmark(false)} />
      )}

      {/* Patient Symptom Check-in Modal */}
      {showCheckin && (
        <SymptomCheckinModal
          patient={activePatient}
          onClose={() => setShowCheckin(false)}
          onSubmitted={() => executeTick()}
        />
      )}
    </div>
  );
}
