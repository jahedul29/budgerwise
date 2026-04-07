'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearCachedUserProfile } from '@/hooks/useStableUser';

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function SignOutButton({ className, compact = false }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        clearCachedUserProfile();
        signOut({ callbackUrl: '/login' });
      }}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border border-expense/20 bg-expense/5 text-expense transition-all hover:bg-expense/10 hover:border-expense/30',
        compact ? 'h-10 w-10 shrink-0' : 'w-full px-3 py-2.5 text-sm font-semibold',
        className
      )}
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
      {!compact ? <span>Sign Out</span> : null}
    </button>
  );
}
