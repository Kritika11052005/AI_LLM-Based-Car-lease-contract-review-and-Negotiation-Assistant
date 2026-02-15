// frontend/lib/constants.ts - UPDATED for SSR contracts
/**
 * Updated constants - ALL SSR now (auth + contracts)
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth (Next.js SSR API routes)
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
  
  // Contracts (Next.js SSR API routes) ← CHANGED!
  CONTRACTS: {
    UPLOAD: "/api/upload-contract",        // ← Still backend (file upload)
    EXTRACT_SLA: (id: string) => `/api/extract-sla/${id}`, // ← Still backend (AI processing)
    GET: (id: string) => `/contracts/${id}`,  // ← NOW SSR!
    LIST: "/contracts",                       // ← NOW SSR!
    DELETE: (id: string) => `/contracts/${id}`,
  },

  // Negotiation (backend - AI processing)
  NEGOTIATION: {
    ANALYZE: (id: string) => `/api/negotiation/analyze-contract/${id}`,
    SCRIPT: (id: string) => `/api/negotiation/negotiate-script/${id}`,
    ASK: (id: string) => `/api/negotiation/negotiate-ask/${id}`,
  },

  // VIN (backend - external API)
  VIN: {
    LOOKUP: (vin: string) => `/api/vin-lookup/${vin}`,
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