/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Shield,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Particles from "@/components/Particles";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"profile" | "password" | "danger">("profile");

  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      window.location.reload();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: data.currentPassword,
          new_password: data.newPassword,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/account", { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Account deleted successfully");
      logout();
      router.push("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  const handleProfileUpdate = () => {
    if (!profileData.fullName || !profileData.email) {
      toast.error("Full name and email are required");
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    changePasswordMutation.mutate(passwordData);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const navItems = [
    { id: "profile" as const, label: "Profile", icon: User, desc: "Personal info" },
    { id: "password" as const, label: "Security", icon: Shield, desc: "Password & auth" },
    { id: "danger" as const, label: "Danger Zone", icon: AlertTriangle, desc: "Delete account", danger: true },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-['Sora',sans-serif] relative overflow-hidden">
      {/* Particles Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Particles
          particleColors={["#6366f1", "#818cf8", "#ffffff"]}
          particleCount={120}
          particleSpread={12}
          speed={0.08}
          particleBaseSize={80}
          moveParticlesOnHover
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      {/* Ambient glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <p className="text-indigo-400 text-xs font-semibold tracking-[0.3em] uppercase mb-2">Account</p>
          <h1
            className="text-5xl font-black tracking-tight"
            style={{ fontFamily: "'Clash Display', 'Sora', sans-serif" }}
          >
            Settings
          </h1>
          <p className="text-white/40 mt-2 text-sm">Manage your identity, security, and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-2">
            {/* Avatar Card */}
            <div className="mb-6 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
                    {user?.fullName ? getInitials(user.fullName) : "U"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0a0a0f]" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{user?.fullName || "User"}</p>
                  <p className="text-white/40 text-xs truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeSection === item.id
                    ? item.danger
                      ? "bg-red-500/10 border border-red-500/30 text-red-400"
                      : "bg-indigo-500/10 border border-indigo-500/30 text-indigo-300"
                    : "border border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  activeSection === item.id
                    ? item.danger ? "bg-red-500/20" : "bg-indigo-500/20"
                    : "bg-white/[0.06] group-hover:bg-white/[0.1]"
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none mb-0.5">{item.label}</p>
                  <p className="text-xs opacity-50 truncate">{item.desc}</p>
                </div>
                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                  activeSection === item.id ? "opacity-100" : ""
                }`} />
              </button>
            ))}
          </aside>

          {/* Main Content */}
          <main>
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base">Profile Information</h2>
                      <p className="text-white/40 text-xs">Update your personal details</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold tracking-widest text-white/40 uppercase">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                          value={profileData.fullName}
                          onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                          placeholder="John Doe"
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold tracking-widest text-white/40 uppercase">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          placeholder="john@example.com"
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                      Phone <span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span>
                    </label>
                    <div className="relative max-w-sm">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-4">
                    <button
                      onClick={handleProfileUpdate}
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                    >
                      {updateProfileMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="w-4 h-4" /> Save Changes</>
                      )}
                    </button>
                    {updateProfileMutation.isSuccess && (
                      <span className="text-emerald-400 text-xs font-medium">✓ Saved</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === "password" && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base">Security</h2>
                      <p className="text-white/40 text-xs">Update your password</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-8 space-y-5 max-w-md">
                  {[
                    { id: "currentPassword", label: "Current Password", placeholder: "Enter current password", key: "currentPassword" as const },
                    { id: "newPassword", label: "New Password", placeholder: "Min. 6 characters", key: "newPassword" as const },
                    { id: "confirmPassword", label: "Confirm New Password", placeholder: "Re-enter new password", key: "confirmPassword" as const },
                  ].map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-xs font-semibold tracking-widest text-white/40 uppercase">{field.label}</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                          type="password"
                          value={passwordData[field.key]}
                          onChange={(e) => setPasswordData({ ...passwordData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Password strength hint */}
                  {passwordData.newPassword && (
                    <div className="flex gap-1.5 items-center">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            passwordData.newPassword.length >= i * 3
                              ? i <= 2 ? "bg-amber-400" : "bg-emerald-400"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-white/30 ml-1">
                        {passwordData.newPassword.length < 6 ? "Weak" : passwordData.newPassword.length < 10 ? "Fair" : "Strong"}
                      </span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={
                        changePasswordMutation.isPending ||
                        !passwordData.currentPassword ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword
                      }
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                    >
                      {changePasswordMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                      ) : (
                        <><Lock className="w-4 h-4" /> Update Password</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {activeSection === "danger" && (
              <div className="rounded-2xl bg-red-950/20 border border-red-500/20 backdrop-blur-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-red-300">Danger Zone</h2>
                      <p className="text-red-400/50 text-xs">Irreversible actions</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-8">
                  <div className="flex items-start gap-6 p-6 rounded-xl bg-red-500/5 border border-red-500/15">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-300 mb-1">Delete Account</h3>
                      <p className="text-white/40 text-sm leading-relaxed mb-5">
                        Permanently removes your account and all associated data — contracts, negotiation history, and settings. This cannot be undone.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-red-500/20">
                            <Trash2 className="w-4 h-4" />
                            Delete My Account
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#0f0f18] border border-white/10 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/50">
                              This will permanently delete your account and remove all your data from our servers,
                              including all contracts and negotiation history. This action <strong className="text-red-400">cannot be undone</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-3">
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAccountMutation.mutate()}
                              className="bg-red-600 hover:bg-red-500 text-white border-0"
                            >
                              {deleteAccountMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                              ) : (
                                "Yes, Delete Account"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}