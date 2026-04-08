import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getUserAiUsageSummary } from '@/lib/ai-usage';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const summary = await getUserAiUsageSummary(userId);
  return NextResponse.json(summary);
}
