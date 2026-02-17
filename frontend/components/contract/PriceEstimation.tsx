"use client";
// components/contract/PriceEstimation.tsx
// Calls POST /api/market/enrich/{id} — MarketCheck price + fairness pipeline

import { useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Info, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { EnrichContractResponse } from "@/types/contract";

interface Props {
  contractId: string;
  dealerPrice?: number | null; // passed from ContractDetailPage via sla.capCost / sla.msrp
}

// ── over/under badge ───────────────────────────────────────────────────────────
function DeltaBadge({ pct }: { pct: number }) {
  const over = pct > 0;
  return (
    <motion.span
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
        over
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      }`}
    >
      {over ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {over ? "+" : ""}{pct.toFixed(1)}%{" "}
      {over ? "Overpriced" : "Below Market"}
    </motion.span>
  );
}

// ── horizontal price bar ───────────────────────────────────────────────────────
function PriceBar({
  low,
  high,
  predicted,
  dealer,
}: {
  low: number;
  high: number;
  predicted: number;
  dealer: number | null;
}) {
  const range = high - low || 1;

  const pctOf = (v: number) => Math.max(0, Math.min(100, ((v - low) / range) * 100));
  const predictedPct = pctOf(predicted);
  const dealerPct    = dealer != null ? pctOf(dealer) : null;

  return (
    <div className="mt-6 mb-2">
      {/* labels */}
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span>Market Low<br /><span className="text-slate-300 font-semibold">{formatCurrency(low)}</span></span>
        <span className="text-center">Market Avg<br /><span className="text-slate-300 font-semibold">{formatCurrency(predicted)}</span></span>
        <span className="text-right">Market High<br /><span className="text-slate-300 font-semibold">{formatCurrency(high)}</span></span>
      </div>

      {/* track */}
      <div className="relative h-3 rounded-full bg-white/6 overflow-visible">
        {/* filled range */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-red-500/30" />

        {/* predicted avg marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/40 rounded-full"
          style={{ left: `${predictedPct}%` }}
        />

        {/* dealer price marker — animates in */}
        {dealerPct != null && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${dealerPct}%` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          >
            <div className="w-3 h-3 rounded-full bg-violet-400 border-2 border-white shadow-[0_0_8px_rgba(167,139,250,0.8)] -translate-y-0.5" />
            <span className="absolute top-5 text-[10px] text-violet-300 font-bold whitespace-nowrap">
              Dealer {formatCurrency(dealer!)}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────────
export function PriceEstimation({ contractId, dealerPrice }: Props) {
  const { data, isLoading, error } = useQuery<EnrichContractResponse>({
    queryKey: ["market-enrich", contractId],
    queryFn: async () => {
      const r = await backendAPI.post(`api/market/enrich/${contractId}`);
      return r.data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 border-white/8 bg-slate-900/60">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
          <Skeleton className="h-5 w-48 bg-white/5" />
        </div>
        <Skeleton className="h-40 w-full bg-white/5 rounded-xl" />
      </Card>
    );
  }

  if (error || !data?.market_data?.predicted_price) {
    return (
      <Card className="p-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3 text-amber-400">
          <Info className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Market data unavailable</p>
            <p className="text-xs text-slate-500 mt-0.5">
              MarketCheck couldn&apos;t retrieve pricing for this vehicle.
              Contract fairness was still scored using term benchmarks.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const { market_data, fairness_breakdown, vehicle_data } = data;
  const predicted = market_data.predicted_price!;
  const low       = market_data.price_range?.low ?? predicted * 0.85;
  const high      = market_data.price_range?.high ?? predicted * 1.15;

  // dealer price: prefer prop, fall back to anything reasonable
  const dealer = dealerPrice ?? null;

  // over/under percent vs predicted
  const deltaPct =
    dealer != null ? ((dealer - predicted) / predicted) * 100 : null;

  const vehicleLabel = vehicle_data
    ? [vehicle_data.year, vehicle_data.make, vehicle_data.model, vehicle_data.trim]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {/* ── Main price card ──────────────────────────────────────────────── */}
      <Card className="p-6 border-white/8 bg-gradient-to-br from-blue-500/8 to-cyan-500/5 backdrop-blur-sm">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <BarChart2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Market Price Analysis</h3>
              {vehicleLabel && (
                <p className="text-xs text-slate-500 mt-0.5">{vehicleLabel}</p>
              )}
            </div>
          </div>
          {deltaPct != null && <DeltaBadge pct={deltaPct} />}
        </div>

        {/* price bar */}
        <PriceBar low={low} high={high} predicted={predicted} dealer={dealer} />

        {/* three-col stat row */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-white/6">
          <Stat label="Market Low"  value={formatCurrency(low)}       color="text-emerald-400" />
          <Stat label="Predicted"   value={formatCurrency(predicted)}  color="text-blue-400" center />
          <Stat label="Market High" value={formatCurrency(high)}       color="text-red-400" right />
        </div>
      </Card>

      {/* ── Fairness breakdown scores ─────────────────────────────────────── */}
      {fairness_breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 border-white/8 bg-slate-900/40">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              Fairness Sub-Scores
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SubScore label="Price"  score={fairness_breakdown.price_score} color="text-violet-400" />
              <SubScore label="APR"    score={fairness_breakdown.apr_score}   color="text-blue-400" />
              <SubScore label="Fees"   score={fairness_breakdown.fees_score}  color="text-cyan-400" />
              <SubScore label="Term"   score={fairness_breakdown.term_score}  color="text-teal-400" />
            </div>
            <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between">
              <span className="text-xs text-slate-500">Blended Fairness Score</span>
              <span className="text-lg font-black text-white">
                {fairness_breakdown.final_score.toFixed(1)}
                <span className="text-xs text-slate-500 font-normal ml-1">/ 100</span>
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── helper sub-components ──────────────────────────────────────────────────────
function Stat({
  label, value, color, center, right,
}: {
  label: string; value: string; color: string; center?: boolean; right?: boolean;
}) {
  return (
    <div className={center ? "text-center" : right ? "text-right" : ""}>
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SubScore({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/4 border border-white/6 text-center">
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{Math.round(score)}</p>
    </div>
  );
}