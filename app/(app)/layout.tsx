import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppFooter } from '@/components/layout/AppFooter';
import { BottomNav } from '@/components/layout/BottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { AppShell } from './AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <AppShell>
      <OfflineBanner />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-w-0 mesh-bg">
          <div className="relative z-10 mx-auto max-w-lg lg:max-w-full">
            {children}
            <AppFooter />
          </div>
        </div>
      </div>
      <BottomNav />
    </AppShell>
  );
}
