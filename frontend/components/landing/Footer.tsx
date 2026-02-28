/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: 'https://www.linkedin.com/in/kritika-benjwal/',
      color: 'hsl(var(--color-primary))',
    },
    {
      name: 'GitHub',
      icon: Github,
      href: 'https://github.com/Kritika11052005',
      color: 'hsl(var(--color-foreground))',
    },
    {
      name: 'Email',
      icon: Mail,
      href: 'mailto:ananya.benjwal@gmail.com',
      color: 'hsl(var(--color-secondary))',
    },
  ];

  return (
    <footer className="relative py-16 px-4 border-t border-[hsl(var(--color-primary))]/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Left side - Branding */}
          <motion.div
            className="text-center md:text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <Link href="/" className="text-xl font-bold text-foreground flex items-center gap-2 cursor-target">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span>
              LeaseGuard
            </span>
          </Link>
            </div>
            <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
              © {currentYear} Your Name. All rights reserved.
            </p>
          </motion.div>

          {/* Center - Links */}
          <motion.div
            className="flex flex-wrap justify-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className='text-center'>
                Made with ❤️ by Kritika Benjwal
            </span>
          </motion.div>

          {/* Right side - Social links */}
          <motion.div
            className="flex gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {socialLinks.map((social, index) => (
              <motion.a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[hsl(var(--color-card))] border border-[hsl(var(--color-primary))]/20 flex items-center justify-center text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:border-[hsl(var(--color-primary))]/40 transition-all group"
                whileHover={{ y: -3, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ '--hover-color': social.color } as any}
              >
                <social.icon className="w-5 h-5" />
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl"
                  style={{ backgroundColor: social.color + '40' }}
                />
              </motion.a>
            ))}
          </motion.div>
        </div>

        
        
      </div>
    </footer>
  );
}