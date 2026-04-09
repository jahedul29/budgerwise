'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users } from 'lucide-react';

const tabs = [
  { href: '/admin/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 px-4 lg:px-8 pt-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
              active
                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                : 'text-navy-400 dark:text-navy-500 hover:text-navy-600 dark:hover:text-navy-300 hover:bg-navy-100/50 dark:hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
