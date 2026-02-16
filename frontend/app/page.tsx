'use client';

import { useEffect } from 'react';
import Header from '@/components/shared/Header';
import Hero from '@/components/landing/Hero3D';
import Problem from '@/components/landing/Problem';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import LivePreview from '@/components/landing/LivePreview';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  useEffect(() => {
    // Smooth scrolling with Lenis
    const loadLenis = async () => {
      const Lenis = (await import('@studio-freight/lenis')).default;
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      function raf(time: number) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);
    };

    loadLenis();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden dark">
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <LivePreview />
      <FinalCTA />
      <Footer />
    </div>
  );
}