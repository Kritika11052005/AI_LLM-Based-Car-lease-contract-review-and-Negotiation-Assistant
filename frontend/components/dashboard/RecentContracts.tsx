/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";

interface RecentContractsProps {
  contracts: any[];
}

export function RecentContracts({ contracts }: RecentContractsProps) {
  const router = useRouter();

  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent contracts
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.slice(0, 5).map((contract) => (
        <div
          key={contract.id}
          className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {contract.vehicle
                ? `${contract.vehicle.year} ${contract.vehicle.make} ${contract.vehicle.model}`
                : "Contract"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(contract.createdAt)}
            </p>
          </div>

          {contract.fairnessScore !== null && (
            <Badge
              variant={
                contract.fairnessScore >= 80
                  ? "default"
                  : contract.fairnessScore >= 60
                  ? "secondary"
                  : "destructive"
              }
            >
              {Math.round(contract.fairnessScore)}%
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}