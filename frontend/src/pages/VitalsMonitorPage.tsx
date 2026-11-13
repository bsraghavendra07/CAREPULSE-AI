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
  Sparkles,
  RefreshCw,
  UserCheck,
  Pill,
  FileText,
  ShieldAlert,
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
  fetchPatients,
  generateSyntheaPatients,
  evaluatePatientRisk,
  PatientRiskResult,
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
  patients: initialPatients,
  latestTicks,
  connected,
}: VitalsMonitorPageProps) {
  // ── Dynamic Synthea Patient State ──
  const [patients, setPatients] = useState<PatientProfile[]>(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPatients[0]?.id || 'P-001'
  );
  const [genCount, setGenCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genToast, setGenToast] = useState<string | null>(null);

  // Sync initial patients when prop updates
  useEffect(() => {
    if (initialPatients.length > 0 && patients.length === 0) {
      setPatients(initialPatients);
      setSelectedPatientId(initialPatients[0].id);
    }
  }, [initialPatients]);

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || patients[0] || initialPatients[0];
  }, [patients, selectedPatientId, initialPatients]);

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
    hr: selectedPatient?.baseline?.heart_rate ?? 78,
    spo2: selectedPatient?.baseline?.oxygen_saturation ?? 98,
    rr: selectedPatient?.baseline?.respiratory_rate ?? 16,
    temp: selectedPatient?.baseline?.body_temperature ?? 36.7,
  });

  // ── Prototype Decision-Support Risk Score State ──
  const [riskAssessment, setRiskAssessment] = useState<PatientRiskResult>({
    patient_id: selectedPatient?.id || 'P-001',
    risk_score: 18,
    risk_level: 'LOW',
    components: {
      vital_abnormality: 0,
      trend_severity: 0,
      patient_context: 18,
    },
    factors: [
      `Baseline clinical profile: ${selectedPatient?.condition || 'Post-Discharge Monitoring'}`,
      'All monitored vital signs within baseline clinical ranges',
    ],
    alert_title: 'Physiological vitals stable',
    alert_reason: 'Current parameters and trends are within acceptable baseline bounds for this patient.',
    primary_condition: selectedPatient?.condition || 'Post-Discharge Monitoring',
    conditions: selectedPatient?.conditions || [selectedPatient?.condition || 'Post-Discharge Monitoring'],
    medications: selectedPatient?.medications || [],
    disclaimer: 'Decision-support suggestion — not a clinical diagnosis.',
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

  // Local trend history buffer for smooth updates
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

  const getNowTimeStr = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  // ── 1. Dynamic Synthea Generation Handler ──
  const handleGenerateSynthea = async () => {
    setIsGenerating(true);
    setGenToast(null);
    try {
      const res = await generateSyntheaPatients(genCount);
      setPatients(res.patients);
      if (res.patients.length > 0) {
        setSelectedPatientId(res.patients[0].id);
      }
      setGenToast(`Generated ${res.patients.length} synthetic patient profiles via Synthea FHIR R4 engine.`);
      setTimeout(() => setGenToast(null), 5000);
    } catch (err: any) {
      setGenToast(`Generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 2. Evaluate Patient-Specific Risk ──
  const triggerRiskEvaluation = (currentVitals: typeof liveVitals, timeStr: string) => {
    if (!selectedPatient) return;

    const condList = selectedPatient.conditions || [selectedPatient.condition || ''];
    const condStr = condList.join(' ').toLowerCase();
    const isScale2 = selectedPatient.scale2_prescribed || condStr.includes('copd') || condStr.includes('emphysema');

    let vitScore = 0;
    let trendScore = 0;
    let ctxScore = 0;
    const factors: string[] = [];

    // Check special events first
    if (probeRemovedDetected || (currentVitals.spo2 === 0 && currentVitals.hr === 0)) {
      setRiskAssessment({
        patient_id: selectedPatient.id,
        risk_score: 15,
        risk_level: 'LOW',
        components: { vital_abnormality: 0, trend_severity: 0, patient_context: 15 },
        factors: [
          'Probe Removal Detected: SpO₂ sensor detached and HR flatlined',
          'Clinical deterioration suppressed to prevent false alarm',
        ],
        alert_title: 'Probe Removal Detected',
        alert_reason: 'SpO₂ signal unavailable and heart rate signal flatlined. Clinical scoring suppressed for sensor maintenance.',
        primary_condition: selectedPatient.condition,
        conditions: condList,
        medications: selectedPatient.medications || [],
        disclaimer: 'Decision-support suggestion — not a clinical diagnosis.',
      });
      return;
    }

    if (dataGapDetected) {
      setRiskAssessment({
        patient_id: selectedPatient.id,
        risk_score: 20,
        risk_level: 'LOW',
        components: { vital_abnormality: 0, trend_severity: 5, patient_context: 15 },
        factors: [
          'Data Gap Detected: telemetry packet stream interrupted',
          'Patient monitor buffer active awaiting reconnect',
        ],
        alert_title: 'Telemetry Data Gap Detected',
        alert_reason: 'Temporary interruption in incoming sensor packets. System maintains active baseline state.',
        primary_condition: selectedPatient.condition,
        conditions: condList,
        medications: selectedPatient.medications || [],
        disclaimer: 'Decision-support suggestion — not a clinical diagnosis.',
      });
      return;
    }

    // Component A: Vital Abnormality (0-50 pts)
    if (isScale2) {
      if (currentVitals.spo2 < 84) {
        vitScore += 35;
        factors.push(`SpO₂ (${currentVitals.spo2}%) critically below hypercapnic threshold (target 88–92%)`);
      } else if (currentVitals.spo2 < 88) {
        vitScore += 22;
        factors.push(`SpO₂ (${currentVitals.spo2}%) below prescribed target range (88–92%)`);
      } else if (currentVitals.spo2 > 96) {
        vitScore += 10;
        factors.push(`SpO₂ (${currentVitals.spo2}%) elevated above safe limit for hypercapnia`);
      }
    } else {
      if (currentVitals.spo2 <= 91) {
        vitScore += 35;
        factors.push(`SpO₂ (${currentVitals.spo2}%) significantly below standard threshold (< 92%)`);
      } else if (currentVitals.spo2 <= 94) {
        vitScore += 20;
        factors.push(`SpO₂ (${currentVitals.spo2}%) moderately hypoxic (92–94%)`);
      }
    }

    if (currentVitals.hr >= 140) {
      vitScore += 30;
      factors.push(`Extreme tachycardia: Heart rate ${currentVitals.hr} bpm`);
    } else if (currentVitals.hr >= 115) {
      vitScore += 18;
      factors.push(`Moderate tachycardia: Heart rate ${currentVitals.hr} bpm`);
    }

    if (currentVitals.rr >= 24) {
      vitScore += 22;
      factors.push(`Elevated tachypnea (${currentVitals.rr} /min)`);
    }

    // Component B: Trend Severity (0-30 pts)
    if (scenario === 'Gradual Vital Drift' || currentVitals.spo2 <= 94) {
      trendScore += 24;
      factors.push('Sustained downward SpO₂ trend detected over time');
    } else if (scenario === 'Sudden Spike' || currentVitals.hr >= 140) {
      trendScore += 28;
      factors.push(`Rapid acute heart rate surge (+${currentVitals.hr - 78} bpm)`);
    }

    // Component C: Patient Clinical Context from Synthea (0-20 pts)
    const hasRespiratory = condStr.includes('copd') || condStr.includes('asthma') || condStr.includes('pulmonary');
    const hasCardio = condStr.includes('heart') || condStr.includes('hyper') || condStr.includes('cardiac') || condStr.includes('fib');

    if (hasRespiratory && (currentVitals.spo2 <= 94 || currentVitals.rr >= 21)) {
      ctxScore += 18;
      factors.push(`Respiratory condition context (${condList[0]}) increases hypoxia alert priority`);
      const respMed = selectedPatient.medications?.find((m) =>
        ['albuterol', 'fluticasone', 'salmeterol', 'budesonide'].some((w) => m.name.toLowerCase().includes(w))
      );
      if (respMed) {
        factors.push(`Current Medication Context: ${respMed.name}`);
      }
    }

    if (hasCardio && (currentVitals.hr >= 115 || currentVitals.hr <= 50)) {
      ctxScore += 18;
      factors.push(`Cardiovascular clinical context (${condList[0]}) elevates tachyarrhythmia alert relevance`);
      const cardioMed = selectedPatient.medications?.find((m) =>
        ['metoprolol', 'furosemide', 'digoxin', 'lisinopril', 'apixaban'].some((w) => m.name.toLowerCase().includes(w))
      );
      if (cardioMed) {
        factors.push(`Current Medication Context: ${cardioMed.name}`);
      }
    }

    if (ctxScore === 0 && condList.length > 0) {
      ctxScore = 5;
      factors.push(`Baseline clinical profile: ${condList[0]}`);
    }

    const total = Math.min(100, vitScore + trendScore + ctxScore);
    const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' =
      total >= 70 ? 'HIGH' : total >= 40 ? 'MODERATE' : 'LOW';

    let alertTitle = 'Physiological vitals stable';
    let alertReason = 'Current parameters and trends are within acceptable baseline bounds for this patient.';

    if (total >= 70) {
      if (currentVitals.hr >= 140) {
        alertTitle = 'Critical heart-rate spike';
        alertReason = `Heart rate increased acutely to ${currentVitals.hr} bpm. Patient clinical history of ${condList[0]} elevates alert urgency.`;
      } else {
        alertTitle = 'Sustained SpO₂ deterioration detected';
        alertReason = `The alert is primarily driven by the sustained decline in SpO₂, with respiratory history (${condList[0]}) increasing the relevance of the event.`;
      }
    } else if (total >= 40) {
      alertTitle = 'Moderate physiological divergence';
      alertReason = `Departure from baseline vitals observed. Clinical context of ${condList[0]} warrants continued bedside monitoring.`;
    }

    setRiskAssessment({
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      risk_score: total,
      risk_level: riskLevel,
      components: {
        vital_abnormality: vitScore,
        trend_severity: trendScore,
        patient_context: ctxScore,
      },
      factors: factors.length > 0 ? factors : ['Vitals within baseline limits'],
      alert_title: alertTitle,
      alert_reason: alertReason,
      primary_condition: selectedPatient.condition,
      conditions: condList,
      medications: selectedPatient.medications || [],
      disclaimer: 'Decision-support suggestion — not a clinical diagnosis.',
    });
  };

  // ── Sync with WebSocket Ticks ──
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
      const updatedVitals = {
        hr: isProbe ? 0 : typeof hrVal === 'number' ? hrVal : liveVitals.hr,
        spo2: isProbe ? 0 : typeof spo2Val === 'number' ? spo2Val : liveVitals.spo2,
        rr: typeof rrVal === 'number' ? rrVal : liveVitals.rr,
        temp: typeof tempVal === 'number' ? tempVal : liveVitals.temp,
      };

      setLiveVitals(updatedVitals);

      setLocalTrendBuffer((prev) => [
        ...prev.slice(-29),
        { time: timeStr, ...updatedVitals },
      ]);

      if (tick.patient_risk) {
        setRiskAssessment(tick.patient_risk);
      } else {
        triggerRiskEvaluation(updatedVitals, timeStr);
      }
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

  // ── Simulation Engine Step (Generates changing vitals + risk score updates) ──
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
        if (scenario === 'Normal') {
          setDataGapDetected(false);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(false);

          const baseHr = selectedPatient?.baseline?.heart_rate || 78;
          const baseSpo2 = selectedPatient?.baseline?.oxygen_saturation || 98;
          const baseRr = selectedPatient?.baseline?.respiratory_rate || 16;
          const baseTemp = selectedPatient?.baseline?.body_temperature || 36.7;

          const newHr = baseHr + Math.floor(Math.sin(step) * 4);
          const newSpo2 = Math.min(100, Math.max(95, baseSpo2 + (step % 2 === 0 ? 0 : 1)));
          const newRr = baseRr + (step % 3 === 0 ? 1 : 0);
          const newTemp = Number((baseTemp + (step % 2 === 0 ? 0.1 : 0)).toFixed(1));

          const newV = { hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp };
          setLiveVitals(newV);
          setLocalTrendBuffer((prev) => [...prev.slice(-29), { time: timeStr, ...newV }]);
          triggerRiskEvaluation(newV, timeStr);

          // FHIR ingestion in background
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
          // SpO2: 98 -> 97 -> 96 -> 95 -> 94 -> 92
          const newSpo2 = Math.max(90, 98 - Math.floor(stage / 2));
          // HR: increases 78 -> 84 -> 92 -> 102
          const newHr = Math.min(115, 78 + stage * 2);
          const newRr = 16 + Math.min(8, Math.floor(stage / 2));
          const newTemp = 36.8;

          const newV = { hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp };
          setLiveVitals(newV);
          setLocalTrendBuffer((prev) => [...prev.slice(-29), { time: timeStr, ...newV }]);
          triggerRiskEvaluation(newV, timeStr);

          if (newSpo2 <= 94) {
            setAlerts((prev) => {
              if (prev.some((a) => a.type === 'early_drift' && a.time === timeStr)) return prev;
              return [
                {
                  id: `drift-${Date.now()}`,
                  type: 'early_drift',
                  severity: 'yellow',
                  title: 'Early deterioration detected',
                  description: `SpO₂ has shown a sustained downward trend (${newSpo2}%). Context: ${selectedPatient?.condition || 'Chronic illness'}.`,
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
          const spikeSequence = [78, 145, 150, 148, 88, 80];
          const newHr = spikeSequence[phase];
          const newSpo2 = 97;
          const newRr = phase >= 1 && phase <= 3 ? 24 : 16;
          const newTemp = 36.7;

          const newV = { hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp };
          setLiveVitals(newV);
          setLocalTrendBuffer((prev) => [...prev.slice(-29), { time: timeStr, ...newV }]);
          triggerRiskEvaluation(newV, timeStr);

          if (newHr >= 140) {
            setAlerts((prev) => {
              if (prev.some((a) => a.type === 'spike' && a.time === timeStr)) return prev;
              return [
                {
                  id: `spike-${Date.now()}`,
                  type: 'spike',
                  severity: 'red',
                  title: 'Critical heart-rate spike',
                  description: `Heart rate increased acutely to ${newHr} bpm. Context: ${selectedPatient?.condition || 'Cardiovascular'}.`,
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

          triggerRiskEvaluation(liveVitals, timeStr);
          setAlerts((prev) => {
            if (prev.some((a) => a.type === 'gap')) return prev;
            return [
              {
                id: `gap-${Date.now()}`,
                type: 'gap',
                severity: 'yellow',
                title: 'Data Gap Detected',
                description: 'Sensor packets delayed or missing. Telemetry engine awaiting next transmission.',
                time: timeStr,
              },
              ...prev.slice(0, 7),
            ];
          });
        } else if (scenario === 'Motion Noise') {
          setDataGapDetected(false);
          setProbeRemovedDetected(false);
          setMotionNoiseActive(true);

          const noiseSeq = [98, 96, 99, 97, 98, 96];
          const newSpo2 = noiseSeq[step % noiseSeq.length];
          const newHr = 78 + (step % 2 === 0 ? 4 : -3);
          const newRr = 16;
          const newTemp = 36.7;

          const newV = { hr: newHr, spo2: newSpo2, rr: newRr, temp: newTemp };
          setLiveVitals(newV);
          setLocalTrendBuffer((prev) => [...prev.slice(-29), { time: timeStr, ...newV }]);
          triggerRiskEvaluation(newV, timeStr);

          setAlerts((prev) => {
            if (prev.some((a) => a.type === 'noise')) return prev;
            return [
              {
                id: `noise-${Date.now()}`,
                type: 'noise',
                severity: 'yellow',
                title: 'Motion-related noise',
                description: 'Artifact detected on PPG baseline. Clinical deterioration scoring guarded.',
                time: timeStr,
              },
              ...prev.slice(0, 7),
            ];
          });
        } else if (scenario === 'Probe Removal') {
          setDataGapDetected(false);
          setProbeRemovedDetected(true);
          setMotionNoiseActive(false);

          const newV = { hr: 0, spo2: 0, rr: 16, temp: 36.7 };
          setLiveVitals(newV);
          setLocalTrendBuffer((prev) => [...prev.slice(-29), { time: timeStr, ...newV }]);
          triggerRiskEvaluation(newV, timeStr);

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
        // ── 2. BIDMC Replay Data ──
        setDataGapDetected(false);
        setProbeRemovedDetected(false);
        setMotionNoiseActive(false);

        const bidmcHrPattern = [77, 75, 78, 78, 79, 77, 78, 77, 78, 76, 75, 77, 78, 79];
        const bidmcSpo2Pattern = [98, 98, 99, 99, 99, 98, 99, 99, 98, 98, 99, 98, 98, 99];
        const bidmcRrPattern = [15.3, 16.2, 15.8, 16.0, 16.3, 17.0, 16.1, 16.4, 17.1, 16.0];

        const newHr = bidmcHrPattern[step % bidmcHrPattern.length];
        const newSpo2 = bidmcSpo2Pattern[step % bidmcSpo2Pattern.length];
        const newRr = bidmcRrPattern[step % bidmcRrPattern.length];

        const tempSeq = [36.5, 36.6, 36.7, 36.6, 36.7, 36.8];
        const newTemp = tempSeq[Math.floor(step / 3) % tempSeq.length];

        const newV = { hr: newHr, spo2: newSpo2, rr: Number(newRr.toFixed(1)), temp: newTemp };
        setLiveVitals(newV);
        setLocalTrendBuffer((prev) => [...prev.slice(-29), { time: timeStr, ...newV }]);
        triggerRiskEvaluation(newV, timeStr);
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
    selectedPatient,
  ]);

  // ── Scenario Change Handler ──
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

  // Trend config
  const trendConfig: Record<
    VitalType,
    { label: string; unit: string; color: string; domain: [number, number]; key: string }
  > = {
    hr: { label: 'Heart Rate', unit: 'bpm', color: '#0284C7', domain: [40, 165], key: 'hr' },
    spo2: { label: 'SpO₂', unit: '%', color: '#0D9488', domain: [85, 100], key: 'spo2' },
    temp: { label: 'Body Temperature', unit: '°C', color: '#EA580C', domain: [35.5, 39.0], key: 'temp' },
    rr: { label: 'Respiratory Rate', unit: '/min', color: '#6366F1', domain: [10, 30], key: 'rr' },
  };

  const activeTrend = trendConfig[selectedVitalTrend];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. PATIENT VITAL MONITOR & SYNTHEA GENERATOR BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Patient Vital Monitor
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
            {/* Dynamic Patient Tag */}
            <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
              Patient {selectedPatient?.id || 'P001'}
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

        {/* ── Synthea Dynamic Generation Controls ── */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-500 font-medium">Count:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value) || 5))}
              className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-bold text-slate-900"
            />
          </div>

          <button
            onClick={handleGenerateSynthea}
            disabled={isGenerating}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-all ${
              isGenerating
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Generate Synthetic Patients'}</span>
          </button>
        </div>
      </div>

      {/* Generation Toast */}
      {genToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">{genToast}</span>
          </div>
          <button onClick={() => setGenToast(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. PATIENT SELECTOR & SYNTHEA CLINICAL PROFILE CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Active Patient Profile</h2>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 rounded-full">
              Synthetic Patient — Synthea
            </span>
          </div>

          {/* Dynamic Select Patient Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">Select Patient:</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="text-xs rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} ({p.age ?? 58}y, {p.gender})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Patient Demographics, Conditions & Medications from Synthea */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Demographics */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Demographics</span>
            <div className="text-slate-900 font-bold text-sm">{selectedPatient?.name}</div>
            <div className="text-slate-600">
              <span className="font-medium">Age:</span> {selectedPatient?.age ?? 58} |{' '}
              <span className="font-medium">Gender:</span> {selectedPatient?.gender}
            </div>
            <div className="text-slate-500 text-[11px]">
              Assigned Specialist: <span className="font-medium text-slate-700">{selectedPatient?.specialist_name || 'Dr. Robert Rivera, MD'}</span>
            </div>
          </div>

          {/* Medical Conditions */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Medical Conditions (Synthea)</span>
            <ul className="space-y-1 text-slate-800 font-medium">
              {(selectedPatient?.conditions && selectedPatient.conditions.length > 0
                ? selectedPatient.conditions
                : [selectedPatient?.condition || 'Post-Discharge Monitoring']
              ).map((c, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <span className="text-sky-600 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Current Medications */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center space-x-1">
              <Pill className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Medications (Synthea)</span>
            </div>
            <ul className="space-y-1 text-slate-800 font-medium">
              {selectedPatient?.medications && selectedPatient.medications.length > 0 ? (
                selectedPatient.medications.map((m, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-teal-600 font-bold">•</span>
                    <span className="truncate" title={m.name}>{m.name}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500 italic">Standard convalescent maintenance</li>
              )}
            </ul>
          </div>
        </div>
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
          3. LIVE VITALS (FOUR CLEAN VITAL CARDS)
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
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${hrStatus.bg} ${hrStatus.text}`}>
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
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${spo2Status.bg} ${spo2Status.text}`}>
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
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${rrStatus.bg} ${rrStatus.text}`}>
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
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${tempStatus.bg} ${tempStatus.text}`}>
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
          4. PROTOTYPE DECISION-SUPPORT RISK SCORE (CORE REQUIREMENT)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">Prototype Risk Score</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explainable Decision-Support Score based on Current Vitals + Trend + Synthea Profile
            </p>
          </div>

          {/* Large Score + Badge */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 leading-none">
                {riskAssessment.risk_score} <span className="text-xs text-slate-400 font-semibold">/ 100</span>
              </div>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${
                riskAssessment.risk_level === 'HIGH'
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : riskAssessment.risk_level === 'MODERATE'
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              {riskAssessment.risk_level}
            </span>
          </div>
        </div>

        {/* Explainable Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">Vital Abnormality</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {riskAssessment.components.vital_abnormality} <span className="text-[10px] text-slate-500 font-normal">/ 50 pts</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">Trend Severity</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {riskAssessment.components.trend_severity} <span className="text-[10px] text-slate-500 font-normal">/ 30 pts</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">Patient Context (Synthea)</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {riskAssessment.components.patient_context} <span className="text-[10px] text-slate-500 font-normal">/ 20 pts</span>
            </div>
          </div>
        </div>

        {/* Explainable Factors List */}
        <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 text-xs space-y-2">
          <div className="font-bold text-slate-800">Why this score was calculated:</div>
          <ul className="space-y-1.5 text-slate-700">
            {riskAssessment.factors.map((factor, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-sky-500 font-bold">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 italic flex items-center justify-between">
            <span>{riskAssessment.alert_reason}</span>
            <span className="text-[10px] text-slate-400 not-italic font-medium">{riskAssessment.disclaimer}</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. VITAL TREND (ONE CLEAN LINE CHART)
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
            <LineChart data={localTrendBuffer} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
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
          6. DATA SOURCE (COMPACT SELECTABLE SECTION)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Data Source</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select physiological telemetry ingestion stream</p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => handleSelectDataSource('WEARABLE')}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
                dataSource === 'WEARABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Virtual Wearable
            </button>
            <button
              onClick={() => handleSelectDataSource('BIDMC')}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
                dataSource === 'BIDMC' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              BIDMC Replay
            </button>
          </div>
        </div>

        {/* ── Virtual Wearable Simulator Panel ── */}
        {dataSource === 'WEARABLE' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scenario</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Streaming Rate</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Simulation State</label>
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

        {/* ── BIDMC Replay Panel ── */}
        {dataSource === 'BIDMC' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">PhysioNet Record</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-center justify-between">
                  <span>BIDMC Patient: Patient 01</span>
                  <span className="text-[10px] font-mono text-slate-500 font-normal">(bidmc_sample_vitals.csv)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Replay Speed</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Replay Playback</label>
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

            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Body temperature is generated by the simulator because it is not available in the BIDMC dataset.</span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. RECENT ALERTS (CONCISE SECTION)
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
                <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Time: {alt.time}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. DATA FLOW (MINIMAL HORIZONTAL FLOW WITH ARROWS)
      ───────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Synthea Profiles
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">
            {dataSource === 'WEARABLE' ? 'Virtual Wearable' : 'BIDMC Replay'}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">FHIR R4 Ingestion API</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">HAPI FHIR</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">Patient-Specific Risk Engine</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-semibold text-slate-900">Decision-Support Alert</span>
        </div>
      </div>
    </div>
  );
}
