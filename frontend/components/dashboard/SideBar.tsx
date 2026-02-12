'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Upload,
  FileText,
  MessageSquare,
  History,
  GitCompare,
  Settings,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StaggeredMenu from '../StaggeredMenu';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload Contract', href: '/dashboard/upload', icon: Upload },
  { name: 'Contracts', href: '/dashboard/contracts', icon: FileText },
  { name: 'Negotiation', href: '/dashboard/negotiation', icon: MessageSquare },
  { name: 'History', href: '/dashboard/history', icon: History },
  { name: 'Comparison', href: '/dashboard/comparison', icon: GitCompare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // For mobile: use StaggeredMenu
  const menuItems = navigation.map((item) => ({
    label: item.name,
    ariaLabel: `Navigate to ${item.name}`,
    link: item.href,
  }));

  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <StaggeredMenu
                position="right"
                items={menuItems}
                displaySocials={false}
                displayItemNumbering={true}
                menuButtonColor="#E5E7EB"
                openMenuButtonColor="#fff"
                changeMenuColorOnOpen={true}
                colors={['#2563EB', '#00D4A8']}
                logoUrl="/logo.svg"
                accentColor="#2563EB"
                onMenuOpen={() => setIsMobileMenuOpen(true)}
                onMenuClose={() => setIsMobileMenuOpen(false)} isFixed={false}        />
        
        {/* Mobile header logo */}
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan rounded-lg flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">CarLease AI</span>
        </div>
      </div>
    );
  }

  // For desktop: collapsible sidebar
  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? '80px' : '256px',
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1], // Smooth easing
      }}
      className={cn(
        'relative bg-ocean-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col',
        'hidden md:flex',
        className
      )}
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center justify-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan rounded-lg flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <motion.span
            initial={false}
            animate={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
            }}
            transition={{
              duration: 0.2,
              ease: 'easeInOut',
            }}
            className="text-xl font-bold gradient-text whitespace-nowrap"
            style={{ overflow: 'hidden' }}
          >
            CarLease AI
          </motion.span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'mx-3 flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative',
                'hover:bg-white/5',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-gray-400 hover:text-white'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <div className={cn(
                'w-5 h-5 flex-shrink-0 flex items-center justify-center',
                isCollapsed && 'mx-auto'
              )}>
                <item.icon className={cn(
                  'w-5 h-5 transition-all duration-200',
                  isActive && 'text-primary',
                  'group-hover:scale-110'
                )} />
              </div>
              
              {/* Label */}
              <motion.span
                initial={false}
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto',
                  marginLeft: isCollapsed ? 0 : 12,
                }}
                transition={{
                  duration: 0.2,
                  ease: 'easeInOut',
                }}
                className="font-medium whitespace-nowrap text-sm"
                style={{ overflow: 'hidden' }}
              >
                {item.name}
              </motion.span>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-6 px-3 py-2 bg-ocean-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                  {item.name}
                  <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-3 h-3 bg-ocean-700 border-l border-t border-white/10 rotate-45" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Section */}
      <div className="p-3 border-t border-white/10">
        <motion.div
          initial={false}
          animate={{
            height: isCollapsed ? '60px' : 'auto',
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className="bg-ocean-800/80 backdrop-blur-sm rounded-lg border border-white/5 overflow-hidden"
        >
          {!isCollapsed ? (
            <div className="p-4">
              <div className="text-sm font-medium mb-1">Free Plan</div>
              <div className="text-xs text-gray-400 mb-3">3 of 5 contracts used</div>
              <div className="w-full bg-ocean-700 rounded-full h-2 mb-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-primary to-cyan rounded-full"
                />
              </div>
              <Link href="/upgrade">
                <button className="w-full btn-gradient text-sm py-2 rounded-md hover:scale-105 transition-transform">
                  Upgrade to Pro
                </button>
              </Link>
            </div>
          ) : (
            <div className="p-3 flex justify-center items-center h-full">
              <Link href="/upgrade">
                <button 
                  className="w-12 h-12 btn-gradient rounded-lg flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  title="Upgrade to Pro"
                >
                  <div className="text-xs font-bold">PRO</div>
                </button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute top-20 w-6 h-6 bg-ocean-700 border border-white/10 rounded-full',
          'flex items-center justify-center hover:bg-ocean-600 transition-all',
          'hover:scale-110 shadow-lg z-20',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          isCollapsed ? '-right-3' : '-right-3'
        )}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>
    </motion.aside>
  );
}