'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function Counter({ end, label }: { end: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const duration = 2000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [inView, end]);

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8 }}
    >
      <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent mb-2">
        {count}%
      </div>
      <div className="text-[hsl(var(--color-muted-foreground))]">{label}</div>
    </motion.div>
  );
}

export default function Problem() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'top 30%',
          scrub: 1,
        },
        y: 100,
        opacity: 0,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const painPoints = [
    {
      title: 'Hidden Fees Everywhere',
      description:
        'Acquisition fees, disposition fees, wear-and-tear charges—most people discover these at the worst possible time.',
    },
    {
      title: 'Unfair Mileage Terms',
      description:
        'Strict limits with punitive per-mile charges that far exceed industry standards.',
    },
    {
      title: 'Unclear Early Termination',
      description:
        'Want out early? The penalties are often buried and astronomically high.',
    },
    {
      title: 'No Negotiation Leverage',
      description:
        "Without knowing what's fair, you have zero power at the negotiation table.",
    },
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative py-32 px-4 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[hsl(var(--color-secondary))] rounded-full blur-[128px] opacity-10" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.h2
          ref={titleRef}
          className="text-4xl md:text-6xl font-bold text-center mb-6"
          style={{ willChange: 'transform' }}
        >
          <span className="bg-gradient-to-r from-[hsl(var(--color-foreground))] to-[hsl(var(--color-muted-foreground))] bg-clip-text text-transparent">
            Most Car Lease Contracts
          </span>
          <br />
          <span className="bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent">
            Hide What Matters
          </span>
        </motion.h2>

        <motion.p
          className="text-xl text-center text-[hsl(var(--color-muted-foreground))] mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Buried in legal jargon are fees, penalties, and terms that cost you thousands. 
          We expose them all.
        </motion.p>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-12 mb-20">
          <Counter end={68} label="Of contracts contain hidden fees" />
          <Counter end={89} label="Don't read the full contract" />
          <Counter end={42} label="Overpay on average" />
        </div>

        {/* Expanding Cards Container */}
        <motion.div
          className="flex flex-col md:flex-row gap-2 max-w-5xl mx-auto h-auto md:h-[400px] p-2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {painPoints.map((item, index) => (
            <div
              key={index}
              className="group flex-1 overflow-hidden cursor-pointer rounded-lg transition-all duration-500 ease-in-out bg-[hsl(var(--color-card))] border border-[hsl(var(--color-primary))]/30 hover:flex-[4] hover:border-[hsl(var(--color-primary))]/60 flex items-center justify-center p-4 min-h-[200px] md:min-h-0"
            >
              <div className="relative flex items-center justify-center h-full w-full">
                {/* Collapsed Title (visible when not hovering) */}
                <span className="text-center transition-all duration-500 ease-in-out transform md:rotate-[-90deg] group-hover:rotate-0 group-hover:opacity-0 uppercase tracking-wider font-bold text-[hsl(var(--color-primary))] text-sm md:text-base whitespace-nowrap md:whitespace-normal">
                  {item.title}
                </span>
                
                {/* Expanded Content (visible when hovering) */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-center items-center p-6 text-center pointer-events-none group-hover:pointer-events-auto">
                  <h3 className="text-xl md:text-2xl font-bold text-[hsl(var(--color-foreground))] mb-4">
                    {item.title}
                  </h3>
                  <p className="text-[hsl(var(--color-muted-foreground))] text-sm md:text-base leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}