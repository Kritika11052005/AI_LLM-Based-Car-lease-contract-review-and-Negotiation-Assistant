/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import {
  NegotiationAnalysis,
  NegotiationScript,
  AskQuestionResponse,
  NegotiationThread,
} from "@/types";
import { toast } from "sonner";

export function useNegotiation(contractId: string) {
  const queryClient = useQueryClient();

  // Analyze contract
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<NegotiationAnalysis>(
        API_ENDPOINTS.NEGOTIATION.ANALYZE(contractId)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });
    },
    onError: (error: any) => {
      toast.error(error.detail || "Analysis failed");
    },
  });

  // Generate negotiation script
  const generateScriptMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<NegotiationScript>(
        API_ENDPOINTS.NEGOTIATION.SCRIPT(contractId)
      );
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.detail || "Script generation failed");
    },
  });

  // Ask question
  const askQuestionMutation = useMutation({
    mutationFn: async (data: { question: string; thread_id?: string }) => {
      const response = await api.post<AskQuestionResponse>(
        API_ENDPOINTS.NEGOTIATION.ASK(contractId),
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["thread", data.thread_id] });
    },
    onError: (error: any) => {
      toast.error(error.detail || "Question failed");
    },
  });

  return {
    analyzeMutation,
    generateScriptMutation,
    askQuestionMutation,
  };
}