'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import TargetCursor from '../TargetCursor';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Target Cursor */}
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
      />

      <motion.header
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${scrolled
            ? 'w-[90%] max-w-4xl backdrop-blur-xl bg-card/80 border border-primary/20 rounded-full px-6 py-3'
            : 'w-full max-w-7xl px-8 py-6'
          }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-foreground flex items-center gap-2 cursor-target">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className={`transition-opacity ${scrolled ? 'hidden sm:block' : ''}`}>
              LeaseGuard
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#about"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-target"
            >
              About
            </a>

            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-target"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-target"
            >
              How It Works
            </a>
          </div>

          {/* Login Button */}
          <Link href={user ? "/dashboard" : "/login"} className="cursor-target">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-primary hover:bg-primary/80 text-primary-foreground px-6 relative group overflow-hidden">
                <span className="relative z-10">{user ? "Dashboard" : "Login"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </motion.div>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground cursor-target"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-4 pt-4 border-t border-primary/20"
          >
            <div className="flex flex-col gap-4">
              <a
                href="#about"
                className="text-muted-foreground hover:text-foreground transition-colors cursor-target"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </a>

              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors cursor-target"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>

              <a
                href="#how-it-works"
                className="text-muted-foreground hover:text-foreground transition-colors cursor-target"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
            </div>
          </motion.div>
        )}
      </motion.header>
    </>
  );
}