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

  // 🔍 DEBUG: Log what we're finding
  console.log("\n📊 DASHBOARD DEBUG:");
  console.log(`Total contracts: ${contracts.length}`);

  const totalContracts = contracts.length;
  const fairnessScores = contracts
    .filter((c) => c.fairnessScore)
    .map((c) => Number(c.fairnessScore));
  const averageFairnessScore =
    fairnessScores.length > 0
      ? fairnessScores.reduce((a, b) => a + b, 0) / fairnessScores.length
      : 0;

  // ── Calculate Contracts This Month ──────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const contractsThisMonth = contracts.filter((c) => c.createdAt >= thirtyDaysAgo).length;

  console.log(`📅 Contracts This Month: ${contractsThisMonth}`);

  // ── Calculate Actionable Items ──────────────────────────────────────────────
  const actionableItems = contracts.filter((contract) => {
    const hasHighRiskClauses = contract.extractions.some((extraction) =>
      extraction.extractedClauses.some((clause) => clause.redFlagLevel === "high")
    );

    const lowFairnessScore = contract.fairnessScore && Number(contract.fairnessScore) < 60;

    return hasHighRiskClauses || lowFairnessScore;
  }).length;

  console.log(`📋 Actionable Items: ${actionableItems}`);

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
      ai_confidence_percentage: (() => {
        const sla = latestContract.sla;
        const fields = [
          sla?.aprPercent, sla?.monthlyPayment, sla?.downPayment,
          sla?.termMonths, sla?.residualValue, sla?.mileageAllowanceYr,
          sla?.earlyTerminationFee, sla?.mileageOverageFee,
          sla?.purchaseOptionPrice, sla?.lateFeePolicy,
        ];
        return Math.round((fields.filter(Boolean).length / fields.length) * 100);
      })(),
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

  // ── Risk Distribution from fairness scores ───────────────────────────────────
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

  // ── Risk Overview ────────────────────────────────────────────────────────────
  const riskOverview = {
    high_risk_contracts: riskCounts.high,
    medium_risk_contracts: riskCounts.medium,
    low_risk_contracts: riskCounts.low,
    contracts_needing_attention: actionableItems,
    summary: actionableItems > 0
      ? `${actionableItems} contract${actionableItems > 1 ? 's' : ''} require${actionableItems === 1 ? 's' : ''} immediate attention`
      : "All contracts are in good standing"
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
  const previousPeriodStart = new Date(thirtyDaysAgo);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
  const contractsPreviousMonth = contracts.filter(
    (c) => c.createdAt >= previousPeriodStart && c.createdAt < thirtyDaysAgo
  ).length;
  const contractsTrend =
    contractsPreviousMonth > 0
      ? ((contractsThisMonth - contractsPreviousMonth) / contractsPreviousMonth) * 100
      : 0;

  // Calculate contracts this month trend
  const contractsThisMonthTrend = contractsTrend;

  // Calculate actionable items trend
  const actionableItemsThisMonth = contracts.filter((contract) => {
    if (contract.createdAt < thirtyDaysAgo) return false;

    const hasHighRiskClauses = contract.extractions.some((extraction) =>
      extraction.extractedClauses.some((clause) => clause.redFlagLevel === "high")
    );
    const lowFairnessScore = contract.fairnessScore && Number(contract.fairnessScore) < 60;

    return hasHighRiskClauses || lowFairnessScore;
  }).length;

  const actionableItemsPrevMonth = contracts.filter((contract) => {
    if (contract.createdAt >= thirtyDaysAgo || contract.createdAt < previousPeriodStart) return false;

    const hasHighRiskClauses = contract.extractions.some((extraction) =>
      extraction.extractedClauses.some((clause) => clause.redFlagLevel === "high")
    );
    const lowFairnessScore = contract.fairnessScore && Number(contract.fairnessScore) < 60;

    return hasHighRiskClauses || lowFairnessScore;
  }).length;

  const actionableItemsTrend = actionableItemsPrevMonth > 0
    ? ((actionableItemsThisMonth - actionableItemsPrevMonth) / actionableItemsPrevMonth) * 100
    : 0;

  console.log("\n✅ Analytics Complete\n");

  return {
    kpi_summary: {
      total_contracts_analyzed: totalContracts,
      average_fairness_score: Math.round(averageFairnessScore),
      actionable_items: actionableItems,
      contracts_this_month: contractsThisMonth,
      trends: {
        contracts_trend: Math.round(contractsTrend),
        fairness_trend: 0,
        actionable_items_trend: Math.round(actionableItemsTrend),
        contracts_this_month_trend: Math.round(contractsThisMonthTrend),
      },
    },
    latest_contract: latestContractData,
    fairness_trend: fairnessTrend,
    risk_distribution: riskDistribution,
    risk_overview: riskOverview,
    recent_activities: activities,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUserServer();
  if (!user) redirect("/login");

  const analytics = await getDashboardAnalytics(user.id);
  return <DashboardClient analytics={analytics} userName={user.name || user.email || "User"} />;
}