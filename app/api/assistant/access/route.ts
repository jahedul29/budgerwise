import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getUserAiAccessState } from '@/lib/ai-usage';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ enabled: false, launcherVisible: false, entitlementType: 'locked' });
  }
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ enabled: false, launcherVisible: false, entitlementType: 'locked' });
  }

  const access = await getUserAiAccessState(userId);
  return NextResponse.json(access);
}
