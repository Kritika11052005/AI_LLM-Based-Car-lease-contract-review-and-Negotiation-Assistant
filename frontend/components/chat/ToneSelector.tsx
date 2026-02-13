"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Smile, Briefcase, Zap } from "lucide-react";

interface ToneSelectorProps {
  value: "professional" | "friendly" | "assertive";
  onChange: (value: "professional" | "friendly" | "assertive") => void;
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="professional">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            <span>Professional</span>
          </div>
        </SelectItem>
        <SelectItem value="friendly">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4" />
            <span>Friendly</span>
          </div>
        </SelectItem>
        <SelectItem value="assertive">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Assertive</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}