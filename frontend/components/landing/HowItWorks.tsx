'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Upload, FileSearch, Shield, Target } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Upload Contract',
    description: 'Simply upload your PDF lease or loan agreement. We support all major dealership formats.',
    Icon: Upload,
    color: 'hsl(var(--color-primary))',
  },
  {
    number: '02',
    title: 'AI Extracts Terms',
    description: 'Our AI scans every clause, extracting APR, fees, mileage limits, penalties, and warranty details.',
    Icon: FileSearch,
    color: 'hsl(var(--color-secondary))',
  },
  {
    number: '03',
    title: 'Risk & Fairness Analysis',
    description: 'Get a comprehensive fairness score and see exactly where your contract falls vs. market standards.',
    Icon: Shield,
    color: 'hsl(var(--color-secondary))',
  },
  {
    number: '04',
    title: 'Smart Negotiation Strategy',
    description: 'Receive personalized talking points and scripts to negotiate better terms with confidence.',
    Icon: Target,
    color: 'hsl(var(--color-primary))',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
          end: 'bottom 40%',
          scrub: 1,
        },
      });

      timeline.from(timelineRef.current, {
        scaleY: 0,
        transformOrigin: 'top',
        ease: 'none',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-32 px-4"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[hsl(var(--color-foreground))] to-[hsl(var(--color-muted-foreground))] bg-clip-text text-transparent">
              How It
            </span>{' '}
            <span className="bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-xl text-[hsl(var(--color-muted-foreground))] max-w-2xl mx-auto">
            Four simple steps to transform your lease negotiation power
          </p>
        </motion.div>

        <div className="relative">
          {/* Animated timeline line */}
          <div
            ref={timelineRef}
            className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[hsl(var(--color-primary))] via-[hsl(var(--color-secondary))] to-[hsl(var(--color-secondary))]"
          />

          {/* Steps */}
          <div className="space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className={`relative flex items-center gap-8 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-8 md:left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-[hsl(var(--color-background))] flex items-center justify-center z-10"
                  style={{ backgroundColor: step.color }}
                >
                  <step.Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content card */}
                <div
                  className={`flex-1 ml-24 md:ml-0 ${
                    index % 2 === 0 ? 'md:pr-16' : 'md:pl-16'
                  }`}
                >
                  <motion.div
                    className="bg-[hsl(var(--color-card))] border border-[hsl(var(--color-primary))]/20 rounded-2xl p-8 relative group hover:border-[hsl(var(--color-primary))]/40 transition-all"
                    whileHover={{ y: -5, scale: 1.02 }}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                      style={{
                        background: `radial-gradient(600px at ${
                          index % 2 === 0 ? 'left' : 'right'
                        } center, ${step.color}10, transparent 70%)`,
                      }}
                    />

                    <div className="relative z-10">
                      <div
                        className="text-6xl font-bold mb-4 opacity-20"
                        style={{ color: step.color }}
                      >
                        {step.number}
                      </div>
                      <h3 className="text-2xl font-bold text-[hsl(var(--color-foreground))] mb-3">
                        {step.title}
                      </h3>
                      <p className="text-[hsl(var(--color-muted-foreground))] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Spacer for opposite side */}
                <div className="hidden md:block flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}