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
}

