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
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Particles from "@/components/Particles";

// ── Animated step indicator shown during AI extraction ───────────────────────
const EXTRACTION_STEPS = [
  "Reading contract text…",
  "Building AI index…",
  "Extracting financial terms…",
  "Analyzing mileage & fees…",
  "Checking warranty & insurance…",
  "Finalizing analysis…",
];

export default function UploadContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStepIdx, setExtractionStepIdx] = useState(0);

  // ── Cycle through step messages while extracting ──────────────────────────
  const startStepCycle = () => {
    setExtractionStepIdx(0);
    const interval = setInterval(() => {
      setExtractionStepIdx((prev) => {
        if (prev >= EXTRACTION_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 14_000); // advance every 14s (~90s total / 6 steps)
    return interval;
  };

  // ── SLA extraction mutation ───────────────────────────────────────────────
  // ✅ FIX 1: Declare BEFORE uploadMutation so it can be referenced
  const extractSLAMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const response = await backendAPI.post(
        API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(contractId),
        {},
        {
          // ✅ FIX 2: 3-minute timeout — RAG extraction takes ~60-90s
          // Without this axios kills the request and fires onError instead of onSuccess
          timeout: 180_000,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Analysis complete! Redirecting…");
      setIsExtracting(false);

      const contractId = data.contract_id;
      if (!contractId) {
        toast.error("Server did not return a contract ID");
        return;
      }

      // ✅ FIX 3: Correct route path (plural "contracts")
      router.push(`/dashboard/contracts/${contractId}`);
    },
    onError: (error: any) => {
      // ✅ FIX 4: Proper axios error reading
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Analysis failed. Please try again.";
      toast.error(msg);
      setIsExtracting(false);
    },
  });

  // ── Upload mutation ───────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (user?.id) formData.append("user_id", user.id);

      const response = await backendAPI.post(
        API_ENDPOINTS.CONTRACTS.UPLOAD,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60_000,
          onUploadProgress: (e: any) => {
            if (e.total)
              setUploadProgress(Math.round((e.loaded * 100) / e.total));
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      const contractId = data.contract_id;
      if (!contractId) {
        toast.error("Upload succeeded but no contract ID returned");
        return;
      }
      toast.success("Contract uploaded! Starting AI analysis…");
      setIsExtracting(true);
      startStepCycle();
      extractSLAMutation.mutate(contractId);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Upload failed. Please try again.";
      toast.error(msg);
      setSelectedFile(null);
      setUploadProgress(0);
    },
  });

  // ── Dropzone ──────────────────────────────────────────────────────────────
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
  const currentStep = EXTRACTION_STEPS[extractionStepIdx];

  // Strip event handlers that clash with framer-motion types
  const {
    onAnimationStart: _a,
    onDrag: _b,
    onDragEnd: _c,
    onDragStart: _d,
    onDragEnter: _e,
    onDragExit: _f,
    onDragLeave: _g,
    onDragOver: _h,
    onDrop: _i,
    ...dropzoneProps
  } = getRootProps();

  return (
    <div className="min-h-screen bg-[#0B1220] relative overflow-hidden">

      {/* Particles background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles
          particleColors={["#2563EB", "#00D4A8", "#7C3AED"]}
          particleCount={120}
          particleSpread={8}
          speed={0.04}
          particleBaseSize={70}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)" }}
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[0%] right-[-5%] w-[450px] h-[450px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,212,168,0.05) 0%, transparent 70%)" }}
          animate={{ x: [0, -18, 0], y: [0, -12, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Page content */}
      <div className="relative z-10 px-6 md:px-10 lg:px-16 py-10 max-w-5xl mx-auto pt-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-[#2563EB] uppercase tracking-widest">
              Contract Upload
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Upload Your Contract
          </h1>
          <p className="text-[#6B7280] mt-1.5 text-sm">
            Drop your car lease or loan PDF — our AI will extract and analyze every clause.
          </p>
        </motion.div>

        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10"
        >
          <AnimatePresence mode="wait">
            {!selectedFile ? (
              /* Dropzone */
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                {...dropzoneProps}
                className={`
                  relative cursor-pointer rounded-3xl border-2 border-dashed p-14
                  flex flex-col items-center justify-center text-center
                  transition-all duration-300 group overflow-hidden
                  ${isDragActive
                    ? "border-[#2563EB] bg-[#2563EB]/8 scale-[1.01]"
                    : "border-white/[0.1] bg-white/[0.025] hover:border-[#2563EB]/50 hover:bg-white/[0.04]"
                  }
                  ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <input {...getInputProps()} />
                {isDragActive && (
                  <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_60px_rgba(37,99,235,0.12)] pointer-events-none" />
                )}
                <motion.div
                  animate={isDragActive ? { scale: 1.15, y: -8 } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2563EB]/20 to-[#00D4A8]/10 border border-[#2563EB]/20 flex items-center justify-center mb-6 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-shadow duration-300"
                >
                  <svg className="w-9 h-9 fill-[#2563EB]" viewBox="0 0 640 512">
                    <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z" />
                  </svg>
                </motion.div>
                <p className="text-lg font-bold text-white mb-1">
                  {isDragActive ? "Release to upload" : "Drag & drop your contract"}
                </p>
                <p className="text-[#6B7280] text-sm mb-5">or</p>
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563EB] text-white text-sm font-semibold shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:bg-[#1E40AF] transition-colors">
                  <Upload className="w-4 h-4" />
                  Browse file
                </div>
                <p className="text-xs text-[#4B5563] mt-5">PDF, PNG, JPG · Max 10 MB</p>
              </motion.div>
            ) : (
              /* File selected / processing */
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-white/[0.08] bg-[#111827]/80 backdrop-blur-sm p-8 space-y-6"
              >
                {/* File row */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="w-12 h-12 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/25 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready to upload
                    </p>
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={handleCancel}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/15 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {isProcessing && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9CA3AF]">
                        {uploadMutation.isPending ? "Uploading…" : currentStep}
                      </span>
                      {uploadMutation.isPending && (
                        <span className="font-semibold text-[#2563EB]">{uploadProgress}%</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      {uploadMutation.isPending ? (
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#00D4A8]"
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      ) : (
                        /* ✅ Indeterminate shimmer bar during long RAG extraction */
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#00D4A8] to-[#2563EB]"
                          style={{ backgroundSize: "200% 100%" }}
                          animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                    {/* ✅ Time expectation — prevents user from thinking it's frozen */}
                    {isExtracting && (
                      <p className="text-[10px] text-[#4B5563] text-center">
                        AI analysis typically takes 60–90 seconds for all 20 fields
                      </p>
                    )}
                  </div>
                )}

                {/* Spinner + current step */}
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2.5 text-[#9CA3AF] py-1">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                    <span className="text-sm">
                      {uploadMutation.isPending
                        ? "Uploading contract…"
                        : currentStep}
                    </span>
                  </div>
                )}

                {/* Action buttons — only shown when idle */}
                {!isProcessing && (
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpload}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    >
                      <Sparkles className="w-4 h-4" />
                      Upload & Analyze
                    </motion.button>
                    <button
                      onClick={handleCancel}
                      className="px-5 py-3 rounded-xl border border-white/[0.08] text-[#9CA3AF] hover:text-white hover:border-white/[0.15] font-medium text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-widest mb-6 text-center">
            How it works
          </p>
          <div className="grid md:grid-cols-3 gap-4 relative">
            <div className="hidden md:flex absolute top-[52px] left-[33%] right-[33%] items-center pointer-events-none z-0">
              <div className="flex-1 h-px bg-gradient-to-r from-[#2563EB]/40 to-[#00D4A8]/40" />
              <div className="mx-4 flex-1 h-px bg-gradient-to-r from-[#00D4A8]/40 to-transparent" />
            </div>
            {[
              {
                icon: Upload, color: "#2563EB",
                bg: "bg-[#2563EB]/10", border: "border-[#2563EB]/20",
                step: "01", title: "Upload Contract",
                desc: "Drop your PDF or image — we support all common lease and loan formats.",
                delay: 0,
              },
              {
                icon: Zap, color: "#00D4A8",
                bg: "bg-[#00D4A8]/10", border: "border-[#00D4A8]/20",
                step: "02", title: "AI Analysis",
                desc: "Our AI reads every clause, flags red flags, and scores contract fairness.",
                delay: 0.1,
              },
              {
                icon: ShieldCheck, color: "#10B981",
                bg: "bg-emerald-500/10", border: "border-emerald-500/20",
                step: "03", title: "Get Insights",
                desc: "Receive a fairness score, negotiation script, and actionable tips.",
                delay: 0.2,
              },
            ].map(({ icon: Icon, color, bg, border, step, title, desc, delay }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 + delay }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative z-10 rounded-2xl border bg-[#111827]/70 backdrop-blur-sm p-6 transition-all duration-300 hover:border-white/[0.12] cursor-default"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="absolute top-4 right-4 text-[10px] font-bold text-[#374151] tracking-wider">{step}</div>
                <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow`}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-[#6B7280] text-xs leading-relaxed">{desc}</p>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl origin-left"
                  style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}