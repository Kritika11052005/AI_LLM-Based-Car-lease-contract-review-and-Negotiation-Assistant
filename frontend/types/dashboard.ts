// types/dashboard.ts

export interface DashboardAnalytics {
  kpi_summary: {
    total_contracts_analyzed: number;
    average_fairness_score: number;
    actionable_items: number;
    contracts_this_month: number; // NEW: replaces total_high_risk_clauses
    trends: {
      contracts_trend: number;
      fairness_trend: number;
      actionable_items_trend: number;
      contracts_this_month_trend: number; // NEW: replaces risk_trend
    };
  };
  latest_contract: {
    id: string;
    contract_name: string;
    upload_date: string;
    fairness_score: number;
    risk_level: "high" | "medium" | "low";
    ai_confidence_percentage: number;
    top_red_flags: {
      title: string;
      description: string;
      severity: "high" | "medium" | "low";
    }[];
  } | null;
  fairness_trend: {
    date: string;
    fairness_score: number;
    contract_id: string;
  }[];
  risk_distribution: {
    high_risk: number;
    medium_risk: number;
    low_risk: number;
  };
  risk_overview: {
    high_risk_contracts: number;
    medium_risk_contracts: number;
    low_risk_contracts: number;
    contracts_needing_attention: number;
    summary: string;
  };
  recent_activities: {
    id: string;
    action_type: string;
    description: string;
    timestamp: string;
    contract_id: string;
  }[];
}