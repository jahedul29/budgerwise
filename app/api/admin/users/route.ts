import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import {
  decodeCursor,
  encodeCursor,
  getSortValue,
  normalizeAdminUserRecord,
  parseAdminUserListParams,
  userMatchesFilters,
} from '@/lib/admin-user-filters';
import { getGlobalAiSettings, getCurrentMonth } from '@/lib/ai-usage';

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const { limit, cursor, sortField, sortDirection, filters } = parseAdminUserListParams(url);

  try {
    const usersCollection = adminDb.collection('users');
    let query = usersCollection
      .orderBy(sortField, sortDirection)
      .orderBy('__name__', sortDirection);

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded.id) {
        query = query.startAfter(decoded.sortValue, decoded.id);
      }
    }

    const globalSettings = await getGlobalAiSettings();

    const currentMonth = getCurrentMonth();

    const maxScan = 1200;
    const batchSize = 200;
    let scanned = 0;
    const matched: Array<{
      id: string;
      name?: string;
      email?: string;
      avatar?: string;
      aiAssistantEnabled: boolean;
      aiEntitlementType: 'locked' | 'trial' | 'full';
      aiTrialAvailable: boolean;
      aiTrialStartedAt?: string;
      aiTrialConsumedAt?: string;
      aiTrialTokenLimit?: number;
      aiTrialTokensUsed?: number;
      aiTrialRequestCount?: number;
      aiTrialLastUsedAt?: string;
      aiUseCustomTokenLimit?: boolean;
      aiMonthlyTokenLimit?: number;
      aiUnlimited?: boolean;
      aiHardStop?: boolean;
      role?: string;
      createdAt?: string;
      lastLoginAt?: string;
      sortValue: string;
    }> = [];
    let hasMore = false;
    let exhausted = false;

    while (!exhausted && scanned < maxScan && matched.length < limit + 1) {
      const snapshot = await query.limit(batchSize).get();
      if (snapshot.empty) {
        exhausted = true;
        break;
      }

      for (const doc of snapshot.docs) {
        scanned += 1;
        const rawData = doc.data() as Record<string, unknown>;
        const normalized = normalizeAdminUserRecord({
          id: doc.id,
          ...rawData,
        });
        if (userMatchesFilters(normalized, filters)) {
          matched.push({
            ...normalized,
            aiEntitlementType: (normalized.aiAssistantEnabled ? 'full' : normalized.aiEntitlementType) as 'locked' | 'trial' | 'full',
            aiTrialAvailable: normalized.aiTrialAvailable,
            aiTrialStartedAt: normalized.aiTrialStartedAt,
            aiTrialConsumedAt: normalized.aiTrialConsumedAt,
            aiTrialTokenLimit: typeof rawData.aiTrialTokenLimit === 'number' ? rawData.aiTrialTokenLimit : undefined,
            aiTrialTokensUsed: typeof rawData.aiTrialTokensUsed === 'number' ? rawData.aiTrialTokensUsed : 0,
            aiTrialRequestCount: typeof rawData.aiTrialRequestCount === 'number' ? rawData.aiTrialRequestCount : 0,
            aiTrialLastUsedAt: typeof rawData.aiTrialLastUsedAt === 'string' ? rawData.aiTrialLastUsedAt : undefined,
            aiUseCustomTokenLimit: Boolean(rawData.aiUseCustomTokenLimit),
            aiMonthlyTokenLimit: typeof rawData.aiMonthlyTokenLimit === 'number' ? rawData.aiMonthlyTokenLimit : undefined,
            aiUnlimited: Boolean(rawData.aiUnlimited),
            aiHardStop: typeof rawData.aiHardStop === 'boolean' ? rawData.aiHardStop : undefined,
            role: typeof rawData.role === 'string' ? rawData.role : 'user',
            sortValue: getSortValue(normalized, sortField),
          });
          if (matched.length >= limit + 1) break;
        }
      }

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (!lastDoc || snapshot.size < batchSize) {
        exhausted = true;
      } else {
        query = usersCollection
          .orderBy(sortField, sortDirection)
          .orderBy('__name__', sortDirection)
          .startAfter(lastDoc.get(sortField) ?? '', lastDoc.id);
      }
    }

    if (matched.length > limit) {
      hasMore = true;
    }

    const pageUsers = matched.slice(0, limit);

    // Fetch monthly usage aggregates for page users
    const usagePromises = pageUsers.map(async (user) => {
      const monthDoc = await adminDb!
        .collection('users')
        .doc(user.id)
        .collection('aiUsageMonthly')
        .doc(currentMonth)
        .get();
      return { id: user.id, data: monthDoc.exists ? monthDoc.data() : null };
    });
    const usageResults = await Promise.all(usagePromises);
    const usageMap = new Map(usageResults.map((r) => [r.id, r.data]));

    const users = pageUsers.map((user) => {
      const monthData = usageMap.get(user.id);
      const isTrialUser = user.aiEntitlementType === 'trial';
      const totalUsed = isTrialUser
        ? (user.aiTrialTokensUsed ?? 0)
        : ((monthData?.totalTokensUsed as number) ?? 0);
      const isUnlimited = isTrialUser ? false : user.aiUnlimited === true;
      const effectiveLimit = isTrialUser
        ? (user.aiTrialTokenLimit ?? globalSettings.defaultTrialTokenLimit)
        : isUnlimited
          ? Infinity
          : user.aiUseCustomTokenLimit && typeof user.aiMonthlyTokenLimit === 'number'
            ? user.aiMonthlyTokenLimit
            : globalSettings.defaultMonthlyTokenLimit;
      const remaining = isUnlimited ? Infinity : Math.max(0, effectiveLimit - totalUsed);
      const usagePercent = isUnlimited ? 0 : effectiveLimit > 0 ? totalUsed / effectiveLimit : 1;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        aiAssistantEnabled: user.aiAssistantEnabled,
        aiEntitlementType: user.aiEntitlementType,
        aiTrialAvailable: user.aiTrialAvailable,
        aiTrialStartedAt: user.aiTrialStartedAt,
        aiTrialConsumedAt: user.aiTrialConsumedAt,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        role: user.role ?? 'user',
        aiTokenUsage: {
          totalTokensUsed: totalUsed,
          tokenLimit: isUnlimited ? null : effectiveLimit,
          remaining: isUnlimited ? null : remaining,
          usagePercent,
          requestCount: isTrialUser ? (user.aiTrialRequestCount ?? 0) : ((monthData?.requestCount as number) ?? 0),
          lastAiActivity: isTrialUser ? (user.aiTrialLastUsedAt ?? user.aiTrialStartedAt ?? null) : ((monthData?.lastUsedAt as string) ?? null),
          isUnlimited,
          isCustomLimit: Boolean(user.aiUseCustomTokenLimit),
          bucketType: isTrialUser ? 'trial' : 'monthly',
        },
      };
    });

    const lastVisible = users[users.length - 1];
    const nextCursor = hasMore && lastVisible
      ? encodeCursor({
          sortValue: getSortValue(lastVisible, sortField),
          id: lastVisible.id,
        })
      : null;

    return NextResponse.json({
      users,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
      meta: {
        scanned,
        maxScanReached: scanned >= maxScan,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list users' },
      { status: 500 },
    );
  }
}
