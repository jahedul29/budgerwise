import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getUserAiUsageSummary, getRecentUsageLedger } from '@/lib/ai-usage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const { userId } = await params;
  const doc = await adminDb.collection('users').doc(userId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [summary, recentEntries] = await Promise.all([
    getUserAiUsageSummary(userId),
    getRecentUsageLedger(userId, 50),
  ]);

  return NextResponse.json({ summary, recentEntries });
}
