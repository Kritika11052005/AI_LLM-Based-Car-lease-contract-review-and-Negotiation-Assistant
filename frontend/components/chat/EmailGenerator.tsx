"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface EmailGeneratorProps {
  contractId: string;
  threadId: string;
}

export function EmailGenerator({ contractId, threadId }: EmailGeneratorProps) {
  const [emailDraft, setEmailDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const generateEmail = () => {
    // Placeholder email template
    const draft = `Subject: Request for Contract Review and Discussion

Dear [Dealer Name],

I hope this email finds you well. I am writing to discuss the lease terms for the [Vehicle Model] we recently reviewed.

After careful analysis, I would like to address the following points:

1. Monthly Payment: I'd like to explore options for a more competitive monthly payment based on current market rates.

2. Mileage Allowance: The current mileage limit may not suit my needs. Can we discuss increasing this?

3. Early Termination Terms: I'd appreciate clarification on the early termination fee structure.

I'm genuinely interested in moving forward with this lease and believe we can find mutually beneficial terms. Would you be available for a call this week to discuss these points?

Thank you for your time and consideration.

Best regards,
[Your Name]
[Your Contact]`;

    setEmailDraft(draft);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailDraft);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!emailDraft ? (
          <Button onClick={generateEmail} className="w-full">
            Generate Email Draft
          </Button>
        ) : (
          <>
            <Textarea
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Email
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={generateEmail}>
                Regenerate
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}