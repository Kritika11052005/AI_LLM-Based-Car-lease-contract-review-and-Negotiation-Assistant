/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
  Gauge,
  Calendar,
  Car,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "@/components/Particles";

interface Contract {
  id: string;
  contractType: string;
  docStatus: string;
  vehicle?: {
    year: number;
    make: string;
    model: string;
    vin: string;
  };
  sla?: {
    aprPercent: any;
    termMonths: number;
    monthlyPayment: any;
    downPayment: any;
    residualValue: any;
    mileageAllowanceYr: number;
    mileageOverageFee: any;
    earlyTerminationFee: any;
    purchaseOptionPrice: any;
  };
  fairnessScore?: number;
  redFlagLevel?: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        {/* Track */}
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold text-white" style={{ textShadow: `0 0 20px ${color}` }}>
          {score.toFixed(0)}
        </div>
        <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">score</div>
      </div>
    </div>
  );
}

function getRatingColor(score: number) {
  if (score >= 75) return "#00D4A8";
  if (score >= 55) return "#F59E0B";
  if (score >= 35) return "#F97316";
  return "#EF4444";
}

function getRatingLabel(score: number) {
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Poor";
  return "Very Poor";
}

export default function CompareContractsPage() {
  const router = useRouter();
  const [contract1Id, setContract1Id] = useState<string>("");
  const [contract2Id, setContract2Id] = useState<string>("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.LIST);
      return response.data;
    },
  });

  const { data: contract1 } = useQuery({
    queryKey: ["contract", contract1Id],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.GET(contract1Id));
      return response.data;
    },
    enabled: !!contract1Id,
  });

  const { data: contract2 } = useQuery({
    queryKey: ["contract", contract2Id],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.GET(contract2Id));
      return response.data;
    },
    enabled: !!contract2Id,
  });

  const getContractTitle = (contract: Contract) => {
    if (contract.vehicle) {
      return `${contract.vehicle.year} ${contract.vehicle.make} ${contract.vehicle.model}`;
    }
    return `Contract ${contract.id.slice(0, 8)}`;
  };

  const availableContracts = contracts.filter((c: Contract) => c.docStatus === "extracted");

  const score1 = Number(contract1?.fairnessScore ?? 0);
  const score2 = Number(contract2?.fairnessScore ?? 0);
  const color1 = "#2563EB";
  const color2 = "#A855F7";

  const comparisonRows = [
    {
      label: "Monthly Payment",
      icon: <Gauge className="w-4 h-4" />,
      val1: contract1?.sla?.monthlyPayment,
      val2: contract2?.sla?.monthlyPayment,
      format: (v: any) => formatCurrency(Number(v)),
      lowerIsBetter: true,
    },
    {
      label: "APR",
      icon: <TrendingUp className="w-4 h-4" />,
      val1: contract1?.sla?.aprPercent,
      val2: contract2?.sla?.aprPercent,
      format: (v: any) => `${Number(v).toFixed(2)}%`,
      lowerIsBetter: true,
    },
    {
      label: "Down Payment",
      icon: <Shield className="w-4 h-4" />,
      val1: contract1?.sla?.downPayment,
      val2: contract2?.sla?.downPayment,
      format: (v: any) => formatCurrency(Number(v)),
      lowerIsBetter: true,
    },
    {
      label: "Lease Term",
      icon: <Calendar className="w-4 h-4" />,
      val1: contract1?.sla?.termMonths,
      val2: contract2?.sla?.termMonths,
      format: (v: any) => `${v} months`,
      lowerIsBetter: false,
    },
    {
      label: "Mileage / Year",
      icon: <Car className="w-4 h-4" />,
      val1: contract1?.sla?.mileageAllowanceYr,
      val2: contract2?.sla?.mileageAllowanceYr,
      format: (v: any) => `${Number(v).toLocaleString()} mi`,
      lowerIsBetter: false,
    },
    {
      label: "Early Exit Fee",
      icon: <Zap className="w-4 h-4" />,
      val1: contract1?.sla?.earlyTerminationFee,
      val2: contract2?.sla?.earlyTerminationFee,
      format: (v: any) => formatCurrency(Number(v)),
      lowerIsBetter: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] relative overflow-hidden">
      {/* ── Particles Background ─────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles
          particleColors={["#2563EB", "#A855F7", "#00D4A8"]}
          particleCount={140}
          particleSpread={9}
          speed={0.04}
          particleBaseSize={65}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      {/* ── Ambient glows ─────────────────────────────────────────── */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="relative z-10 px-6 py-8 max-w-6xl mx-auto pt-24">

        {/* ── Header ────────────────────────────────────────────── */}
        <motion.div
          className="flex items-center gap-5 mb-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => router.push("/dashboard/contracts")}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Contract Comparison
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              Side-by-side analysis of your lease agreements
            </p>
          </div>
        </motion.div>

        {/* ── Loading ───────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
              <p className="text-white/40 text-sm">Loading contracts…</p>
            </div>
          </div>
        )}

        {/* ── Empty / Not Enough Contracts ─────────────────────── */}
        {!isLoading && availableContracts.length < 2 && (
          <motion.div
            className="flex flex-col items-center justify-center py-32 gap-5"
            {...fadeInUp}
          >
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="w-9 h-9 text-white/30" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">
                {availableContracts.length === 0
                  ? "No Contracts Available"
                  : "Need One More Contract"}
              </p>
              <p className="text-white/40 text-sm mt-1">
                {availableContracts.length === 0
                  ? "You need at least 2 analyzed contracts to compare."
                  : "Upload one more contract to start comparing."}
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="bg-[#2563EB] hover:bg-[#1E40AF] text-white"
            >
              Upload Contract
            </Button>
          </motion.div>
        )}

        {/* ── Main UI ───────────────────────────────────────────── */}
        {!isLoading && availableContracts.length >= 2 && (
          <motion.div
            className="space-y-6"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {/* ── Contract Selectors ──────────────────────────── */}
            <motion.div
              className="grid md:grid-cols-2 gap-4"
              variants={fadeInUp}
            >
              {/* Contract 1 Selector */}
              <div className="relative group">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#2563EB]/40 to-[#2563EB]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-[#0F1829]/90 backdrop-blur-xl border border-white/8 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] shadow-[0_0_8px_#2563EB]" />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                      Contract A
                    </span>
                  </div>
                  <Select value={contract1Id} onValueChange={setContract1Id}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/8 focus:ring-[#2563EB]/30 rounded-xl h-11">
                      <SelectValue placeholder="Select a contract…" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F1829] border-white/10 text-white">
                      {availableContracts.map((contract: Contract) => (
                        <SelectItem
                          key={contract.id}
                          value={contract.id}
                          className="focus:bg-white/10 focus:text-white"
                        >
                          {getContractTitle(contract)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contract1 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-white/30 mt-2 font-mono"
                    >
                      ID: {contract1Id.slice(0, 16)}…
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Contract 2 Selector */}
              <div className="relative group">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#A855F7]/40 to-[#A855F7]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-[#0F1829]/90 backdrop-blur-xl border border-white/8 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#A855F7] shadow-[0_0_8px_#A855F7]" />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                      Contract B
                    </span>
                  </div>
                  <Select value={contract2Id} onValueChange={setContract2Id}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/8 focus:ring-[#A855F7]/30 rounded-xl h-11">
                      <SelectValue placeholder="Select a contract…" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F1829] border-white/10 text-white">
                      {availableContracts
                        .filter((c: Contract) => c.id !== contract1Id)
                        .map((contract: Contract) => (
                          <SelectItem
                            key={contract.id}
                            value={contract.id}
                            className="focus:bg-white/10 focus:text-white"
                          >
                            {getContractTitle(contract)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {contract2 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-white/30 mt-2 font-mono"
                    >
                      ID: {contract2Id.slice(0, 16)}…
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── Empty Comparison State ───────────────────────── */}
            <AnimatePresence>
              {(!contract1 || !contract2) && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col items-center justify-center py-20 gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-white/30 text-sm">
                    Select two contracts above to begin comparison
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Comparison Results ───────────────────────────── */}
            <AnimatePresence>
              {contract1 && contract2 && (
                <motion.div
                  className="space-y-5"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* ── Fairness Score Hero ─────────────────── */}
                  <div className="relative overflow-hidden bg-[#0F1829]/90 backdrop-blur-xl border border-white/8 rounded-2xl p-8">
                    {/* Subtle grid overlay */}
                    <div
                      className="absolute inset-0 opacity-[0.02]"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                      }}
                    />

                    <div className="relative flex items-center justify-between mb-6">
                      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                        Fairness Score
                      </h2>
                      <div className="h-px flex-1 mx-4 bg-white/6" />
                      <Shield className="w-4 h-4 text-white/20" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                      {/* Contract A Score */}
                      <div className="flex flex-col items-center gap-4">
                        <ScoreRing score={score1} color={color1} />
                        <div className="text-center">
                          <p className="text-white font-semibold text-sm">
                            {contract1.vehicle
                              ? `${contract1.vehicle.year} ${contract1.vehicle.make} ${contract1.vehicle.model}`
                              : "Contract A"}
                          </p>
                          <span
                            className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: `${getRatingColor(score1)}20`,
                              color: getRatingColor(score1),
                              border: `1px solid ${getRatingColor(score1)}40`,
                            }}
                          >
                            {getRatingLabel(score1)}
                          </span>
                        </div>
                      </div>

                      {/* VS divider */}
                      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center">
                        <span className="text-[10px] font-bold text-white/30 tracking-widest">VS</span>
                      </div>

                      {/* Contract B Score */}
                      <div className="flex flex-col items-center gap-4">
                        <ScoreRing score={score2} color={color2} />
                        <div className="text-center">
                          <p className="text-white font-semibold text-sm">
                            {contract2.vehicle
                              ? `${contract2.vehicle.year} ${contract2.vehicle.make} ${contract2.vehicle.model}`
                              : "Contract B"}
                          </p>
                          <span
                            className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: `${getRatingColor(score2)}20`,
                              color: getRatingColor(score2),
                              border: `1px solid ${getRatingColor(score2)}40`,
                            }}
                          >
                            {getRatingLabel(score2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Financial Terms Table ───────────────── */}
                  <div className="bg-[#0F1829]/90 backdrop-blur-xl border border-white/8 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/6 flex items-center gap-3">
                      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                        Financial Terms
                      </h2>
                      <div className="flex-1 h-px bg-white/6" />
                      {/* Legend */}
                      <div className="flex items-center gap-4 text-[11px] text-white/30">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> A
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#A855F7]" /> B
                        </span>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-white/5">
                      {comparisonRows.map((row, i) => {
                        const num1 = Number(row.val1);
                        const num2 = Number(row.val2);
                        const hasValues = row.val1 && row.val2;
                        let winner: "a" | "b" | "tie" = "tie";
                        if (hasValues && num1 !== num2) {
                          winner = row.lowerIsBetter
                            ? num1 < num2 ? "a" : "b"
                            : num1 > num2 ? "a" : "b";
                        }

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.4 }}
                            className="grid grid-cols-[1fr_1.2fr_1.2fr] items-center px-6 py-4 hover:bg-white/2 transition-colors group"
                          >
                            {/* Label */}
                            <div className="flex items-center gap-2.5">
                              <span className="text-white/25 group-hover:text-white/40 transition-colors">
                                {row.icon}
                              </span>
                              <span className="text-sm text-white/50 font-medium">
                                {row.label}
                              </span>
                            </div>

                            {/* Contract A value */}
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-semibold transition-colors",
                                  winner === "a" ? "text-[#2563EB]" : "text-white/60"
                                )}
                              >
                                {row.val1 ? row.format(row.val1) : "—"}
                              </span>
                              {winner === "a" && hasValues && (
                                <TrendingUp className="w-3.5 h-3.5 text-[#2563EB]" />
                              )}
                              {winner === "b" && hasValues && (
                                <TrendingDown className="w-3.5 h-3.5 text-red-400/60" />
                              )}
                            </div>

                            {/* Contract B value */}
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-semibold transition-colors",
                                  winner === "b" ? "text-[#A855F7]" : "text-white/60"
                                )}
                              >
                                {row.val2 ? row.format(row.val2) : "—"}
                              </span>
                              {winner === "b" && hasValues && (
                                <TrendingUp className="w-3.5 h-3.5 text-[#A855F7]" />
                              )}
                              {winner === "a" && hasValues && (
                                <TrendingDown className="w-3.5 h-3.5 text-red-400/60" />
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Recommendation ──────────────────────── */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    {/* Gradient border */}
                    <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-r from-[#2563EB]/30 via-[#A855F7]/30 to-[#00D4A8]/30">
                      <div className="absolute inset-0 rounded-2xl bg-[#0F1829]" />
                    </div>

                    <div className="relative px-6 py-5 flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-[#00D4A8]/10 border border-[#00D4A8]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-[#00D4A8]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">
                          Recommendation
                        </p>
                        <p className="text-sm text-white/70 leading-relaxed">
                          {score1 > score2 ? (
                            <>
                              <span className="text-[#2563EB] font-semibold">Contract A</span> scores higher
                              with a fairness rating of <span className="text-white font-semibold">{score1.toFixed(1)}</span> vs{" "}
                              <span className="text-white font-semibold">{score2.toFixed(1)}</span> — it offers
                              better overall terms based on market benchmarks.
                            </>
                          ) : score2 > score1 ? (
                            <>
                              <span className="text-[#A855F7] font-semibold">Contract B</span> scores higher
                              with a fairness rating of <span className="text-white font-semibold">{score2.toFixed(1)}</span> vs{" "}
                              <span className="text-white font-semibold">{score1.toFixed(1)}</span> — it offers
                              better overall terms based on market benchmarks.
                            </>
                          ) : (
                            <>Both contracts score equally. Review the individual terms above to decide which fits your needs better.</>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}