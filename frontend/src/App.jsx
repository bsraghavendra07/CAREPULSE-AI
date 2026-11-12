import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ScenarioControls from './components/ScenarioControls';
import RecoveryDNACard from './components/RecoveryDNACard';
import VitalCards from './components/VitalCards';
import RadarWidget from './components/RadarWidget';
import SensorTruthWidget from './components/SensorTruthWidget';
import AlertCard from './components/AlertCard';
import BenchmarkReport from './components/BenchmarkReport';
import SymptomCheckinModal from './components/SymptomCheckinModal';
import { Stethoscope } from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState('P-003');
  const [dataSource, setDataSource] = useState('SIMULATOR'); // 'SIMULATOR' | 'BIDMC'
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeScenario, setActiveScenario] = useState('SCENARIO_A'); // 'SCENARIO_A' | 'SCENARIO_B' | 'SCENARIO_C'
  const [activeEvent, setActiveEvent] = useState(null);
  
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
  const [alertCounts, setAlertCounts] = useState({ urgent: 0, review: 0, sensor: 0 });

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
      playTimerRef.current = setInterval(() => {
        executeTick();
      }, 2200);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, dataSource, activePatientId]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Top Clean Header */}
      <Header
        isConnected={isConnected}
        lang={lang}
        setLang={setLang}
        onOpenBenchmark={() => setShowBenchmark(true)}
        onOpenCheckin={() => setShowCheckin(true)}
        alertCounts={alertCounts}
        patients={patients}
        activePatientId={activePatientId}
        onSelectPatient={setActivePatientId}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        
        {/* Simple Scenario Control Dock */}
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

        {/* 4 LOINC Vital Sign Cards + Trajectory Chart */}
        <VitalCards
          vitals={currentVitals}
          history={vitalsHistory}
          isScale2={isScale2}
        />

        {/* Intelligence Grid: Left (Recovery DNA + Radar + Sensor Truth) & Right (Explainable Alert Card) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Patient Profile & Diagnostic Engines (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <RecoveryDNACard
              profile={activePatient}
              personalizedEval={personalizedEval}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RadarWidget
                radar={radarResult}
              />
              <SensorTruthWidget
                verdict={sensorVerdict}
              />
            </div>
          </div>

          {/* Right Column: Explainable Clinical Alert Card (6 cols) */}
          <div className="lg:col-span-6">
            <AlertCard
              alert={activeAlertCard}
              lang={lang}
            />
          </div>

        </div>

      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-[11px] py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CAREPULSE AI • MINEARENA 1.0 • TEAM #1CODERANGERS</span>
          <span>Designed with Modulify & 60fps design inspiration • Clinical Decision Support System</span>
        </div>
      </footer>

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
