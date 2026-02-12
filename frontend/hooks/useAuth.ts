/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { LoginRequest, SignupRequest, AuthResponse } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, setToken, logout, isLoading } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const formData = new URLSearchParams();
      formData.append("username", credentials.email);
      formData.append("password", credentials.password);
      
      const response = await api.post<AuthResponse>("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setToken(data.access_token);
      setUser(data.user);
      toast.success("Login successful!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.detail || "Login failed");
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupRequest) => {
      const response = await api.post<AuthResponse>("/auth/register", data);
      return response.data;
    },
    onSuccess: (data) => {
      setToken(data.access_token);
      setUser(data.user);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.detail || "Signup failed");
    },
  });

  // Logout function
  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: handleLogout,
    isLoginLoading: loginMutation.isPending,
    isSignupLoading: signupMutation.isPending,
  };
}