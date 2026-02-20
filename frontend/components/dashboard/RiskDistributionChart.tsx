/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface RiskDistributionChartProps {
  data: { rating: string; count: number }[];
}

const COLORS = {
  Excellent: "#22c55e",
  Good: "#3b82f6",
  Fair: "#eab308",
  Poor: "#f97316",
  "Very Poor": "#ef4444",
};

const renderLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.06) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
      style={{ pointerEvents: "none" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;

  const { rating, count } = payload[0].payload;
  const color = COLORS[rating as keyof typeof COLORS] || "#8884d8";

  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${color}`,
        borderRadius: "8px",
        padding: "10px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        minWidth: "130px",
      }}
    >
      <p style={{ color: color, margin: 0, fontWeight: 700, fontSize: 14 }}>
        {rating}
      </p>
      <p style={{ color: "#111827", margin: "4px 0 0", fontSize: 13 }}>
        Count: <span style={{ fontWeight: 700 }}>{count}</span>
      </p>
    </div>
  );
};

export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.rating as keyof typeof COLORS] || "#8884d8"}
            />
          ))}
        </Pie>
        <Tooltip
          content={<CustomTooltip />}
          wrapperStyle={{
            backgroundColor: "transparent",
            border: "none",
            outline: "none",
            boxShadow: "none",
          }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#94a3b8", fontSize: 13 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}