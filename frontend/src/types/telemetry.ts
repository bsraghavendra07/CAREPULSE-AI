export type DataSource = 'BIDMC' | 'SIMULATED' | 'DROPOUT' | 'FHIR_INGEST';
export type SQIStatus = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskLevel = 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH';
export type ScaleUsed = 'SCALE_1' | 'SCALE_2';

export type TriageTier = 'ROUTINE' | 'WATCH' | 'REVIEW' | 'URGENT';

export type SuggestedSpecialtyName = 'Pulmonology' | 'Cardiology' | 'Internal Medicine' | 'General Medicine';

export interface SuggestedSpecialty {
  alert_id?: string;
  triggering_pattern: string | null;
  suggested_specialty: SuggestedSpecialtyName | null;
  reason: string | null;
  decision_support_only: boolean;
  is_applicable: boolean;
}

export interface VitalValue {
  value: number | string | boolean | null;
  source: DataSource;
  status?: string;
}

export interface Vitals {
  heart_rate: VitalValue;
  oxygen_saturation: VitalValue;
  respiratory_rate: VitalValue;
  systolic_bp: VitalValue;
  body_temperature: VitalValue;
  consciousness: VitalValue;
  supplemental_oxygen: VitalValue;
  [key: string]: VitalValue | any;
}

export type SignalState = 'VALID' | 'SUSPECT' | 'ARTIFACT' | 'PROBE_REMOVED' | 'FLATLINE' | 'MISSING';

export interface SignalReliability {
  parameter: string;
  status: SignalState;
  reliable: boolean;
  current_value?: number | null;
  reason?: string | null;
  implausible?: boolean;
  flatline?: boolean;
  near_flatline?: boolean;
  artifact_type?: string | null;
}

export type ArtifactType = 'NONE' | 'MISSING_READING' | 'FLATLINE' | 'MOTION_NOISE' | 'INVALID_VALUE';

export interface SignalQuality {
  sqi: number;
  status: SQIStatus;
  artifact_detected: boolean;
  motion_injected: boolean;
  probe_removed?: boolean;
  clinical_alert_suppressed?: boolean;
  suppression_reason?: string | null;
  sensor_alert?: string | null;
  is_genuine_deterioration?: boolean;
  genuine_deterioration_note?: string | null;
  signals?: Record<string, SignalReliability>;
  note: string | null;
  is_unreliable?: boolean;
  artifact_type?: ArtifactType;
  affected_vital?: string | null;
  unreliable_reason?: string | null;
  original_reading?: Record<string, any>;
  suppress_critical_alert?: boolean;
  traceable_history?: number[];
}

export type CDSAlertLevel = 'ROUTINE' | 'WATCH' | 'REVIEW' | 'URGENT';

export interface CDSAlert {
  alert_id: string;
  patient_id: string;
  patient_name: string;
  alert_level: CDSAlertLevel;
  vital_sign: string;
  current_value: string;
  trend_pattern: string;
  explanation: string;
  timestamp: string;
  clinical_action: string;
  is_artifact_suppressed?: boolean;
  system_classification: string;
}

export interface NEWS2Score {
  total_score: number;
  scale_used: ScaleUsed;
  scale2_prescribed: boolean;
  scale2_justification: string | null;
  target_spo2_range?: string;
  risk_level: RiskLevel;
  has_red_score: boolean;
  red_score_parameter: string | null;
  sub_scores: Record<string, number>;
  components?: Record<string, number | null>;
  missing_parameters?: string[];
  primary_contributors?: string[];
  triage_tier?: TriageTier;
  alert_reason?: string;
  clinical_action?: string;
  suggested_specialty?: SuggestedSpecialty;
}

export interface BaselineMetric {
  parameter: string;
  baseline_mean?: number | null;
  current_value?: number | null;
  absolute_change?: number | null;
  percentage_change?: number | null;
  trend_direction: string; // "↓ Declining" | "↑ Increasing" | "→ Stable" | "Insufficient data"
  consecutive_steps?: number;
  status: string;
  is_deteriorating?: boolean;
  samples_count?: number;
}

export interface GradualDeteriorationAlert {
  detected: boolean;
  parameter?: string | null;
  parameter_label?: string | null;
  baseline_value?: number | null;
  current_value?: number | null;
  trend?: string | null;
  alert_message: string;
  clinical_explanation?: string;
  distinction_disclaimer?: string;
}

export interface PersonalizedInsight {
  is_advisory_alert: boolean;
  alert_parameters: string[];
  z_scores: Record<string, number>;
  baseline: Record<string, number>;
  advisory_note: string;
  trends?: Record<string, BaselineMetric>;
  gradual_deterioration?: GradualDeteriorationAlert;
}

export interface ActiveSimulationEvent {
  event_type: string;
  status: string;
  elapsed_ticks: number;
  duration_ticks: number;
  progress_pct: number;
  params: Record<string, any>;
}

export interface MLAnomalyPrediction {
  model_version: string;
  model_type: string;
  timestamp: string;
  anomaly_score: number;
  raw_decision_score: number;
  is_anomaly: boolean;
  anomaly_level: 'NORMAL' | 'BORDERLINE' | 'ELEVATED_ANOMALY' | 'SEVERE_ANOMALY';
  top_deviating_features: string[];
  metric_type: string;
  is_supervised_risk_prediction: boolean;
  clinical_distinction_disclaimer: string;
}

export interface TelemetryTick {
  timestamp: string;
  patient_id: string;
  tick_number: number;
  vitals: Vitals;
  signal_quality: SignalQuality;
  news2: NEWS2Score;
  personalized: PersonalizedInsight;
  suggested_specialty?: SuggestedSpecialty;
  routed_alert?: any;
  criticality_analysis?: any;
  dispatched_sms?: any;
  ml_anomaly?: MLAnomalyPrediction;
  cds_alert?: CDSAlert | null;
  fhir_observation_id: string;
  probe_removed?: boolean;
  active_simulation_event?: ActiveSimulationEvent | null;
  patient_risk?: any;
}

export interface BenchmarkMetric {
  metric_name: string;
  fixed_threshold: string;
  our_system: string;
  improvement: string;
  clinical_rationale: string;
}

export interface ScenarioBenchmarkResult {
  scenario_id: string;
  scenario_name: string;
  description: string;
  fixed_threshold_lead_time_min: number;
  our_system_lead_time_min: number;
  fixed_threshold_false_alerts: number;
  our_system_false_alerts: number;
  fixed_alerts_per_patient_day: number;
  our_alerts_per_patient_day: number;
}

export interface PerformanceBenchmarkReport {
  is_demo_sample_data: boolean;
  title: string;
  disclaimer: string;
  summary_metrics: BenchmarkMetric[];
  scenario_breakdowns: ScenarioBenchmarkResult[];
  methodology: Record<string, any>;
}

export interface PerformanceReport {
  total_ticks: number;
  news2_alerts_fired: number;
  news2_red_scores: number;
  personalized_advisories: number;
  artifact_flags: number;
  artifact_low_flags: number;
  news2_alert_rate: number;
  artifact_flag_rate: number;
  alerts_per_patient_day?: number;
  total_monitored_patient_days?: number;
  false_alerts_suppressed_by_sqi?: number;
  scenario_validation?: {
    slow_deterioration: {
      events_count: number;
      detected_count: number;
      avg_lead_time_ticks: number;
    };
    stable_recovery: {
      events_count: number;
      false_alerts_in_recovery: number;
      stability_rate_pct: number;
    };
    sensor_artifact: {
      artifacts_detected: number;
      artifacts_low_flags: number;
      false_alerts_suppressed: number;
    };
  };
  per_patient: Record<string, {
    total_ticks: number;
    news2_alerts_fired: number;
    news2_red_scores: number;
    personalized_advisories: number;
    artifact_flags: number;
    news2_alert_rate: number;
    artifact_flag_rate: number;
    alerts_per_patient_day?: number;
    monitored_patient_days?: number;
  }>;
  scenario_events: Array<{
    patient_id: string;
    scenario: string;
    action: string;
    timestamp: string;
    tick: number;
  }>;
  detection_latency: Record<string, number | null>;
}

