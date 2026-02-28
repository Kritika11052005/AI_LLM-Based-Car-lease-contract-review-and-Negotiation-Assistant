'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('@/components/shared/Header'), { ssr: false });
const Hero = dynamic(() => import('@/components/landing/Hero3D'), { ssr: false });
const Problem = dynamic(() => import('@/components/landing/Problem'), { ssr: false });
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks'), { ssr: false });
const Features = dynamic(() => import('@/components/landing/Features'), { ssr: false });
const LivePreview = dynamic(() => import('@/components/landing/LivePreview'), { ssr: false });
const FinalCTA = dynamic(() => import('@/components/landing/FinalCTA'), { ssr: false });
const Footer = dynamic(() => import('@/components/landing/Footer'), { ssr: false });

export default function LandingPage() {
  useEffect(() => {
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