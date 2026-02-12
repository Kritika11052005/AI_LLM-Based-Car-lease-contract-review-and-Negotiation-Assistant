"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Sidebar } from "@/components/dashboard/SideBar";
import { 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle 
} from "lucide-react";
import gsap from "gsap";
import Galaxy from '@/components/Galaxy';

export default function DashboardPage() {
  const { user } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const stats = [
    {
      name: "Total Contracts",
      value: "0",
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Avg Fairness Score",
      value: "N/A",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      name: "Red Flags Found",
      value: "0",
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      name: "Saved Deals",
      value: "0",
      icon: CheckCircle,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  useEffect(() => {
    // GSAP Animations
    const ctx = gsap.context(() => {
      // Header animation - fade in from top
      gsap.from(headerRef.current, {
        opacity: 0,
        y: -50,
        duration: 1,
        ease: "power3.out",
      });

      // Stats cards - stagger animation from bottom
      gsap.from(".stat-card", {
        opacity: 0,
        y: 60,
        duration: 0.8,
        stagger: 0.15,
        ease: "back.out(1.7)",
        delay: 0.3,
      });

      // Cards section - fade in with scale
      gsap.from(cardsRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: "power2.out",
        delay: 0.8,
      });

      // Continuous floating animation for stat values
      gsap.to(".stat-value", {
        y: -5,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.2,
      });

      // Icon rotation on hover effect
      const statCards = document.querySelectorAll(".stat-card");
      statCards.forEach((card) => {
        const icon = card.querySelector(".stat-icon");
        
        card.addEventListener("mouseenter", () => {
          gsap.to(icon, {
            rotation: 360,
            scale: 1.2,
            duration: 0.6,
            ease: "back.out(2)",
          });
        });
        
        card.addEventListener("mouseleave", () => {
          gsap.to(icon, {
            rotation: 0,
            scale: 1,
            duration: 0.4,
            ease: "power2.out",
          });
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Galaxy Background - Lowest layer */}
      <div className="fixed inset-0 w-full h-full z-0">
        <Galaxy 
          mouseRepulsion
          mouseInteraction
          density={1}
          glowIntensity={0.3}
          saturation={0}
          hueShift={140}
          twinkleIntensity={0.3}
          rotationSpeed={0.1}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          starSpeed={0.5}
          speed={1}
        />
      </div>

      {/* Sidebar - Higher layer */}
      <Sidebar />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-8 md:p-12 lg:p-16">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Header */}
          <div ref={headerRef} className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#B19EEF] to-[#5227FF] bg-clip-text text-transparent">
              Welcome back, {user?.fullName?.split(" ")[0] || "User"}!
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your car lease contracts and negotiations.
            </p>
          </div>

          {/* Stats Grid */}
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.name}
                  className="stat-card p-6 hover:shadow-lg transition-shadow duration-300 border-border/50 hover:border-primary/50 backdrop-blur-md bg-card/70"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.name}</p>
                      <p className="stat-value text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`stat-icon p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-border/50 backdrop-blur-md bg-card/70">
              <h3 className="text-lg font-semibold mb-4">Get Started</h3>
              <div className="space-y-3">
                <a
                  href="/dashboard/upload"
                  className="block p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <h4 className="font-medium text-primary">Upload Your First Contract</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get AI-powered analysis and negotiation tips
                  </p>
                </a>
              </div>
            </Card>

            <Card className="p-6 border-border/50 backdrop-blur-md bg-card/70">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>No recent activity</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}