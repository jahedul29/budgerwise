import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  AiGlobalSettings,
  AiUsageLedgerEntry,
  AiUsageMonthlyAggregate,
  AiUsageSummary,
  AiFeature,
  AiUsageStatus,
} from '@/types';

const DEFAULT_MONTHLY_TOKEN_LIMIT = 500_000;
const DEFAULT_HARD_STOP = true;

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getGlobalAiSettings(): Promise<AiGlobalSettings> {
  if (!adminDb) {
    return {
      defaultMonthlyTokenLimit: DEFAULT_MONTHLY_TOKEN_LIMIT,
      defaultAiHardStop: DEFAULT_HARD_STOP,
    };
  }

  const doc = await adminDb.collection('admin').doc('aiSettings').get();
  if (!doc.exists) {
    return {
      defaultMonthlyTokenLimit: DEFAULT_MONTHLY_TOKEN_LIMIT,
      defaultAiHardStop: DEFAULT_HARD_STOP,
    };
  }

  const data = doc.data()!;
  return {
    defaultMonthlyTokenLimit:
      typeof data.defaultMonthlyTokenLimit === 'number'
        ? data.defaultMonthlyTokenLimit
        : DEFAULT_MONTHLY_TOKEN_LIMIT,
    defaultAiHardStop:
      typeof data.defaultAiHardStop === 'boolean'
        ? data.defaultAiHardStop
        : DEFAULT_HARD_STOP,
    openaiReportedTokens:
      typeof data.openaiReportedTokens === 'number'
        ? data.openaiReportedTokens
        : null,
    openaiReportedMonth:
      typeof data.openaiReportedMonth === 'string'
        ? data.openaiReportedMonth
        : null,
  };
}

export async function updateGlobalAiSettings(
  settings: Partial<AiGlobalSettings>,
): Promise<AiGlobalSettings> {
  if (!adminDb) throw new Error('Firebase not configured');

  const ref = adminDb.collection('admin').doc('aiSettings');
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (typeof settings.defaultMonthlyTokenLimit === 'number') {
    update.defaultMonthlyTokenLimit = settings.defaultMonthlyTokenLimit;
  }
  if (typeof settings.defaultAiHardStop === 'boolean') {
    update.defaultAiHardStop = settings.defaultAiHardStop;
  }
  if (typeof settings.openaiReportedTokens === 'number') {
    update.openaiReportedTokens = settings.openaiReportedTokens;
  }
  if (settings.openaiReportedTokens === null) {
    update.openaiReportedTokens = null;
  }
  if (typeof settings.openaiReportedMonth === 'string') {
    update.openaiReportedMonth = settings.openaiReportedMonth;
  }

  await ref.set(update, { merge: true });
  return getGlobalAiSettings();
}

export async function getEffectiveTokenLimit(userId: string): Promise<{
  limit: number;
  isUnlimited: boolean;
  isCustomLimit: boolean;
  hardStopEnabled: boolean;
}> {
  if (!adminDb) {
    return {
      limit: DEFAULT_MONTHLY_TOKEN_LIMIT,
      isUnlimited: false,
      isCustomLimit: false,
      hardStopEnabled: DEFAULT_HARD_STOP,
    };
  }

  const [userDoc, globalSettings] = await Promise.all([
    adminDb.collection('users').doc(userId).get(),
    getGlobalAiSettings(),
  ]);

  const userData = userDoc.data() ?? {};

  if (userData.aiUnlimited === true) {
    return {
      limit: Infinity,
      isUnlimited: true,
      isCustomLimit: false,
      hardStopEnabled: false,
    };
  }

  const isCustomLimit = userData.aiUseCustomTokenLimit === true;
  const limit = isCustomLimit && typeof userData.aiMonthlyTokenLimit === 'number'
    ? userData.aiMonthlyTokenLimit
    : globalSettings.defaultMonthlyTokenLimit;

  const hardStopEnabled = typeof userData.aiHardStop === 'boolean'
    ? userData.aiHardStop
    : globalSettings.defaultAiHardStop;

  return { limit, isUnlimited: false, isCustomLimit, hardStopEnabled };
}

export async function getCurrentMonthTokenUsage(
  userId: string,
  month?: string,
): Promise<AiUsageMonthlyAggregate | null> {
  if (!adminDb) return null;

  const m = month ?? getCurrentMonth();
  const doc = await adminDb
    .collection('users')
    .doc(userId)
    .collection('aiUsageMonthly')
    .doc(m)
    .get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    userId,
    month: m,
    inputTokensUsed: data.inputTokensUsed ?? 0,
    outputTokensUsed: data.outputTokensUsed ?? 0,
    totalTokensUsed: data.totalTokensUsed ?? 0,
    requestCount: data.requestCount ?? 0,
    lastUsedAt: data.lastUsedAt ?? '',
  };
}

export async function assertWithinTokenLimit(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usage: AiUsageSummary;
}> {
  const [effectiveLimit, monthlyUsage] = await Promise.all([
    getEffectiveTokenLimit(userId),
    getCurrentMonthTokenUsage(userId),
  ]);

  const totalUsed = monthlyUsage?.totalTokensUsed ?? 0;
  const remaining = effectiveLimit.isUnlimited
    ? null
    : Math.max(0, effectiveLimit.limit - totalUsed);
  const usagePercent = effectiveLimit.isUnlimited
    ? 0
    : effectiveLimit.limit > 0
      ? totalUsed / effectiveLimit.limit
      : 1;

  const usage: AiUsageSummary = {
    totalTokensUsed: totalUsed,
    tokenLimit: effectiveLimit.isUnlimited ? null : effectiveLimit.limit,
    remaining,
    usagePercent,
    requestCount: monthlyUsage?.requestCount ?? 0,
    lastUsedAt: monthlyUsage?.lastUsedAt,
    isUnlimited: effectiveLimit.isUnlimited,
    isCustomLimit: effectiveLimit.isCustomLimit,
    hardStopEnabled: effectiveLimit.hardStopEnabled,
  };

  if (effectiveLimit.isUnlimited) {
    return { allowed: true, usage };
  }

  if (totalUsed >= effectiveLimit.limit && effectiveLimit.hardStopEnabled) {
    return {
      allowed: false,
      reason: 'Monthly AI token limit reached. Please contact your administrator.',
      usage,
    };
  }

  return { allowed: true, usage };
}

export async function recordAiUsage(params: {
  userId: string;
  model: string;
  provider: string;
  feature: AiFeature;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestId: string;
  status: AiUsageStatus;
}): Promise<void> {
  if (!adminDb) return;

  const month = getCurrentMonth();
  const timestamp = new Date().toISOString();

  const ledgerEntry: Omit<AiUsageLedgerEntry, 'id'> = {
    userId: params.userId,
    timestamp,
    month,
    model: params.model,
    provider: params.provider,
    feature: params.feature,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.totalTokens,
    requestId: params.requestId,
    status: params.status,
  };

  const userRef = adminDb.collection('users').doc(params.userId);
  const ledgerRef = userRef.collection('aiUsageLedger').doc();
  const monthlyRef = userRef.collection('aiUsageMonthly').doc(month);

  const batch = adminDb.batch();

  batch.set(ledgerRef, ledgerEntry);

  batch.set(
    monthlyRef,
    {
      userId: params.userId,
      month,
      inputTokensUsed: FieldValue.increment(params.inputTokens),
      outputTokensUsed: FieldValue.increment(params.outputTokens),
      totalTokensUsed: FieldValue.increment(params.totalTokens),
      requestCount: FieldValue.increment(1),
      lastUsedAt: timestamp,
    },
    { merge: true },
  );

  await batch.commit();
}

export async function getUserAiUsageSummary(userId: string): Promise<AiUsageSummary> {
  const [effectiveLimit, monthlyUsage] = await Promise.all([
    getEffectiveTokenLimit(userId),
    getCurrentMonthTokenUsage(userId),
  ]);

  const totalUsed = monthlyUsage?.totalTokensUsed ?? 0;
  const remaining = effectiveLimit.isUnlimited
    ? null
    : Math.max(0, effectiveLimit.limit - totalUsed);
  const usagePercent = effectiveLimit.isUnlimited
    ? 0
    : effectiveLimit.limit > 0
      ? totalUsed / effectiveLimit.limit
      : 1;

  return {
    totalTokensUsed: totalUsed,
    tokenLimit: effectiveLimit.isUnlimited ? null : effectiveLimit.limit,
    remaining,
    usagePercent,
    requestCount: monthlyUsage?.requestCount ?? 0,
    lastUsedAt: monthlyUsage?.lastUsedAt,
    isUnlimited: effectiveLimit.isUnlimited,
    isCustomLimit: effectiveLimit.isCustomLimit,
    hardStopEnabled: effectiveLimit.hardStopEnabled,
  };
}

export async function getRecentUsageLedger(
  userId: string,
  limitCount = 20,
): Promise<AiUsageLedgerEntry[]> {
  if (!adminDb) return [];

  const snap = await adminDb
    .collection('users')
    .doc(userId)
    .collection('aiUsageLedger')
    .orderBy('timestamp', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      timestamp: data.timestamp,
      month: data.month,
      model: data.model,
      provider: data.provider,
      feature: data.feature,
      inputTokens: data.inputTokens ?? 0,
      outputTokens: data.outputTokens ?? 0,
      totalTokens: data.totalTokens ?? 0,
      requestId: data.requestId,
      status: data.status,
    } as AiUsageLedgerEntry;
  });
}
