// types/dashboard.ts

export interface DashboardKPISummary {
  total_contracts_analyzed: number;
  average_fairness_score: number;
  estimated_savings_identified: number;
  total_high_risk_clauses: number;
  trends: {
    contracts_trend: number;
    fairness_trend: number;
    savings_trend: number;
    risk_trend: number;
  };
}

export interface LatestContractSnapshot {
  id: string;
  contract_name: string;
  upload_date: string;
  fairness_score: number;
  risk_level: 'high' | 'medium' | 'low';
  ai_confidence_percentage: number;
  top_red_flags: {
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }[];
}

export interface FairnessTrendDataPoint {
  date: string;
  fairness_score: number;
  contract_id: string;
}

export interface RiskDistribution {
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

export interface SavingsInsight {
  average_apr_above_market: number;
  estimated_overpayment: number;
  negotiation_leverage_points: readonly string[];
  potential_savings_summary: string;
}

export interface RecentActivity {
  id: string;
  action_type: string;
  description: string;
  timestamp: string;
  contract_id?: string;
}

export interface DashboardAnalytics {
  kpi_summary: DashboardKPISummary;
  latest_contract: LatestContractSnapshot | null;
  fairness_trend: FairnessTrendDataPoint[];
  risk_distribution: RiskDistribution;
  savings_insight: SavingsInsight;
  recent_activities: RecentActivity[];
}