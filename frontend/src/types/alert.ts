export type AlertSeverity = 'ROUTINE' | 'WATCH' | 'REVIEW' | 'URGENT' | 'DEVICE_WARNING';

export type AlertStatus = 'PENDING' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'RESOLVED';

export interface RoutedAlert {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_condition: string;
  department: string;
  specialist_name: string;
  specialist_title: string;
  specialist_email: string;
  severity: AlertSeverity;
  news2_score: number;
  triage_tier: string;
  alert_reason: string;
  clinical_action: string;
  vital_readings: Record<string, number | string | boolean>;
  timestamp: string;
  status: AlertStatus;
  status_updated_at?: string;
  acknowledged_by?: string;
  emergency_flag: boolean;
  emergency_queue: boolean;
  is_artifact: boolean;
  sensor_note?: string;
  decision_support_specialty?: string;
}

export interface AlertStats {
  total_alerts: number;
  pending_reviews: number;
  acknowledged_alerts: number;
  under_review_alerts: number;
  resolved_alerts: number;
  urgent_alerts: number;
  department_distribution: Record<string, number>;
}
