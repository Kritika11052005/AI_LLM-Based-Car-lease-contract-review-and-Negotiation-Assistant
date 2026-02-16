'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ContainerScroll } from '../ui/container-scroll-animation';

function CircularGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        let current = 0;
        const increment = score / 60;
        const interval = setInterval(() => {
          current += increment;
          if (current >= score) {
            setAnimatedScore(score);
            clearInterval(interval);
          } else {
            setAnimatedScore(Math.floor(current));
          }
        }, 16);
        return () => clearInterval(interval);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [inView, score]);

  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = () => {
    if (animatedScore >= 75) return 'hsl(var(--color-secondary))';
    if (animatedScore >= 50) return 'hsl(var(--color-primary))';
    return 'hsl(var(--color-secondary))';
  };

  return (
    <div ref={ref} className="relative w-48 h-48">
      <svg className="transform -rotate-90" width="192" height="192">
        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r="70"
          fill="none"
          stroke="hsl(var(--color-card))"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx="96"
          cy="96"
          r="70"
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${getColor()})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-[hsl(var(--color-foreground))]">{animatedScore}</div>
        <div className="text-sm text-[hsl(var(--color-muted-foreground))] mt-1">Fairness Score</div>
      </div>
    </div>
  );
}

export default function LivePreview() {
  const mockData = {
    apr: 4.9,
    monthlyPayment: 389,
    leaseTerm: 36,
    fairnessScore: 78,
    risks: [
      {
        type: 'warning',
        title: 'High Disposition Fee',
        description: '$595 end-of-lease fee is 38% above market average',
      },
      {
        type: 'info',
        title: 'Standard Mileage Allowance',
        description: '12,000 miles/year with $0.25/mile overage',
      },
      {
        type: 'success',
        title: 'Competitive APR',
        description: 'Your 4.9% rate is in the top 25% for this vehicle class',
      },
    ],
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[hsl(var(--color-secondary))] rounded-full blur-[128px] opacity-10" />
      </div>

      {/* Container Scroll Animation */}
      <div className="flex flex-col overflow-hidden">
        <ContainerScroll
          titleComponent={
            <>
              <h2 className="text-4xl md:text-6xl font-bold">
                <span className="bg-gradient-to-r from-[hsl(var(--color-foreground))] to-[hsl(var(--color-muted-foreground))] bg-clip-text text-transparent">
                  See Your Contract
                </span>{' '}
                <br />
                <span className="text-4xl md:text-[5rem] font-bold mt-1 leading-none bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent">
                  Analyzed
                </span>
              </h2>
              <p className="text-xl text-[hsl(var(--color-muted-foreground))] max-w-2xl mx-auto mt-4">
                Real-time insights that help you make informed decisions
              </p>
            </>
          }
        >
          {/* Preview Content - This will scroll up with the animation */}
          <div className="mx-auto rounded-2xl bg-[hsl(var(--color-card))] border border-[hsl(var(--color-primary))]/20 p-8 w-full min-h-[900px]">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left side - Key metrics */}
              <div className="space-y-6">
                {/* Fairness gauge */}
                <div className="bg-[hsl(var(--color-background))] border border-[hsl(var(--color-primary))]/20 rounded-2xl p-8 flex flex-col items-center">
                  <CircularGauge score={mockData.fairnessScore} />
                  <p className="text-[hsl(var(--color-muted-foreground))] mt-6 text-center text-sm">
                    Your contract scores better than{' '}
                    <span className="text-[hsl(var(--color-secondary))] font-semibold">
                      {mockData.fairnessScore}%
                    </span>{' '}
                    of comparable leases
                  </p>
                </div>
                <div className="bg-[hsl(var(--color-background))] border border-[hsl(var(--color-primary))]/20 rounded-2xl p-4">
                  <h3 className="text-sm text-[hsl(var(--color-muted-foreground))] mb-6 uppercase tracking-wider">
                    Contract Summary
                  </h3>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-6 border-b border-[hsl(var(--color-primary))]/10">
                      <div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))] mb-1">APR</div>
                        <div className="text-3xl font-bold text-[hsl(var(--color-foreground))]">
                          {mockData.apr}%
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--color-primary))]/20 to-[hsl(var(--color-secondary))]/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-[hsl(var(--color-secondary))]" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pb-6 border-b border-[hsl(var(--color-primary))]/10">
                      <div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))] mb-1">
                          Monthly Payment
                        </div>
                        <div className="text-3xl font-bold text-[hsl(var(--color-foreground))]">
                          ${mockData.monthlyPayment}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-[hsl(var(--color-muted-foreground))] mb-1">
                          Lease Term
                        </div>
                        <div className="text-3xl font-bold text-[hsl(var(--color-foreground))]">
                          {mockData.leaseTerm} months
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                
              </div>

              {/* Right side - Risk indicators */}
              <div className="space-y-4">
                <h3 className="text-sm text-[hsl(var(--color-muted-foreground))] mb-4 uppercase tracking-wider">
                  Risk Analysis
                </h3>

                {mockData.risks.map((risk, index) => {
                  const Icon =
                    risk.type === 'warning'
                      ? AlertTriangle
                      : risk.type === 'success'
                      ? CheckCircle
                      : Info;

                  const colors = {
                    warning: {
                      border: 'border-[hsl(var(--color-secondary))]/30',
                      bg: 'bg-[hsl(var(--color-secondary))]/5',
                      icon: 'text-[hsl(var(--color-secondary))]',
                    },
                    success: {
                      border: 'border-[hsl(var(--color-secondary))]/30',
                      bg: 'bg-[hsl(var(--color-secondary))]/5',
                      icon: 'text-[hsl(var(--color-secondary))]',
                    },
                    info: {
                      border: 'border-[hsl(var(--color-primary))]/30',
                      bg: 'bg-[hsl(var(--color-primary))]/5',
                      icon: 'text-[hsl(var(--color-primary))]',
                    },
                  };

                  const color = colors[risk.type as keyof typeof colors];

                  return (
                    <div
                      key={index}
                      className={`bg-[hsl(var(--color-background))] border ${color.border} rounded-xl p-6 ${color.bg}`}
                    >
                      <div className="flex gap-4">
                        <div className={`flex-shrink-0 ${color.icon}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[hsl(var(--color-foreground))] mb-1">
                            {risk.title}
                          </h4>
                          <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
                            {risk.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ContainerScroll>
      </div>
    </section>
  );
}