"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  isSystem?: boolean;
  timestamp: string;
}

export function MessageBubble({
  message,
  isUser,
  isSystem = false,
  timestamp,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="w-full">
        <div className="rounded-lg p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        <span className="text-xs font-bold">{isUser ? "You" : "AI"}</span>
      </div>

      {/* Message */}
      <div className={cn("flex-1 group", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-lg p-4 max-w-[80%]",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {message}
          </div>
        </div>

        {/* Timestamp & Actions */}
        <div
          className={cn(
            "flex items-center gap-2 mt-1 text-xs text-muted-foreground",
            isUser && "flex-row-reverse"
          )}
        >
          <span>{formatDateTime(timestamp)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}