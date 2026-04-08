import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

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

  const data = doc.data()!;
  return NextResponse.json({
    aiAssistantEnabled: Boolean(data.aiAssistantEnabled),
    aiUseCustomTokenLimit: Boolean(data.aiUseCustomTokenLimit),
    aiMonthlyTokenLimit: typeof data.aiMonthlyTokenLimit === 'number' ? data.aiMonthlyTokenLimit : null,
    aiUnlimited: Boolean(data.aiUnlimited),
    aiHardStop: typeof data.aiHardStop === 'boolean' ? data.aiHardStop : null,
  });
}

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
  const userRef = adminDb.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof body.aiAssistantEnabled === 'boolean') {
    update.aiAssistantEnabled = body.aiAssistantEnabled;
  }
  if (typeof body.aiUseCustomTokenLimit === 'boolean') {
    update.aiUseCustomTokenLimit = body.aiUseCustomTokenLimit;
  }
  if (typeof body.aiMonthlyTokenLimit === 'number' && body.aiMonthlyTokenLimit > 0) {
    update.aiMonthlyTokenLimit = body.aiMonthlyTokenLimit;
  }
  if (typeof body.aiUnlimited === 'boolean') {
    update.aiUnlimited = body.aiUnlimited;
  }
  if (typeof body.aiHardStop === 'boolean') {
    update.aiHardStop = body.aiHardStop;
  }

  // If setting to default, clear custom fields
  if (body.resetToDefault === true) {
    update.aiUseCustomTokenLimit = false;
    update.aiMonthlyTokenLimit = null;
    update.aiUnlimited = false;
    update.aiHardStop = null;
  }

  await userRef.update(update);

  return NextResponse.json({ ok: true, userId, ...update });
}
