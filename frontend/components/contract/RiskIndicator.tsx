/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RiskIndicatorsProps {
  redFlagLevel?: string | null;
  negotiationIntents?: any;
}

export function RiskIndicators({
  redFlagLevel,
  negotiationIntents,
}: RiskIndicatorsProps) {
  const getIcon = () => {
    if (redFlagLevel === "Excellent" || redFlagLevel === "Good") {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (redFlagLevel === "Fair") {
      return <Info className="w-5 h-5 text-yellow-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-red-500" />;
  };

  const getColor = () => {
    if (redFlagLevel === "Excellent" || redFlagLevel === "Good") {
      return "border-green-500/50 bg-green-500/10";
    }
    if (redFlagLevel === "Fair") {
      return "border-yellow-500/50 bg-yellow-500/10";
    }
    return "border-red-500/50 bg-red-500/10";
  };

  // Parse negotiation intents if available
  const intents = negotiationIntents
    ? typeof negotiationIntents === "string"
      ? JSON.parse(negotiationIntents)
      : negotiationIntents
    : [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        {getIcon()}
        Risk Assessment
      </h3>

      {/* Risk Level Badge */}
      <div className={`p-4 rounded-lg border ${getColor()}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Risk Level</span>
          <Badge variant="outline">{redFlagLevel || "Unknown"}</Badge>
        </div>
      </div>

      {/* Negotiation Points */}
      {intents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Key Negotiation Points
          </h4>
          <div className="space-y-2">
            {intents.slice(0, 3).map((intent: any, index: number) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/30 border border-border text-sm"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{intent.intent}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {intent.category}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}