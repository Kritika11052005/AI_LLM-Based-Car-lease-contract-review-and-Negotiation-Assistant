/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
// app/(dashboard)/dashboard/negotiate/[id]/page.tsx
//
// Reached via: router.push(`/dashboard/negotiate/${contractId}`)
// Auto-pipeline on mount:
//   1. POST /api/negotiation/analyze/{id}   → intents stored in DB + analysis
//   2. POST /api/negotiation/script/{id}    → negotiation script + threadId
//   3. Drop straight into the chat UI with script pre-loaded

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import api from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "@/components/Particles";
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  BrainCircuit,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── types ──────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  type: "text" | "analysis" | "script" | "user" | "error";
  content: string;
  data?: any;
  timestamp: string;
}

interface Conversation {
  id: string;
  contractId?: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

// ── pipeline step config ───────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  {
    id: "sla",
    icon: FileSearch,
    label: "Reading contract terms",
    sublabel: "Extracting SLA from database",
  },
  {
    id: "analyze",
    icon: BrainCircuit,
    label: "Generating negotiation intents",
    sublabel: "Analyzing clauses & storing to database",
  },
  {
    id: "script",
    icon: ScrollText,
    label: "Building your negotiation script",
    sublabel: "Personalising strategy",
  },
];

type PipelineStatus = "idle" | "running" | "done" | "error";
type StepState = "pending" | "active" | "done" | "error";

// ── animated pipeline loader ───────────────────────────────────────────────────
function PipelineLoader({
  currentStep,
  status,
}: {
  currentStep: number;
  status: PipelineStatus;
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full gap-10 py-20"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glowing orb */}
      <div className="relative">
        <motion.div
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center shadow-[0_0_60px_rgba(37,99,235,0.5)]"
          animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <BrainCircuit className="w-9 h-9 text-white" />
        </motion.div>
        {/* Ripple rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-[#2563EB]/30"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1 + i * 0.4, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">
          Preparing Your Negotiation
        </h2>
        <p className="text-sm text-[#6B7280]">
          Sit tight — this takes about 10 seconds
        </p>
      </div>

      {/* Step tracker */}
      <div className="w-full max-w-sm space-y-3 px-4">
        {PIPELINE_STEPS.map((step, idx) => {
          const stepState: StepState =
            status === "error" && idx === currentStep
              ? "error"
              : idx < currentStep
              ? "done"
              : idx === currentStep
              ? "active"
              : "pending";

          const Icon = step.icon;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                stepState === "done" &&
                  "bg-emerald-500/8 border-emerald-500/20",
                stepState === "active" &&
                  "bg-[#2563EB]/10 border-[#2563EB]/30 shadow-[0_0_20px_rgba(37,99,235,0.15)]",
                stepState === "pending" && "bg-white/3 border-white/5 opacity-40",
                stepState === "error" && "bg-red-500/10 border-red-500/30"
              )}
            >
              {/* icon */}
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  stepState === "done" && "bg-emerald-500/20",
                  stepState === "active" && "bg-[#2563EB]/20",
                  stepState === "pending" && "bg-white/5",
                  stepState === "error" && "bg-red-500/20"
                )}
              >
                {stepState === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : stepState === "active" ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-5 h-5 text-[#2563EB]" />
                  </motion.div>
                ) : stepState === "error" ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <Icon className="w-5 h-5 text-[#6B7280]" />
                )}
              </div>

              {/* text */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    stepState === "done" && "text-emerald-300",
                    stepState === "active" && "text-white",
                    stepState === "pending" && "text-[#6B7280]",
                    stepState === "error" && "text-red-400"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                  {step.sublabel}
                </p>
              </div>

              {/* connector dot */}
              {stepState === "done" && (
                <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── message renderer ───────────────────────────────────────────────────────────
function MessageRenderer({ message }: { message: ChatMessage }) {
  if (message.type === "user") {
    return (
      <motion.div
        className="flex justify-end gap-3"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-end max-w-[72%]">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          </div>
          <p className="text-[11px] text-[#4B5563] mt-1.5 px-1">
            {formatDateTime(message.timestamp)}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0 shadow-md mt-0.5">
          <span className="text-[10px] font-bold text-white">You</span>
        </div>
      </motion.div>
    );
  }

  if (message.type === "error") {
    return (
      <motion.div
        className="flex items-start gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 max-w-[72%]">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-red-300 leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // script message gets special formatting
  if (message.type === "script") {
    return (
      <motion.div
        className="flex items-start gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center shrink-0 shadow-lg mt-0.5">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 max-w-[85%]">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#00D4A8] uppercase tracking-wider">
              Negotiation Script Ready
            </span>
            <div className="h-px flex-1 bg-[#00D4A8]/20" />
          </div>
          <div className="bg-[#1F2937] border border-[#2563EB]/15 rounded-2xl rounded-tl-sm px-5 py-4 shadow-md">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#E5E7EB]">
              {message.content}
            </div>
          </div>
          <p className="text-[11px] text-[#4B5563] mt-1.5 px-1">
            {formatDateTime(message.timestamp)}
          </p>
        </div>
      </motion.div>
    );
  }

  // default AI text message
  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center shrink-0 shadow-lg mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[72%]">
        <div className="bg-[#1F2937] border border-[#2563EB]/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#E5E7EB]">
            {message.content}
          </div>
        </div>
        <p className="text-[11px] text-[#4B5563] mt-1.5 px-1">
          {formatDateTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function NegotiateContractPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  const { user } = useAuth();

  // pipeline state
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [currentStep, setCurrentStep] = useState(0);

  // chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasRun = useRef(false);

  // ── scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── sidebar threads ──────────────────────────────────────────────────────────
  const { data: conversations = [], refetch: refetchThreads } = useQuery({
    queryKey: ["negotiation-threads"],
    queryFn: async () => {
      const response = await api.get("/negotiation/threads");
      return response.data;
    },
    enabled: !!user,
  });

  // ── auto-pipeline on mount (with existing-thread check) ────────────────────────────
  // 1. Check if a thread already exists for this contractId
  // 2. If yes → load it directly, skip the pipeline entirely (saves API calls)
  // 3. If no  → run full extract → analyze → script pipeline
  useEffect(() => {
    if (!contractId || hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      try {
        // ── Check for an existing thread for this contract ───────────────────────
        console.log("[Pipeline] Checking for existing thread for", contractId);
        const threadsRes = await api.get("/negotiation/threads");
        const allThreads: Conversation[] = threadsRes.data ?? [];
        const existing = allThreads.find((t) => t.contractId === contractId);

        if (existing) {
          console.log("[Pipeline] Existing thread found:", existing.id, "— skipping pipeline");
          const msgRes = await api.get(`/negotiation/threads/${existing.id}/messages`);
          const loadedMsgs: ChatMessage[] = msgRes.data?.messages ?? [];

          setThreadId(existing.id);
          setActiveConversationId(existing.id);

          // Prepend a banner only if there are no messages to show
          const banner: ChatMessage = {
            id: "restored-banner",
            type: "text",
            content: "♻️ Restored your previous negotiation for this contract. Ask a follow-up or request a fresh script anytime.",
            timestamp: new Date().toISOString(),
          };
          setMessages(loadedMsgs.length > 0 ? loadedMsgs : [banner]);
          setPipelineStatus("done");
          return; // ← skip pipeline entirely
        }

        console.log("[Pipeline] No existing thread — running fresh pipeline");
      } catch (checkErr) {
        // Thread check failed — safe to proceed with pipeline
        console.warn("[Pipeline] Thread check failed, running pipeline:", checkErr);
      }

      setPipelineStatus("running");

      try {
        // Step 0: Extract / confirm SLA from DB
        setCurrentStep(0);
        console.log("[Pipeline] Step 0: extracting SLA for", contractId);
        await backendAPI.post(API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(contractId));
        console.log("[Pipeline] Step 0 done ✓");

        // Step 1: Analyze → generate + persist negotiation intents
        setCurrentStep(1);
        console.log("[Pipeline] Step 1: analyzing contract", contractId);
        const analysisRes = await backendAPI.post(
          API_ENDPOINTS.NEGOTIATION.ANALYZE(contractId)
        );
        const analysis = analysisRes.data;
        console.log("[Pipeline] Step 1 done ✓", analysis);

        // Step 2: Generate negotiation script
        setCurrentStep(2);
        console.log("[Pipeline] Step 2: generating script", contractId);
        const scriptRes = await backendAPI.post(
          API_ENDPOINTS.NEGOTIATION.SCRIPT(contractId)
        );
        console.log("[Pipeline] Step 2 done ✓", scriptRes.data);

        const newThreadId: string = scriptRes.data.thread_id;
        setThreadId(newThreadId);
        setActiveConversationId(newThreadId);
        setPipelineStatus("done");

        // Brief pause so all three steps show "done" before chat fades in
        await new Promise((r) => setTimeout(r, 700));

        // Seed chat with summary + script
        const redFlagCount: number = analysis?.red_flags?.length ?? 0;
        const fairnessScore: number | null = analysis?.fairness_score ?? null;

        const contextMsg: ChatMessage = {
          id: "ctx-intro",
          type: "text",
          content:
            `✅ Analysis complete!` +
            (fairnessScore !== null
              ? ` Fairness score: **${Math.round(fairnessScore)}/100**.`
              : "") +
            (redFlagCount > 0
              ? ` Found **${redFlagCount} red flag${redFlagCount > 1 ? "s" : ""}** in your contract.`
              : " No major red flags detected.") +
            `\n\nHere's your personalised negotiation script — use it word-for-word with the dealer:`,
          timestamp: new Date().toISOString(),
        };

        const scriptMsg: ChatMessage = {
          id: "script-initial",
          type: "script",
          content: scriptRes.data.negotiation_script,
          timestamp: new Date().toISOString(),
        };

        const followupMsg: ChatMessage = {
          id: "followup",
          type: "text",
          content:
            "You can now ask me anything about your contract — counter-offer strategies, clause explanations, or to generate a tougher version of the script.",
          timestamp: new Date().toISOString(),
        };

        setMessages([contextMsg, scriptMsg, followupMsg]);
        refetchThreads();
      } catch (err: any) {
        // Log full error details to console for debugging
        console.error("[NegotiatePipeline] Error:", {
          status:   err?.response?.status,
          url:      err?.config?.url,
          detail:   err?.response?.data?.detail,
          data:     err?.response?.data,
          message:  err?.message,
        });

        setPipelineStatus("error");

        // Extract the most meaningful error message available
        const errMsg =
          err?.response?.data?.detail ??
          err?.response?.data?.message ??
          (typeof err?.response?.data === "string" ? err.response.data : null) ??
          err?.message ??
          `HTTP ${err?.response?.status ?? "unknown"} on ${err?.config?.url ?? "unknown endpoint"}`;

        toast.error(errMsg);
        setMessages([
          {
            id: "error-msg",
            type: "error",
            content: `Pipeline failed at step ${currentStep + 1}/3.\n\n${errMsg}\n\nCheck the browser console for the full error details.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  // ── ask question ─────────────────────────────────────────────────────────────
  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await backendAPI.post(
        API_ENDPOINTS.NEGOTIATION.ASK(contractId),
        { question, thread_id: threadId }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (!threadId) setThreadId(data.thread_id);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          type: "text",
          content: data.answer,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Failed to get response");
    },
  });

  const handleSend = () => {
    const q = inputMessage.trim();
    if (!q || pipelineStatus !== "done") return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: "user",
        content: q,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInputMessage("");
    askMutation.mutate(q);
  };

  // ── load existing thread from sidebar ────────────────────────────────────────
  const loadThread = async (thread: Conversation) => {
    setActiveConversationId(thread.id);
    setThreadId(thread.id);
    const res = await api.get(`/negotiation/threads/${thread.id}/messages`);
    setMessages(res.data.messages ?? []);
  };

  // ── new chat → go back to negotiate index ─────────────────────────────────────
  const handleNewChat = () => {
    router.push("/dashboard/negotiate");
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const showPipeline =
    pipelineStatus === "running" ||
    (pipelineStatus === "error" && messages.length === 0) ||
    (pipelineStatus === "idle");

  const canChat = pipelineStatus === "done" && !askMutation.isPending;

  return (
    <div className="min-h-screen bg-[#0B1220] relative overflow-hidden">
      {/* ── Particles ─────────────────────────────────────────────────────── */}
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

      {/* ── Layout ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto pt-16">
          <div className="flex gap-6 h-[calc(100vh-140px)]">

            {/* ── Left sidebar ──────────────────────────────────────────── */}
            <div className="w-72 flex flex-col gap-4 shrink-0">
              {/* Back + New Chat */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/contracts/${contractId}`)}
                  className="border-[#1F2937] text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] h-11 px-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleNewChat}
                  className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1E40AF] transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>

              {/* Thread list */}
              <Card className="flex-1 overflow-hidden bg-[#111827]/90 backdrop-blur-md border-[#1F2937] rounded-2xl shadow-xl">
                <div className="p-5 border-b border-[#1F2937]">
                  <h3 className="font-semibold text-sm text-[#E5E7EB]">
                    Chat History
                  </h3>
                </div>
                <div className="overflow-y-auto h-[calc(100%-61px)]">
                  <div className="p-3 space-y-2">
                    {(conversations as Conversation[]).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadThread(conv)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg hover:bg-[#1F2937] transition-all duration-200",
                          activeConversationId === conv.id &&
                            "bg-[#1F2937] border border-[#2563EB]/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 mt-1 text-[#2563EB] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-[#E5E7EB]">
                              {conv.title}
                            </p>
                            <p className="text-xs text-[#9CA3AF] truncate mt-1">
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {conversations.length === 0 && (
                      <div className="p-8 text-center text-sm text-[#9CA3AF]">
                        No conversations yet
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Main chat area ─────────────────────────────────────────── */}
            <Card className="flex-1 flex flex-col bg-[#111827]/90 backdrop-blur-md border-[#1F2937] rounded-2xl shadow-xl overflow-hidden">

              {/* ── Header bar ──────────────────────────────────────────── */}
              <div className="px-6 py-4 border-b border-[#1F2937] flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    AI Negotiation Assistant
                  </h2>
                  <p className="text-[11px] text-[#6B7280]">
                    Contract · {contractId.slice(0, 8)}…
                  </p>
                </div>
                <div className="ml-auto">
                  {pipelineStatus === "done" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready
                    </motion.div>
                  )}
                  {pipelineStatus === "running" && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 px-3 py-1 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analysing
                    </div>
                  )}
                </div>
              </div>

              {/* ── Messages / Pipeline ─────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {showPipeline ? (
                    <motion.div
                      key="pipeline"
                      className="h-full"
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.35 }}
                    >
                      <PipelineLoader
                        currentStep={currentStep}
                        status={pipelineStatus}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat"
                      className="p-6"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45 }}
                    >
                      <div className="max-w-4xl mx-auto space-y-6">
                        {messages.map((msg) => (
                          <MessageRenderer key={msg.id} message={msg} />
                        ))}

                        {/* thinking indicator */}
                        {askMutation.isPending && (
                          <motion.div
                            className="flex items-start gap-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-[#1F2937] border border-[#2563EB]/10 rounded-2xl rounded-tl-sm px-4 py-3">
                              <div className="flex gap-1.5 items-center h-4">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{
                                      duration: 0.8,
                                      repeat: Infinity,
                                      delay: i * 0.18,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Input bar ───────────────────────────────────────────── */}
              <div className="border-t border-[#1F2937] p-5 bg-[#0B1220]/50 backdrop-blur-sm shrink-0">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex-1 bg-[#1F2937] border rounded-xl px-4 py-3 transition-colors",
                        canChat
                          ? "border-[#2563EB]/20 focus-within:border-[#2563EB]/50"
                          : "border-white/5 opacity-50"
                      )}
                    >
                      <Input
                        placeholder={
                          pipelineStatus !== "done"
                            ? "Preparing your negotiation…"
                            : "Ask anything about your contract…"
                        }
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={!canChat}
                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-[#E5E7EB] placeholder:text-[#6B7280]"
                      />
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={!inputMessage.trim() || !canChat}
                      size="icon"
                      className="h-11 w-11 shrink-0 bg-[#2563EB] hover:bg-[#1E40AF] disabled:opacity-40 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}