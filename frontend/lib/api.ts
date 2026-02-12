/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { APIError } from "@/types";

/**
 * Axios instance with base configuration
 */
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor - Attach JWT token to all requests
 */
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIError>) => {
    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401) {
      // Clear token
      Cookies.remove("access_token");
      
      // Redirect to login (only on client side)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        detail: "Network error. Please check your connection.",
        status: 0,
      });
    }
    
    // Return formatted error
    return Promise.reject({
      detail: error.response.data?.detail || "An error occurred",
      status: error.response.status,
    });
  }
);

/**
 * Upload file with progress tracking
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
  
  const response = await api.post(url, formData, config);
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

export default api;