// frontend/components/contract/FairnessScoreCard.tsx
/**
 * Comprehensive Fairness Score Display
 * Shows 0-100 score with detailed breakdown
 */

import { useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface FairnessScoreProps {
  contractId: string;
}

export function FairnessScoreCard({ contractId }: FairnessScoreProps) {
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch fairness score
  const { data: fairnessData, isLoading, error, refetch } = useQuery({
    queryKey: ["fairness-score", contractId],
    queryFn: async () => {
      const response = await backendAPI.post(`api/fairness/calculate-fairness/${contractId}`);
      return response.data;
    },
  });

  const handleRecalculate = async () => {
    setIsCalculating(true);
    await refetch();
    setIsCalculating(false);
  };

  if (isLoading || isCalculating) {
    return (
      <Card className="p-6">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-center gap-2 text-yellow-600">
          <Info className="w-5 h-5" />
          <p className="text-sm">Fairness score unavailable. Analyzing contract...</p>
        </div>
      </Card>
    );
  }

  const { fairness_score, rating, summary, breakdown, red_flags, warnings, recommendations } = fairnessData;

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 55) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getRatingColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 55) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Contract Fairness Score
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRecalculate}
            disabled={isCalculating}
          >
            <RefreshCw className={`w-4 h-4 ${isCalculating ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className={`text-6xl font-bold ${getScoreColor(fairness_score)}`}>
              {Math.round(fairness_score)}
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <Badge className={`mt-2 ${getRatingColor(fairness_score)} text-white`}>
              {rating}
            </Badge>
          </div>

          <div className="w-48">
            <Progress value={fairness_score} className="h-3" />
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{summary}</p>
      </Card>

      {/* Score Breakdown */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          <ScoreBar label="APR Fairness" score={breakdown.apr_score} max={25} />
          <ScoreBar label="Monthly Payment" score={breakdown.payment_score} max={20} />
          <ScoreBar label="Down Payment" score={breakdown.down_payment_score} max={15} />
          <ScoreBar label="Mileage Terms" score={breakdown.mileage_score} max={15} />
          <ScoreBar label="Fees & Penalties" score={breakdown.fees_score} max={15} />
          <ScoreBar label="Residual Value" score={breakdown.residual_score} max={10} />
        </div>
      </Card>

      {/* Red Flags */}
      {red_flags.length > 0 && (
        <Card className="p-6 border-red-500/30 bg-red-500/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            🚩 Red Flags ({red_flags.length})
          </h3>
          <ul className="space-y-2">
            {red_flags.map((flag: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2 p-2 rounded bg-red-500/10">
                <span className="text-red-500 font-bold mt-0.5">•</span>
                <span className="flex-1">{flag}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <Info className="w-5 h-5" />
            ⚠️ Warnings ({warnings.length})
          </h3>
          <ul className="space-y-2">
            {warnings.map((warning: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2 p-2 rounded bg-yellow-500/10">
                <span className="text-yellow-500 font-bold mt-0.5">•</span>
                <span className="flex-1">{warning}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-500" />
          💡 Negotiation Recommendations
        </h3>
        <ul className="space-y-2">
          {recommendations.map((rec: string, i: number) => (
            <li key={i} className="text-sm flex items-start gap-2 p-2 rounded bg-blue-500/10">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span className="flex-1">{rec}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// Score Bar Component
function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = (score / max) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {score.toFixed(1)}/{max}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}