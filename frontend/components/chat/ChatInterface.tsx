/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UseMutationResult } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { Send, Loader2 } from "lucide-react";
import { NegotiationMessage, AskQuestionResponse } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ENDPOINTS } from "@/lib/constants";

interface ChatInterfaceProps {
  contractId: string;
  threadId: string | null;
  setThreadId: (id: string) => void;
  tone: string;
  askQuestionMutation: UseMutationResult<
    AskQuestionResponse,
    any,
    { question: string; thread_id?: string }
  >;
}

export function ChatInterface({
  contractId,
  threadId,
  setThreadId,
  tone,
  askQuestionMutation,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages if thread exists
  const { data: messages, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const response = await api.get<{ messages: NegotiationMessage[] }>(
        API_ENDPOINTS.NEGOTIATION.MESSAGES(threadId)
      );
      return response.data.messages || [];
    },
    enabled: !!threadId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");

    const result = await askQuestionMutation.mutateAsync({
      question: userMessage,
      thread_id: threadId || undefined,
    });

    // Set thread ID if this is the first message
    if (!threadId) {
      setThreadId(result.thread_id);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <ChatSkeleton />
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg.body}
              isUser={msg.senderRole === "user"}
              timestamp={msg.sentAt}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-6xl">💬</div>
            <h3 className="text-xl font-semibold">Start Your Negotiation</h3>
            <p className="text-muted-foreground max-w-md">
              Ask me anything about your contract or click &quot;Generate Script&quot; to
              get a complete negotiation strategy.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMessage("What are the main red flags in this contract?")
                }
              >
                Show red flags
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMessage("How can I negotiate a better monthly payment?")
                }
              >
                Lower payment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage("Is the APR rate fair?")}
              >
                Check APR
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMessage("What should I ask the dealer?")
                }
              >
                Dealer questions
              </Button>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {askQuestionMutation.isPending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-foreground">AI</span>
            </div>
            <div className="flex-1 bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask about your contract or negotiation strategy..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={askQuestionMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || askQuestionMutation.isPending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
          <Skeleton className={`h-20 ${i % 2 === 0 ? "w-3/4" : "w-2/3"}`} />
        </div>
      ))}
    </div>
  );
}