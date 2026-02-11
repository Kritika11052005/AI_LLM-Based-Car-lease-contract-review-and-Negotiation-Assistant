import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupees (₹)
 * Handles Indian numbering system (lakhs, crores)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency without symbol (for compact display)
 */
export function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format in lakhs/crores for Indian users
 * Example: 1500000 → "15 Lakhs"
 */
export function formatIndianCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) {
    // Crores
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (absAmount >= 100000) {
    // Lakhs
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (absAmount >= 1000) {
    // Thousands
    return `₹${(amount / 1000).toFixed(2)} K`;
  } else {
    return `₹${amount.toFixed(0)}`;
  }
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate monthly payment affordability
 */
export function calculateAffordability(
  monthlyPayment: number,
  monthlyIncome: number
): {
  percentage: number;
  status: "excellent" | "good" | "fair" | "poor";
  color: string;
} {
  const percentage = (monthlyPayment / monthlyIncome) * 100;
  
  if (percentage <= 15) {
    return { percentage, status: "excellent", color: "text-green-500" };
  } else if (percentage <= 20) {
    return { percentage, status: "good", color: "text-blue-500" };
  } else if (percentage <= 30) {
    return { percentage, status: "fair", color: "text-yellow-500" };
  } else {
    return { percentage, status: "poor", color: "text-red-500" };
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Sleep utility for animations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}