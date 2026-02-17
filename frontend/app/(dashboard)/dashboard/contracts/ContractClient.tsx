"use client";
// app/(dashboard)/dashboard/contracts/ContractsClient.tsx
// Receives server-fetched contracts (with fileName already resolved via Prisma SSR)

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LucideIcon } from "lucide-react";
import {
  Upload, Search, FileText, Car, ArrowRight,
  ShieldCheck, ShieldAlert, TrendingUp,
  Calendar, Clock,
} from "lucide-react";

// ── types ──────────────────────────────────────────────────────────────────────
export interface SerialisedContract {
  id:            string;
  contractType:  string | null;
  docStatus:     string | null;
  fairnessScore: number | null;
  redFlagLevel:  string | null;
  createdAt:     string;
  vehicle: {
    vin:   string | null;
    year:  number | null;
    make:  string | null;
    model: string | null;
    trim:  string | null;
  } | null;
  fileName: string | null;   // ← from contract_files via SSR join
}

// ── helpers ────────────────────────────────────────────────────────────────────
function scoreColor(s: number | null) {
  if (s === null) return { text: "text-slate-400", bg: "bg-slate-500/10",  border: "border-slate-500/20", bar: "bg-slate-400",  hex: "#94a3b8" };
  if (s >= 80)   return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", bar: "bg-emerald-400", hex: "#34d399" };
  if (s >= 60)   return { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   bar: "bg-amber-400",   hex: "#fbbf24" };
  return           { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    bar: "bg-red-400",    hex: "#f87171" };
}

function scoreLabel(s: number | null) {
  if (s === null) return "Pending";
  if (s >= 80)   return "Excellent";
  if (s >= 60)   return "Fair";
  return "Poor";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** Priority: vehicle info → clean file name → VIN → ID snippet */
function getDisplayName(c: SerialisedContract): string {
  const v = c.vehicle;
  if (v?.year && v?.make && v?.model) {
    return `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}`;
  }
  if (c.fileName) {
    // Strip extension, replace separators with spaces, title-case
    return c.fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  if (v?.vin) return `VIN: ${v.vin}`;
  return `Contract #${c.id.slice(0, 8).toUpperCase()}`;
}

function getSubtitle(c: SerialisedContract): string | null {
  if (c.vehicle?.vin) return `VIN: ${c.vehicle.vin}`;
  if (c.fileName)     return c.fileName;   // show raw name as subtitle when used as title
  return null;
}

// ── count-up ───────────────────────────────────────────────────────────────────
function CountUp({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / 1000 / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * to));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{val}</>;
}

// ── score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, index }: { score: number | null; index: number }) {
  const col = scoreColor(score);
  const pct = score ?? 0;
  const R = 18, SW = 3.5, circ = 2 * Math.PI * R;
  const offset = circ - (circ * pct) / 100;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-11 h-11 shrink-0">
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
          <motion.circle
            cx="22" cy="22" r={R}
            fill="none" stroke={col.hex} strokeWidth={SW}
            strokeDasharray={circ} strokeLinecap="round"
            transform="rotate(-90 22 22)"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.0, ease: "easeOut", delay: 0.15 + index * 0.06 }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${col.text}`}>
          {score !== null ? score : "—"}
        </div>
      </div>
      <div>
        <p className={`text-xs font-semibold ${col.text}`}>{scoreLabel(score)}</p>
        <p className="text-[10px] text-slate-500">Fairness</p>
      </div>
    </div>
  );
}

// ── contract card ──────────────────────────────────────────────────────────────
function ContractCard({ c, index }: { c: SerialisedContract; index: number }) {
  const router  = useRouter();
  const col     = scoreColor(c.fairnessScore);
  const name    = getDisplayName(c);
  const sub     = getSubtitle(c);
  const analyzed = c.docStatus?.toLowerCase() === "analyzed" || c.fairnessScore != null;

  // Don't show subtitle if it would duplicate the title
  const showSub = sub && sub !== name && !name.startsWith("VIN:");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.38, delay: index * 0.055, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={() => router.push(`/dashboard/contracts/${c.id}`)}
      className="group cursor-pointer"
    >
      <div className="
        relative rounded-2xl border bg-[#0f1623]/90 backdrop-blur-sm
        border-white/[0.06] hover:border-white/[0.13]
        shadow-[0_2px_16px_rgba(0,0,0,0.35)]
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        transition-all duration-300 overflow-hidden
      ">
        {/* coloured top accent */}
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${col.bar} opacity-50`} />

        <div className="p-5">
          <div className="flex items-center gap-4">

            {/* icon */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${col.bg} border ${col.border}`}>
              <Car className={`w-5 h-5 ${col.text}`} />
            </div>

            {/* title + meta */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[15px] text-white truncate leading-snug">{name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-slate-500 capitalize">{c.contractType ?? "Lease"}</span>
                <span className="text-slate-700">·</span>
                {analyzed ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                    <ShieldCheck className="w-3 h-3" />Analyzed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-500">
                    <Clock className="w-3 h-3" />Processing
                  </span>
                )}
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Calendar className="w-3 h-3" />{formatDate(c.createdAt)}
                </span>
              </div>
              {showSub && (
                <p className="text-[11px] text-slate-600 mt-0.5 truncate">{sub}</p>
              )}
            </div>

            {/* score ring — hidden on xs */}
            <div className="hidden sm:flex shrink-0">
              <ScoreRing score={c.fairnessScore} index={index} />
            </div>

            {/* arrow */}
            <div className="shrink-0 ml-1 flex items-center gap-1.5 text-[12px] font-medium text-slate-500 group-hover:text-white transition-colors">
              <span className="hidden md:inline">View</span>
              <motion.div className="group-hover:translate-x-1 transition-transform duration-200">
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </div>
          </div>

          {/* mobile score bar */}
          <div className="sm:hidden mt-3 pt-3 border-t border-white/[0.05]">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">Fairness Score</span>
              <span className={`font-semibold ${col.text}`}>
                {c.fairnessScore != null ? `${c.fairnessScore}%` : "—"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${col.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${c.fairnessScore ?? 0}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 + index * 0.05 }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── metric card ────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, accent, index }: {
  icon: LucideIcon; label: string; value: number;
  sub: string; accent: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.09 }}
      className="rounded-2xl border border-white/[0.07] bg-[#0f1623]/80 backdrop-blur-sm p-5 flex items-center gap-4"
    >
      <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight leading-none">
          <CountUp to={value} />
        </p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
        <p className="text-[10px] text-slate-600">{sub}</p>
      </div>
    </motion.div>
  );
}

// ── filter pills ───────────────────────────────────────────────────────────────
const FILTERS = ["All", "Analyzed", "Processing", "High Risk"] as const;
type FilterType = typeof FILTERS[number];

// ── main client component ──────────────────────────────────────────────────────
export function ContractsClient({ contracts }: { contracts: SerialisedContract[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");

  // metrics
  const scores   = contracts.map(c => c.fairnessScore).filter((s): s is number => s !== null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highRisk = contracts.filter(c => c.fairnessScore !== null && c.fairnessScore < 60).length;

  // filtered list
  const filtered = contracts.filter(c => {
    const q   = search.toLowerCase();
    const match = !q
      || getDisplayName(c).toLowerCase().includes(q)
      || (c.fileName ?? "").toLowerCase().includes(q)
      || (c.contractType ?? "").toLowerCase().includes(q)
      || (c.docStatus ?? "").toLowerCase().includes(q)
      || (c.vehicle?.vin ?? "").toLowerCase().includes(q);

    const analyzed = c.docStatus?.toLowerCase() === "analyzed" || c.fairnessScore != null;
    const byFilter =
      filter === "All"        ? true
      : filter === "Analyzed"   ? analyzed
      : filter === "Processing" ? !analyzed
      : filter === "High Risk"  ? (c.fairnessScore !== null && c.fairnessScore < 60)
      : true;

    return match && byFilter;
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(circle at 20% 30%, #111827, #0B1220)" }}
    >
      {/* blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <motion.div className="absolute top-[-15%] left-[-8%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)" }}
          animate={{ x: [0, 25, 0], y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-[5%] right-[-5%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,212,168,0.04) 0%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-7">

        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Your Contracts</h1>
            <p className="text-slate-400 text-sm mt-1">Manage, analyze, and optimize your lease agreements.</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] h-10 px-5"
            >
              <Upload className="w-4 h-4 mr-2" />Upload Contract
            </Button>
          </motion.div>
        </motion.div>

        {/* metrics */}
        {contracts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard index={0} icon={FileText}    label="Total Contracts"    value={contracts.length} sub="All uploads"           accent="bg-blue-600" />
            <MetricCard index={1} icon={TrendingUp}  label="Avg Fairness Score" value={avgScore}          sub="Portfolio average"     accent="bg-violet-600" />
            <MetricCard index={2} icon={ShieldAlert} label="High Risk"          value={highRisk}           sub="Score below 60"        accent="bg-red-600" />
          </div>
        )}

        {/* search + filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.18 }}
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by name, file, VIN, or status…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-11 rounded-full bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/40 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-200
                  ${filter === f
                    ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.35)]"
                    : "bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white hover:border-white/[0.14]"
                  }`}
              >
                {f}
                {f === "High Risk" && highRisk > 0 && (
                  <span className="ml-1.5 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">
                    {highRisk}
                  </span>
                )}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-600">
              {filtered.length} contract{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </motion.div>

        {/* cards */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <AnimatePresence>
                {filtered.map((c, i) => <ContractCard key={c.id} c={c} index={i} />)}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-6">
                {search || filter !== "All"
                  ? <Search className="w-9 h-9 text-slate-600" />
                  : <Car className="w-9 h-9 text-slate-600" />
                }
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {search || filter !== "All" ? "No contracts match" : "No contracts yet"}
              </h3>
              <p className="text-slate-500 text-sm max-w-xs mb-6">
                {search || filter !== "All"
                  ? "Try changing your search or clearing the filter"
                  : "Upload your first car lease contract to start AI-powered analysis"
                }
              </p>
              {!search && filter === "All" ? (
                <Button onClick={() => router.push("/dashboard/upload")}
                  className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-6">
                  <Upload className="w-4 h-4 mr-2" />Upload Contract
                </Button>
              ) : (
                <button onClick={() => { setSearch(""); setFilter("All"); }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}