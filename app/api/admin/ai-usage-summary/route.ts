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
      'aiAssistantEnabled', 'aiUnlimited', 'aiUseCustomTokenLimit', 'aiMonthlyTokenLimit',
    ).get(),
  ]);

  let totalEnabledUsers = 0;
  let totalUnlimitedUsers = 0;
  let totalAllocatedTokens = 0;
  const enabledUserIds: string[] = [];

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (!data.aiAssistantEnabled) continue;
    totalEnabledUsers += 1;
    enabledUserIds.push(doc.id);

    if (data.aiUnlimited) {
      totalUnlimitedUsers += 1;
    } else {
      const limit = data.aiUseCustomTokenLimit && typeof data.aiMonthlyTokenLimit === 'number'
        ? data.aiMonthlyTokenLimit
        : globalSettings.defaultMonthlyTokenLimit;
      totalAllocatedTokens += limit;
    }
  }

  let totalTokensUsed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalRequests = 0;
  let activeAiUsers = 0;

  if (enabledUserIds.length > 0) {
    const usagePromises = enabledUserIds.map((userId) =>
      adminDb!
        .collection('users').doc(userId)
        .collection('aiUsageMonthly').doc(currentMonth)
        .get(),
    );
    const usageDocs = await Promise.all(usagePromises);

    for (const doc of usageDocs) {
      if (!doc.exists) continue;
      const data = doc.data()!;
      totalTokensUsed += (data.totalTokensUsed as number) ?? 0;
      totalInputTokens += (data.inputTokensUsed as number) ?? 0;
      totalOutputTokens += (data.outputTokensUsed as number) ?? 0;
      totalRequests += (data.requestCount as number) ?? 0;
      activeAiUsers += 1;
    }
  }

  return NextResponse.json({
    month: currentMonth,
    totalTokensUsed,
    totalInputTokens,
    totalOutputTokens,
    totalRequests,
    totalAllocatedTokens,
    totalEnabledUsers,
    totalUnlimitedUsers,
    activeAiUsers,
    defaultMonthlyTokenLimit: globalSettings.defaultMonthlyTokenLimit,
    defaultTrialTokenLimit: globalSettings.defaultTrialTokenLimit,
    openaiReportedTokens: globalSettings.openaiReportedMonth === currentMonth
      ? (globalSettings.openaiReportedTokens ?? null)
      : null,
  });
}
