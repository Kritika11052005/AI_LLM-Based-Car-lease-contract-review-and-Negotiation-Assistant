/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/lib/api.ts - UPDATED for SSR contracts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { APIError } from "@/types";

/**
 * Axios instance for BACKEND (Python FastAPI - port 8000)
 * Used ONLY for: Upload, Extract-SLA, VIN lookup, Negotiation (AI processing)
 */
export const backendAPI: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * Axios instance for FRONTEND (Next.js API routes - port 3000)
 * Used for: Authentication + Contract fetching (SSR)
 */
export const frontendAPI: AxiosInstance = axios.create({
  baseURL: "/api", // Relative URL - calls Next.js API routes
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Add interceptors to backendAPI
backendAPI.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

backendAPI.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIError>) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    
    if (!error.response) {
      return Promise.reject({
        detail: "Network error. Please check your connection.",
        status: 0,
      });
    }
    
    return Promise.reject({
      detail: error.response.data?.detail || "An error occurred",
      status: error.response.status,
    });
  }
);

// Add interceptors to frontendAPI
frontendAPI.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

frontendAPI.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIError>) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    
    if (!error.response) {
      return Promise.reject({
        detail: "Network error. Please check your connection.",
        status: 0,
      });
    }
    
    return Promise.reject({
      detail: error.response.data?.detail || error.response.data?.error || "An error occurred",
      status: error.response.status,
    });
  }
);

/**
 * Upload file with progress tracking (to backend)
 */
export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  
  const config: AxiosRequestConfig = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    },
  };
  
  const response = await backendAPI.post(url, formData, config);
  return response.data;
};

/**
 * Helper function to handle API errors
 */
export const handleAPIError = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "detail" in error) {
    return (error as APIError).detail;
  }
  return "An unexpected error occurred";
};

// Default export is frontendAPI now (for SSR contract fetching)
export default frontendAPI;