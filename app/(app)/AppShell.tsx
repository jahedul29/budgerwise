'use client';
import { useSession } from 'next-auth/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSync } from '@/hooks/useSync';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  useOnlineStatus();
  useSync(session?.user?.id);

  return <>{children}</>;
}
