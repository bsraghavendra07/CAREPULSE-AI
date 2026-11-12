export interface FullClinicalReport {
  report_id: string;
  generated_at: string;
  patient_id: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  primary_condition: string;
  ward: string;
  news2_total_score: number;
  has_red_score: boolean;
  red_score_parameter?: string | null;
  triage_tier: string;
  trigger_reason: string;
  clinical_action_directive: string;
  vital_signs: Record<string, any>;
  isolation_forest_anomaly_score?: number | null;
  isolation_forest_anomaly_level?: string | null;
  signal_quality_status: string;
  assigned_specialist: string;
  specialist_department: string;
  specialist_phone: string;
  report_url: string;
}

export interface SMSAlertRecord {
  id: string;
  alert_id: string;
  patient_id: string;
  patient_name: string;
  patient_condition: string;
  recipient_name: string;
  recipient_role: string;
  recipient_phone: string;
  emergency_level: string;
  message_body: string;
  delivery_status: string;
  carrier_route: string;
  timestamp: string;
  report_url: string;
  full_report: FullClinicalReport;
}

export interface SMSGatewayConfig {
  provider: string;
  enabled: boolean;
  account_sid?: string | null;
  auth_token?: string | null;
  from_number: string;
  default_recipient_phone: string;
  cooldown_seconds: number;
}

export interface SendTestSMSPayload {
  patient_id: string;
  recipient_phone: string;
  custom_note?: string;
  force_urgent?: boolean;
}
