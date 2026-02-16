/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/dashboard/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user's contracts
    const contracts = await prisma.contract.findMany({
      where: { userId: user.id },
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

    // Calculate estimated savings (example: based on above-market fees)
    const estimatedSavings = contracts.reduce((total, contract) => {
      if (!contract.sla) return total;
      
      // Example calculation: disposition fee above $400 is considered high
      const dispositionFee = Number(contract.sla.dispositionFee || 0);
      const savingsFromDisposition = Math.max(0, dispositionFee - 400);
      
      // Early termination fee above $500 is high
      const earlyTermFee = Number(contract.sla.earlyTerminationFee || 0);
      const savingsFromEarlyTerm = Math.max(0, earlyTermFee - 500);
      
      return total + savingsFromDisposition + savingsFromEarlyTerm;
    }, 0);

    // Get latest contract
    const latestContract = contracts[0] || null;
    
    let latestContractData = null;
    if (latestContract) {
      // Get top 3 red flags
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
        .slice(0, 3)
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
        risk_level: latestContract.redFlagLevel || 'medium',
        ai_confidence_percentage: 85, // You can calculate this based on extraction confidence
        top_red_flags: topRedFlags
      };
    }

    // Fairness trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentContracts = contracts.filter(
      c => c.createdAt >= sixMonthsAgo && c.fairnessScore
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

    const marketAPR = 5.5; // Industry average
    const aprAboveMarket = Math.max(0, avgAPR - marketAPR);

    const savingsInsight = {
      average_apr_above_market: aprAboveMarket,
      estimated_overpayment: estimatedSavings,
      negotiation_leverage_points: [
        "Disposition fee reduction",
        "Lower APR rate",
        "Increased mileage allowance"
      ],
      potential_savings_summary: `You could save approximately $${Math.round(estimatedSavings)} by negotiating better terms`
    };

    // AI Insights
    const aiInsights = [];
    
    if (avgAPR > marketAPR + 1) {
      aiInsights.push({
        recommendation: `Your average APR of ${avgAPR.toFixed(2)}% is ${aprAboveMarket.toFixed(2)}% above market average. Consider negotiating for a lower rate.`,
        insight_type: 'warning',
        confidence: 0.92
      });
    }

    if (highRiskClauses > 5) {
      aiInsights.push({
        recommendation: `${highRiskClauses} high-risk clauses detected across your contracts. Review clause X for potential negotiation.`,
        insight_type: 'warning',
        confidence: 0.88
      });
    }

    // Recent activities
    const recentActivities = await prisma.auditEvent.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      take: 10
    });

    const activities = recentActivities.map(event => ({
      id: event.id,
      action_type: event.action || 'unknown',
      description: getActivityDescription(event),
      timestamp: event.occurredAt.toISOString(),
      contract_id: event.entityId
    }));

    // Calculate trends (compare to previous period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const contractsThisMonth = contracts.filter(c => c.createdAt >= thirtyDaysAgo).length;
    const previousPeriodStart = new Date(thirtyDaysAgo);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
    
    const contractsPreviousMonth = contracts.filter(
      c => c.createdAt >= previousPeriodStart && c.createdAt < thirtyDaysAgo
    ).length;

    const contractsTrend = contractsPreviousMonth > 0
      ? ((contractsThisMonth - contractsPreviousMonth) / contractsPreviousMonth) * 100
      : 0;

    return NextResponse.json({
      kpi_summary: {
        total_contracts_analyzed: totalContracts,
        average_fairness_score: Math.round(averageFairnessScore),
        estimated_savings_identified: Math.round(estimatedSavings),
        total_high_risk_clauses: highRiskClauses,
        trends: {
          contracts_trend: Math.round(contractsTrend),
          fairness_trend: 0, // Calculate if needed
          savings_trend: 0,
          risk_trend: 0
        }
      },
      latest_contract: latestContractData,
      fairness_trend: fairnessTrend,
      risk_distribution: riskDistribution,
      savings_insight: savingsInsight,
      ai_insights: aiInsights,
      recent_activities: activities
    });

  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
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