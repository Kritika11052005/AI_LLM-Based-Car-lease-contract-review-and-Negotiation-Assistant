/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { uploadFile } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ToneSelector } from "@/components/chat/ToneSelector";
import { EmailGenerator } from "@/components/chat/EmailGenerator";
import { FairnessGauge } from "@/components/dashboard/FairnessGauge";
import { SLADisplay } from "@/components/contract/SLADsiplay";
import {
  Upload,
  FileText,
  Loader2,
  Sparkles,
  X,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { UPLOAD_CONFIG } from "@/lib/constants";

type Step = "upload" | "processing" | "chat";

export default function NegotiatePage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contractId, setContractId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [tone, setTone] = useState<"professional" | "friendly" | "assertive">(
    "professional"
  );
  const [processingStage, setProcessingStage] = useState<string>("");

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setProcessingStage("Uploading contract...");
      const response = await uploadFile(
        API_ENDPOINTS.CONTRACTS.UPLOAD,
        file,
        setUploadProgress
      );
      return response;
    },
    onSuccess: (data) => {
      setContractId(data.contract_id);
      extractSLAMutation.mutate(data.contract_id);
    },
    onError: (error: any) => {
      toast.error(error.detail || "Upload failed");
      setStep("upload");
      setSelectedFile(null);
    },
  });

  // Extract SLA mutation
  const extractSLAMutation = useMutation({
    mutationFn: async (contractId: string) => {
      setProcessingStage("Extracting lease terms with AI...");
      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(contractId)
      );
      return response.data;
    },
    onSuccess: (data) => {
      setContractData(data);
      analyzeMutation.mutate(data.contract_id);
    },
    onError: (error: any) => {
      toast.error(error.detail || "SLA extraction failed");
      setStep("upload");
    },
  });

  // Analyze contract mutation
  const analyzeMutation = useMutation({
    mutationFn: async (contractId: string) => {
      setProcessingStage("Analyzing contract fairness...");
      const response = await api.post(
        API_ENDPOINTS.NEGOTIATION.ANALYZE(contractId)
      );
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysisData(data);
      generateScriptMutation.mutate(data.contract_id);
    },
    onError: (error: any) => {
      toast.error(error.detail || "Analysis failed");
      // Continue to chat even if analysis fails
      setStep("chat");
    },
  });

  // Generate script mutation
  const generateScriptMutation = useMutation({
    mutationFn: async (contractId: string) => {
      setProcessingStage("Generating negotiation strategy...");
      const response = await api.post(
        API_ENDPOINTS.NEGOTIATION.SCRIPT(contractId)
      );
      return response.data;
    },
    onSuccess: (data) => {
      setThreadId(data.thread_id);
      toast.success("Contract processed! Ready to negotiate.");
      setStep("chat");
    },
    onError: (error: any) => {
      toast.error(error.detail || "Script generation failed");
      setStep("chat");
    },
  });

  // Ask question mutation
  const askQuestionMutation = useMutation({
    mutationFn: async (data: { question: string; thread_id?: string }) => {
      const response = await api.post(
        API_ENDPOINTS.NEGOTIATION.ASK(contractId!),
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (!threadId) {
        setThreadId(data.thread_id);
      }
    },
    onError: (error: any) => {
      toast.error(error.detail || "Question failed");
    },
  });

  // Dropzone
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: UPLOAD_CONFIG.ACCEPTED_TYPES,
    multiple: false,
    disabled: step !== "upload",
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    setStep("processing");
    uploadMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setStep("upload");
    setSelectedFile(null);
    setUploadProgress(0);
    setContractId(null);
    setThreadId(null);
    setContractData(null);
    setAnalysisData(null);
    setProcessingStage("");
  };

  // Render based on step
  if (step === "upload") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Negotiation Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload your contract to get personalized negotiation strategies
          </p>
        </div>

        <Card className="p-8">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`
                relative cursor-pointer bg-muted/30 p-12 rounded-[40px] 
                border-2 border-dashed transition-all duration-300
                ${
                  isDragActive
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <svg
                  className="w-16 h-16 fill-muted-foreground"
                  viewBox="0 0 640 512"
                >
                  <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z" />
                </svg>

                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragActive ? "Drop it here!" : "Drag and Drop"}
                  </p>
                  <p className="text-muted-foreground">or</p>
                  <span className="inline-block px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity">
                    Browse file
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  Supported: PDF, PNG, JPG (Max 10MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-destructive" />
                </button>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleUpload} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Negotiation Analysis
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Upload Contract</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your lease/loan contract
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Get fairness scores and red flags
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Negotiate</h3>
                <p className="text-sm text-muted-foreground">
                  Chat with AI for negotiation tips
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12">
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Processing Your Contract</h2>
              <p className="text-muted-foreground">{processingStage}</p>
            </div>

            <Progress value={uploadProgress} className="h-2" />

            <div className="space-y-3 text-left">
              <ProcessingStep
                label="Upload Contract"
                isComplete={!!contractId}
                isActive={uploadMutation.isPending}
              />
              <ProcessingStep
                label="Extract Lease Terms"
                isComplete={!!contractData}
                isActive={extractSLAMutation.isPending}
              />
              <ProcessingStep
                label="Analyze Fairness"
                isComplete={!!analysisData}
                isActive={analyzeMutation.isPending}
              />
              <ProcessingStep
                label="Generate Strategy"
                isComplete={!!threadId}
                isActive={generateScriptMutation.isPending}
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Chat step
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Negotiation Assistant</h1>
          <p className="text-muted-foreground mt-1">
            {contractData?.vehicle_data
              ? `${contractData.vehicle_data.year} ${contractData.vehicle_data.make} ${contractData.vehicle_data.model}`
              : "Your Contract"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ToneSelector value={tone} onChange={setTone} />
          <Button variant="outline" onClick={handleReset}>
            <Upload className="w-4 h-4 mr-2" />
            New Contract
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2 space-y-6">
          <ChatInterface
            contractId={contractId!}
            threadId={threadId}
            setThreadId={setThreadId}
            tone={tone}
            askQuestionMutation={askQuestionMutation}
          />

          {/* SLA Display */}
          {contractData?.sla_data && (
            <SLADisplay
              sla={contractData.database_saved}
              contractId={contractId!}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Fairness Score */}
          {analysisData?.fairness_score !== undefined && (
            <Card className="p-6">
              <FairnessGauge
                score={analysisData.fairness_score}
                rating={analysisData.rating}
              />
            </Card>
          )}

          {/* Email Generator */}
          {threadId && (
            <EmailGenerator contractId={contractId!} threadId={threadId} />
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessingStep({
  label,
  isComplete,
  isActive,
}: {
  label: string;
  isComplete: boolean;
  isActive: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      {isComplete ? (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : isActive ? (
        <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-muted flex-shrink-0" />
      )}
      <span
        className={`text-sm font-medium ${
          isComplete || isActive ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
