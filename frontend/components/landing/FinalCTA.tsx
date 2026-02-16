'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function FinalCTA() {
  return (
    <section className="relative py-32 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--color-primary))] rounded-full blur-[200px] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[hsl(var(--color-secondary))] rounded-full blur-[150px] opacity-10" />
      </div>

      <motion.div
        className="max-w-4xl mx-auto text-center relative z-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="bg-[hsl(var(--color-card))]/50 backdrop-blur-xl border border-[hsl(var(--color-primary))]/30 rounded-3xl p-12 md:p-16 relative overflow-hidden">
          {/* Animated gradient border effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--color-primary))]/20 via-[hsl(var(--color-secondary))]/20 to-[hsl(var(--color-secondary))]/20 animate-pulse" />
          </div>

          <div className="relative z-10">
            <motion.h2
              className="text-4xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-[hsl(var(--color-foreground))] to-[hsl(var(--color-muted-foreground))] bg-clip-text text-transparent">
                Stop Overpaying.
              </span>
              <br />
              <span className="bg-gradient-to-r from-[hsl(var(--color-primary))] via-[hsl(var(--color-secondary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent">
                Start Negotiating Smarter.
              </span>
            </motion.h2>

            <motion.p
              className="text-xl text-[hsl(var(--color-muted-foreground))] mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Join thousands of drivers who&apos;ve saved an average of $2,400 on their
              car leases using AI-powered contract analysis.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/login" >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] hover:from-[hsl(var(--color-primary))]/80 hover:to-[hsl(var(--color-secondary))]/80 text-white px-10 py-7 text-lg relative group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started for Free
                    <ArrowRight className="w-5 h-5" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--color-secondary))] to-[hsl(var(--color-primary))] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[hsl(var(--color-primary))]/50 text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-primary))]/10 px-10 py-7 text-lg backdrop-blur-sm"
                >
                  Book a Demo
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="mt-10 flex items-center justify-center gap-6 text-sm text-[hsl(var(--color-muted-foreground))]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}