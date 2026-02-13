/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/api";
import { API_ENDPOINTS, UPLOAD_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";

export default function UploadContractPage() {
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await uploadFile(
        API_ENDPOINTS.CONTRACTS.UPLOAD,
        file,
        setUploadProgress
      );
      return response;
    },
    onSuccess: (data) => {
      toast.success("Contract uploaded successfully!");
      setIsExtracting(true);

      // Auto-start SLA extraction
      extractSLAMutation.mutate(data.contract_id);
    },
    onError: (error: any) => {
      toast.error(error.detail || "Upload failed");
      setSelectedFile(null);
      setUploadProgress(0);
    },
  });

  // SLA extraction mutation
  const extractSLAMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const response = await api.post(
        API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(contractId)
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Contract analysis complete!");
      setIsExtracting(false);

      // Redirect to contract detail page
      router.push(`/dashboard/contracts/${data.contract_id}`);
    },
    onError: (error: any) => {
      toast.error(error.detail || "Analysis failed");
      setIsExtracting(false);
    },
  });

  // Dropzone config
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    // Validate file size
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: UPLOAD_CONFIG.ACCEPTED_TYPES,
    multiple: false,
    disabled: uploadMutation.isPending || isExtracting,
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const isProcessing = uploadMutation.isPending || isExtracting;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Upload Contract
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload your car lease or loan contract for AI-powered analysis
        </p>
      </div>

      {/* Upload Area */}
      <Card className="p-8">
        <div className="max-w-xl mx-auto">
          {!selectedFile ? (
            // Dropzone
            <div
              {...getRootProps()}
              className={`
                relative cursor-pointer bg-muted/30 p-12 rounded-[40px] 
                border-2 border-dashed transition-all duration-300
                ${isDragActive
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
                ${isProcessing && "opacity-50 cursor-not-allowed"}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                {/* Cloud Icon */}
                <svg
                  className="w-16 h-16 fill-gray-500 dark:fill-gray-400"
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
            // File Selected
            <div className="space-y-6">
              {/* File Preview */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isProcessing && (
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-destructive" />
                  </button>
                )}
              </div>

              {/* Progress */}
              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {uploadMutation.isPending
                        ? "Uploading..."
                        : "Analyzing contract..."}
                    </span>
                    <span className="font-medium">
                      {uploadMutation.isPending ? `${uploadProgress}%` : ""}
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Action Buttons */}
              {!isProcessing && (
                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Upload & Analyze
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">
                    {uploadMutation.isPending
                      ? "Uploading contract..."
                      : "Extracting lease details with AI..."}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
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
                Upload your lease/loan contract as PDF or image
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <FileText className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Our AI extracts key terms and identifies red flags
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
              <h3 className="font-semibold mb-1">Get Insights</h3>
              <p className="text-sm text-muted-foreground">
                Receive negotiation tips and fairness scores
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}