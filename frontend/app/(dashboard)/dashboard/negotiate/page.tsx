/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Particles from "@/components/Particles";
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
  contractId?: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export default function NegotiatePage() {
  const { user } = useAuth();
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

  const { data: conversations = [], refetch: refetchThreads } = useQuery({
    queryKey: ["negotiation-threads"],
    queryFn: async () => {
      const response = await api.get("/negotiation/threads");
      return response.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const response = await backendAPI.post(
        API_ENDPOINTS.CONTRACTS.UPLOAD,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      return response.data;
    },
    onSuccess: async (data) => {
      setContractId(data.contract_id);
      
      const slaResponse = await backendAPI.post(API_ENDPOINTS.CONTRACTS.EXTRACT_SLA(data.contract_id));
      const analysisResponse = await backendAPI.post(API_ENDPOINTS.NEGOTIATION.ANALYZE(data.contract_id));
      const analysis = analysisResponse.data;

      const analysisMessage: ChatMessage = {
        id: `analysis-${Date.now()}`,
        type: "analysis",
        content: "",
        data: analysis,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, analysisMessage]);

      const scriptResponse = await backendAPI.post(API_ENDPOINTS.NEGOTIATION.SCRIPT(data.contract_id));
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

      refetchThreads();
      setActiveConversationId(scriptResponse.data.thread_id);
    },
    onError: (error: any) => {
      toast.error(error.detail || "Upload failed");
      setIsUploading(false);
    },
  });

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await backendAPI.post(API_ENDPOINTS.NEGOTIATION.ASK(contractId!), {
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

  const loadThread = async (thread: Conversation) => {
    setActiveConversationId(thread.id);
    setThreadId(thread.id);
    setContractId(thread.contractId || null);

    const response = await api.get(`/negotiation/threads/${thread.id}/messages`);
    const { messages: threadMessages } = response.data;

    setMessages([
      {
        id: "greeting",
        type: "text",
        content: `💬 Loaded conversation: ${thread.title}`,
        timestamp: new Date().toISOString(),
      },
      ...threadMessages,
    ]);
  };

  const handleFileUpload = (file: File) => {
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      toast.error("File must be less than 10MB");
      return;
    }

    if (!user?.id) {
      toast.error("Please login to upload contracts");
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
    setContractId(null);
    setThreadId(null);
    setActiveConversationId(null);
  };

  return (
    <div className="min-h-screen bg-[#0B1220] relative overflow-hidden">
      {/* Particles Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles
          particleColors={["#2563EB", "#00D4A8", "#7C3AED"]}
          particleCount={150}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={80}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-6">
        {/* Main Container with proper spacing */}
        <div className="max-w-7xl mx-auto">
          {/* Add extra top padding to move chat down and avoid sidebar toggle */}
          <div className="pt-16">
            <div className="flex gap-6 h-[calc(100vh-180px)]">
              {/* Left Sidebar - Chat History */}
              <div className="w-72 flex flex-col gap-4 flex-shrink-0">
                <Button 
                  onClick={startNewChat} 
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#1E40AF] transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>

                <Card className="flex-1 overflow-hidden bg-[#111827]/90 backdrop-blur-md border-[#1F2937] rounded-2xl shadow-xl">
                  <div className="p-5 border-b border-[#1F2937]">
                    <h3 className="font-semibold text-sm text-[#E5E7EB]">Chat History</h3>
                  </div>
                  <div className="overflow-y-auto h-[calc(100%-61px)]">
                    <div className="p-3 space-y-2">
                      {conversations.map((conv: Conversation) => (
                        <button
                          key={conv.id}
                          onClick={() => loadThread(conv)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg hover:bg-[#1F2937] transition-all duration-200",
                            activeConversationId === conv.id && "bg-[#1F2937] border border-[#2563EB]/30"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <MessageSquare className="w-4 h-4 mt-1 text-[#2563EB] flex-shrink-0" />
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

              {/* Main Chat Area */}
              <Card className="flex-1 flex flex-col bg-[#111827]/90 backdrop-blur-md border-[#1F2937] rounded-2xl shadow-xl overflow-hidden">
                {/* Messages Area */}
                <div 
                  className="flex-1 overflow-y-auto p-6" 
                  {...getRootProps()}
                >
                  <input {...getInputProps()} />
                  
                  {/* Messages Container with max-width */}
                  <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((msg) => (
                      <MessageRenderer key={msg.id} message={msg} />
                    ))}

                    {/* Upload Prompt */}
                    {messages.length === 1 && !isUploading && (
                      <div className="flex justify-center pt-8">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-8 py-4 bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-3 shadow-lg"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="font-medium">Upload Contract</span>
                        </button>
                      </div>
                    )}

                    {/* Loading State */}
                    {isUploading && (
                      <div className="flex items-center gap-4 p-5 bg-[#1F2937] rounded-xl border border-[#2563EB]/30">
                        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-[#E5E7EB]">Processing your contract...</p>
                          <p className="text-sm text-[#9CA3AF] mt-1">
                            Extracting terms, analyzing fairness, generating script
                          </p>
                        </div>
                      </div>
                    )}

                    {askMutation.isPending && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 bg-[#1F2937] rounded-2xl rounded-tl-sm p-5">
                          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="border-t border-[#1F2937] p-5 bg-[#0B1220]/50 backdrop-blur-sm">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-end gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-11 w-11 flex-shrink-0 border-[#1F2937] hover:bg-[#1F2937] hover:border-[#2563EB]/50 transition-all"
                        title="Upload contract"
                      >
                        <Upload className="w-5 h-5" />
                      </Button>
                      
                      {/* Hidden file input for upload button */}
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
                      
                      <div className="flex-1 bg-[#1F2937] border border-[#2563EB]/20 rounded-xl px-4 py-3 focus-within:border-[#2563EB]/50 transition-colors">
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
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-[#E5E7EB] placeholder:text-[#6B7280]"
                        />
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={!inputMessage.trim() || !contractId || askMutation.isPending}
                        size="icon"
                        className="h-11 w-11 flex-shrink-0 bg-[#2563EB] hover:bg-[#1E40AF] disabled:opacity-50 transition-all"
                        title="Send message"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Message Renderer Component
function MessageRenderer({ message }: { message: ChatMessage }) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end gap-4">
        <div className="flex flex-col items-end max-w-[70%]">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white rounded-2xl rounded-tr-sm p-4 shadow-lg">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
          <p className="text-xs text-[#6B7280] mt-2 px-2">
            {formatDateTime(message.timestamp)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-xs font-bold text-white">You</span>
        </div>
      </div>
    );
  }

  // AI messages
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#00D4A8] flex items-center justify-center flex-shrink-0 shadow-lg">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 max-w-[70%]">
        <div className="bg-[#1F2937] border border-[#2563EB]/10 rounded-2xl rounded-tl-sm p-5 shadow-md">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#E5E7EB]">
            {message.content}
          </div>
        </div>
        <p className="text-xs text-[#6B7280] mt-2 px-2">
          {formatDateTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}