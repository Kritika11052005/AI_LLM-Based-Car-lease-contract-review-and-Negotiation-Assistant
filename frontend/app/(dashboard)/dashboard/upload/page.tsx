/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { backendAPI } from "@/lib/api";
import { API_ENDPOINTS, UPLOAD_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function UploadContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          }
        },
      };

      const response = await backendAPI.post(
        API_ENDPOINTS.CONTRACTS.UPLOAD,
        formData,
        config
      );
      
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Contract uploaded successfully!");
      setIsExtracting(true);
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
      const response = await backendAPI.post(
        API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(contractId)
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Contract analysis complete!");
      setIsExtracting(false);
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
    
    if (!user?.id) {
      toast.error("Please login to upload contracts");
      router.push("/login");
      return;
    }
    
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

      {/* Premium Workflow Pipeline */}
      <div className="relative pt-4 pb-16 px-4 md:px-8">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-xl font-semibold text-[#E5E7EB] mb-2">
            How It Works
          </h2>
          <p className="text-sm text-[#9CA3AF]">
            AI-powered contract analysis in three simple steps
          </p>
        </motion.div>

        {/* Workflow Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative max-w-6xl mx-auto">
          {/* Connection Lines (Desktop) */}
          <div className="hidden md:block absolute top-[60px] left-0 right-0 pointer-events-none z-0">
            <div className="flex items-center gap-8 px-4">
              <div className="flex-1" />
              {/* Line 1->2 */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="h-[2px] w-full bg-gradient-to-r from-[#2563EB]/60 via-[#2563EB]/30 to-transparent origin-left relative"
              >
                {/* Animated dot */}
                <motion.div
                  initial={{ left: 0, opacity: 0 }}
                  animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2,
                    delay: 0.8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#2563EB] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]"
                />
              </motion.div>
              <div className="flex-1" />
              {/* Line 2->3 */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                className="h-[2px] w-full bg-gradient-to-r from-[#00D4A8]/60 via-[#00D4A8]/30 to-transparent origin-left relative"
              >
                {/* Animated dot */}
                <motion.div
                  initial={{ left: 0, opacity: 0 }}
                  animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2,
                    delay: 1.2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#00D4A8] rounded-full shadow-[0_0_8px_rgba(0,212,168,0.8)]"
                />
              </motion.div>
              <div className="flex-1" />
            </div>
          </div>

          {/* Card 1: Upload */}
          <WorkflowCard
            icon={Upload}
            iconBg="bg-[#2563EB]/10"
            iconColor="text-[#2563EB]"
            title="Upload Contract"
            description="Upload your lease/loan contract as PDF"
            step="01"
            delay={0}
            accentColor="#2563EB"
          />

          {/* Card 2: AI Analysis */}
          <WorkflowCard
            icon={FileText}
            iconBg="bg-[#00D4A8]/10"
            iconColor="text-[#00D4A8]"
            title="AI Analysis"
            description="Our AI extracts key terms and finds red flags"
            step="02"
            delay={0.2}
            accentColor="#00D4A8"
          />

          {/* Card 3: Get Insights */}
          <WorkflowCard
            icon={CheckCircle}
            iconBg="bg-[#10B981]/10"
            iconColor="text-[#10B981]"
            title="Get Insights"
            description="Receive negotiation tips and fairness scores"
            step="03"
            delay={0.4}
            accentColor="#10B981"
          />
        </div>
      </div>
    </div>
  );
}

// Premium Workflow Card Component
function WorkflowCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  step,
  delay,
  accentColor,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  step: string;
  delay: number;
  accentColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      whileHover={{
        scale: 1.03,
        y: -8,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      className="group relative z-10"
    >
      <Card 
        className="relative overflow-hidden p-6 bg-[#111827] border-[#1F2937] transition-all duration-300 group-hover:border-[#2563EB]"
        style={{
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Hover glow effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: `0 0 30px rgba(37, 99, 235, 0.2)`,
          }}
        />

        {/* Step Number Badge */}
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#0B1220] border border-[#1F2937] flex items-center justify-center group-hover:border-[#2563EB] transition-colors duration-300">
          <span className="text-xs font-semibold text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors duration-300">
            {step}
          </span>
        </div>

        {/* Icon */}
        <motion.div
          whileHover={{ 
            scale: 1.15, 
            y: -4,
            transition: { duration: 0.2, ease: "easeOut" }
          }}
          className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-5 shadow-lg`}
          style={{
            boxShadow: `0 4px 12px ${accentColor}20`,
          }}
        >
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </motion.div>

        {/* Content */}
        <div>
          <h3 className="font-semibold text-[#E5E7EB] mb-2 text-lg">
            {title}
          </h3>
          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            {description}
          </p>
        </div>

        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-[#2563EB]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none rounded-xl" />
        
        {/* Bottom accent line on hover */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, transparent 100%)`,
          }}
        />
      </Card>
    </motion.div>
  );
}