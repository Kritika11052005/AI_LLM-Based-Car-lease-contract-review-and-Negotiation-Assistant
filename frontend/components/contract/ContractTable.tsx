"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Contract } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  FileText,
  Eye,
  MessageSquare,
  MoreVertical,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContractTableProps {
  contracts: Contract[];
}

type SortField = "createdAt" | "fairnessScore" | "vehicle";
type SortOrder = "asc" | "desc";

function SortIcon({ field, sortField, sortOrder }: { field: SortField; sortField: SortField; sortOrder: SortOrder }) {
  if (sortField !== field) return null;
  return sortOrder === "asc" ? (
    <ChevronUp className="w-4 h-4" />
  ) : (
    <ChevronDown className="w-4 h-4" />
  );
}

export function ContractTable({ contracts }: ContractTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedContracts = [...contracts].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "fairnessScore":
        comparison = (a.fairnessScore || 0) - (b.fairnessScore || 0);
        break;
      case "vehicle":
        const aVehicle = a.vehicle
          ? `${a.vehicle.make} ${a.vehicle.model}`.toLowerCase()
          : "";
        const bVehicle = b.vehicle
          ? `${b.vehicle.make} ${b.vehicle.model}`.toLowerCase()
          : "";
        comparison = aVehicle.localeCompare(bVehicle);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <Card>
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 font-semibold text-sm">
        <div
          className="col-span-4 flex items-center gap-2 cursor-pointer hover:text-primary"
          onClick={() => handleSort("vehicle")}
        >
          <span>Contract</span>
          <SortIcon field="vehicle" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div className="col-span-2">Status</div>
        <div
          className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-primary"
          onClick={() => handleSort("fairnessScore")}
        >
          <span>Fairness</span>
          <SortIcon field="fairnessScore" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div
          className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-primary"
          onClick={() => handleSort("createdAt")}
        >
          <span>Uploaded</span>
          <SortIcon field="createdAt" sortField={sortField} sortOrder={sortOrder} />
        </div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border">
        {sortedContracts.map((contract) => (
          <div
            key={contract.id}
            className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
          >
            {/* Contract Info */}
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {contract.vehicle
                    ? `${contract.vehicle.year} ${contract.vehicle.make} ${contract.vehicle.model}`
                    : "Untitled Contract"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {contract.contractType || "Lease"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="col-span-2 flex items-center">
              <StatusBadge status={contract.docStatus} />
            </div>

            {/* Fairness Score */}
            <div className="col-span-2 flex items-center">
              {contract.fairnessScore !== null && contract.fairnessScore !== undefined ? (
                <FairnessBadge score={contract.fairnessScore} />
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>

            {/* Upload Date */}
            <div className="col-span-2 flex items-center">
              <span className="text-sm text-muted-foreground">
                {formatDate(contract.createdAt)}
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/contracts/${contract.id}`);
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/negotiate/${contract.id}`);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Negotiate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => e.stopPropagation()}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const getStatusConfig = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case "extracted":
        return { label: "Analyzed", variant: "default" as const };
      case "uploaded":
        return { label: "Processing", variant: "secondary" as const };
      case "error":
        return { label: "Failed", variant: "destructive" as const };
      default:
        return { label: "Unknown", variant: "outline" as const };
    }
  };

  const config = getStatusConfig(status);

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function FairnessBadge({ score }: { score: number }) {
  const getScoreConfig = (score: number) => {
    if (score >= 80)
      return { label: `${Math.round(score)}%`, className: "bg-green-500 text-white" };
    if (score >= 60)
      return { label: `${Math.round(score)}%`, className: "bg-blue-500 text-white" };
    if (score >= 40)
      return { label: `${Math.round(score)}%`, className: "bg-yellow-500 text-white" };
    if (score >= 20)
      return { label: `${Math.round(score)}%`, className: "bg-orange-500 text-white" };
    return { label: `${Math.round(score)}%`, className: "bg-red-500 text-white" };
  };

  const config = getScoreConfig(score);

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${config.className}`}>
      {config.label}
    </div>
  );
}