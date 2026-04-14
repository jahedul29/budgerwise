import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getGlobalAiSettings, getCurrentMonth } from '@/lib/ai-usage';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const currentMonth = getCurrentMonth();

  const [globalSettings, usersSnap] = await Promise.all([
    getGlobalAiSettings(),
    adminDb.collection('users').select(
      'aiAssistantEnabled',
      'aiUnlimited',
      'aiUseCustomTokenLimit',
      'aiMonthlyTokenLimit',
      'aiEntitlementType',
      'aiTrialTokenLimit',
      'aiTrialTokensUsed',
      'aiTrialRequestCount',
    ).get(),
  ]);

  let totalEnabledUsers = 0;
  let totalUnlimitedUsers = 0;
  let totalAllocatedTokens = 0;
  let totalTrialUsers = 0;

  // Collect all user IDs that may have usage, and track trial user-doc totals
  // as a fallback for users who don't yet have a monthly aggregate doc.
  const allUserIds: string[] = [];
  const trialFallback = new Map<string, { tokens: number; requests: number }>();

  for (const doc of usersSnap.docs) {
    const data = doc.data();

    if (data.aiEntitlementType === 'trial') {
      totalTrialUsers += 1;
      totalAllocatedTokens += typeof data.aiTrialTokenLimit === 'number'
        ? data.aiTrialTokenLimit
        : globalSettings.defaultTrialTokenLimit;
      allUserIds.push(doc.id);
      trialFallback.set(doc.id, {
        tokens: typeof data.aiTrialTokensUsed === 'number' ? data.aiTrialTokensUsed : 0,
        requests: typeof data.aiTrialRequestCount === 'number' ? data.aiTrialRequestCount : 0,
      });
      continue;
    }

    if (data.aiAssistantEnabled) {
      totalEnabledUsers += 1;
      allUserIds.push(doc.id);

      if (data.aiUnlimited) {
        totalUnlimitedUsers += 1;
      } else {
        const limit = data.aiUseCustomTokenLimit && typeof data.aiMonthlyTokenLimit === 'number'
          ? data.aiMonthlyTokenLimit
          : globalSettings.defaultMonthlyTokenLimit;
        totalAllocatedTokens += limit;
      }
    }
  }

  let totalTokensUsed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalRequests = 0;
  let activeAiUsers = 0;

  if (allUserIds.length > 0) {
    const usagePromises = allUserIds.map((userId) =>
      adminDb!
        .collection('users').doc(userId)
        .collection('aiUsageMonthly').doc(currentMonth)
        .get(),
    );
    const usageDocs = await Promise.all(usagePromises);

    for (let i = 0; i < usageDocs.length; i++) {
      const doc = usageDocs[i];
      const userId = allUserIds[i];

      if (doc.exists) {
        const data = doc.data()!;
        totalTokensUsed += (data.totalTokensUsed as number) ?? 0;
        totalInputTokens += (data.inputTokensUsed as number) ?? 0;
        totalOutputTokens += (data.outputTokensUsed as number) ?? 0;
        totalRequests += (data.requestCount as number) ?? 0;
        activeAiUsers += 1;
        // Monthly doc found — no need for fallback
        trialFallback.delete(userId);
      }
    }
  }

  // For trial users without a monthly aggregate doc (usage recorded before
  // the fix), fall back to totals stored on the user document.
  for (const [, fb] of trialFallback) {
    totalTokensUsed += fb.tokens;
    totalRequests += fb.requests;
    if (fb.requests > 0) activeAiUsers += 1;
  }

  return NextResponse.json({
    month: currentMonth,
    totalTokensUsed,
    totalInputTokens,
    totalOutputTokens,
    totalRequests,
    totalAllocatedTokens,
    totalEnabledUsers,
    totalTrialUsers,
    totalUnlimitedUsers,
    activeAiUsers,
    defaultMonthlyTokenLimit: globalSettings.defaultMonthlyTokenLimit,
    defaultTrialTokenLimit: globalSettings.defaultTrialTokenLimit,
    openaiReportedTokens: globalSettings.openaiReportedMonth === currentMonth
      ? (globalSettings.openaiReportedTokens ?? null)
      : null,
  });
}
