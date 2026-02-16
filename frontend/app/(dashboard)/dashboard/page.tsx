/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { DASHBOARD_CONFIG } from "@/config/dashboard";
import type { DashboardAnalytics } from "@/types/dashboard";

async function getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  // Get all user's contracts
  const contracts = await prisma.contract.findMany({
    where: { userId },
    include: {
      sla: true,
      vehicle: true,
      extractions: {
        include: {
          extractedClauses: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate KPI Summary
  const totalContracts = contracts.length;
  
  const fairnessScores = contracts
    .filter(c => c.fairnessScore)
    .map(c => Number(c.fairnessScore));
  
  const averageFairnessScore = fairnessScores.length > 0
    ? fairnessScores.reduce((a, b) => a + b, 0) / fairnessScores.length
    : 0;

  // Count high-risk clauses across all contracts
  const highRiskClauses = contracts.reduce((count, contract) => {
    const highRisk = contract.extractions.reduce((extractionCount, extraction) => {
      return extractionCount + extraction.extractedClauses.filter(
        clause => clause.redFlagLevel === 'high'
      ).length;
    }, 0);
    return count + highRisk;
  }, 0);

  // Calculate estimated savings
  const estimatedSavings = contracts.reduce((total, contract) => {
    if (!contract.sla) return total;
    
    // Disposition fee above benchmark is considered high
    const dispositionFee = Number(contract.sla.dispositionFee || 0);
    const savingsFromDisposition = Math.max(0, dispositionFee - DASHBOARD_CONFIG.fees.dispositionFeeBenchmark);
    
    // Early termination fee above benchmark is high
    const earlyTermFee = Number(contract.sla.earlyTerminationFee || 0);
    const savingsFromEarlyTerm = Math.max(0, earlyTermFee - DASHBOARD_CONFIG.fees.earlyTerminationFeeBenchmark);
    
    return total + savingsFromDisposition + savingsFromEarlyTerm;
  }, 0);

  // Get latest contract
  const latestContract = contracts[0] || null;
  
  let latestContractData = null;
  if (latestContract) {
    // Get top red flags
    const allClauses = latestContract.extractions.flatMap(
      e => e.extractedClauses
    );
    
    const topRedFlags = allClauses
      .filter(c => c.redFlagLevel && c.redFlagLevel !== 'low')
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.redFlagLevel as keyof typeof severityOrder] - 
               severityOrder[a.redFlagLevel as keyof typeof severityOrder];
      })
      .slice(0, DASHBOARD_CONFIG.display.maxTopRedFlags)
      .map(c => ({
        title: c.clauseType || 'Unknown Clause',
        description: c.comment || c.textSnippet || 'No details available',
        severity: c.redFlagLevel || 'medium'
      }));

    latestContractData = {
      id: latestContract.id,
      contract_name: latestContract.vehicle 
        ? `${latestContract.vehicle.year} ${latestContract.vehicle.make} ${latestContract.vehicle.model}`
        : latestContract.dealerOfferName || 'Unnamed Contract',
      upload_date: latestContract.createdAt.toISOString(),
      fairness_score: Number(latestContract.fairnessScore || 0),
      risk_level: (latestContract.redFlagLevel || DASHBOARD_CONFIG.display.defaultRiskLevel) as 'high' | 'medium' | 'low',
      ai_confidence_percentage: DASHBOARD_CONFIG.display.defaultAIConfidence,
      top_red_flags: topRedFlags as { title: string; description: string; severity: 'high' | 'medium' | 'low' }[]
    };
  }

  // Fairness trend (configurable time period)
  const fairnessTrendStartDate = new Date();
  fairnessTrendStartDate.setMonth(fairnessTrendStartDate.getMonth() - DASHBOARD_CONFIG.timePeriods.fairnessTrendMonths);
  
  const recentContracts = contracts.filter(
    c => c.createdAt >= fairnessTrendStartDate && c.fairnessScore
  );

  const fairnessTrend = recentContracts.map(c => ({
    date: c.createdAt.toISOString(),
    fairness_score: Number(c.fairnessScore),
    contract_id: c.id
  }));

  // Risk distribution
  const riskCounts = contracts.reduce((acc, contract) => {
    const level = contract.redFlagLevel || 'low';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const riskDistribution = {
    high_risk: riskCounts.high || 0,
    medium_risk: riskCounts.medium || 0,
    low_risk: riskCounts.low || 0
  };

  // Savings insight
  const contractsWithSLA = contracts.filter(c => c.sla);
  const avgAPR = contractsWithSLA.length > 0
    ? contractsWithSLA.reduce((sum, c) => sum + Number(c.sla!.aprPercent || 0), 0) / contractsWithSLA.length
    : 0;

  const aprAboveMarket = Math.max(0, avgAPR - DASHBOARD_CONFIG.market.averageAPR);

  const savingsInsight = {
    average_apr_above_market: aprAboveMarket,
    estimated_overpayment: estimatedSavings,
    negotiation_leverage_points: DASHBOARD_CONFIG.negotiation.defaultLeveragePoints,
    potential_savings_summary: `You could save approximately ₹${Math.round(estimatedSavings).toLocaleString('en-IN')} by negotiating better terms`
  };

  // Recent activities
  const recentActivities = await prisma.auditEvent.findMany({
    where: { userId },
    orderBy: { occurredAt: 'desc' },
    take: DASHBOARD_CONFIG.display.maxRecentActivities
  });

  const activities = recentActivities.map(event => ({
    id: event.id,
    action_type: event.action || 'unknown',
    description: getActivityDescription(event),
    timestamp: event.occurredAt.toISOString(),
    contract_id: event.entityId || undefined
  }));

  // Calculate trends (compare to previous period)
  const trendPeriodStart = new Date();
  trendPeriodStart.setDate(trendPeriodStart.getDate() - DASHBOARD_CONFIG.timePeriods.trendPeriodDays);
  
  const contractsThisMonth = contracts.filter(c => c.createdAt >= trendPeriodStart).length;
  const previousPeriodStart = new Date(trendPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - DASHBOARD_CONFIG.timePeriods.trendPeriodDays);
  
  const contractsPreviousMonth = contracts.filter(
    c => c.createdAt >= previousPeriodStart && c.createdAt < trendPeriodStart
  ).length;

  const contractsTrend = contractsPreviousMonth > 0
    ? ((contractsThisMonth - contractsPreviousMonth) / contractsPreviousMonth) * 100
    : 0;

  return {
    kpi_summary: {
      total_contracts_analyzed: totalContracts,
      average_fairness_score: Math.round(averageFairnessScore),
      estimated_savings_identified: Math.round(estimatedSavings),
      total_high_risk_clauses: highRiskClauses,
      trends: {
        contracts_trend: Math.round(contractsTrend),
        fairness_trend: 0,
        savings_trend: 0,
        risk_trend: 0
      }
    },
    latest_contract: latestContractData,
    fairness_trend: fairnessTrend,
    risk_distribution: riskDistribution,
    savings_insight: savingsInsight,
    recent_activities: activities
  };
}

function getActivityDescription(event: any): string {
  const action = event.action || '';
  const details = event.details as any;
  
  switch (action) {
    case 'contract_upload':
      return 'Contract uploaded successfully';
    case 'sla_extraction':
      return 'Contract terms extracted';
    case 'negotiation_started':
      return 'Negotiation thread created';
    case 'vin_lookup':
      return 'Vehicle information retrieved';
    default:
      return details?.description || 'Activity recorded';
  }
}

export default async function DashboardPage() {
  // Get current user (server-side)
  const user = await getCurrentUserServer();
  
  if (!user) {
    redirect('/login');
  }

  // Fetch dashboard analytics (server-side)
  const analytics = await getDashboardAnalytics(user.id);

  // Pass data to client component
  return <DashboardClient analytics={analytics} userName={user.name || user.email || 'User'} />;
}