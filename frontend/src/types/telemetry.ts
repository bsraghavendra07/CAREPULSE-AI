export type DataSource = 'BIDMC' | 'SIMULATED';
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
  value: number | string | boolean;
  source: DataSource;
}

export interface Vitals {
  heart_rate: VitalValue;
  oxygen_saturation: VitalValue;
  respiratory_rate: VitalValue;
  systolic_bp: VitalValue;
  body_temperature: VitalValue;
  consciousness: VitalValue;
  supplemental_oxygen: VitalValue;
}

export type ArtifactType = 'NONE' | 'MISSING_READING' | 'FLATLINE' | 'MOTION_NOISE' | 'INVALID_VALUE';

export interface SignalQuality {
  sqi: number;
  status: SQIStatus;
  artifact_detected: boolean;
  motion_injected: boolean;
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
  risk_level: RiskLevel;
  has_red_score: boolean;
  red_score_parameter: string | null;
  sub_scores: Record<string, number>;
  triage_tier?: TriageTier;
  alert_reason?: string;
  clinical_action?: string;
  suggested_specialty?: SuggestedSpecialty;
}

export interface PersonalizedInsight {
  is_advisory_alert: boolean;
  alert_parameters: string[];
  z_scores: Record<string, number>;
  baseline: Record<string, number>;
  advisory_note: string;
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

