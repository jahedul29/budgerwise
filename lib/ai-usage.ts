import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  AiAssistantAccessState,
  AiEntitlementType,
  AiGlobalSettings,
  AiUsageBucketType,
  AiUsageLedgerEntry,
  AiUsageMonthlyAggregate,
  AiUsageSummary,
  AiFeature,
  AiUsageStatus,
} from '@/types';

const DEFAULT_MONTHLY_TOKEN_LIMIT = 500_000;
const DEFAULT_TRIAL_TOKEN_LIMIT = 100_000;
const DEFAULT_HARD_STOP = true;
const DEFAULT_TRIAL_ENABLED = true;

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getGlobalAiSettings(): Promise<AiGlobalSettings> {
  if (!adminDb) {
    return {
      defaultMonthlyTokenLimit: DEFAULT_MONTHLY_TOKEN_LIMIT,
      defaultTrialTokenLimit: DEFAULT_TRIAL_TOKEN_LIMIT,
      defaultAiHardStop: DEFAULT_HARD_STOP,
      trialEnabled: DEFAULT_TRIAL_ENABLED,
    };
  }

  const doc = await adminDb.collection('admin').doc('aiSettings').get();
  if (!doc.exists) {
    return {
      defaultMonthlyTokenLimit: DEFAULT_MONTHLY_TOKEN_LIMIT,
      defaultTrialTokenLimit: DEFAULT_TRIAL_TOKEN_LIMIT,
      defaultAiHardStop: DEFAULT_HARD_STOP,
      trialEnabled: DEFAULT_TRIAL_ENABLED,
    };
  }

  const data = doc.data()!;
  return {
    defaultMonthlyTokenLimit:
      typeof data.defaultMonthlyTokenLimit === 'number'
        ? data.defaultMonthlyTokenLimit
        : DEFAULT_MONTHLY_TOKEN_LIMIT,
    defaultTrialTokenLimit:
      typeof data.defaultTrialTokenLimit === 'number'
        ? data.defaultTrialTokenLimit
        : DEFAULT_TRIAL_TOKEN_LIMIT,
    defaultAiHardStop:
      typeof data.defaultAiHardStop === 'boolean'
        ? data.defaultAiHardStop
        : DEFAULT_HARD_STOP,
    trialEnabled:
      typeof data.trialEnabled === 'boolean'
        ? data.trialEnabled
        : DEFAULT_TRIAL_ENABLED,
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
  if (typeof settings.defaultTrialTokenLimit === 'number') {
    update.defaultTrialTokenLimit = settings.defaultTrialTokenLimit;
  }
  if (typeof settings.defaultAiHardStop === 'boolean') {
    update.defaultAiHardStop = settings.defaultAiHardStop;
  }
  if (typeof settings.trialEnabled === 'boolean') {
    update.trialEnabled = settings.trialEnabled;
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

type UserAiDoc = {
  aiAssistantEnabled?: boolean;
  aiUseCustomTokenLimit?: boolean;
  aiMonthlyTokenLimit?: number;
  aiUnlimited?: boolean;
  aiHardStop?: boolean;
  aiEntitlementType?: AiEntitlementType;
  aiTrialAvailable?: boolean;
  aiTrialStartedAt?: string | null;
  aiTrialConsumedAt?: string | null;
  aiTrialTokenLimit?: number;
  aiTrialTokensUsed?: number;
  aiTrialRequestCount?: number;
  aiTrialLastUsedAt?: string | null;
};

async function getUserAiDoc(userId: string): Promise<UserAiDoc> {
  if (!adminDb) return {};
  const userDoc = await adminDb.collection('users').doc(userId).get();
  return (userDoc.data() ?? {}) as UserAiDoc;
}

export async function getUserAiAccessState(userId: string): Promise<AiAssistantAccessState> {
  const [globalSettings, userData, monthlyUsage] = await Promise.all([
    getGlobalAiSettings(),
    getUserAiDoc(userId),
    getCurrentMonthTokenUsage(userId),
  ]);

  const trialAvailable = userData.aiTrialAvailable !== false;
  const entitlementType: AiEntitlementType =
    userData.aiEntitlementType === 'trial' || userData.aiEntitlementType === 'full'
      ? userData.aiEntitlementType
      : 'locked';

  const trialTokenLimit = typeof userData.aiTrialTokenLimit === 'number'
    ? userData.aiTrialTokenLimit
    : globalSettings.defaultTrialTokenLimit;
  const trialTokensUsed = typeof userData.aiTrialTokensUsed === 'number' ? userData.aiTrialTokensUsed : 0;
  const trialRequestCount = typeof userData.aiTrialRequestCount === 'number' ? userData.aiTrialRequestCount : 0;
  const trialLastUsedAt = typeof userData.aiTrialLastUsedAt === 'string' ? userData.aiTrialLastUsedAt : undefined;
  const trialRemaining = Math.max(0, trialTokenLimit - trialTokensUsed);

  if (entitlementType === 'trial') {
    const blockedReason = trialTokensUsed >= trialTokenLimit ? 'trial_exhausted' : null;
    return {
      enabled: !blockedReason,
      launcherVisible: true,
      entitlementType: blockedReason ? 'locked' : 'trial',
      trialAvailable,
      trialStartedAt: userData.aiTrialStartedAt ?? null,
      trialConsumedAt: userData.aiTrialConsumedAt ?? null,
      trialTokenLimit,
      trialTokensUsed,
      trialRemaining,
      blockedReason,
      usage: {
        totalTokensUsed: trialTokensUsed,
        tokenLimit: trialTokenLimit,
        remaining: trialRemaining,
        usagePercent: trialTokenLimit > 0 ? trialTokensUsed / trialTokenLimit : 1,
        requestCount: trialRequestCount,
        lastUsedAt: trialLastUsedAt ?? userData.aiTrialStartedAt ?? undefined,
        isUnlimited: false,
        isCustomLimit: false,
        hardStopEnabled: true,
        entitlementType: blockedReason ? 'locked' : 'trial',
        bucketType: 'trial',
        blockedReason,
        trialAvailable,
        trialStartedAt: userData.aiTrialStartedAt ?? null,
        trialConsumedAt: userData.aiTrialConsumedAt ?? null,
      },
      trialEnabled: globalSettings.trialEnabled,
    };
  }

  if (userData.aiAssistantEnabled === true) {
    const effectiveLimit = await getEffectiveTokenLimit(userId);
    const totalUsed = monthlyUsage?.totalTokensUsed ?? 0;
    const remaining = effectiveLimit.isUnlimited
      ? null
      : Math.max(0, effectiveLimit.limit - totalUsed);
    const usagePercent = effectiveLimit.isUnlimited
      ? 0
      : effectiveLimit.limit > 0
        ? totalUsed / effectiveLimit.limit
        : 1;
    const blockedReason =
      !effectiveLimit.isUnlimited && effectiveLimit.hardStopEnabled && totalUsed >= effectiveLimit.limit
        ? 'monthly_limit_reached'
        : null;

    return {
      enabled: true,
      launcherVisible: true,
      entitlementType: 'full',
      trialAvailable,
      trialStartedAt: userData.aiTrialStartedAt ?? null,
      trialConsumedAt: userData.aiTrialConsumedAt ?? null,
      trialTokenLimit,
      trialTokensUsed,
      trialRemaining,
      blockedReason,
      usage: {
        totalTokensUsed: totalUsed,
        tokenLimit: effectiveLimit.isUnlimited ? null : effectiveLimit.limit,
        remaining,
        usagePercent,
        requestCount: monthlyUsage?.requestCount ?? 0,
        lastUsedAt: monthlyUsage?.lastUsedAt,
        isUnlimited: effectiveLimit.isUnlimited,
        isCustomLimit: effectiveLimit.isCustomLimit,
        hardStopEnabled: effectiveLimit.hardStopEnabled,
        entitlementType: 'full',
        bucketType: 'monthly',
        blockedReason,
        trialAvailable,
        trialStartedAt: userData.aiTrialStartedAt ?? null,
        trialConsumedAt: userData.aiTrialConsumedAt ?? null,
      },
      trialEnabled: globalSettings.trialEnabled,
    };
  }

  return {
    enabled: false,
    launcherVisible: true,
    entitlementType: 'locked',
    trialAvailable,
    trialStartedAt: userData.aiTrialStartedAt ?? null,
    trialConsumedAt: userData.aiTrialConsumedAt ?? null,
    trialTokenLimit,
    trialTokensUsed,
    trialRemaining,
    blockedReason: userData.aiTrialConsumedAt ? 'trial_exhausted' : 'locked',
    usage: null,
    trialEnabled: globalSettings.trialEnabled,
  };
}

export async function startUserAiTrial(userId: string): Promise<AiAssistantAccessState> {
  if (!adminDb) throw new Error('Firebase not configured');

  const [globalSettings, userDoc] = await Promise.all([
    getGlobalAiSettings(),
    adminDb.collection('users').doc(userId).get(),
  ]);

  if (!userDoc.exists) throw new Error('User not found');
  if (!globalSettings.trialEnabled) throw new Error('Free trial is currently disabled');

  const data = userDoc.data() as UserAiDoc;
  if (data.aiEntitlementType === 'trial') {
    return getUserAiAccessState(userId);
  }
  if (data.aiAssistantEnabled === true || data.aiEntitlementType === 'full') {
    throw new Error('User already has full AI access');
  }
  if (data.aiTrialAvailable === false) {
    throw new Error('Free trial already used');
  }

  const nowIso = new Date().toISOString();
  await userDoc.ref.set({
    aiEntitlementType: 'trial',
    aiTrialAvailable: true,
    aiTrialStartedAt: nowIso,
    aiTrialConsumedAt: null,
    aiTrialTokenLimit: globalSettings.defaultTrialTokenLimit,
    aiTrialTokensUsed: 0,
    aiTrialRequestCount: 0,
    aiTrialLastUsedAt: null,
    updatedAt: nowIso,
  }, { merge: true });

  return getUserAiAccessState(userId);
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
  const access = await getUserAiAccessState(userId);
  const usage = access.usage ?? {
    totalTokensUsed: 0,
    tokenLimit: null,
    remaining: null,
    usagePercent: 0,
    requestCount: 0,
    isUnlimited: false,
    isCustomLimit: false,
    hardStopEnabled: true,
    entitlementType: 'locked',
    bucketType: null,
    blockedReason: access.blockedReason ?? 'locked',
    trialAvailable: access.trialAvailable,
    trialStartedAt: access.trialStartedAt,
    trialConsumedAt: access.trialConsumedAt,
  };

  if (access.entitlementType === 'trial') {
    return { allowed: true, usage };
  }
  if (access.entitlementType === 'full') {
    if (!usage.isUnlimited && usage.hardStopEnabled && usage.tokenLimit != null && usage.totalTokensUsed >= usage.tokenLimit) {
      return {
        allowed: false,
        reason: 'Monthly AI token limit reached. Please contact your administrator.',
        usage: { ...usage, blockedReason: 'monthly_limit_reached' },
      };
    }
    return { allowed: true, usage };
  }

  if (access.blockedReason === 'trial_exhausted') {
    return {
      allowed: false,
      reason: 'Your free trial has ended. Contact your administrator to enable full AI access.',
      usage: { ...usage, blockedReason: 'trial_exhausted' },
    };
  }

  return {
    allowed: false,
    reason: 'AI assistant access not enabled',
    usage: { ...usage, blockedReason: 'locked' },
  };
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
  entitlementTypeAtRequest?: AiEntitlementType;
  bucketType?: AiUsageBucketType;
}): Promise<void> {
  if (!adminDb) return;

  const month = getCurrentMonth();
  const timestamp = new Date().toISOString();
  const userRef = adminDb.collection('users').doc(params.userId);
  const bucketType = params.bucketType ?? 'monthly';
  const entitlementTypeAtRequest = params.entitlementTypeAtRequest ?? 'full';

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
    entitlementTypeAtRequest,
    bucketType,
  };

  const ledgerRef = userRef.collection('aiUsageLedger').doc();
  const monthlyRef = userRef.collection('aiUsageMonthly').doc(month);
  if (bucketType === 'trial') {
    await adminDb.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      const userData = (userDoc.data() ?? {}) as UserAiDoc;
      const currentUsed = typeof userData.aiTrialTokensUsed === 'number' ? userData.aiTrialTokensUsed : 0;
      const currentLimit = typeof userData.aiTrialTokenLimit === 'number'
        ? userData.aiTrialTokenLimit
        : DEFAULT_TRIAL_TOKEN_LIMIT;
      const nextUsed = currentUsed + params.totalTokens;

      tx.set(ledgerRef, ledgerEntry);

      const userUpdate: Record<string, unknown> = {
        aiTrialTokensUsed: nextUsed,
        aiTrialRequestCount: FieldValue.increment(1),
        aiTrialLastUsedAt: timestamp,
        updatedAt: timestamp,
      };

      if (nextUsed >= currentLimit) {
        userUpdate.aiEntitlementType = 'locked';
        userUpdate.aiTrialAvailable = false;
        userUpdate.aiTrialConsumedAt = userData.aiTrialConsumedAt ?? timestamp;
      }

      tx.set(userRef, userUpdate, { merge: true });
    });
    return;
  }

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
  const access = await getUserAiAccessState(userId);
  return access.usage ?? {
    totalTokensUsed: 0,
    tokenLimit: null,
    remaining: null,
    usagePercent: 0,
    requestCount: 0,
    isUnlimited: false,
    isCustomLimit: false,
    hardStopEnabled: true,
    entitlementType: 'locked',
    bucketType: null,
    blockedReason: access.blockedReason ?? 'locked',
    trialAvailable: access.trialAvailable,
    trialStartedAt: access.trialStartedAt,
    trialConsumedAt: access.trialConsumedAt,
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
