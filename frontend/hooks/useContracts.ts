import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { Contract, UploadContractResponse, ExtractSLAResponse } from "@/types";
import { toast } from "sonner";

export function useContracts() {
  const queryClient = useQueryClient();

  // Fetch all contracts
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const response = await backendAPI.get<Contract[]>(API_ENDPOINTS.CONTRACTS.LIST);
      return response.data;
    },
  });

  return {
    contracts,
    isLoading,
  };
}

// Separate hook for getting a single contract
export function useContract(id: string) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const response = await backendAPI.get<Contract>(
        API_ENDPOINTS.CONTRACTS.GET(id)
      );
      return response.data;
    },
    enabled: !!id,
  });
}