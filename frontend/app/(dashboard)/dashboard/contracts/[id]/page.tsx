"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Contract } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const response = await api.get<Contract>(
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">📄</div>
        <h2 className="text-2xl font-bold">Contract Not Found</h2>
        <p className="text-muted-foreground">
          This contract doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button onClick={() => router.push("/dashboard/contracts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contracts
        </Button>
      </div>
    );
  }

  const sla = contract.sla;
  const vehicle = contract.vehicle;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/contracts")}
            className="mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Contract Analysis
            </h1>
            {vehicle && (vehicle.year || vehicle.make || vehicle.model) && (
              <p className="text-xl text-muted-foreground mt-1">
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.trim && ` ${vehicle.trim}`}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                {contract.contractType || "Lease"}
              </Badge>
              <Badge 
                variant={contract.docStatus === "extracted" ? "default" : "secondary"}
                className="text-xs"
              >
                {contract.docStatus || "Processing"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
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

      {/* Vehicle Info Card */}
      {vehicle ? (
        vehicle.make || vehicle.model || vehicle.year ? (
          // Has vehicle data - show full card with all available fields
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Vehicle Information</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {vehicle.make && (
                <div>
                  <p className="text-sm text-muted-foreground">Make</p>
                  <p className="font-medium">{vehicle.make}</p>
                </div>
              )}
              {vehicle.model && (
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{vehicle.model}</p>
                </div>
              )}
              {vehicle.year && (
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
              )}
              {vehicle.trim && (
                <div>
                  <p className="text-sm text-muted-foreground">Trim</p>
                  <p className="font-medium">{vehicle.trim}</p>
                </div>
              )}
              {vehicle.vin && (
                <div>
                  <p className="text-sm text-muted-foreground">VIN</p>
                  <p className="font-mono text-sm">{vehicle.vin}</p>
                </div>
              )}
              {vehicle.bodyClass && (
                <div>
                  <p className="text-sm text-muted-foreground">Body Type</p>
                  <p className="font-medium">{vehicle.bodyClass}</p>
                </div>
              )}
              {vehicle.engine && (
                <div>
                  <p className="text-sm text-muted-foreground">Engine</p>
                  <p className="font-medium">{vehicle.engine}</p>
                </div>
              )}
              {vehicle.drivetrain && (
                <div>
                  <p className="text-sm text-muted-foreground">Drivetrain</p>
                  <p className="font-medium">{vehicle.drivetrain}</p>
                </div>
              )}
              {vehicle.fuelType && (
                <div>
                  <p className="text-sm text-muted-foreground">Fuel Type</p>
                  <p className="font-medium">{vehicle.fuelType}</p>
                </div>
              )}
              {vehicle.colorExt && (
                <div>
                  <p className="text-sm text-muted-foreground">Exterior Color</p>
                  <p className="font-medium">{vehicle.colorExt}</p>
                </div>
              )}
              {vehicle.colorInt && (
                <div>
                  <p className="text-sm text-muted-foreground">Interior Color</p>
                  <p className="font-medium">{vehicle.colorInt}</p>
                </div>
              )}
              {vehicle.odometerMiles && (
                <div>
                  <p className="text-sm text-muted-foreground">Odometer</p>
                  <p className="font-medium">{vehicle.odometerMiles.toLocaleString()} miles</p>
                </div>
              )}
            </div>
          </Card>
        ) : (
          // Only VIN, no other data - show warning
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Vehicle Information</h2>
            </div>
            
            {/* VIN Display */}
            {vehicle.vin && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border mb-4">
                <p className="text-xs text-muted-foreground mb-1">VIN</p>
                <p className="font-mono text-sm font-medium">{vehicle.vin}</p>
              </div>
            )}

            {/* Warning */}
            <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center bg-yellow-500/5 rounded-lg border border-yellow-500/20">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-sm">VIN Not Found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This VIN may not exist in the database or vehicle data could not be retrieved
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
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(Number(sla.monthlyPayment) || 0)}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">APR</p>
              </div>
              <p className="text-2xl font-bold">
                {sla.aprPercent ? `${Number(sla.aprPercent).toFixed(2)}%` : "N/A"}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-sm text-muted-foreground">Term</p>
              </div>
              <p className="text-2xl font-bold">
                {sla.termMonths ? `${sla.termMonths} months` : "N/A"}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Gauge className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-sm text-muted-foreground">Annual Mileage</p>
              </div>
              <p className="text-2xl font-bold">
                {sla.mileageAllowanceYr ? `${sla.mileageAllowanceYr.toLocaleString()} km` : "N/A"}
              </p>
            </Card>
          </div>

          {/* Detailed Terms */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Payment Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Payment Details
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Down Payment</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(sla.downPayment) || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Monthly Payment</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(sla.monthlyPayment) || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Residual Value</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(sla.residualValue) || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Purchase Option</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(sla.purchaseOptionPrice) || 0)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Mileage & Fees */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                Mileage & Fees
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Annual Mileage</span>
                  <span className="font-semibold">
                    {sla.mileageAllowanceYr ? `${sla.mileageAllowanceYr.toLocaleString()} km` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Overage Fee</span>
                  <span className="font-semibold">
                    {sla.mileageOverageFee ? `₹${Number(sla.mileageOverageFee).toFixed(2)}/km` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Early Termination</span>
                  <span className="font-semibold">
                    {sla.earlyTerminationFee ? formatCurrency(Number(sla.earlyTerminationFee)) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Disposition Fee</span>
                  <span className="font-semibold">
                    {sla.dispositionFee ? formatCurrency(Number(sla.dispositionFee)) : "N/A"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Additional Terms */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Additional Terms
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">
                  Maintenance Responsibility
                </h4>
                <p className="text-sm">
                  {sla.maintenanceResp || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">
                  Warranty Coverage
                </h4>
                <p className="text-sm">
                  {sla.warrantySummary || "Not specified"}
                </p>
              </div>
              <div className="md:col-span-2">
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">
                  Late Fee Policy
                </h4>
                <p className="text-sm">
                  {sla.lateFeePolicy || "Not specified"}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* No SLA Data */}
      {!sla && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="p-4 bg-yellow-500/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold">No Contract Terms Found</h3>
            <p className="text-muted-foreground max-w-md">
              Contract terms haven&apos;t been extracted yet. Please wait for the analysis to complete.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ContractDetailSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <Skeleton className="h-32 w-full" />
      
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>

      <Skeleton className="h-48 w-full" />
    </div>
  );
}