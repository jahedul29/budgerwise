'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, List, BarChart3, Target, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const tabs = [
  { name: 'Home', icon: Home, href: '/dashboard' },
  { name: 'Transactions', icon: List, href: '/transactions' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Budgets', icon: Target, href: '/budgets' },
  { name: 'More', icon: MoreHorizontal, href: '/more' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-nav safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[11px] font-medium transition-all min-w-[56px] no-tap-highlight',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-navy-300 dark:text-navy-400 active:text-navy-500 dark:active:text-navy-200'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-2xl bg-primary-50 dark:bg-primary-500/10"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <tab.icon className={cn(
                'relative z-10 h-5 w-5 transition-colors',
                isActive && 'text-primary-500'
              )} />
              <span className="relative z-10">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
