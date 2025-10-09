export interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
}

export interface PatientWithPredictions extends Patient {
  predictions: PredictionLogWithUser[];
  totalPredictions: number;
  lastPrediction?: Date;
  averagePredictionLevel?: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskAnalysis: {
    criticalPredictions: number; // Level 1-2
    moderatePredictions: number; // Level 3
    lowUrgencyPredictions: number; // Level 4-5
    trendDirection: 'improving' | 'stable' | 'declining';
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

export interface PatientSearchResult {
  success: true;
  patients: Patient[];
  total: number;
}

export interface PatientExistsResponse {
  success: false;
  exists: true;
  patient: Patient;
  message: 'Patient already exists';
  code: 'PATIENT_EXISTS';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PredictionLogWithUser {
  id: number;
  userId: number;
  patientNumber: string;
  inputs: any;
  predict: number;
  ktasExplained: any;
  probs: string[];
  model: string;
  createdAt: Date;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export const ERROR_CODES = {
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  INVALID_PATIENT_ID: 'INVALID_PATIENT_ID',
  SEARCH_QUERY_REQUIRED: 'SEARCH_QUERY_REQUIRED',
  PATIENT_EXISTS: 'PATIENT_EXISTS',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
} as const;
