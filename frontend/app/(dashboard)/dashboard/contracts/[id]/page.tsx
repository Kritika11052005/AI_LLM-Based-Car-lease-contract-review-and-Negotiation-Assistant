"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Contract } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const {
    data: contract,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const response = await api.get(
        API_ENDPOINTS.CONTRACTS.GET(contractId)
      );
      return response.data;
    },
  });

  if (isLoading) {
    return <ContractDetailSkeleton />;
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">📄 Contract Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This contract doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push("/dashboard/contracts")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Button>
        </Card>
      </div>
    );
  }

  const sla = contract.sla;
  const vehicle = contract.vehicle;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/contracts")}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold mb-2">Contract Analysis</h1>
            {vehicle && (vehicle.year || vehicle.make || vehicle.model) && (
              <p className="text-xl text-muted-foreground">
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.trim && ` ${vehicle.trim}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-sm">
              {contract.contractType || "Lease"}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {contract.docStatus || "Processing"}
            </Badge>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/negotiate/${contractId}`)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Start Negotiation
            </Button>
          </div>
        </div>

        {/* Fairness Score Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Fairness Analysis
          </h2>
          <FairnessScoreCard contractId={contractId} />
        </div>

        {/* Price Estimation Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Price & Market Analysis
          </h2>
          <PriceEstimation contractId={contractId} />
        </div>

        {/* Vehicle Info Card */}
        {vehicle ? (
          vehicle.make || vehicle.model || vehicle.year ? (
            // Has vehicle data - show full card with all available fields
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Vehicle Information</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {vehicle.make && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Make</p>
                    <p className="font-medium">{vehicle.make}</p>
                  </div>
                )}
                {vehicle.model && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Model</p>
                    <p className="font-medium">{vehicle.model}</p>
                  </div>
                )}
                {vehicle.year && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Year</p>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                )}
                {vehicle.trim && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Trim</p>
                    <p className="font-medium">{vehicle.trim}</p>
                  </div>
                )}
                {vehicle.vin && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">VIN</p>
                    <p className="font-medium font-mono text-sm">
                      {vehicle.vin}
                    </p>
                  </div>
                )}
                {vehicle.bodyClass && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Body Type
                    </p>
                    <p className="font-medium">{vehicle.bodyClass}</p>
                  </div>
                )}
                {vehicle.engine && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Engine</p>
                    <p className="font-medium">{vehicle.engine}</p>
                  </div>
                )}
                {vehicle.drivetrain && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Drivetrain
                    </p>
                    <p className="font-medium">{vehicle.drivetrain}</p>
                  </div>
                )}
                {vehicle.fuelType && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Fuel Type
                    </p>
                    <p className="font-medium">{vehicle.fuelType}</p>
                  </div>
                )}
                {vehicle.colorExt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Exterior Color
                    </p>
                    <p className="font-medium">{vehicle.colorExt}</p>
                  </div>
                )}
                {vehicle.colorInt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Interior Color
                    </p>
                    <p className="font-medium">{vehicle.colorInt}</p>
                  </div>
                )}
                {vehicle.odometerMiles && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Odometer
                    </p>
                    <p className="font-medium">
                      {vehicle.odometerMiles.toLocaleString()} miles
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            // Only VIN, no other data - show warning
            <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Car className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-xl font-semibold">Vehicle Information</h2>
              </div>

              {/* VIN Display */}
              {vehicle.vin && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">VIN</p>
                  <p className="font-medium font-mono text-sm">{vehicle.vin}</p>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                    VIN Not Found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This VIN may not exist in the database or vehicle data could
                    not be retrieved
                  </p>
                </div>
              </div>
            </Card>
          )
        ) : null}

        {/* Financial Terms */}
        {sla && (
          <>
            {/* Key Financial Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-muted-foreground">
                    Monthly Payment
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(sla.monthlyPayment) || 0)}
                </p>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-5 h-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">APR</p>
                </div>
                <p className="text-2xl font-bold">
                  {sla.aprPercent
                    ? `${Number(sla.aprPercent).toFixed(2)}%`
                    : "N/A"}
                </p>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Term</p>
                </div>
                <p className="text-2xl font-bold">
                  {sla.termMonths ? `${sla.termMonths} months` : "N/A"}
                </p>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <p className="text-sm text-muted-foreground">
                    Annual Mileage
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  {sla.mileageAllowanceYr
                    ? `${sla.mileageAllowanceYr.toLocaleString()} km`
                    : "N/A"}
                </p>
              </Card>
            </div>

            {/* Detailed Terms */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Payment Details */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Payment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Down Payment
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(sla.downPayment) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Monthly Payment
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(sla.monthlyPayment) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Residual Value
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(sla.residualValue) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Purchase Option
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(sla.purchaseOptionPrice) || 0)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Mileage & Fees */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-primary" />
                  Mileage & Fees
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Annual Mileage
                    </span>
                    <span className="font-medium">
                      {sla.mileageAllowanceYr
                        ? `${sla.mileageAllowanceYr.toLocaleString()} km`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Overage Fee
                    </span>
                    <span className="font-medium">
                      {sla.mileageOverageFee
                        ? `₹${Number(sla.mileageOverageFee).toFixed(2)}/km`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Early Termination
                    </span>
                    <span className="font-medium">
                      {sla.earlyTerminationFee
                        ? formatCurrency(Number(sla.earlyTerminationFee))
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Disposition Fee
                    </span>
                    <span className="font-medium">
                      {sla.dispositionFee
                        ? formatCurrency(Number(sla.dispositionFee))
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Additional Terms */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Additional Terms
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Maintenance Responsibility
                  </p>
                  <p className="font-medium">
                    {sla.maintenanceResp || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Warranty Coverage
                  </p>
                  <p className="font-medium">
                    {sla.warrantySummary || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Late Fee Policy
                  </p>
                  <p className="font-medium">
                    {sla.lateFeePolicy || "Not specified"}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* No SLA Data */}
        {!sla && (
          <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                  No Contract Terms Found
                </p>
                <p className="text-sm text-muted-foreground">
                  Contract terms haven&apos;t been extracted yet. Please wait for the
                  analysis to complete.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ContractDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-32 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}