"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Contract } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractTable } from "@/components/contract/ContractTable";
import { Card } from "@/components/ui/card";
import { Upload, Search, Filter, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContractsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all contracts
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const response = await api.get<Contract[]>(API_ENDPOINTS.CONTRACTS.LIST);
      return response.data;
    },
  });

  // Filter contracts based on search
  const filteredContracts = contracts?.filter((contract) => {
    const searchLower = searchQuery.toLowerCase();
    const vehicleName = contract.vehicle
      ? `${contract.vehicle.year} ${contract.vehicle.make} ${contract.vehicle.model}`.toLowerCase()
      : "";
    const contractType = contract.contractType?.toLowerCase() || "";
    const status = contract.docStatus?.toLowerCase() || "";

    return (
      vehicleName.includes(searchLower) ||
      contractType.includes(searchLower) ||
      status.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            My Contracts
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your uploaded lease contracts
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/upload")}>
          <Upload className="w-4 h-4 mr-2" />
          Upload New Contract
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by vehicle, type, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Contracts Table */}
      {isLoading ? (
        <ContractsTableSkeleton />
      ) : filteredContracts && filteredContracts.length > 0 ? (
        <ContractTable contracts={filteredContracts} />
      ) : (
        <EmptyState hasContracts={!!(contracts && contracts.length > 0)} />
      )}
    </div>
  );
}

function ContractsTableSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyState({ hasContracts }: { hasContracts: boolean }) {
  const router = useRouter();

  return (
    <Card className="p-12">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">
          {hasContracts ? "No contracts found" : "No contracts yet"}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {hasContracts
            ? "Try adjusting your search query or filters"
            : "Upload your first car lease contract to get started with AI-powered analysis"}
        </p>
        {!hasContracts && (
          <Button onClick={() => router.push("/dashboard/upload")} className="mt-4">
            <Upload className="w-4 h-4 mr-2" />
            Upload Contract
          </Button>
        )}
      </div>
    </Card>
  );
}