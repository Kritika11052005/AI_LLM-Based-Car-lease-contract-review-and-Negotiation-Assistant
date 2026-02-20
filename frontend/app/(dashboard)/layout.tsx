"use client";

import { Sidebar } from "@/components/dashboard/SideBar";
import Galaxy from '@/components/Galaxy';
import LoadingSpinner from "@/components/shared/LoadingSpinner"
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Sidebar Component */}
      <Sidebar />

      {/* Galaxy Background */}
      <div className="fixed top-0 left-0 w-full h-full -z-10">
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

      {/* Main Content */}
      <main className="min-h-screen">
        <LoadingSpinner/>
        {children}
      </main>
    </>
  );
}