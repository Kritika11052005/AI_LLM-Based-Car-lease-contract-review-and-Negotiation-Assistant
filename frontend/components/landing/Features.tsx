'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Car,
  Scale,
  TrendingUp,
  MessageSquare,
  GitCompare,
} from 'lucide-react';

const features = [
  {
    title: 'SLA Extraction',
    description:
      'Automatically pull out every service level agreement, warranty term, and maintenance clause.',
    Icon: FileText,
    gradient: 'from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))]',
  },
  {
    title: 'VIN Lookup',
    description:
      'Instant vehicle history, market value, and depreciation forecasts based on VIN.',
    Icon: Car,
    gradient: 'from-[hsl(var(--color-secondary))] to-[hsl(var(--color-secondary))]',
  },
  {
    title: 'Fairness Score',
    description:
      'Get an objective 0-100 score on how your contract compares to market standards.',
    Icon: Scale,
    gradient: 'from-[hsl(var(--color-secondary))] to-[hsl(var(--color-primary))]',
  },
  {
    title: 'Price Benchmarking',
    description:
      'See real-time pricing data for similar vehicles and lease terms in your area.',
    Icon: TrendingUp,
    gradient: 'from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))]',
  },
  {
    title: 'AI Negotiation Assistant',
    description:
      'Personalized scripts and strategies based on your contract&apos;s weak points.',
    Icon: MessageSquare,
    gradient: 'from-[hsl(var(--color-secondary))] to-[hsl(var(--color-secondary))]',
  },
  {
    title: 'Contract Comparison',
    description:
      'Upload multiple offers and see side-by-side analysis to pick the best deal.',
    Icon: GitCompare,
    gradient: 'from-[hsl(var(--color-secondary))] to-[hsl(var(--color-primary))]',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-4">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[hsl(var(--color-primary))] rounded-full blur-[128px] opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-[hsl(var(--color-foreground))] to-[hsl(var(--color-muted-foreground))] bg-clip-text text-transparent">
              Everything You Need to
            </span>{' '}
            <span className="bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent">
              Win
            </span>
          </h2>
          <p className="text-xl text-[hsl(var(--color-muted-foreground))] max-w-2xl mx-auto">
            Powerful AI tools that give you the edge in every negotiation
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="group relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
            >
              {/* Rotating border container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden">
                {/* Rotating gradient border */}
                <div className="absolute inset-0 animate-rotate-border">
                  <div className={`w-full h-[130%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r ${feature.gradient}`} style={{ width: '100px' }} />
                </div>

                {/* Card content */}
                <div className="relative bg-[hsl(var(--color-card))] m-[2px] rounded-2xl p-8 h-full z-10">
                  {/* Icon with gradient background */}
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-6`}
                  >
                    <div className="w-full h-full bg-[hsl(var(--color-card))] rounded-xl flex items-center justify-center">
                      <feature.Icon className="w-7 h-7 text-[hsl(var(--color-foreground))]" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[hsl(var(--color-foreground))] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[hsl(var(--color-muted-foreground))] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes rotate-border {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        .animate-rotate-border {
          animation: rotate-border 3s linear infinite;
        }
      `}</style>
    </section>
  );
}