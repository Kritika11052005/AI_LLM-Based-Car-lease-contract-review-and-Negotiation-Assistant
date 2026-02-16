/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle,
  DollarSign,
  Gauge,
  FileText,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

export default function CompareContractsPage() {
  const router = useRouter();
  const [contract1Id, setContract1Id] = useState<string>("");
  const [contract2Id, setContract2Id] = useState<string>("");

  // Fetch all user contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.CONTRACTS.LIST);
      return response.data;
    },
  });

  // Fetch selected contracts
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading contracts...</p>
        </div>
      </div>
    );
  }

  const availableContracts = contracts.filter((c: Contract) => c.docStatus === "extracted");

  return (
    <div className="space-y-6 pb-8">
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Compare Contracts
            </h1>
            <p className="text-muted-foreground mt-1">
              Side-by-side comparison of your lease contracts
            </p>
          </div>
        </div>
      </div>

      {/* No Contracts Message */}
      {availableContracts.length === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">No Contracts Available</h3>
              <p className="text-muted-foreground mt-2">
                You need at least 2 analyzed contracts to compare.
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/upload")}
              >
                Upload Contract
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Not Enough Contracts */}
      {availableContracts.length === 1 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-yellow-500/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Need More Contracts</h3>
              <p className="text-muted-foreground mt-2">
                You have 1 contract. Upload at least one more to compare.
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/upload")}
              >
                Upload Another Contract
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Contract Selectors */}
      {availableContracts.length >= 2 && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Contract 1</h3>
              <Select value={contract1Id} onValueChange={setContract1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first contract" />
                </SelectTrigger>
                <SelectContent>
                  {availableContracts.map((contract: Contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {getContractTitle(contract)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Contract 2</h3>
              <Select value={contract2Id} onValueChange={setContract2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second contract" />
                </SelectTrigger>
                <SelectContent>
                  {availableContracts
                    .filter((c: Contract) => c.id !== contract1Id)
                    .map((contract: Contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {getContractTitle(contract)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Card>
          </div>

          {/* Comparison Table */}
          {contract1 && contract2 && (
            <div className="space-y-6">
              {/* Fairness Score Comparison */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Contract Fairness
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2">
                      {contract1.fairnessScore || 0}%
                    </div>
                    <Badge
                      className={cn(
                        "text-white",
                        (contract1.fairnessScore || 0) >= 70 ? "bg-green-500" : "bg-yellow-500"
                      )}
                    >
                      {contract1.redFlagLevel || "Unknown"}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                      {contract2.fairnessScore || 0}%
                    </div>
                    <Badge
                      className={cn(
                        "text-white",
                        (contract2.fairnessScore || 0) >= 70 ? "bg-green-500" : "bg-yellow-500"
                      )}
                    >
                      {contract2.redFlagLevel || "Unknown"}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Financial Comparison */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Financial Terms
                </h3>
                <ComparisonTable
                  rows={[
                    {
                      label: "Monthly Payment",
                      val1: contract1.sla?.monthlyPayment,
                      val2: contract2.sla?.monthlyPayment,
                      format: (v: any) => formatCurrency(Number(v)),
                      lowerIsBetter: true,
                    },
                    {
                      label: "APR",
                      val1: contract1.sla?.aprPercent,
                      val2: contract2.sla?.aprPercent,
                      format: (v: any) => `${Number(v).toFixed(2)}%`,
                      lowerIsBetter: true,
                    },
                    {
                      label: "Down Payment",
                      val1: contract1.sla?.downPayment,
                      val2: contract2.sla?.downPayment,
                      format: (v: any) => formatCurrency(Number(v)),
                      lowerIsBetter: true,
                    },
                    {
                      label: "Term",
                      val1: contract1.sla?.termMonths,
                      val2: contract2.sla?.termMonths,
                      format: (v: any) => `${v} months`,
                      lowerIsBetter: false,
                    },
                  ]}
                />
              </Card>

              {/* Recommendation */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Recommendation
                </h3>
                <p className="text-muted-foreground">
                  {(contract1.fairnessScore || 0) > (contract2.fairnessScore || 0) ? (
                    <>
                      <strong className="text-foreground">Contract 1</strong> appears better with{" "}
                      {contract1.fairnessScore}% fairness vs {contract2.fairnessScore}%.
                    </>
                  ) : (contract2.fairnessScore || 0) > (contract1.fairnessScore || 0) ? (
                    <>
                      <strong className="text-foreground">Contract 2</strong> appears better with{" "}
                      {contract2.fairnessScore}% fairness vs {contract1.fairnessScore}%.
                    </>
                  ) : (
                    <>Both contracts have similar fairness scores.</>
                  )}
                </p>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {(!contract1 || !contract2) && (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Select Contracts to Compare</h3>
                  <p className="text-muted-foreground mt-2">
                    Choose two contracts from the dropdowns above
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Comparison Table Component
function ComparisonTable({
  rows,
}: {
  rows: Array<{
    label: string;
    val1: any;
    val2: any;
    format: (v: any) => string;
    lowerIsBetter: boolean;
  }>;
}) {
  const compareValue = (val1: any, val2: any, lowerIsBetter: boolean) => {
    if (!val1 || !val2) return "equal";
    const num1 = Number(val1);
    const num2 = Number(val2);
    if (lowerIsBetter) {
      return num1 < num2 ? "better1" : num1 > num2 ? "better2" : "equal";
    } else {
      return num1 > num2 ? "better1" : num1 < num2 ? "better2" : "equal";
    }
  };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const comparison = compareValue(row.val1, row.val2, row.lowerIsBetter);

        return (
          <div
            key={i}
            className="grid grid-cols-3 gap-4 py-3 border-b border-border/50 last:border-0"
          >
            <div className="font-medium text-sm">{row.label}</div>
            <div className="flex items-center gap-2">
              <span className={comparison === "better1" ? "font-semibold text-green-500" : ""}>
                {row.val1 ? row.format(row.val1) : "N/A"}
              </span>
              {comparison === "better1" && <TrendingUp className="w-4 h-4 text-green-500" />}
              {comparison === "better2" && <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
            <div className="flex items-center gap-2">
              <span className={comparison === "better2" ? "font-semibold text-green-500" : ""}>
                {row.val2 ? row.format(row.val2) : "N/A"}
              </span>
              {comparison === "better2" && <TrendingUp className="w-4 h-4 text-green-500" />}
              {comparison === "better1" && <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}