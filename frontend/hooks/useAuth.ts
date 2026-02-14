/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { frontendAPI, backendAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";
import { LoginRequest, SignupRequest, AuthResponse } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Cookies from "js-cookie";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, setToken, logout, setLoading } = useAuthStore();

  // Check if user is authenticated on mount
  useQuery({
    queryKey: ["auth-check"],
    queryFn: async () => {
      const token = Cookies.get("access_token");
      if (!token) {
        setLoading(false);
        return null;
      }

      try {
        // Use frontendAPI for auth check
        const response = await frontendAPI.get(API_ENDPOINTS.AUTH.ME);
        setUser(response.data.user);
        return response.data.user;
      } catch {
        // Token is invalid, clear it
        logout();
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      // Use frontendAPI for login (Next.js API route)
      const response = await frontendAPI.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: credentials.email,
        password: credentials.password,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Token is already set in cookie by the API route
      setUser(data.user);
      toast.success("Login successful!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.detail || error.error || "Login failed");
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupRequest) => {
      // Use frontendAPI for signup (Next.js API route)
      const response = await frontendAPI.post(API_ENDPOINTS.AUTH.REGISTER, {
        email: data.email,
        password: data.password,
        name: data.fullName,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Token is already set in cookie by the API route
      setUser(data.user);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.detail || error.error || "Signup failed");
    },
  });

  // Logout function
  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear cookie
      await frontendAPI.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
      toast.success("Logged out successfully");
      router.push("/login");
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading: useAuthStore((state) => state.isLoading),
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: handleLogout,
    isLoginLoading: loginMutation.isPending,
    isSignupLoading: signupMutation.isPending,
  };
}

// Export hook for backend API calls (contracts, VIN, negotiation)
export function useBackendAPI() {
  return backendAPI;
}