/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { uploadFile } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Send,
  Loader2,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Plus,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { UPLOAD_CONFIG } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  type: "text" | "upload" | "analysis" | "script" | "user";
  content: string;
  data?: any;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export default function NegotiatePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "greeting",
      type: "text",
      content: `👋 Hi! I'm your AI Lease Negotiation Assistant.

I can help you:
- Analyze your car lease/loan contracts
- Identify red flags and unfair terms
- Calculate fairness scores
- Generate personalized negotiation scripts
- Answer questions about your contract

To get started, upload your contract below!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [contractId, setContractId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Upload & process contract
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await uploadFile(API_ENDPOINTS.CONTRACTS.UPLOAD, file, () => {});
      return response;
    },
    onSuccess: async (data) => {
      setContractId(data.contract_id);
      
      // Extract SLA
      const slaResponse = await api.post(API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(data.contract_id));
      
      // Analyze
      const analysisResponse = await api.post(API_ENDPOINTS.NEGOTIATION.ANALYZE(data.contract_id));
      const analysis = analysisResponse.data;

      // Add analysis cards
      const analysisMessage: ChatMessage = {
        id: `analysis-${Date.now()}`,
        type: "analysis",
        content: "",
        data: analysis,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, analysisMessage]);

      // Generate script
      const scriptResponse = await api.post(API_ENDPOINTS.NEGOTIATION.SCRIPT(data.contract_id));
      setThreadId(scriptResponse.data.thread_id);

      const scriptMessage: ChatMessage = {
        id: `script-${Date.now()}`,
        type: "script",
        content: scriptResponse.data.negotiation_script,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, scriptMessage]);

      setIsUploading(false);
      toast.success("Contract analyzed successfully!");

      // Save to conversation history
      const newConv: Conversation = {
        id: data.contract_id,
        title: slaResponse.data.vehicle_data
          ? `${slaResponse.data.vehicle_data.year} ${slaResponse.data.vehicle_data.make}`
          : "Contract Analysis",
        lastMessage: "Analysis complete",
        timestamp: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(data.contract_id);
    },
    onError: (error: any) => {
      toast.error(error.detail || "Upload failed");
      setIsUploading(false);
    },
  });

  // Ask question
  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await api.post(API_ENDPOINTS.NEGOTIATION.ASK(contractId!), {
        question,
        thread_id: threadId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!threadId) setThreadId(data.thread_id);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: "text",
        content: data.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
  });

  const handleFileUpload = (file: File) => {
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      toast.error("File must be less than 10MB");
      return;
    }

    setIsUploading(true);
    const uploadMsg: ChatMessage = {
      id: `upload-${Date.now()}`,
      type: "user",
      content: `📎 Uploaded: ${file.name}`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, uploadMsg]);

    uploadMutation.mutate(file);
  };

  const onDrop = (files: File[]) => {
    if (files[0]) handleFileUpload(files[0]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: UPLOAD_CONFIG.ACCEPTED_TYPES,
    multiple: false,
    noClick: true,
  });

  const handleSend = () => {
    if (!inputMessage.trim() || !contractId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    askMutation.mutate(inputMessage);
  };

  const startNewChat = () => {
    setMessages([
      {
        id: "greeting",
        type: "text",
        content: `👋 Hi! I'm your AI Lease Negotiation Assistant...`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setContractId(null);
    setThreadId(null);
    setActiveConversationId(null);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left Sidebar - Chat History */}
      <div className="w-64 flex flex-col gap-4">
        <Button onClick={startNewChat} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>

        <Card className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Chat History</h3>
          </div>
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={cn(
                  "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                  activeConversationId === conv.id && "bg-muted"
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" {...getRootProps()}>
          <input {...getInputProps()} />
          
          {messages.map((msg) => (
            <MessageRenderer key={msg.id} message={msg} />
          ))}

          {/* Upload Prompt (shown after greeting) */}
          {messages.length === 1 && (
            <div className="flex justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Contract
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          )}

          {/* Loading */}
          {isUploading && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">Processing your contract...</p>
                <p className="text-sm text-muted-foreground">
                  Extracting terms, analyzing fairness, generating script
                </p>
              </div>
            </div>
          )}

          {askMutation.isPending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 bg-muted rounded-lg p-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Input
              placeholder={
                contractId
                  ? "Ask about your contract..."
                  : "Upload a contract first..."
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!contractId || askMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!inputMessage.trim() || !contractId || askMutation.isPending}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Message Renderer Component
function MessageRenderer({ message }: { message: ChatMessage }) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="flex flex-col items-end max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4 shadow-sm">
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 px-2">
            {formatDateTime(message.timestamp)}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-foreground">You</span>
        </div>
      </div>
    );
  }

  if (message.type === "analysis") {
    const data = message.data;
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 space-y-3 max-w-[90%]">
          {/* Fairness Score Card */}
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-blue-500/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {Math.round(data.fairness_score)}%
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Fairness Score</p>
              </div>
              <Badge
                className={cn(
                  "text-base px-4 py-2 font-semibold",
                  data.fairness_score >= 80 && "bg-green-500 text-white",
                  data.fairness_score >= 60 && data.fairness_score < 80 && "bg-blue-500 text-white",
                  data.fairness_score >= 40 && data.fairness_score < 60 && "bg-yellow-500 text-white",
                  data.fairness_score < 40 && "bg-red-500 text-white"
                )}
              >
                {data.rating}
              </Badge>
            </div>
          </Card>

          {/* Red Flags */}
          {data.red_flags.length > 0 && (
            <Card className="p-5 border-red-500/30 bg-red-500/5 shadow-md">
              <h4 className="font-semibold flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                🚩 Red Flags Found ({data.red_flags.length})
              </h4>
              <ul className="space-y-2">
                {data.red_flags.map((flag: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2 p-2 rounded bg-red-500/5">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span className="flex-1">{flag}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <Card className="p-5 border-yellow-500/30 bg-yellow-500/5 shadow-md">
              <h4 className="font-semibold flex items-center gap-2 mb-3 text-yellow-600 dark:text-yellow-400">
                <TrendingUp className="w-5 h-5" />
                ⚠️ Warnings ({data.warnings.length})
              </h4>
              <ul className="space-y-2">
                {data.warnings.map((warning: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-2 p-2 rounded bg-yellow-500/5">
                    <span className="text-yellow-500 font-bold mt-0.5">•</span>
                    <span className="flex-1">{warning}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="text-xs text-muted-foreground px-2">
            {formatDateTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (message.type === "script") {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 max-w-[90%]">
          <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
            <h4 className="font-bold text-lg flex items-center gap-2 mb-4 text-primary">
              <FileText className="w-5 h-5" />
              📋 Your Personalized Negotiation Script
            </h4>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-background/50 rounded-lg p-4 border border-border">
                {message.content}
              </div>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 px-2">
            {formatDateTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Regular AI text message
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[80%]">
        <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-tl-sm p-4 shadow-sm border border-border/50">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 px-2">
          {formatDateTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}