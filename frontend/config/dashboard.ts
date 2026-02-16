// config/dashboard.ts

/**
 * Dashboard Analytics Configuration
 * 
 * Customize all benchmark values and settings here
 * to match your market conditions and business requirements
 */

export const DASHBOARD_CONFIG = {
  // ============================================
  // FEE BENCHMARKS (Indian Rupees)
  // ============================================
  fees: {
    // Disposition fee above this is considered high
    dispositionFeeBenchmark: 30000,     // ₹30,000
    
    // Early termination fee above this is considered high
    earlyTerminationFeeBenchmark: 40000, // ₹40,000
  },

  // ============================================
  // MARKET RATES
  // ============================================
  market: {
    // Market average APR for car loans in India
    averageAPR: 8.5,                    // 8.5%
    
    // APR above this triggers a warning
    highAPRThreshold: 10.0,             // 10.0%
  },

  // ============================================
  // TIME PERIODS
  // ============================================
  timePeriods: {
    // Trend comparison period (in days)
    // Compares last N days vs previous N days
    trendPeriodDays: 30,
    
    // Fairness trend chart time range (in months)
    fairnessTrendMonths: 6,
  },

  // ============================================
  // DISPLAY SETTINGS
  // ============================================
  display: {
    // Maximum number of recent activities to show
    maxRecentActivities: 10,
    
    // Maximum number of top red flags in latest contract
    maxTopRedFlags: 3,
    
    // Default AI confidence percentage when not calculated
    defaultAIConfidence: 85,
    
    // Default risk level when not set
    defaultRiskLevel: 'medium' as const,
  },

  // ============================================
  // NEGOTIATION LEVERAGE POINTS
  // ============================================
  negotiation: {
    // Default leverage points shown in savings insight
    defaultLeveragePoints: [
      "Disposition fee reduction",
      "Lower APR rate",
      "Increased mileage allowance"
    ],
  },
} as const;

// Type export for TypeScript
export type DashboardConfig = typeof DASHBOARD_CONFIG;