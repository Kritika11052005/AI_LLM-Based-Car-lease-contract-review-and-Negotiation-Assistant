"use client";
// app/dashboard/contracts/[id]/page.tsx
import type { LucideIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { downloadContractReport } from "@/lib/downloadContractReport";
import { FairnessScoreCard } from "@/components/contract/FairnessScoreCard";
import { PriceEstimation } from "@/components/contract/PriceEstimation";
import {
  ArrowLeft,
  MessageSquare,
  Download,
  Share2,
  Car,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Contract } from "@/types/contract";

// ── animation variants ─────────────────────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: "easeOut", delay: i * 0.12 },
  }),
};

// ── metric card ────────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon, label, value, gradient, iconColor, index,
}: {
  icon: LucideIcon;   // ← was React.ElementType
  label: string;
  value: string;
  gradient: string;
  iconColor: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card
        className={`p-5 bg-gradient-to-br ${gradient} border-white/8 backdrop-blur-sm
          hover:shadow-[0_4px_32px_rgba(0,0,0,0.4)] hover:border-white/12 transition-all duration-200`}
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.div whileHover={{ y: -2, rotate: -4 }} transition={{ duration: 0.2 }}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </motion.div>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      </Card>
    </motion.div>
  );
}

// ── section wrapper ────────────────────────────────────────────────────────────
function Section({
  children, index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const { data: contract, isLoading, error } = useQuery<Contract>({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const r = await api.get(API_ENDPOINTS.CONTRACTS.GET(contractId));
      return r.data;
    },
  });

  // ── loading ────────────────────────────────────────────────────────────────
  if (isLoading) return <ContractDetailSkeleton />;

  // ── error ──────────────────────────────────────────────────────────────────
  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-white/8 bg-slate-900/80">
          <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-white">Contract Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">
            This contract doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push("/dashboard/contracts")} variant="outline" className="border-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Button>
        </Card>
      </div>
    );
  }

  const sla = contract.sla;
  const vehicle = contract.vehicle;
  const hasVehicleInfo = vehicle && (vehicle.year || vehicle.make || vehicle.model);
  const vinOnly = vehicle && !hasVehicleInfo && vehicle.vin;

  // dealer price for the price bar marker
  // NEW CODE with fallbacks:
  const dealer = sla?.dealerPrice != null ? Number(sla.dealerPrice) :
    sla?.capCost != null ? Number(sla.capCost) :
      sla?.msrp != null ? Number(sla.msrp) :
        // Fallback 1: Use residual value (good proxy for vehicle value in leases)
        sla?.residualValue != null ? Number(sla.residualValue) :
          // Fallback 2: Use purchase option price
          sla?.purchaseOptionPrice != null ? Number(sla.purchaseOptionPrice) :
            // Fallback 3: Rough estimate from total payments
            sla?.monthlyPayment != null && sla?.termMonths != null
              ? Number(sla.monthlyPayment) * sla.termMonths + (Number(sla.downPayment) || 0)
              : null;

  return (
    <>
      {/* ── Background ────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div style={{ background: "radial-gradient(circle at 20% 30%, #111827, #0B1220)" }}
          className="absolute inset-0" />
        {/* floating blobs */}
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)" }}
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,212,168,0.06) 0%, transparent 70%)" }}
          animate={{ x: [0, -15, 0], y: [0, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── Page ──────────────────────────────────────────────────────────── */}
      <motion.div
        className="min-h-screen p-4 md:p-8"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <Section index={0}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard/contracts")}
                  className="mb-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Contract Analysis
                </h1>
                {hasVehicleInfo && (
                  <p className="text-lg text-slate-400 mt-1">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                    {vehicle.trim && ` ${vehicle.trim}`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs">
                  {contract.contractType || "Lease"}
                </Badge>
                <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs">
                  {contract.docStatus || "Processing"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadContractReport(contract)}
                  className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />Download
                </Button>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="sm"
                    onClick={() => router.push(`/dashboard/negotiate/${contractId}`)}
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Start Negotiation
                  </Button>
                </motion.div>
              </div>
            </div>
          </Section>

          {/* ── Key Metrics (4 cards) ────────────────────────────────────── */}
          {sla && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                index={1} icon={DollarSign} iconColor="text-emerald-400"
                label="Monthly Payment" gradient="from-emerald-500/10 to-green-500/5"
                value={formatCurrency(Number(sla.monthlyPayment) || 0)}
              />
              <MetricCard
                index={2} icon={Gauge} iconColor="text-blue-400"
                label="APR" gradient="from-blue-500/10 to-cyan-500/5"
                value={sla.aprPercent ? `${Number(sla.aprPercent).toFixed(2)}%` : "N/A"}
              />
              <MetricCard
                index={3} icon={Calendar} iconColor="text-purple-400"
                label="Term" gradient="from-purple-500/10 to-pink-500/5"
                value={sla.termMonths ? `${sla.termMonths} months` : "N/A"}
              />
              <MetricCard
                index={4} icon={TrendingUp} iconColor="text-orange-400"
                label="Annual Mileage" gradient="from-orange-500/10 to-red-500/5"
                value={sla.mileageAllowanceYr
                  ? `${sla.mileageAllowanceYr.toLocaleString()} km`
                  : "N/A"}
              />
            </div>
          )}

          {/* ── Fairness Analysis ────────────────────────────────────────── */}
          <Section index={5}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <TrendingUp className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Fairness Analysis</h2>
            </div>
            <FairnessScoreCard contractId={contractId} />
          </Section>

          {/* ── Price & Market ───────────────────────────────────────────── */}
          <Section index={6}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Price & Market Analysis</h2>
            </div>
            <PriceEstimation contractId={contractId} dealerPrice={dealer} />
          </Section>

          {/* ── Vehicle Info ─────────────────────────────────────────────── */}
          {hasVehicleInfo ? (
            <Section index={7}>
              <Card className="p-6 border-white/8 bg-slate-900/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Car className="w-5 h-5 text-slate-300" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Vehicle Information</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  {[
                    { label: "Make", value: vehicle.make },
                    { label: "Model", value: vehicle.model },
                    { label: "Year", value: vehicle.year?.toString() },
                    { label: "Trim", value: vehicle.trim },
                    { label: "VIN", value: vehicle.vin, mono: true },
                    { label: "Body Type", value: vehicle.bodyClass },
                    { label: "Engine", value: vehicle.engine },
                    { label: "Drivetrain", value: vehicle.drivetrain },
                    { label: "Fuel Type", value: vehicle.fuelType },
                    { label: "Exterior Color", value: vehicle.colorExt },
                    { label: "Interior Color", value: vehicle.colorInt },
                    {
                      label: "Odometer", value: vehicle.odometerMiles
                        ? `${Number(vehicle.odometerMiles).toLocaleString()} miles`
                        : undefined
                    },
                  ]
                    .filter((f) => f.value)
                    .map((f, i) => (
                      <motion.div
                        key={f.label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 * i }}
                        className="group p-3 rounded-xl hover:bg-white/4 transition-colors"
                      >
                        <p className="text-xs text-slate-500 mb-1">{f.label}</p>
                        <p className={`text-sm font-semibold text-slate-200 ${f.mono ? "font-mono" : ""}`}>
                          {f.value}
                        </p>
                      </motion.div>
                    ))}
                </div>
              </Card>
            </Section>
          ) : vinOnly ? (
            <Section index={7}>
              <Card className="p-6 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Car className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Vehicle Information</h2>
                </div>
                {vehicle.vin && (
                  <div className="mb-4 p-3 rounded-xl bg-white/4">
                    <p className="text-xs text-slate-500 mb-1">VIN</p>
                    <p className="text-sm font-mono text-slate-200">{vehicle.vin}</p>
                  </div>
                )}
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-400 mb-1">VIN Not Decoded</p>
                    <p className="text-xs text-slate-400">
                      Vehicle data couldn&apos;t be retrieved. Run the market enrichment endpoint
                      to decode this VIN via MarketCheck.
                    </p>
                  </div>
                </div>
              </Card>
            </Section>
          ) : null}

          {/* ── Financial Terms ──────────────────────────────────────────── */}
          {sla && (
            <>
              <Section index={8}>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Payment Details */}
                  <Card className="p-6 border-white/8 bg-slate-900/40">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      Payment Details
                    </h3>
                    <div className="space-y-0">
                      {[
                        { label: "MSRP", value: sla.msrp ? formatCurrency(Number(sla.msrp)) : "N/A" },
                        { label: "Cap Cost", value: sla.capCost ? formatCurrency(Number(sla.capCost)) : "N/A" },
                        { label: "Cap Cost Reduction", value: sla.capCostReduction ? formatCurrency(Number(sla.capCostReduction)) : "N/A" },
                        { label: "Down Payment", value: sla.downPayment ? formatCurrency(Number(sla.downPayment)) : "N/A" },
                        { label: "Monthly Payment", value: sla.monthlyPayment ? formatCurrency(Number(sla.monthlyPayment)) : "N/A" },
                        { label: "Fees Total", value: sla.feesTotal ? formatCurrency(Number(sla.feesTotal)) : "N/A" },
                        { label: "Residual Value", value: sla.residualValue ? formatCurrency(Number(sla.residualValue)) : "N/A" },
                        { label: "Residual % of MSRP", value: sla.residualPercentMsrp ? `${Number(sla.residualPercentMsrp).toFixed(1)}%` : "N/A" },
                        { label: "Purchase Option", value: sla.purchaseOptionPrice ? formatCurrency(Number(sla.purchaseOptionPrice)) : "N/A" },
                        { label: "APR", value: sla.aprPercent ? `${Number(sla.aprPercent).toFixed(2)}%` : "N/A" },
                        { label: "Money Factor", value: sla.moneyFactor ? Number(sla.moneyFactor).toFixed(5) : "N/A" },
                        { label: "Term", value: sla.termMonths ? `${sla.termMonths} months` : "N/A" },
                      ].map((row, i) => (
                        <div key={i}
                          className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors px-1 rounded">
                          <span className="text-xs text-slate-500">{row.label}</span>
                          <span className={`text-sm font-semibold ${row.value === "N/A" ? "text-slate-600" : "text-slate-200"}`}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Mileage & Fees */}
                  <Card className="p-6 border-white/8 bg-slate-900/40">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
                      <Gauge className="w-4 h-4 text-blue-400" />
                      Mileage & Fees
                    </h3>
                    <div className="space-y-0">
                      {[
                        { label: "Annual Mileage", value: sla.mileageAllowanceYr ? `${sla.mileageAllowanceYr.toLocaleString()} km` : "N/A" },
                        { label: "Overage Fee", value: sla.mileageOverageFee ? `₹${Number(sla.mileageOverageFee).toFixed(2)}/km` : "N/A" },
                        { label: "Early Termination", value: sla.earlyTerminationFee ? formatCurrency(Number(sla.earlyTerminationFee)) : "N/A" },
                        { label: "Disposition Fee", value: sla.dispositionFee ? formatCurrency(Number(sla.dispositionFee)) : "N/A" },
                      ].map((row, i) => (
                        <div key={i}
                          className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors px-1 rounded">
                          <span className="text-xs text-slate-500">{row.label}</span>
                          <span className={`text-sm font-semibold ${row.value === "N/A" ? "text-slate-600" : "text-slate-200"}`}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Additional Terms inline */}
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mt-6 mb-4">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Obligations & Coverage
                    </h3>
                    <div className="space-y-0">
                      {[
                        { label: "Insurance", value: sla.insuranceRequirements ?? "N/A" },
                        { label: "Maintenance", value: sla.maintenanceResp ?? "N/A" },
                        { label: "Warranty", value: sla.warrantySummary ?? "N/A" },
                        { label: "Late Fee", value: sla.lateFeePolicy ?? "N/A" },
                      ].map((row, i) => (
                        <div key={i}
                          className="flex justify-between items-start gap-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors px-1 rounded">
                          <span className="text-xs text-slate-500 shrink-0">{row.label}</span>
                          <span className={`text-xs text-right font-medium ${row.value === "N/A" ? "text-slate-600" : "text-slate-300"}`}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </Section>
            </>
          )}

          {/* ── No SLA ──────────────────────────────────────────────────── */}
          {!sla && (
            <Section index={8}>
              <Card className="p-6 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-400 mb-1">
                      No Contract Terms Found
                    </p>
                    <p className="text-xs text-slate-400">
                      Contract terms haven&apos;t been extracted yet. Please wait for analysis to complete.
                    </p>
                  </div>
                </div>
              </Card>
            </Section>
          )}

        </div>
      </motion.div>
    </>
  );
}

// ── skeleton ───────────────────────────────────────────────────────────────────
function ContractDetailSkeleton() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 bg-white/5 rounded-2xl" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full bg-white/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}