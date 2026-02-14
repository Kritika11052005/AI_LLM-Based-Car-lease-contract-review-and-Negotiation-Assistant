/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Upload,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatIndianCurrency } from "@/lib/utils";

interface DashboardStats {
  total_contracts: number;
  average_fairness_score: number;
  contracts_this_month: number;
  fairness_trend: { month: string; score: number }[];
  risk_distribution: { rating: string; count: number }[];
  estimated_savings: number;
  recent_contracts: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Fetch dashboard analytics
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: async () => {
      try {
        const response = await api.get<DashboardStats>("/dashboard/analytics");
        return response.data;
      } catch (error) {
        // Return mock data if endpoint doesn't exist yet
        return {
          total_contracts: 0,
          average_fairness_score: 0,
          contracts_this_month: 0,
          fairness_trend: [],
          risk_distribution: [],
          estimated_savings: 0,
          recent_contracts: [],
        };
      }
    },
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const hasContracts = stats && stats.total_contracts > 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Welcome back, {user?.fullName?.split(" ")[0] || "User"}! 👋
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Here&apos;s an overview of your car lease contracts and negotiations.
        </p>
      </div>

      {hasContracts ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Contracts"
              value={stats.total_contracts.toString()}
              icon={FileText}
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatsCard
              title="Avg Fairness Score"
              value={`${Math.round(stats.average_fairness_score)}%`}
              icon={TrendingUp}
              color="text-green-500"
              bgColor="bg-green-500/10"
            />
            <StatsCard
              title="This Month"
              value={stats.contracts_this_month.toString()}
              icon={CheckCircle}
              color="text-cyan-500"
              bgColor="bg-cyan-500/10"
            />
            <StatsCard
              title="Est. Savings"
              value={formatIndianCurrency(stats.estimated_savings)}
              icon={AlertCircle}
              color="text-orange-500"
              bgColor="bg-orange-500/10"
            />
          </div>

          {/* Charts would go here when data is available */}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl md:text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <Card className="border-border/50">
      <CardContent className="p-8 md:p-12">
        <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-2xl mx-auto">
          {/* Icon */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <FileText className="w-10 h-10 md:w-12 md:h-12 text-primary" />
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold">No contracts yet</h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md">
              Upload your first car lease contract to get started with AI-powered
              analysis and negotiation assistance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              onClick={() => router.push("/dashboard/upload")}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Contract
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/negotiate")}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Negotiation
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="grid sm:grid-cols-3 gap-6 mt-8 w-full">
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 mx-auto">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Get fairness scores and identify red flags instantly
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-3 mx-auto">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">Smart Negotiation</h3>
              <p className="text-sm text-muted-foreground">
                Personalized scripts and strategies for better deals
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 mx-auto">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">Save Money</h3>
              <p className="text-sm text-muted-foreground">
                Negotiate better terms and track your savings
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}