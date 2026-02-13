"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Contract } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FairnessGauge } from "@/components/dashboard/FairnessGauge";
import { SLADisplay } from "@/components/contract/SLADsiplay";
import { RiskIndicators } from "@/components/contract/RiskIndicator";
import { VehicleInfo } from "@/components/contract/VehicleInfo";
import {
  ArrowLeft,
  MessageSquare,
  Download,
  Share2,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  // Fetch contract with SLA data
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

  const fairnessScore = contract.fairnessScore || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/contracts")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Contract Analysis</h1>
            <p className="text-muted-foreground mt-1">
              {contract.vehicle
                ? `${contract.vehicle.year} ${contract.vehicle.make} ${contract.vehicle.model}`
                : "Contract Details"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            size="sm"
            onClick={() =>
              router.push(`/dashboard/negotiate/${contractId}`)
            }
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Start Negotiation
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Fairness & Vehicle */}
        <div className="space-y-6">
          {/* Fairness Gauge */}
          <Card className="p-6">
            <FairnessGauge score={fairnessScore} rating={contract.redFlagLevel} />
          </Card>

          {/* Vehicle Info */}
          {contract.vehicle && (
            <Card className="p-6">
              <VehicleInfo vehicle={contract.vehicle} />
            </Card>
          )}

          {/* Risk Indicators */}
          <Card className="p-6">
            <RiskIndicators
              redFlagLevel={contract.redFlagLevel}
              negotiationIntents={contract.negotiationIntents}
            />
          </Card>
        </div>

        {/* Right Column - SLA Details */}
        <div className="lg:col-span-2">
          <SLADisplay sla={contract.sla} contractId={contractId} />
        </div>
      </div>
    </div>
  );
}

function ContractDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    </div>
  );
}