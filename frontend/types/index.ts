/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Core TypeScript Types based on Prisma Schema
 */

// ============================================
// USER & AUTH
// ============================================

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  authProvider: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

// ============================================
// VEHICLE
// ============================================

export interface Vehicle {
  id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  engine: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  odometerMiles: number | null;
  colorExt: string | null;
  colorInt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface VINLookupResponse {
  vin: string;
  vehicle_data: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    body_class?: string;
    engine?: string;
    drivetrain?: string;
    fuel_type?: string;
  };
}

// ============================================
// CONTRACT & SLA
// ============================================

export interface Contract {
  id: string;
  userId: string | null;
  vehicleId: string | null;
  dealerId: string | null;
  lenderId: string | null;
  contractType: string | null;
  docStatus: string | null;
  dealerOfferName: string | null;
  contractDate: string | null;
  locale: string | null;
  currency: string | null;
  fairnessScore: number | null;
  redFlagLevel: string | null;
  notes: string | null;
  negotiationIntents: any | null;
  createdAt: string;
  updatedAt: string | null;
  vehicle?: Vehicle;
  sla?: ContractSLA;
  files?: ContractFile[];
}

export interface ContractSLA {
  id: string;
  contractId: string;
  aprPercent: number | null;
  moneyFactor: number | null;
  termMonths: number | null;
  monthlyPayment: number | null;
  downPayment: number | null;
  feesTotal: number | null;
  residualValue: number | null;
  residualPercentMsrp: number | null;
  msrp: number | null;
  capCost: number | null;
  capCostReduction: number | null;
  mileageAllowanceYr: number | null;
  mileageOverageFee: number | null;
  earlyTerminationFee: number | null;
  dispositionFee: number | null;
  purchaseOptionPrice: number | null;
  insuranceRequirements: string | null;
  maintenanceResp: string | null;
  warrantySummary: string | null;
  lateFeePolicy: string | null;
  otherTerms: any | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ContractFile {
  id: string;
  contractId: string;
  storageUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  pageCount: number | null;
  uploadedAt: string;
}

// ============================================
// CONTRACT UPLOAD & EXTRACTION
// ============================================

export interface UploadContractResponse {
  message: string;
  contract_id: string;
  file_id: string;
  filename: string;
  text_length: number;
}

export interface ExtractSLAResponse {
  message: string;
  contract_id: string;
  sla_data: SLAData;
  vin: string | null;
  vehicle_data: any | null;
  database_saved: {
    contract_sla_created: boolean;
    vehicle_linked: boolean;
    fields_saved: {
      apr_percent: number | null;
      term_months: number | null;
      monthly_payment: number | null;
      mileage_allowance: number | null;
      overage_fee: number | null;
      purchase_option: number | null;
    };
  };
}

export interface SLAData {
  interest_rate: string | null;
  lease_term_months: number | null;
  monthly_payment: string | null;
  down_payment: string | null;
  residual_value: string | null;
  mileage_allowance: string | null;
  overage_charge: string | null;
  early_termination_fee: string | null;
  purchase_option: string | null;
  maintenance_responsibility: string | null;
  warranty_coverage: string | null;
  late_fee: string | null;
}

// ============================================
// NEGOTIATION
// ============================================

export interface NegotiationIntent {
  intent: string;
  priority: number;
  category: string;
  current_value: string | number | null;
  target_value: string | number | null;
  rationale: string;
  talking_points: string[];
}

export interface NegotiationAnalysis {
  contract_id: string;
  fairness_score: number;
  rating: "Excellent" | "Good" | "Fair" | "Poor" | "Very Poor";
  summary: string;
  red_flags: string[];
  warnings: string[];
  negotiation_intents: NegotiationIntent[];
}

export interface NegotiationScript {
  contract_id: string;
  thread_id: string;
  fairness_score: number;
  rating: string;
  negotiation_script: string;
}

export interface NegotiationThread {
  id: string;
  userId: string | null;
  contractId: string | null;
  dealerId: string | null;
  lenderId: string | null;
  channel: string | null;
  subject: string | null;
  createdAt: string;
  closedAt: string | null;
  messages?: NegotiationMessage[];
}

export interface NegotiationMessage {
  id: string;
  threadId: string;
  senderRole: string;
  body: string;
  suggestedText: string | null;
  attachments: any | null;
  sentAt: string;
}

export interface AskQuestionRequest {
  question: string;
  thread_id?: string;
}

export interface AskQuestionResponse {
  contract_id: string;
  thread_id: string;
  question: string;
  answer: string;
}

// ============================================
// ANALYTICS
// ============================================

export interface DashboardAnalytics {
  total_contracts: number;
  average_fairness_score: number;
  contracts_this_month: number;
  fairness_trend: {
    month: string;
    score: number;
  }[];
  risk_distribution: {
    rating: string;
    count: number;
  }[];
  estimated_savings: number;
}

// ============================================
// API ERROR
// ============================================

export interface APIError {
  detail: string;
  status?: number;
}

// ============================================
// FORM TYPES
// ============================================

export interface ContractUploadFormData {
  file: File;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
export interface AskQuestionResponse {
  contract_id: string;
  thread_id: string;
  question: string;
  answer: string;
}