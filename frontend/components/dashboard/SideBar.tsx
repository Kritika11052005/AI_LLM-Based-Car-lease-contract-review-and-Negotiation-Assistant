"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname,useRouter} from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  GitCompare,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Upload Contract", href: "/dashboard/upload", icon: Upload },
  { name: "My Contracts", href: "/dashboard/contracts", icon: FileText },
  { name: "Negotiate", href: "/dashboard/negotiate", icon: MessageSquare },
  { name: "Compare Offers", href: "/dashboard/compare", icon: GitCompare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Hamburger Menu Button - Enhanced Visibility */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-[60] w-12 h-12 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[#B19EEF]/20 to-[#5227FF]/20 backdrop-blur-md border border-[#B19EEF]/30 hover:border-[#B19EEF]/60 transition-all duration-300 group shadow-lg hover:shadow-[#B19EEF]/30"
        aria-label="Toggle menu"
      >
        <span
          className={cn(
            "w-6 h-0.5 bg-white transition-all duration-300 group-hover:bg-[#B19EEF]",
            isOpen && "rotate-45 translate-y-2 bg-[#B19EEF]"
          )}
        />
        <span
          className={cn(
            "w-6 h-0.5 bg-white transition-all duration-300 group-hover:bg-[#B19EEF]",
            isOpen && "opacity-0"
          )}
        />
        <span
          className={cn(
            "w-6 h-0.5 bg-white transition-all duration-300 group-hover:bg-[#B19EEF]",
            isOpen && "-rotate-45 -translate-y-2 bg-[#B19EEF]"
          )}
        />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-screen w-80 z-50 transition-transform duration-500 ease-in-out",
          "bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419]",
          "dark:from-[#0a0e1a] dark:via-[#0f1419] dark:to-[#000000]",
          "border-l border-[#B19EEF]/20",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-8">
          {/* Logo */}
          <div className="mb-12 animate-fade-in">
            <Link href="/">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#B19EEF] to-[#5227FF] bg-clip-text text-transparent">
              LeaseGaurd
            </h1></Link>
            <p className="text-sm text-gray-400 mt-1">Car Lease Review and Negotiation Assistant</p>
          </div>

          {/* User Info */}
          <div
            className="flex items-center gap-3 mb-8 p-3 rounded-lg bg-white/5 border border-[#B19EEF]/20"
            style={{ animationDelay: "100ms" }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B19EEF] to-[#5227FF] flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item, index) => {
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={toggleSidebar}
                  className={cn(
                    "group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300",
                    "hover:bg-white/10 hover:translate-x-2",
                    isActive && "bg-gradient-to-r from-[#B19EEF]/20 to-[#5227FF]/20 border-l-2 border-[#5227FF]"
                  )}
                  style={{
                    animation: isOpen ? `slideIn 0.3s ease-out ${index * 50}ms both` : "none",
                  }}
                >
                  <div className="relative">
                    <span className="absolute -left-6 text-xs text-[#B19EEF] font-mono opacity-50">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon
                      size={20}
                      className={cn(
                        "transition-colors",
                        isActive ? "text-[#5227FF]" : "text-gray-400 group-hover:text-[#B19EEF]"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-gray-300 group-hover:text-white"
                    )}
                  >
                    {item.name}
                  </span>
                  {isActive && (
                    <ChevronRight size={16} className="ml-auto text-[#5227FF]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="space-y-4 pt-6 border-t border-[#B19EEF]/20">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-gray-400">Theme</span>
              <ThemeToggle />
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                toggleSidebar();
                router.push("/");
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 hover:bg-red-500/10 hover:translate-x-2 group"
            >
              <LogOut size={20} className="text-red-400 group-hover:text-red-300" />
              <span className="text-sm font-medium text-red-400 group-hover:text-red-300">
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
}