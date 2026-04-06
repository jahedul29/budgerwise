'use client';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SyncIndicator } from '@/components/shared/SyncIndicator';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { getGreeting } from '@/lib/utils';
import { format } from 'date-fns';

export function Header() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 glass-nav lg:bg-transparent lg:backdrop-blur-none lg:border-none">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-6">
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Avatar only on mobile (sidebar has it on desktop) */}
          <Avatar className="h-10 w-10 ring-2 ring-primary-100 dark:ring-primary-900/50 lg:hidden">
            <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
            <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-sm lg:text-2xl font-semibold lg:font-bold font-display text-navy-900 dark:text-navy-50">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-xs lg:text-sm text-navy-400 dark:text-navy-300">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <SyncIndicator />
          <SignOutButton compact />
        </div>
      </div>
    </header>
  );
}
