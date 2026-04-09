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
  const trialTokenLimit = typeof data.aiTrialTokenLimit === 'number' ? data.aiTrialTokenLimit : null;
  const trialTokensUsed = typeof data.aiTrialTokensUsed === 'number' ? data.aiTrialTokensUsed : 0;
  const trialCompleted = trialTokenLimit !== null && trialTokenLimit > 0 && trialTokensUsed >= trialTokenLimit;
  return NextResponse.json({
    aiAssistantEnabled: Boolean(data.aiAssistantEnabled),
    aiEntitlementType:
      data.aiAssistantEnabled === true
        ? 'full'
        : data.aiEntitlementType === 'trial'
          ? 'trial'
          : 'locked',
    aiTrialAvailable: data.aiTrialAvailable !== false,
    aiTrialStartedAt: typeof data.aiTrialStartedAt === 'string' ? data.aiTrialStartedAt : null,
    aiTrialConsumedAt: typeof data.aiTrialConsumedAt === 'string' ? data.aiTrialConsumedAt : null,
    aiTrialTokenLimit: trialTokenLimit,
    aiTrialTokensUsed: trialTokensUsed,
    aiTrialCompleted: trialCompleted,
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
  const existingData = doc.data() ?? {};
  const existingTrialTokenLimit =
    typeof existingData.aiTrialTokenLimit === 'number' ? existingData.aiTrialTokenLimit : null;
  const existingTrialTokensUsed =
    typeof existingData.aiTrialTokensUsed === 'number' ? existingData.aiTrialTokensUsed : 0;
  const existingTrialCompleted =
    existingTrialTokenLimit !== null &&
    existingTrialTokenLimit > 0 &&
    existingTrialTokensUsed >= existingTrialTokenLimit;

  if (typeof body.aiAssistantEnabled === 'boolean') {
    update.aiAssistantEnabled = body.aiAssistantEnabled;
  }
  if (typeof body.aiTrialAvailable === 'boolean') {
    if (body.aiTrialAvailable && existingTrialCompleted) {
      return NextResponse.json({ error: 'Completed trials cannot be reopened' }, { status: 400 });
    }

    update.aiTrialAvailable = body.aiTrialAvailable;
    if (!body.aiTrialAvailable) {
      update.aiEntitlementType =
        existingData.aiAssistantEnabled === true || existingData.aiEntitlementType === 'full'
          ? 'full'
          : existingData.aiEntitlementType === 'trial'
            ? 'locked'
            : 'locked';
    } else if (
      existingData.aiAssistantEnabled !== true &&
      existingData.aiEntitlementType !== 'full' &&
      typeof existingData.aiTrialStartedAt === 'string' &&
      existingData.aiTrialStartedAt &&
      !existingTrialCompleted
    ) {
      update.aiEntitlementType = 'trial';
    }
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
