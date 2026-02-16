// frontend/components/contract/PriceEstimation.tsx
/**
 * Price Estimation Component
 * Shows fair market value and lease term analysis
 */

import { useQuery } from "@tanstack/react-query";
import { backendAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PriceEstimationProps {
  contractId: string;
}

export function PriceEstimation({ contractId }: PriceEstimationProps) {
  const { data: priceData, isLoading, error } = useQuery({
    queryKey: ["price-analysis", contractId],
    queryFn: async () => {
      const response = await backendAPI.get(`api/price/contract-price-analysis/${contractId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  if (error || !priceData?.success) {
    return (
      <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-center gap-2 text-yellow-600">
          <Info className="w-5 h-5" />
          <p className="text-sm">Price analysis unavailable for this contract</p>
        </div>
      </Card>
    );
  }

  const { price_estimate, lease_analysis, comparison } = priceData;

  return (
    <div className="space-y-6">
      {/* Fair Market Value */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold">Fair Market Value</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">MSRP Range</p>
            <p className="text-lg font-semibold">
              {formatCurrency(price_estimate.msrp_low)} - {formatCurrency(price_estimate.msrp_high)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average MSRP</p>
            <p className="text-lg font-semibold">
              {formatCurrency(price_estimate.msrp_avg)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Value</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(price_estimate.fair_market_value)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(price_estimate.depreciation_rate * 100).toFixed(0)}% depreciation
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-background/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Data Sources:</strong> {price_estimate.data_sources.join(", ")}
          </p>
        </div>
      </Card>

      {/* Payment Comparison */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold">Payment Analysis</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Your Monthly Payment</p>
            <p className="text-3xl font-bold">
              {formatCurrency(comparison.actual_monthly_payment)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Expected Payment</p>
            <p className="text-3xl font-bold text-muted-foreground">
              {formatCurrency(comparison.expected_monthly_payment)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {comparison.difference > 0 ? (
              <TrendingUp className="w-5 h-5 text-red-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-500" />
            )}
            <span className="font-semibold">
              {comparison.difference > 0 ? "Overpaying" : "Good Deal"}:{" "}
              {formatCurrency(Math.abs(comparison.difference))}/month
            </span>
          </div>
          <Badge
            className={
              comparison.verdict === "Fair"
                ? "bg-green-500 text-white"
                : "bg-yellow-500 text-white"
            }
          >
            {comparison.verdict}
          </Badge>
        </div>
      </Card>

      {/* Lease Term Fairness */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold">Lease Term Fairness</h3>
        </div>

        <div className="space-y-3">
          <FairnessRow
            label="APR"
            fair={lease_analysis.fairness_checks.apr_fair}
            rating={lease_analysis.fairness_checks.apr_rating}
          />
          <FairnessRow
            label="Down Payment"
            fair={lease_analysis.fairness_checks.down_payment_fair}
          />
          <FairnessRow
            label="Residual Value"
            fair={lease_analysis.fairness_checks.residual_value_fair}
          />
        </div>

        {/* Recommendations */}
        {lease_analysis.recommendations.length > 0 && (
          <div className="mt-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <p className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Recommendations
            </p>
            <ul className="space-y-2">
              {lease_analysis.recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Total Cost Breakdown */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <h3 className="font-semibold mb-4">Total Cost Breakdown</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-lg font-semibold">
              {formatCurrency(lease_analysis.total_cost)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Interest</p>
            <p className="text-lg font-semibold">
              {formatCurrency(lease_analysis.total_interest)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estimated Lease Value</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(price_estimate.estimated_lease_value)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Fairness Row Component
function FairnessRow({
  label,
  fair,
  rating,
}: {
  label: string;
  fair: boolean;
  rating?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {fair ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500 font-medium">Fair</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-500 font-medium">
              {rating || "Review"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}