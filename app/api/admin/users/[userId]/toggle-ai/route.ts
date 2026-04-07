import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function POST(
  request: Request,
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
  const body = await request.json().catch(() => null);
  const enabled = Boolean(body?.enabled);

  const userRef = adminDb.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await userRef.update({
    aiAssistantEnabled: enabled,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, userId, aiAssistantEnabled: enabled });
}
