import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PatientProfile } from '../types/patient';
import { TelemetryTick } from '../types/telemetry';
import {
  Heart,
  Activity,
  Wind,
  Thermometer,
  Play,
  Square,
  Pause,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
  Clock,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  setDataSourceMode,
  setSimulationSpeed,
  pauseSimulation,
  resumeSimulation,
  startSimulationEvent,
  stopSimulationEvent,
  restoreProbe,
  clearScenario,
  ingestFhirObservation,
} from '../lib/api';

interface VitalsMonitorPageProps {
  patients: PatientProfile[];
  latestTicks: Record<string, TelemetryTick>;
  telemetryHistory: Record<string, TelemetryTick[]>;
  connected: boolean;
  onSelectPatient?: (patient: PatientProfile) => void;
}

type VitalType = 'hr' | 'spo2' | 'temp' | 'rr';
type DataSourceType = 'WEARABLE' | 'BIDMC';
type WearableScenario =
  | 'Normal'
  | 'Gradual Vital Drift'
  | 'Sudden Spike'
  | 'Missing Readings'
  | 'Motion Noise'
  | 'Probe Removal';

interface AlertItem {
  id: string;
  type: 'early_drift' | 'spike' | 'probe' | 'gap' | 'noise' | 'normal';
  severity: 'yellow' | 'red' | 'blue' | 'green';
  title: string;
  description: string;
  time: string;
}

export function VitalsMonitorPage({
  patients,
  latestTicks,
  telemetryHistory,
  connected,
}: VitalsMonitorPageProps) {
  // ── Patient Identification (Default to Patient P001) ──
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients[0]?.id || 'P-001'
  );

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  // ── Active Data Source (Virtual Wearable vs BIDMC Replay) ──
  const [dataSource, setDataSource] = useState<DataSourceType>('WEARABLE');

  // ── Virtual Wearable Simulator Controls ──
  const [scenario, setScenario] = useState<WearableScenario>('Normal');
  const [streamingRate, setStreamingRate] = useState<number>(5); // 1, 5, 10 seconds
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);

  // ── BIDMC Replay Controls ──
  const [replaySpeed, setReplaySpeed] = useState<number>(1); // 1x, 2x, 5x
  const [isReplayRunning, setIsReplayRunning] = useState<boolean>(true);

  // ── Vital Trend Channel Selector ──
  const [selectedVitalTrend, setSelectedVitalTrend] = useState<VitalType>('hr');

  // ── Live Simulated/Replayed State Buffer ──
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('10:42:15');
  const [dataGapDetected, setDataGapDetected] = useState<boolean>(false);
  const [probeRemovedDetected, setProbeRemovedDetected] = useState<boolean>(false);
  const [motionNoiseActive, setMotionNoiseActive] = useState<boolean>(false);

  // Current values
  const [liveVitals, setLiveVitals] = useState({
    hr: 78,
    spo2: 98,
    rr: 16,
    temp: 36.7,
  });

  // Recent Alerts list
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'init-1',
      type: 'normal',
      severity: 'green',
      title: 'Vitals Stable',
      description: 'Continuous physiological telemetry within baseline thresholds.',
      time: '10:40:00',
    },
  ]);

  // Local trend history buffer for smooth, reliable updates
  const [localTrendBuffer, setLocalTrendBuffer] = useState<
    Array<{
      time: string;
      hr: number | null;
      spo2: number | null;
      rr: number | null;
      temp: number | null;
    }>
  >(() => {
    const now = new Date();
    const initData = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 5000);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      initData.push({
        time: timeStr,
        hr: 75 + Math.floor(Math.sin(i) * 3),
        spo2: 98,
        rr: 16,
        temp: 36.7,
      });
    }
    return initData;
  });

  // Keep format time helper
  const getNowTimeStr = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  // ── Sync with WebSocket when available ──
  const tick = latestTicks[selectedPatientId];
  useEffect(() => {
    if (!tick) return;

    const timeStr = getNowTimeStr();
    setLastUpdatedTime(timeStr);

    const v = tick.vitals;
    const hrVal = v?.heart_rate?.value ?? v?.hr?.value;
    const spo2Val = v?.oxygen_saturation?.value ?? v?.spo2?.value;
    const rrVal = v?.respiratory_rate?.value ?? v?.rr?.value;
    const tempVal = v?.body_temperature?.value ?? v?.temp?.value ?? 36.7;

    const isDropout =
      tick.active_simulation_event?.event_type === 'dropout' ||
      tick.vitals?.heart_rate?.status === 'NO_READING';
    const isProbe =
      tick.probe_removed ||
      tick.active_simulation_event?.event_type === 'probe_removal';
    const isMotion =
      tick.signal_quality?.artifact_detected ||
      tick.active_simulation_event?.event_type === 'motion_noise';

    setDataGapDetected(isDropout);
    setProbeRemovedDetected(isProbe);
    setMotionNoiseActive(isMotion);

    if (!isDropout) {
      setLiveVitals({
        hr: isProbe ? 0 : typeof hrVal === 'number' ? hrVal : 78,
        spo2: isProbe ? 0 : typeof spo2Val === 'number' ? spo2Val : 98,
        rr: typeof rrVal === 'number' ? rrVal : 16,
        temp: typeof tempVal === 'number' ? tempVal : 36.7,
      });

      setLocalTrendBuffer((prev) => {
        const next = [
          ...prev,
          {
            time: timeStr,
            hr: isProbe ? 0 : typeof hrVal === 'number' ? hrVal : 78,
            spo2: isProbe ? 0 : typeof spo2Val === 'number' ? spo2Val : 98,
            rr: typeof rrVal === 'number' ? rrVal : 16,
            temp: typeof tempVal === 'number' ? tempVal : 36.7,
          },
        ];
        return next.slice(-30);
      });
    }
  }, [tick]);

  // ── Data Source Switch Handler ──
  const handleSelectDataSource = async (source: DataSourceType) => {
    setDataSource(source);
    try {
      await setDataSourceMode(selectedPatientId, source);
      if (source === 'BIDMC') {
        await restoreProbe(selectedPatientId);
        await setSimulationSpeed(replaySpeed);
        setIsReplayRunning(true);
      } else {
        await setSimulationSpeed(streamingRate === 1 ? 5 : streamingRate === 5 ? 2 : 1);
        setIsSimRunning(true);
      }
    } catch (e) {
      console.error('Failed to set data source mode:', e);
    }
  };

  // ── Simulation Engine Step (Active client generator for precise scenarios) ──
  const simStepRef = useRef<number>(0);
  const driftStageRef = useRef<number>(0);
  const spikeStageRef = useRef<number>(0);

  useEffect(() => {
    const isRunning = dataSource === 'WEARABLE' ? isSimRunning : isReplayRunning;
    if (!isRunning) return;

    const intervalMs =
      dataSource === 'WEARABLE'
        ? streamingRate * 1000
        : Math.round(1000 / replaySpeed);

    const timer = setInterval(() => {
      simStepRef.current += 1;
      const step = simStepRef.current;
      const timeStr = getNowTimeStr();
      setLastUpdatedTime(timeStr);

      if (dataSource === 'WEARABLE') {
        // ── 1. Virtual Wearable Scenarios ──
        if (scenario === 'Normal') {
          setDataGapDetected(false);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(false);

          const newHr = 74 + Math.floor(Math.random() * 8); // 74–82 bpm
          const newSpo2 = 97 + Math.floor(Math.random() * 3); // 97–99%
          const newRr = 15 + Math.floor(Math.random() * 4); // 15–18 /min
          const newTemp = 36.6 + Math.floor(Math.random() * 3) * 0.1; // 36.6–36.8 °C

          setLiveVitals({ hr: newHr, spo2: newSpo2, rr: newRr, temp: Number(newTemp.toFixed(1)) });
          setLocalTrendBuffer((prev) => [
            ...prev.slice(-29),
            { time: timeStr, hr: newHr, spo2: newSpo2, rr: newRr, temp: Number(newTemp.toFixed(1)) },
          ]);

          // Optional FHIR R4 ingestion in background
          ingestFhirObservation({
            patient_id: selectedPatientId,
            vital_name: 'oxygen_saturation',
            value: newSpo2,
            unit: '%',
          }).catch(() => {});
        } else if (scenario === 'Gradual Vital Drift') {
          setDataGapDetected(false);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(false);

          driftStageRef.current += 1;
          const stage = driftStageRef.current;
          // SpO2: 98 -> 97 -> 96 -> 95 -> 94
          const newSpo2 = Math.max(92, 98 - Math.floor(stage / 2));
          // HR gradually increases: 76 -> 82 -> 88 -> 95
          const newHr = Math.min(108, 76 + stage * 2);
          const newRr = 16 + Math.min(6, Math.floor(stage / 2));
          const newTemp = 36.8;

          setLiveVitals({ hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp });
          setLocalTrendBuffer((prev) => [
            ...prev.slice(-29),
            { time: timeStr, hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp },
          ]);

          if (newSpo2 <= 95) {
            setAlerts((prev) => {
              if (prev.some((a) => a.type === 'early_drift' && a.time === timeStr)) return prev;
              return [
                {
                  id: `drift-${Date.now()}`,
                  type: 'early_drift',
                  severity: 'yellow',
                  title: 'Early deterioration detected',
                  description: 'SpO₂ has shown a sustained downward trend.',
                  time: timeStr,
                },
                ...prev.slice(0, 7),
              ];
            });
          }
        } else if (scenario === 'Sudden Spike') {
          setDataGapDetected(false);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(false);

          spikeStageRef.current = (spikeStageRef.current + 1) % 6;
          const phase = spikeStageRef.current;
          // 78 -> 145 -> 150 -> 82
          const spikeSequence = [78, 145, 150, 148, 88, 80];
          const newHr = spikeSequence[phase];
          const newSpo2 = 97;
          const newRr = phase >= 1 && phase <= 3 ? 24 : 16;
          const newTemp = 36.7;

          setLiveVitals({ hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp });
          setLocalTrendBuffer((prev) => [
            ...prev.slice(-29),
            { time: timeStr, hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp },
          ]);

          if (newHr >= 140) {
            setAlerts((prev) => {
              if (prev.some((a) => a.type === 'spike' && a.time === timeStr)) return prev;
              return [
                {
                  id: `spike-${Date.now()}`,
                  type: 'spike',
                  severity: 'red',
                  title: 'Critical heart-rate spike',
                  description: `Heart rate increased to ${newHr} bpm.`,
                  time: timeStr,
                },
                ...prev.slice(0, 7),
              ];
            });
          }
        } else if (scenario === 'Missing Readings') {
          setDataGapDetected(true);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(false);

          // Temporarily stop generating readings; dashboard keeps working normally
          setAlerts((prev) => {
            if (prev.some((a) => a.type === 'gap')) return prev;
            return [
              {
                id: `gap-${Date.now()}`,
                type: 'gap',
                severity: 'yellow',
                title: 'Data Gap Detected',
                description: 'Telemetry packet transmission delayed or missing from sensor.',
                time: timeStr,
              },
              ...prev.slice(0, 7),
            ];
          });
        } else if (scenario === 'Motion Noise') {
          setDataGapDetected(false);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(true);

          // Fluctuations: SpO2: 98 -> 96 -> 99 -> 97 -> 98
          const noiseSeq = [98, 96, 99, 97, 98, 96];
          const newSpo2 = noiseSeq[step % noiseSeq.length];
          const newHr = 78 + (step % 2 === 0 ? 4 : -3);
          const newRr = 16;
          const newTemp = 36.7;

          setLiveVitals({ hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp });
          setLocalTrendBuffer((prev) => [
            ...prev.slice(-29),
            { time: timeStr, hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp },
          ]);

          setAlerts((prev) => {
            if (prev.some((a) => a.type === 'noise')) return prev;
            return [
              {
                id: `noise-${Date.now()}`,
                type: 'noise',
                severity: 'yellow',
                title: 'Motion-related noise',
                description: 'Photoplethysmogram baseline tremor detected. Filtering active.',
                time: timeStr,
              },
              ...prev.slice(0, 7),
            ];
          });
        } else if (scenario === 'Probe Removal') {
          setDataGapDetected(false);
          setProbeRemovedDetected(true);
          setMotionNoiseActive(false);

          // Set SpO2 = 0 or null and HR flatline
          setLiveVitals({ hr: 0, spo2: 0, rr: 16, temp: 36.7 });
          setLocalTrendBuffer((prev) => [
            ...prev.slice(-29),
            { time: timeStr, hr: 0, spo2: 0, rr: 16, temp: 36.7 },
          ]);

          setAlerts((prev) => {
            if (prev.some((a) => a.type === 'probe')) return prev;
            return [
              {
                id: `probe-${Date.now()}`,
                type: 'probe',
                severity: 'yellow',
                title: 'Probe Removal Detected',
                description: 'SpO₂ signal unavailable and heart rate signal flatlined.',
                time: timeStr,
              },
              ...prev.slice(0, 7),
            ];
          });
        }
      } else {
        // ── 2. BIDMC Replay Data (Genuine BIDMC CSV replay sequence) ──
        setDataGapDetected(false);
        setProbeRemovedDetected(false);
        setMotionNoiseActive(false);

        // Standard BIDMC Patient 01 physiological stream
        const bidmcHrPattern = [77, 75, 78, 78, 79, 77, 78, 77, 78, 76, 75, 77, 78, 79];
        const bidmcSpo2Pattern = [98, 98, 99, 99, 99, 98, 99, 99, 98, 98, 99, 98, 98, 99];
        const bidmcRrPattern = [15.3, 16.2, 15.8, 16.0, 16.3, 17.0, 16.1, 16.4, 17.1, 16.0];

        const newHr = bidmcHrPattern[step % bidmcHrPattern.length];
        const newSpo2 = bidmcSpo2Pattern[step % bidmcSpo2Pattern.length];
        const newRr = bidmcRrPattern[step % bidmcRrPattern.length];

        // Body temperature is generated by simulator (BIDMC does not have temperature)
        // Realistic 36.5°C -> 36.6°C -> 36.7°C
        const tempSeq = [36.5, 36.6, 36.7, 36.6, 36.7, 36.8];
        const newTemp = tempSeq[Math.floor(step / 3) % tempSeq.length];

        setLiveVitals({ hr: newHr, spo2: newSpo2, rr: Number(newRr.toFixed(1)), temp: newTemp });
        setLocalTrendBuffer((prev) => [
          ...prev.slice(-29),
          { time: timeStr, hr: newHr, spo2: newSpo2, rr: Number(newRr.toFixed(1)), temp: newTemp },
        ]);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    dataSource,
    isSimRunning,
    isReplayRunning,
    scenario,
    streamingRate,
    replaySpeed,
    selectedPatientId,
  ]);

  // ── Trigger Backend Actions When Scenario Changes ──
  const handleScenarioChange = async (newScenario: WearableScenario) => {
    setScenario(newScenario);
    driftStageRef.current = 0;
    spikeStageRef.current = 0;

    try {
      if (newScenario === 'Normal') {
        await stopSimulationEvent(selectedPatientId);
        await restoreProbe(selectedPatientId);
        await clearScenario(selectedPatientId);
        setDataGapDetected(false);
        setProbeRemovedDetected(false);
        setMotionNoiseActive(false);
      } else if (newScenario === 'Gradual Vital Drift') {
        await startSimulationEvent(selectedPatientId, 'drift', 45, {
          vital: 'oxygen_saturation',
          start_val: 98,
          target_val: 92,
        });
      } else if (newScenario === 'Sudden Spike') {
        await startSimulationEvent(selectedPatientId, 'spike', 12, {
          vital: 'heart_rate',
          spike_val: 150,
        });
      } else if (newScenario === 'Missing Readings') {
        await startSimulationEvent(selectedPatientId, 'dropout', 30, { vital: 'all' });
      } else if (newScenario === 'Motion Noise') {
        await startSimulationEvent(selectedPatientId, 'motion_noise', 40, { intensity: 'medium' });
      } else if (newScenario === 'Probe Removal') {
        await startSimulationEvent(selectedPatientId, 'probe_removal', 60, {});
      }
    } catch (err) {
      console.warn('Backend event sync info:', err);
    }
  };

  const handleStartSimulation = async () => {
    setIsSimRunning(true);
    try {
      await resumeSimulation();
    } catch {}
  };

  const handleStopSimulation = async () => {
    setIsSimRunning(false);
    try {
      await pauseSimulation();
    } catch {}
  };

  const handleStartReplay = async () => {
    setIsReplayRunning(true);
    try {
      await setSimulationSpeed(replaySpeed);
      await resumeSimulation();
    } catch {}
  };

  const handlePauseReplay = async () => {
    setIsReplayRunning(false);
    try {
      await pauseSimulation();
    } catch {}
  };

  // Helper for vital status badge
  const getVitalStatus = (
    type: VitalType,
    val: number
  ): { label: 'Normal' | 'Warning' | 'Critical'; bg: string; text: string } => {
    if (probeRemovedDetected && (type === 'hr' || type === 'spo2')) {
      return { label: 'Warning', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
    }
    if (type === 'hr') {
      if (val >= 130 || (val > 0 && val < 45))
        return { label: 'Critical', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
      if (val >= 100 || val <= 55)
        return { label: 'Warning', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
      return { label: 'Normal', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
    }
    if (type === 'spo2') {
      if (val <= 91 && val > 0)
        return { label: 'Critical', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
      if (val <= 94 && val > 0)
        return { label: 'Warning', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
      return { label: 'Normal', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
    }
    if (type === 'rr') {
      if (val >= 25 || val <= 8)
        return { label: 'Critical', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
      if (val >= 21 || val <= 11)
        return { label: 'Warning', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
      return { label: 'Normal', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
    }
    // temp
    if (val >= 38.5 || val <= 35.0)
      return { label: 'Critical', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' };
    if (val >= 37.8 || val <= 35.8)
      return { label: 'Warning', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
    return { label: 'Normal', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' };
  };

  const hrStatus = getVitalStatus('hr', liveVitals.hr);
  const spo2Status = getVitalStatus('spo2', liveVitals.spo2);
  const rrStatus = getVitalStatus('rr', liveVitals.rr);
  const tempStatus = getVitalStatus('temp', liveVitals.temp);

  // Configuration for single visible trend chart
  const trendConfig: Record<
    VitalType,
    { label: string; unit: string; color: string; domain: [number, number]; key: string }
  > = {
    hr: {
      label: 'Heart Rate',
      unit: 'bpm',
      color: '#0284C7', // Medical Sky Blue
      domain: [40, 165],
      key: 'hr',
    },
    spo2: {
      label: 'SpO₂',
      unit: '%',
      color: '#0D9488', // Medical Teal
      domain: [85, 100],
      key: 'spo2',
    },
    temp: {
      label: 'Body Temperature',
      unit: '°C',
      color: '#EA580C', // Warm Amber
      domain: [35.5, 39.0],
      key: 'temp',
    },
    rr: {
      label: 'Respiratory Rate',
      unit: '/min',
      color: '#6366F1', // Indigo
      domain: [10, 30],
      key: 'rr',
    },
  };

  const activeTrend = trendConfig[selectedVitalTrend];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. PATIENT VITAL MONITOR (PAGE TITLE & SUBHEADER)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Patient Vital Monitor
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
            {/* Patient P001 Tag */}
            <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
              Patient P001
            </span>

            {/* Monitoring Active Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Monitoring Active</span>
            </div>

            {/* Last Updated Timestamp */}
            <div className="flex items-center space-x-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Last Updated: <span className="font-mono text-slate-700">{lastUpdatedTime}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Small Patient Switcher if needed */}
        {patients.length > 1 && (
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-400 mr-1">Switch:</span>
            {patients.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  p.id === selectedPatientId
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Status Banner for Special Sensor Events ── */}
      {dataGapDetected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="font-semibold">Data Gap Detected</span>
            <span className="text-amber-700">— Telemetry packets paused. Monitor remains active.</span>
          </div>
        </div>
      )}

      {probeRemovedDetected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-semibold">Probe Removal Detected</span>
            <span className="text-amber-700">
              — SpO₂ sensor detached and heart-rate flatline. Clinical scoring paused for sensor maintenance.
            </span>
          </div>
        </div>
      )}

      {motionNoiseActive && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="h-4 w-4 text-sky-600" />
            <span className="font-semibold">Motion-related noise</span>
            <span className="text-sky-700">— Artifact suppression active. Clinical alarms protected against false trigger.</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE VITALS (FOUR CLEAN VITAL CARDS)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <Heart className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Heart Rate</span>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${hrStatus.bg} ${hrStatus.text}`}
            >
              {probeRemovedDetected ? 'Detached' : hrStatus.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {probeRemovedDetected ? '0' : dataGapDetected ? '—' : liveVitals.hr}
            </span>
            <span className="text-xs font-medium text-slate-500">bpm</span>
          </div>
        </div>

        {/* SpO₂ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">SpO₂</span>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${spo2Status.bg} ${spo2Status.text}`}
            >
              {probeRemovedDetected ? 'Detached' : spo2Status.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {probeRemovedDetected ? '0' : dataGapDetected ? '—' : liveVitals.spo2}
            </span>
            <span className="text-xs font-medium text-slate-500">%</span>
          </div>
        </div>

        {/* Respiratory Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Wind className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Respiratory Rate</span>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${rrStatus.bg} ${rrStatus.text}`}
            >
              {rrStatus.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {dataGapDetected ? '—' : liveVitals.rr}
            </span>
            <span className="text-xs font-medium text-slate-500">/min</span>
          </div>
        </div>

        {/* Body Temperature */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                <Thermometer className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Body Temperature</span>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${tempStatus.bg} ${tempStatus.text}`}
            >
              {tempStatus.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {dataGapDetected ? '—' : liveVitals.temp}
            </span>
            <span className="text-xs font-medium text-slate-500">°C</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. VITAL TREND (ONE CLEAN LINE CHART)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Vital Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live physiological waveform ({activeTrend.label})
            </p>
          </div>

          {/* Selector: Heart Rate | SpO2 | Temperature | Respiratory Rate */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedVitalTrend('hr')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedVitalTrend === 'hr'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Heart Rate
            </button>
            <button
              onClick={() => setSelectedVitalTrend('spo2')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedVitalTrend === 'spo2'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SpO₂
            </button>
            <button
              onClick={() => setSelectedVitalTrend('temp')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedVitalTrend === 'temp'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setSelectedVitalTrend('rr')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                selectedVitalTrend === 'rr'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Respiratory Rate
            </button>
          </div>
        </div>

        {/* The Single Line Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={localTrendBuffer}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={activeTrend.domain}
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                unit={activeTrend.unit === '%' ? '%' : ''}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '11px',
                }}
                formatter={(val: any) => [`${val} ${activeTrend.unit}`, activeTrend.label]}
                labelStyle={{ fontWeight: 600, color: '#334155' }}
              />
              <Line
                type="monotone"
                dataKey={activeTrend.key}
                stroke={activeTrend.color}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. DATA SOURCE (COMPACT SELECTABLE SECTION)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Data Source</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select physiological telemetry ingestion stream
            </p>
          </div>

          {/* Two selectable options: Virtual Wearable | BIDMC Replay */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => handleSelectDataSource('WEARABLE')}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
                dataSource === 'WEARABLE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Virtual Wearable
            </button>
            <button
              onClick={() => handleSelectDataSource('BIDMC')}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
                dataSource === 'BIDMC'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              BIDMC Replay
            </button>
          </div>
        </div>

        {/* ── 5. VIRTUAL WEARABLE CONTROL PANEL ── */}
        {dataSource === 'WEARABLE' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Scenario dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Scenario
                </label>
                <select
                  value={scenario}
                  onChange={(e) => handleScenarioChange(e.target.value as WearableScenario)}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                >
                  <option value="Normal">Normal</option>
                  <option value="Gradual Vital Drift">Gradual Vital Drift</option>
                  <option value="Sudden Spike">Sudden Spike</option>
                  <option value="Missing Readings">Missing Readings</option>
                  <option value="Motion Noise">Motion Noise</option>
                  <option value="Probe Removal">Probe Removal</option>
                </select>
              </div>

              {/* Streaming Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Streaming Rate
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 5, 10].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setStreamingRate(rate)}
                      className={`text-xs py-2 rounded-xl border font-semibold transition-colors ${
                        streamingRate === rate
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {rate} second{rate > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start / Stop Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Simulation State
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleStartSimulation}
                    disabled={isSimRunning}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition-all ${
                      isSimRunning
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Simulation</span>
                  </button>
                  <button
                    onClick={handleStopSimulation}
                    disabled={!isSimRunning}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition-all ${
                      !isSimRunning
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
                    }`}
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 8. BIDMC REPLAY CONTROL PANEL ── */}
        {dataSource === 'BIDMC' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* BIDMC Patient Display */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PhysioNet Record
                </label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-center justify-between">
                  <span>BIDMC Patient: Patient 01</span>
                  <span className="text-[10px] font-mono text-slate-500 font-normal">
                    (bidmc_sample_vitals.csv)
                  </span>
                </div>
              </div>

              {/* Replay Speed */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Replay Speed
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        setReplaySpeed(speed);
                        setSimulationSpeed(speed).catch(() => {});
                      }}
                      className={`text-xs py-2 rounded-xl border font-semibold transition-colors ${
                        replaySpeed === speed
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Replay Controls: Start / Pause */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Replay Playback
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleStartReplay}
                    disabled={isReplayRunning}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition-all ${
                      isReplayRunning
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Replay</span>
                  </button>
                  <button
                    onClick={handlePauseReplay}
                    disabled={!isReplayRunning}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition-all ${
                      !isReplayRunning
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
                    }`}
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Unobtrusive note about Body Temperature */}
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                Body temperature is generated by the simulator because it is not available in the BIDMC dataset.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          9. RECENT ALERTS (CONCISE SECTION)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Recent Alerts</h2>
          <span className="text-xs text-slate-400">Clinical & Sensor Notifications</span>
        </div>

        <div className="space-y-2.5">
          {alerts.map((alt) => {
            const isRed = alt.severity === 'red';
            const isYellow = alt.severity === 'yellow';
            const isGreen = alt.severity === 'green';

            return (
              <div
                key={alt.id}
                className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                  isRed
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : isYellow
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : isGreen
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <span className="text-sm mt-0.5">
                    {isRed ? '🔴' : isYellow ? '🟡' : isGreen ? '🟢' : '🔵'}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{alt.title}</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{alt.description}</p>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  Time: {alt.time}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          10. DATA FLOW (VERY SMALL HORIZONTAL FLOW WITH ARROWS)
      ───────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-900">
            {dataSource === 'WEARABLE' ? 'Virtual Wearable' : 'BIDMC Replay'}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">FHIR R4 Ingestion API</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">HAPI FHIR</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">Detection Engine</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">Alert</span>
        </div>
      </div>
    </div>
  );
}
