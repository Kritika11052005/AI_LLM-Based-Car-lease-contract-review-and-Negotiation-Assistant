/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { DashboardAnalytics } from "@/types/dashboard";

// ── Helper: Get display name (same logic as contracts page) ─────────────────
function getContractDisplayName(contract: any): string {
  const v = contract.vehicle;
  if (v?.year && v?.make && v?.model) {
    return `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}`;
  }
  const fileName = contract.files?.[0]?.fileName;
  if (fileName) {
    return fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (ch: string) => ch.toUpperCase());
  }
  if (v?.vin) return `VIN: ${v.vin}`;
  return `Contract #${contract.id.slice(0, 8).toUpperCase()}`;
}

// ── Helper: Derive risk level from fairness score ───────────────────────────
function getRiskFromScore(score: number | null): "high" | "medium" | "low" {
  if (score === null) return "low";
  if (score < 50) return "high";
  if (score < 70) return "medium";
  return "low";
}

async function getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  const contracts = await prisma.contract.findMany({
    where: { userId },
    include: {
      sla: true,
      vehicle: {
        select: { vin: true, year: true, make: true, model: true, trim: true },
      },
      files: {
        select: { fileName: true },
        take: 1,
        orderBy: { uploadedAt: "asc" },
      },
      extractions: {
        include: { extractedClauses: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalContracts = contracts.length;
  const fairnessScores = contracts
    .filter((c) => c.fairnessScore)
    .map((c) => Number(c.fairnessScore));
  const averageFairnessScore =
    fairnessScores.length > 0
      ? fairnessScores.reduce((a, b) => a + b, 0) / fairnessScores.length
      : 0;

  const highRiskClauses = contracts.reduce((count, contract) => {
    const highRisk = contract.extractions.reduce((extractionCount, extraction) => {
      return (
        extractionCount +
        extraction.extractedClauses.filter((clause) => clause.redFlagLevel === "high").length
      );
    }, 0);
    return count + highRisk;
  }, 0);

  // ── FIXED SAVINGS: Calculate from real SLA data ────────────────────────────
  const contractsWithSLA = contracts.filter((c) => c.sla);
  
  // India market benchmarks
  const MARKET_APR = 9.0;
  const BENCHMARK_DISPOSITION_FEE = 5000;
  const BENCHMARK_EARLY_TERM_FEE = 10000;
  const BENCHMARK_MILEAGE_OVERAGE = 3.0;

  let totalSavings = 0;
  const leveragePoints: string[] = [];
  
  let totalAPR = 0;
  let aprCount = 0;
  let highDispositionCount = 0;
  let highTermFeeCount = 0;

  contractsWithSLA.forEach((c) => {
    const sla = c.sla!;
    
    // APR analysis
    const apr = Number(sla.aprPercent || 0);
    if (apr > 0) {
      totalAPR += apr;
      aprCount++;
      
      if (apr > MARKET_APR) {
        const monthlyPayment = Number(sla.monthlyPayment || 0);
        const termMonths = sla.termMonths || 36;
        const aprDiff = apr - MARKET_APR;
        const savings = (aprDiff / 100) * (monthlyPayment * termMonths) / 2;
        totalSavings += savings;
      }
    }

    // Disposition fee
    const dispositionFee = Number(sla.dispositionFee || 0);
    if (dispositionFee > BENCHMARK_DISPOSITION_FEE) {
      totalSavings += (dispositionFee - BENCHMARK_DISPOSITION_FEE);
      highDispositionCount++;
    }

    // Early termination fee
    const earlyTermFee = Number(sla.earlyTerminationFee || 0);
    if (earlyTermFee > BENCHMARK_EARLY_TERM_FEE) {
      totalSavings += (earlyTermFee - BENCHMARK_EARLY_TERM_FEE);
      highTermFeeCount++;
    }

    // Mileage overage
    const overageFee = Number(sla.mileageOverageFee || 0);
    if (overageFee > BENCHMARK_MILEAGE_OVERAGE) {
      totalSavings += (overageFee - BENCHMARK_MILEAGE_OVERAGE) * 2000;
    }
  });

  const avgAPR = aprCount > 0 ? totalAPR / aprCount : 0;
  const aprAboveMarket = Math.max(0, avgAPR - MARKET_APR);

  // Build actionable leverage points
  if (avgAPR > MARKET_APR + 0.5) {
    leveragePoints.push(`Negotiate APR from ${avgAPR.toFixed(1)}% down to ${MARKET_APR}%`);
  }
  if (highDispositionCount > 0) {
    leveragePoints.push(`Reduce disposition fee by ₹${BENCHMARK_DISPOSITION_FEE.toLocaleString('en-IN')}`);
  }
  if (highTermFeeCount > 0) {
    leveragePoints.push(`Lower early termination penalty`);
  }
  if (leveragePoints.length === 0) {
    leveragePoints.push("Request additional mileage allowance");
    leveragePoints.push("Negotiate lower acquisition fees");
  }

  const estimatedSavings = Math.round(totalSavings);

  // ── Latest Contract ──────────────────────────────────────────────────────────
  const latestContract = contracts[0] || null;
  let latestContractData = null;
  
  if (latestContract) {
    const allClauses = latestContract.extractions.flatMap((e) => e.extractedClauses);
    const topRedFlags = allClauses
      .filter((c) => c.redFlagLevel && c.redFlagLevel !== "low")
      .sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return (
          severityOrder[b.redFlagLevel as keyof typeof severityOrder] -
          severityOrder[a.redFlagLevel as keyof typeof severityOrder]
        );
      })
      .slice(0, 3)
      .map((c) => ({
        title: c.clauseType || "Unknown Clause",
        description: c.comment || c.textSnippet || "No details available",
        severity: c.redFlagLevel || "medium",
      }));

    const score = Number(latestContract.fairnessScore || 0);
    latestContractData = {
      id: latestContract.id,
      contract_name: getContractDisplayName(latestContract),
      upload_date: latestContract.createdAt.toISOString(),
      fairness_score: score,
      risk_level: getRiskFromScore(score),
      ai_confidence_percentage: 85,
      top_red_flags: topRedFlags as {
        title: string;
        description: string;
        severity: "high" | "medium" | "low";
      }[],
    };
  }

  // ── Fairness Trend ───────────────────────────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentContracts = contracts.filter(
    (c) => c.createdAt >= sixMonthsAgo && c.fairnessScore
  );
  const fairnessTrend = recentContracts.map((c) => ({
    date: c.createdAt.toISOString(),
    fairness_score: Number(c.fairnessScore),
    contract_id: c.id,
  }));

  // ── FIXED: Risk Distribution from fairness scores ───────────────────────────
  const riskCounts = { high: 0, medium: 0, low: 0 };
  contracts.forEach((c) => {
    const risk = getRiskFromScore(c.fairnessScore ? Number(c.fairnessScore) : null);
    riskCounts[risk]++;
  });

  const riskDistribution = {
    high_risk: riskCounts.high,
    medium_risk: riskCounts.medium,
    low_risk: riskCounts.low,
  };

  // ── Savings Insight ──────────────────────────────────────────────────────────
  const savingsInsight = {
    average_apr_above_market: aprAboveMarket,
    estimated_overpayment: estimatedSavings,
    negotiation_leverage_points: leveragePoints,
    potential_savings_summary: `You could save approximately ₹${estimatedSavings.toLocaleString("en-IN")} by negotiating better terms`,
  };

  // ── Recent Activities (top 3 contracts) ──────────────────────────────────────
  const top3Contracts = contracts.slice(0, 3);
  const activities = top3Contracts.map((c) => ({
    id: c.id,
    action_type: "contract_analyzed",
    description: getContractDisplayName(c),
    timestamp: c.createdAt.toISOString(),
    contract_id: c.id,
  }));

  // ── Calculate Trends ─────────────────────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const contractsThisMonth = contracts.filter((c) => c.createdAt >= thirtyDaysAgo).length;
  const previousPeriodStart = new Date(thirtyDaysAgo);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
  const contractsPreviousMonth = contracts.filter(
    (c) => c.createdAt >= previousPeriodStart && c.createdAt < thirtyDaysAgo
  ).length;
  const contractsTrend =
    contractsPreviousMonth > 0
      ? ((contractsThisMonth - contractsPreviousMonth) / contractsPreviousMonth) * 100
      : 0;

  return {
    kpi_summary: {
      total_contracts_analyzed: totalContracts,
      average_fairness_score: Math.round(averageFairnessScore),
      estimated_savings_identified: estimatedSavings,
      total_high_risk_clauses: highRiskClauses,
      trends: {
        contracts_trend: Math.round(contractsTrend),
        fairness_trend: 0,
        savings_trend: 0,
        risk_trend: 0,
      },
    },
    latest_contract: latestContractData,
    fairness_trend: fairnessTrend,
    risk_distribution: riskDistribution,
    savings_insight: savingsInsight,
    recent_activities: activities,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUserServer();
  if (!user) redirect("/login");

  const analytics = await getDashboardAnalytics(user.id);
  return <DashboardClient analytics={analytics} userName={user.name || user.email || "User"} />;
}