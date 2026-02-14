// frontend/lib/constants.ts - UPDATED
/**
 * Updated constants for SSR auth
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth (Next.js API routes - NOT backend)
  AUTH: {
    LOGIN: "/auth/login",       // ← Next.js route
    REGISTER: "/auth/register", // ← Next.js route
    LOGOUT: "/auth/logout",     // ← Next.js route
    ME: "/auth/me",             // ← Next.js route
  },
  
  // Backend data endpoints (no /api prefix - goes directly to backend)
  CONTRACTS: {
    UPLOAD: "/upload-contract",
    EXTRACT_SLA: (id: string) => `/extract-sla/${id}`,
    GET: (id: string) => `/contracts/${id}`,
    LIST: "/contracts",
    DELETE: (id: string) => `/contracts/${id}`,
  },
  
  // Negotiation (backend)
  NEGOTIATION: {
    ANALYZE: (id: string) => `/negotiation/analyze-contract/${id}`,
    SCRIPT: (id: string) => `/negotiation/negotiate-script/${id}`,
    ASK: (id: string) => `/negotiation/negotiate-ask/${id}`,
  },
  
  // VIN (backend)
  VIN: {
    LOOKUP: (vin: string) => `/vin-lookup/${vin}`,
  },
} as const;

/**
 * App Routes
 */
export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  UPLOAD: "/dashboard/upload",
  CONTRACTS: "/dashboard/contracts",
  CONTRACT_DETAIL: (id: string) => `/dashboard/contracts/${id}`,
  NEGOTIATE: (id: string) => `/dashboard/negotiate/${id}`,
  COMPARE: "/dashboard/compare",
  SETTINGS: "/dashboard/settings",
} as const;

/**
 * Theme colors (Deep Sea Theme)
 */
export const THEME_COLORS = {
  background: {
    light: "#FFFFFF",
    dark: "#0B1220",
  },
  card: {
    light: "#FFFFFF",
    dark: "#111827",
  },
  primary: "#2563EB",
  secondary: "#00D4A8",
  text: {
    light: "#1F2937",
    dark: "#E5E7EB",
  },
} as const;

/**
 * Fairness score thresholds
 */
export const FAIRNESS_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 20,
} as const;

/**
 * File upload settings
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_TYPES: {
    "application/pdf": [".pdf"],
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
  },
} as const;

/**
 * Currency settings for India
 */
export const CURRENCY_CONFIG = {
  LOCALE: "en-IN",
  CURRENCY: "INR",
  SYMBOL: "₹",
} as const;

/**
 * Toast messages
 */
export const TOAST_MESSAGES = {
  SUCCESS: {
    UPLOAD: "Contract uploaded successfully!",
    SAVE: "Saved successfully!",
    DELETE: "Deleted successfully!",
    COPY: "Copied to clipboard!",
  },
  ERROR: {
    UPLOAD: "Failed to upload contract. Please try again.",
    NETWORK: "Network error. Please check your connection.",
    GENERIC: "Something went wrong. Please try again.",
    AUTH: "Authentication failed. Please login again.",
  },
} as const;