// types/contract.ts
// Matches Prisma schema field names + Week 7 market/fairness API shapes

export interface Vehicle {
  id?: string;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  bodyClass?: string | null;
  engine?: string | null;
  drivetrain?: string | null;
  fuelType?: string | null;
  odometerMiles?: number | null;
  colorExt?: string | null;
  colorInt?: string | null;
}

export interface ContractSLA {
  id?: string;
  aprPercent?: number | null;
  moneyFactor?: number | null;
  termMonths?: number | null;
  monthlyPayment?: number | null;
  downPayment?: number | null;
  feesTotal?: number | null;
  residualValue?: number | null;
  residualPercentMsrp?: number | null;
  msrp?: number | null;
  capCost?: number | null;
  capCostReduction?: number | null;
  mileageAllowanceYr?: number | null;
  mileageOverageFee?: number | null;
  earlyTerminationFee?: number | null;
  dispositionFee?: number | null;
  purchaseOptionPrice?: number | null;
  insuranceRequirements?: string | null;
  maintenanceResp?: string | null;
  warrantySummary?: string | null;
  lateFeePolicy?: string | null;
  otherTerms?: Record<string, unknown> | null;
}

export interface Contract {
  id: string;
  contractType?: string | null;
  docStatus?: string | null;
  dealerOfferName?: string | null;
  contractDate?: string | null;
  locale?: string | null;
  currency?: string | null;
  fairnessScore?: number | null;
  redFlagLevel?: string | null;
  notes?: string | null;
  negotiationIntents?: NegotiationIntent[] | null;
  createdAt?: string;
  updatedAt?: string | null;
  vehicle?: Vehicle | null;
  sla?: ContractSLA | null;
}

export interface PriceRange {
  low: number;
  high: number;
}

export interface MarketData {
  predicted_price: number | null;
  price_range: PriceRange | null;
}

export interface FairnessBreakdown {
  price_score: number;
  apr_score: number;
  fees_score: number;
  term_score: number;
  final_score: number;
}

export interface NegotiationIntent {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  field: string;
  current_value: string;
  target_value: string;
  market_benchmark: string;
  reasoning: string;
  negotiation_leverage: string;
}

export interface EnrichContractResponse {
  contract_data: {
    id: string;
    contract_type?: string | null;
    fairness_score?: number | null;
    red_flag_level?: string | null;
  };
  vehicle_data?: {
    vin?: string | null;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
  } | null;
  market_data?: MarketData | null;
  fairness_breakdown?: FairnessBreakdown | null;
  negotiation_intents?: NegotiationIntent[] | null;
}

export interface FairnessScoreResponse {
  contract_id: string;
  final_score: number;
  rating: string;
  price_score: number;
  apr_score: number;
  fees_score: number;
  term_score: number;
  red_flags: string[];
  warnings: string[];
  recommendations: string[];
  negotiation_intents: NegotiationIntent[];
}