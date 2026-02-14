/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { Send, Loader2 } from "lucide-react";
import { AskQuestionResponse } from "@/types";
import { type UseMutationResult } from "@tanstack/react-query";
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  contractId: string;
  threadId: string | null;
  setThreadId: (id: string) => void;
  tone: string;
  askQuestionMutation: UseMutationResult<
    any,
    any,
    { question: string; thread_id?: string }
  >;
  initialMessages?: ChatMessage[];
}

export function ChatInterface({
  contractId,
  threadId,
  setThreadId,
  tone,
  askQuestionMutation,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update messages when initial messages change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");

    await askQuestionMutation.mutateAsync({
      question: userMessage,
      thread_id: threadId || undefined,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[700px]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg.content}
              isUser={msg.role === "user"}
              isSystem={msg.role === "system"}
              timestamp={msg.timestamp}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-6xl">💬</div>
            <h3 className="text-xl font-semibold">Start Your Negotiation</h3>
            <p className="text-muted-foreground max-w-md">
              Upload a contract to get AI-powered negotiation strategies and
              personalized advice.
            </p>
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