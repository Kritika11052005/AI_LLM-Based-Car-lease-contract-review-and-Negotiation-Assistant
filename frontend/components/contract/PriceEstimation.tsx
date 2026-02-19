"use client";
// components/contract/PriceEstimation.tsx
// MarketCheck price analysis with live USD → INR conversion

import { useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { RefreshCw, Info, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { EnrichContractResponse } from "@/types/contract";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  contractId: string;
  dealerPrice?: number | null;
}

// ── Fetch live USD to INR exchange rate ─────────────────────────────────────────
async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    return data.rates.INR || 83.5; // fallback to 83.5 if API fails
  } catch (error) {
    console.warn('Exchange rate API failed, using fallback:', error);
    return 83.5; // static fallback
  }
}

function convertToINR(usdPrice: number, rate: number): number {
  return Math.round(usdPrice * rate);
}

// ── main export ────────────────────────────────────────────────────────────────
export function PriceEstimation({ contractId, dealerPrice }: Props) {
  // Fetch exchange rate (cached for 1 hour)
  const { data: exchangeRate = 83.5 } = useQuery<number>({
    queryKey: ['usd-inr-rate'],
    queryFn: fetchExchangeRate,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const { data, isLoading, error, refetch, isRefetching } = useQuery<EnrichContractResponse>({
    queryKey: ["market-enrich", contractId],
    queryFn: async () => {
      const r = await backendAPI.post(`/api/market/enrich/${contractId}`);
      return r.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6 border-white/8 bg-slate-900/60">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48 bg-white/5" />
          <Skeleton className="h-10 w-32 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-64 w-full bg-white/5" />
      </Card>
    );
  }

  if (error || !data?.market_data?.predicted_price) {
    return (
      <Card className="p-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3 text-amber-400">
          <Info className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Market data unavailable</p>
            <p className="text-xs text-slate-500 mt-0.5">
              MarketCheck couldn&apos;t retrieve pricing for this vehicle.
              This may happen if the VIN is invalid or the vehicle is too new/old.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const { market_data } = data;

  // Convert USD prices to INR using live rate
  const predictedUSD = market_data.predicted_price!;
  const lowUSD = market_data.price_range?.low ?? predictedUSD * 0.85;
  const highUSD = market_data.price_range?.high ?? predictedUSD * 1.15;

  const predictedINR = convertToINR(predictedUSD, exchangeRate);
  const lowINR = convertToINR(lowUSD, exchangeRate);
  const highINR = convertToINR(highUSD, exchangeRate);

  // Dealer price is already in INR
  const dealerINR = dealerPrice ?? null;

  // Price difference calculation
  const priceDiff = dealerINR != null ? dealerINR - predictedINR : 0;
  const priceDiffPct = dealerINR != null ? ((priceDiff / predictedINR) * 100) : 0;

  // Fairness score
  const fairnessScore = data.fairness_breakdown?.final_score ?? 0;

  // ✅ Chart data - now includes BOTH dealer price and market price
  const chartData = [
    {
      name: "Dealer Price",
      value: dealerINR ?? 0,
      fill: "#8B5CF6", // violet
    },
    {
      name: "Market Avg",
      value: predictedINR,
      fill: "#3B82F6", // blue
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 border-white/8 bg-slate-900/40 backdrop-blur-sm">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Market Analysis</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Compare your contract against current market data
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* ── Metric Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Dealer Price */}
          <MetricCard
            label="DEALER PRICE"
            value={formatCurrency(dealerINR ?? 0)}
            subtitle="From contract"
            delay={0}
          />

          {/* Market Average */}
          <MetricCard
            label="MARKET AVERAGE"
            value={formatCurrency(predictedINR)}
            subtitle="Market estimate"
            delay={0.1}
          />

          {/* Price Difference */}
          <MetricCard
            label="PRICE DIFFERENCE"
            value={`${priceDiff >= 0 ? '+' : ''}${Math.abs(priceDiffPct).toFixed(1)}%`}
            subtitle="vs market average"
            valueColor={priceDiff > 0 ? "text-red-400" : priceDiff < 0 ? "text-emerald-400" : "text-slate-300"}
            icon={priceDiff > 0 ? TrendingUp : priceDiff < 0 ? TrendingDown : undefined}
            delay={0.2}
          />

          {/* Fairness Score */}
          <MetricCard
            label="FAIRNESS SCORE"
            value={`${Math.round(fairnessScore)}/100`}
            subtitle="Overall rating"
            valueColor={
              fairnessScore >= 80 ? "text-emerald-400" :
                fairnessScore >= 60 ? "text-amber-400" : "text-red-400"
            }
            delay={0.3}
          />
        </div>

        {/* ── Price Comparison Chart ─────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-1">Price Comparison</h4>
            <p className="text-xs text-slate-500">
              Your contract price compared to current market listings
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1220',  // Darker background matching your theme
                    border: '1px solid #2563EB',  // Blue border on hover
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  }}
                  labelStyle={{
                    color: '#E5E7EB',  // Light gray for label
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                  itemStyle={{
                    color: '#00D4A8',  // Teal/cyan for the price value ✅
                    fontSize: '14px',
                    fontWeight: '700',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Price']}
                  cursor={{ fill: 'rgba(37, 99, 235, 0.1)' }}  // Light blue bar hover background
                />

                {/* Market average reference line */}
                <ReferenceLine
                  y={predictedINR}
                  stroke="#3B82F6"
                  strokeDasharray="5 5"
                  label={{
                    value: `Market Avg: ${formatCurrency(predictedINR)}`,
                    fill: '#3B82F6',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />

                <Bar
                  dataKey="value"
                  fill="#8B5CF6"  // Violet bar color
                  radius={[8, 8, 0, 0]}
                  maxBarSize={100}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Market Range Info ──────────────────────────────────────────── */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <h5 className="text-xs font-semibold text-slate-400 mb-3">Market Range</h5>
            <div className="flex items-center justify-between text-sm">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Low</p>
                <p className="font-semibold text-emerald-400">{formatCurrency(lowINR)}</p>
              </div>
              <div className="flex-1 mx-4">
                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-red-500/30 relative">
                  {/* Dealer price marker */}
                  {dealerINR != null && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{
                        left: `${Math.max(0, Math.min(100, ((dealerINR - lowINR) / (highINR - lowINR)) * 100))}%`
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      <div className="w-3 h-3 rounded-full bg-violet-400 border-2 border-white shadow-lg" />
                    </motion.div>
                  )}
                  {/* Market average marker */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((predictedINR - lowINR) / (highINR - lowINR)) * 100))}%`
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-lg" />
                  </motion.div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">High</p>
                <p className="font-semibold text-red-400">{formatCurrency(highINR)}</p>
              </div>
            </div>
          </div>

          {/* ── Data Sources ───────────────────────────────────────────────── */}
          <div className="flex items-start gap-2 text-xs text-slate-500 pt-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-400">Data Sources</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>MarketCheck Price Prediction (USD)</li>
                <li>Live exchange rate: 1 USD = ₹{exchangeRate.toFixed(2)} INR</li>
                <li>Rate updated hourly via exchangerate-api.com</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Metric Card Component ──────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  subtitle,
  valueColor = "text-white",
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-4 hover:bg-white/[0.04] transition-colors"
    >
      <p className="text-[10px] font-semibold text-slate-500 tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-black ${valueColor} tracking-tight`}>
          {value}
        </p>
        {Icon && <Icon className={`w-4 h-4 ${valueColor}`} />}
      </div>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </motion.div>
  );
}