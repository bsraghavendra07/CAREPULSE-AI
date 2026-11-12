export interface PatientProfile {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  condition: string;
  scale2_prescribed: boolean;
  riskSummary: string;
  baseline: {
    heart_rate: number;
    oxygen_saturation: number;
    respiratory_rate: number;
    systolic_bp: number;
    body_temperature: number;
  };
  department?: string;
  specialist_name?: string;
  specialist_title?: string;
  specialist_email?: string;
  specialist_initials?: string;
  phone_extension?: string;
}

