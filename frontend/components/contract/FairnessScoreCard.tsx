"use client";
// components/contract/FairnessScoreCard.tsx
// Calls POST /api/fairness/score/{id} — intent-driven scoring

import { useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Target,
} from "lucide-react";
import type { FairnessScoreResponse } from "@/types/contract";

interface Props {
  contractId: string;
}

// ── colour helpers ─────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80)
    return {
      text: "text-emerald-400",
      hex: "#34d399",
      glow: "rgba(52,211,153,0.20)",
      bg: "from-emerald-500/10 to-green-500/5",
      bar: "bg-emerald-400",
    };
  if (s >= 60)
    return {
      text: "text-amber-400",
      hex: "#fbbf24",
      glow: "rgba(251,191,36,0.20)",
      bg: "from-amber-500/10 to-yellow-500/5",
      bar: "bg-amber-400",
    };
  return {
    text: "text-red-400",
    hex: "#f87171",
    glow: "rgba(248,113,113,0.20)",
    bg: "from-red-500/10 to-rose-500/5",
    bar: "bg-red-400",
  };
}

// ── count-up animation ─────────────────────────────────────────────────────────
function CountUp({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", setDisplay);
    const ctrl = animate(mv, to, { duration, ease: "easeOut" });
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [to, duration, mv, rounded]);

  return <>{display}</>;
}

// ── SVG arc gauge ──────────────────────────────────────────────────────────────
function ArcGauge({ score }: { score: number }) {
  const CX = 100, CY = 100, R = 72, STROKE = 10;
  const circ = 2 * Math.PI * R;
  const arc = circ * 0.75; // 270° sweep
  const { hex, glow } = scoreColor(score);

  const emptyOffset = arc;
  const filledOffset = arc - (arc * score) / 100;

  return (
    <motion.svg
      width="200"
      height="168"
      viewBox="0 0 200 200"
      aria-label={`Score ${score}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <defs>
        <filter id="scoreGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="scoreGlowStrong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feColorMatrix in="blur" type="saturate" values="2" result="saturated" />
          <feMerge>
            <feMergeNode in="saturated" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* track */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={STROKE}
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
        transform={`rotate(135 ${CX} ${CY})`}
      />

      {/* outer glow halo — animates with fill */}
      <motion.circle
        cx={CX} cy={CY} r={R + 9}
        fill="none"
        stroke={glow}
        strokeWidth={3}
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
        transform={`rotate(135 ${CX} ${CY})`}
        filter="url(#scoreGlow)"
        initial={{ strokeDashoffset: emptyOffset + circ * 0.125 }}
        animate={{ strokeDashoffset: filledOffset + circ * 0.125 }}
        transition={{ duration: 1.8, ease: "easeOut", delay: 0.35 }}
      />

      {/* main fill arc */}
      <motion.circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke={hex}
        strokeWidth={STROKE}
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset={circ * 0.125}
        strokeLinecap="round"
        transform={`rotate(135 ${CX} ${CY})`}
        filter="url(#scoreGlowStrong)"
        initial={{ strokeDashoffset: emptyOffset + circ * 0.125 }}
        animate={{ strokeDashoffset: filledOffset + circ * 0.125 }}
        transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
      />

      {/* tip dot — appears when arc finishes drawing */}
      <motion.circle
        cx={CX} cy={CY - R} r={STROKE / 2 + 1}
        fill={hex}
        filter="url(#scoreGlowStrong)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 1.8 }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      />
    </motion.svg>
  );
}

// ── breakdown bar ──────────────────────────────────────────────────────────────
function BreakdownBar({
  label,
  pct,
  delay,
  color,
}: {
  label: string;
  pct: number;
  delay: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-200">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay }}
        />
      </div>
    </div>
  );
}

// ── priority badge ─────────────────────────────────────────────────────────────
function PriorityPill({ p }: { p: string }) {
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
    HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    LOW: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[p] ?? styles.LOW
        }`}
    >
      {p}
    </span>
  );
}

// ── main export ────────────────────────────────────────────────────────────────
export function FairnessScoreCard({ contractId }: Props) {
  const [isRecalc, setIsRecalc] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<FairnessScoreResponse>({
    queryKey: ["fairness-score", contractId],
    queryFn: async () => {
      const r = await backendAPI.post(`api/fairness/score/${contractId}`);
      return r.data;
    },
  });

  const handleRecalc = async () => {
    setIsRecalc(true);
    await refetch();
    setIsRecalc(false);
  };

  if (isLoading || isRecalc) {
    return (
      <Card className="p-6 border-white/8 bg-slate-900/60">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-full bg-white/5" />
          <Skeleton className="h-5 w-48 bg-white/5" />
        </div>
        <Skeleton className="h-48 w-full bg-white/5 rounded-xl" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3 text-amber-400">
          <Info className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            Fairness score unavailable — run contract extraction first.
          </p>
        </div>
      </Card>
    );
  }

  const score = data.final_score;
  const col = scoreColor(score);

  const breakdown = [
    { label: "Price vs Market", pct: data.price_score, color: "bg-violet-400", delay: 0.1 },
    { label: "APR Fairness", pct: data.apr_score, color: "bg-blue-400", delay: 0.2 },
    { label: "Fees", pct: data.fees_score, color: "bg-cyan-400", delay: 0.3 },
    { label: "Loan Term", pct: data.term_score, color: "bg-teal-400", delay: 0.4 },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <Card
        className={`relative overflow-hidden border-white/8 bg-gradient-to-br ${col.bg} backdrop-blur-sm`}
        style={{ boxShadow: `0 0 60px ${col.glow}` }}
      >
        {/* subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative p-6">
          {/* header row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Target className={`w-5 h-5 ${col.text}`} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm tracking-wide">
                  Fairness Analysis
                </h3>
                <p className="text-xs text-slate-500">Intent-driven scoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
                {data.rating}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                onClick={handleRecalc}
                disabled={isRecalc}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRecalc ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* gauge + bars */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative shrink-0 w-[200px] h-[168px]">
              <ArcGauge score={score} />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ paddingBottom: "20px" }}
              >
                <motion.span
                  className={`text-5xl font-black tracking-tight tabular-nums ${col.text}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5, ease: "backOut" }}
                  style={{ textShadow: `0 0 32px ${col.hex}55` }}
                >
                  <CountUp to={score} />
                </motion.span>
                <motion.span
                  className="text-[11px] text-slate-500 font-medium mt-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  / 100
                </motion.span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              {breakdown.map((b) => (
                <BreakdownBar key={b.label} {...b} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Red flags ────────────────────────────────────────────────────── */}
      {data.red_flags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-5 border-red-500/20 bg-red-500/5">
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" />
              Red Flags
              <span className="ml-1 text-xs bg-red-500/20 px-2 py-0.5 rounded-full">
                {data.red_flags.length}
              </span>
            </h4>
            <ul className="space-y-2">
              {data.red_flags.map((f, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-300 flex items-start gap-2 p-2.5 rounded-lg bg-red-500/8"
                >
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* ── Warnings ─────────────────────────────────────────────────────── */}
      {data.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="p-5 border-amber-500/20 bg-amber-500/5">
            <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" />
              Warnings
              <span className="ml-1 text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                {data.warnings.length}
              </span>
            </h4>
            <ul className="space-y-2">
              {data.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-300 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8"
                >
                  <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* ── Recommendations ──────────────────────────────────────────────── */}
      {/*data.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="p-5 border-blue-500/20 bg-blue-500/5">
            <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4" />
              Negotiation Recommendations
            </h4>
            <ul className="space-y-2">
              {data.recommendations.map((r, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-300 flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/8"
                >
                  <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )*/}

      {/* ── Negotiation Intents ───────────────────────────────────────────── */}
      {/*data.negotiation_intents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="p-5 border-white/8 bg-slate-900/40">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Negotiation Intents
            </h4>
            <div className="space-y-3">
              {data.negotiation_intents.map((intent, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.07 }}
                  className="p-3 rounded-xl bg-white/4 border border-white/6 hover:border-white/12 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200 capitalize">
                      {intent.field.replace(/_/g, " ")}
                    </span>
                    <PriorityPill p={intent.priority} />
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-1.5 flex-wrap">
                    <span className="text-slate-500">Now:</span>
                    <span className="text-red-400 font-medium">{intent.current_value}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-400 font-medium">{intent.target_value}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {intent.reasoning}
                  </p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )*/}
    </motion.div>
  );
}