/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Sparkles,
  ArrowUpRight,
  Upload,
  MessageSquare,
  ChevronRight,
  Eye,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DashboardAnalytics } from "@/types/dashboard";
import Particles from "@/components/Particles";

interface DashboardClientProps {
  analytics: DashboardAnalytics;
  userName: string;
}

export function DashboardClient({ analytics, userName }: DashboardClientProps) {
  const router = useRouter();
  const hasContracts = analytics.kpi_summary.total_contracts_analyzed > 0;

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E5E7EB] relative overflow-hidden">
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

      {/* Dashboard Content */}
      <div className="relative z-10 p-4 md:p-8 space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2 ml-0 md:ml-16"
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#2563EB] to-[#00D4A8] bg-clip-text text-transparent">
            Welcome back, {userName.split(' ')[0]}! 👋
          </h1>
          <p className="text-[#9CA3AF]">
            Here&apos;s an overview of your car lease contracts and AI insights
          </p>
        </motion.div>

        {hasContracts ? (
          <>
            {/* KPI Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Contracts Analyzed"
                value={analytics.kpi_summary.total_contracts_analyzed}
                trend={analytics.kpi_summary.trends.contracts_trend}
                icon={FileText}
                color="from-[#2563EB] to-[#1E40AF]"
                delay={0}
              />
              <KPICard
                title="Average Fairness Score"
                value={analytics.kpi_summary.average_fairness_score}
                suffix="%"
                trend={analytics.kpi_summary.trends.fairness_trend}
                icon={TrendingUp}
                color="from-[#10B981] to-[#059669]"
                delay={0.1}
              />
              <KPICard
                title="Items Need Action"
                value={analytics.kpi_summary.actionable_items}
                trend={analytics.kpi_summary.trends.actionable_items_trend}
                icon={AlertCircle}
                color="from-[#F59E0B] to-[#D97706]"
                delay={0.2}
                invertTrend={true}
              />
              <KPICard
                title="Contracts This Month"
                value={analytics.kpi_summary.contracts_this_month}
                trend={analytics.kpi_summary.trends.contracts_this_month_trend}
                icon={FileText}
                color="from-[#7C3AED] to-[#6D28D9]"
                delay={0.3}
              />
            </div>

            {/* Latest Contract Snapshot */}
            {analytics.latest_contract && (
              <LatestContractCard contract={analytics.latest_contract} />
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 ">
              {/* Fairness Trend Chart */}
              {analytics.fairness_trend.length > 0 && (
                <FairnessTrendChart data={analytics.fairness_trend} />
              )}

              {/* Risk Distribution Chart */}
              <RiskDistributionChart distribution={analytics.risk_distribution} />
            </div>

            {/* Risk Overview & Recent Activity Row - Move closer to charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 -mt-0.5">
              <RiskOverviewPanel overview={analytics.risk_overview} />
              <RecentActivityFeed activities={analytics.recent_activities} />
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  prefix = '',
  suffix = '',
  trend,
  icon: Icon,
  color,
  delay,
  formatValue = false,
  invertTrend = false
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend: number;
  icon: any;
  color: string;
  delay: number;
  formatValue?: boolean;
  invertTrend?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = formatValue
    ? displayValue.toLocaleString('en-IN')
    : displayValue;

  // For actionable items, lower is better, so invert trend colors
  const isPositiveTrend = invertTrend ? trend < 0 : trend > 0;
  const trendColor = isPositiveTrend ? 'text-[#10B981]' : 'text-[#EF4444]';
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-[#111827] border-[#1F2937] hover:border-[#2563EB] transition-all duration-300 hover:shadow-lg hover:shadow-[#2563EB]/20 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {trend !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <p className="text-sm text-[#9CA3AF] mb-2">{title}</p>
          <p className="text-3xl font-bold text-[#E5E7EB]">
            {prefix}{formattedValue}{suffix}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LatestContractCard({ contract }: { contract: any }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="bg-[#111827] border-[#1F2937] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#2563EB]/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#00D4A8]" />
                Latest Contract Analysis
              </CardTitle>
              <p className="text-[#9CA3AF]">{contract.contract_name}</p>
            </div>
            <Badge
              variant={contract.risk_level === 'high' ? 'destructive' : contract.risk_level === 'medium' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {contract.risk_level.toUpperCase()} RISK
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Fairness Score Gauge */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#1F2937"
                    strokeWidth="8"
                    fill="none"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#fairnessGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 351.68" }}
                    animate={{
                      strokeDasharray: `${(contract.fairness_score / 100) * 351.68} 351.68`
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                  <defs>
                    <linearGradient id="fairnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#00D4A8" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold">{contract.fairness_score}</span>
                  <span className="text-xs text-[#9CA3AF]">Fairness</span>
                </div>
              </div>
            </div>

            {/* AI Confidence */}
            <div className="space-y-2">
              <p className="text-sm text-[#9CA3AF]">AI-SLA Extraction Confidence</p>
              <p className="text-2xl font-bold">{contract.ai_confidence_percentage}%</p>
              <Progress value={contract.ai_confidence_percentage} className="h-2" />
            </div>

            {/* Upload Date */}
            <div className="space-y-2">
              <p className="text-sm text-[#9CA3AF]">Uploaded</p>
              <p className="text-lg font-semibold">
                {new Date(contract.upload_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Top Red Flags */}
          {contract.top_red_flags.length > 0 && (
            <div className="space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                Top Red Flags
              </p>
              <div className="space-y-2">
                {contract.top_red_flags.map((flag: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-[#0B1220] rounded-lg border border-[#1F2937] flex items-start gap-3"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${flag.severity === 'high' ? 'bg-[#EF4444]' :
                      flag.severity === 'medium' ? 'bg-[#F59E0B]' :
                        'bg-[#10B981]'
                      }`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{flag.title}</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">{flag.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
            className="w-full bg-gradient-to-r from-[#2563EB] to-[#00D4A8] hover:opacity-90"
          >
            View Full Breakdown
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FairnessTrendChart({ data }: { data: any[] }) {
  const sortedData = [...data].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sortedData.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    score: d.fairness_score
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#2563EB]" />
            Fairness Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #1F2937',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ fill: '#2563EB', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RiskDistributionChart({ distribution }: { distribution: any }) {
  const data = [
    { name: 'High Risk', value: distribution.high_risk, color: '#EF4444' },
    { name: 'Medium Risk', value: distribution.medium_risk, color: '#F59E0B' },
    { name: 'Low Risk', value: distribution.low_risk, color: '#10B981' },
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#7C3AED]" />
            Risk Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                itemStyle={{ color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            {data.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-[#9CA3AF]">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RiskOverviewPanel({ overview }: { overview: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
    >
      <Card className="bg-gradient-to-br from-[#111827] to-[#1F2937] border-[#F59E0B]/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            Risk Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-[#0B1220] rounded-lg border border-[#F59E0B]/20">
            <p className="text-sm text-[#9CA3AF] mb-2">Status</p>
            <p className={`text-lg font-semibold ${overview.contracts_needing_attention > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'
              }`}>
              {overview.summary}
            </p>
          </div>

          {/* Risk Breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Portfolio Breakdown:</p>

            {overview.high_risk_contracts > 0 && (
              <div className="flex items-center justify-between p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-sm">High Risk Contracts</span>
                </div>
                <Badge variant="destructive">{overview.high_risk_contracts}</Badge>
              </div>
            )}

            {overview.medium_risk_contracts > 0 && (
              <div className="flex items-center justify-between p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-sm">Medium Risk Contracts</span>
                </div>
                <Badge className="bg-[#F59E0B]">{overview.medium_risk_contracts}</Badge>
              </div>
            )}

            {overview.low_risk_contracts > 0 && (
              <div className="flex items-center justify-between p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span className="text-sm">Low Risk Contracts</span>
                </div>
                <Badge className="bg-[#10B981]">{overview.low_risk_contracts}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecentActivityFeed({ activities }: { activities: any[] }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
    >
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#2563EB]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-[#0B1220] rounded-lg border border-[#1F2937] hover:border-[#2563EB]/50 transition-colors group"
                >
                  <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      {new Date(activity.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {activity.contract_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/dashboard/contracts/${activity.contract_id}`)}
                      className="shrink-0 h-8 px-3 text-xs hover:bg-[#2563EB]/20 hover:text-[#2563EB] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-[#9CA3AF] text-center py-8">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2563EB]/20 to-[#00D4A8]/20 flex items-center justify-center">
              <FileText className="w-12 h-12 text-[#2563EB]" />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold">No contracts yet</h2>
              <p className="text-[#9CA3AF]">
                Upload your first car lease contract to get started with AI-powered analysis
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={() => router.push("/dashboard/upload")}
                size="lg"
                className="bg-gradient-to-r from-[#2563EB] to-[#00D4A8] hover:opacity-90"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Contract
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/negotiate")}
                size="lg"
                className="border-[#1F2937] hover:bg-[#1F2937]"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Start Negotiation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}