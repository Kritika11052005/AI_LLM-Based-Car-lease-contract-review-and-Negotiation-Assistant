"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FairnessGaugeProps {
  score: number;
  rating?: string | null;
}

export function FairnessGauge({ score, rating }: FairnessGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (score: number) => {
    if (score >= 80) return { color: "text-green-500", bg: "bg-green-500" };
    if (score >= 60) return { color: "text-blue-500", bg: "bg-blue-500" };
    if (score >= 40) return { color: "text-yellow-500", bg: "bg-yellow-500" };
    if (score >= 20) return { color: "text-orange-500", bg: "bg-orange-500" };
    return { color: "text-red-500", bg: "bg-red-500" };
  };

  const getRating = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    if (score >= 20) return "Poor";
    return "Very Poor";
  };

  const { color, bg } = getColor(score);
  const displayRating = rating || getRating(score);

  // Calculate circumference
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center space-y-4">
      <h3 className="text-lg font-semibold">Fairness Score</h3>

      {/* Circular Progress */}
      <div className="relative w-48 h-48">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-muted"
          />
          {/* Progress Circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(color, "transition-all duration-1000 ease-out")}
            strokeLinecap="round"
          />
        </svg>

        {/* Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-5xl font-bold", color)}>
            {Math.round(animatedScore)}
          </span>
          <span className="text-sm text-muted-foreground">out of 100</span>
        </div>
      </div>

      {/* Rating Badge */}
      <div
        className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold",
          bg,
          "text-white"
        )}
      >
        {displayRating}
      </div>

      <p className="text-center text-sm text-muted-foreground max-w-xs">
        This score represents how fair your lease terms are compared to market
        standards.
      </p>
    </div>
  );
}