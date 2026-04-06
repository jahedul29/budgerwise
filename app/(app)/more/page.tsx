'use client';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Wallet, Tag, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  { label: 'Accounts', icon: Wallet, href: '/more/accounts', color: 'text-accent' },
  { label: 'Categories', icon: Tag, href: '/more/categories', color: 'text-primary-500' },
  { label: 'Settings', icon: Settings, href: '/more/settings', color: 'text-navy-400' },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function MorePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <PageWrapper>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-4 py-6 lg:px-8 lg:py-8 space-y-5"
      >
        <motion.div variants={fadeUp} className="lg:hidden">
          <h1 className="text-xl font-display font-bold text-navy-900 dark:text-navy-50 mb-4">More</h1>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl flex items-center gap-4 p-5">
            <Avatar className="h-14 w-14 ring-2 ring-primary-200/50 dark:ring-primary-800/50">
              <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
              <AvatarFallback className="text-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-display font-bold text-navy-800 dark:text-navy-50 truncate">{user?.name || 'User'}</p>
              <p className="text-sm text-navy-400 dark:text-navy-300 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100/60 dark:divide-white/[0.04]">
            {menuItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-navy-50/50 dark:hover:bg-white/[0.03] group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-light dark:bg-white/[0.04]">
                  <item.icon className={`h-[18px] w-[18px] ${item.color}`} />
                </div>
                <span className="flex-1 text-sm font-medium text-navy-800 dark:text-navy-50">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-navy-300 dark:text-navy-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-expense/15 bg-expense/5 px-5 py-4 text-sm font-semibold text-expense transition-all hover:bg-expense/10 hover:border-expense/25 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-expense/10">
              <LogOut className="h-[18px] w-[18px]" />
            </div>
            Sign Out
          </button>
        </motion.div>

        <p className="text-center text-xs text-navy-400 dark:text-navy-300 pt-4">
          BudgetWise v1.0.0
        </p>
      </motion.div>
    </PageWrapper>
  );
}
