'use client';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Home, List, BarChart3, Target, Settings, CreditCard, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { LogoMark } from '@/components/brand/LogoMark';
import { SignOutButton } from '@/components/shared/SignOutButton';

const mainNav = [
  { name: 'Dashboard', icon: Home, href: '/dashboard' },
  { name: 'Transactions', icon: List, href: '/transactions' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Budgets', icon: Target, href: '/budgets' },
];

const secondaryNav = [
  { name: 'Accounts', icon: CreditCard, href: '/more/accounts' },
  { name: 'Categories', icon: Tag, href: '/more/categories' },
  { name: 'Settings', icon: Settings, href: '/more/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] xl:w-[280px] h-screen sticky top-0 glass-nav border-r border-gray-200/50 dark:border-white/[0.04]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow-sm">
          <LogoMark className="h-6.5 w-6.5" />
        </div>
        <span className="font-display text-xl font-bold tracking-tight text-gradient">BudgetWise</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scroll">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-navy-400 dark:text-navy-300">
          Main
        </p>
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 no-tap-highlight group',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-navy-400 dark:text-navy-200 hover:text-navy-700 dark:hover:text-white hover:bg-navy-50/50 dark:hover:bg-white/[0.04]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200/50 dark:border-primary-500/20"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon className={cn(
                'relative z-10 h-[18px] w-[18px] transition-colors',
                isActive ? 'text-primary-500' : 'text-navy-300 dark:text-navy-400 group-hover:text-navy-500 dark:group-hover:text-navy-200'
              )} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}

        <div className="my-4 mx-3 border-t border-gray-200/60 dark:border-white/[0.04]" />

        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-navy-400 dark:text-navy-300">
          Manage
        </p>
        {secondaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 no-tap-highlight group',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-navy-400 dark:text-navy-200 hover:text-navy-700 dark:hover:text-white hover:bg-navy-50/50 dark:hover:bg-white/[0.04]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200/50 dark:border-primary-500/20"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon className={cn(
                'relative z-10 h-[18px] w-[18px] transition-colors',
                isActive ? 'text-primary-500' : 'text-navy-300 dark:text-navy-400 group-hover:text-navy-500 dark:group-hover:text-navy-200'
              )} />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-200/50 dark:border-white/[0.04]">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary-200/50 dark:ring-primary-800/50">
            <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
            <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-800 dark:text-navy-50 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-navy-400 dark:text-navy-300 truncate">
              {user?.email || ''}
            </p>
          </div>
          <SyncIndicator />
        </div>
        <SignOutButton className="mt-4" />
      </div>
    </aside>
  );
}
