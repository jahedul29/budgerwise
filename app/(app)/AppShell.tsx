'use client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSync } from '@/hooks/useSync';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { useStableUser } from '@/hooks/useStableUser';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { userId } = useStableUser();
  useOnlineStatus();
  useSync(userId);

  return (
    <>
      <PullToRefresh />
      {children}
    </>
  );
}
