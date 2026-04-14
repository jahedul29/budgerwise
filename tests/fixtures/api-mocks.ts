/**
 * Centralised mock API response payloads.
 *
 * Every E2E test file can import the payload it needs and pass it to
 * `mockApiRoute()` from our helpers.
 */

import type { MockUser } from './auth';

/* ── AI Access States ── */

export function lockedAccessState() {
  return {
    enabled: false,
    launcherVisible: true,
    entitlementType: 'locked' as const,
    trialAvailable: true,
    trialEnabled: true,
    trialStartedAt: null,
    trialConsumedAt: null,
    trialTokenLimit: 100_000,
    trialTokensUsed: 0,
    trialRemaining: 100_000,
    blockedReason: 'locked',
    usage: null,
  };
}

export function trialAccessState(tokensUsed = 20_000) {
  const limit = 100_000;
  return {
    enabled: true,
    launcherVisible: true,
    entitlementType: 'trial' as const,
    trialAvailable: true,
    trialEnabled: true,
    trialStartedAt: new Date().toISOString(),
    trialConsumedAt: null,
    trialTokenLimit: limit,
    trialTokensUsed: tokensUsed,
    trialRemaining: limit - tokensUsed,
    blockedReason: null,
    usage: {
      totalTokensUsed: tokensUsed,
      tokenLimit: limit,
      remaining: limit - tokensUsed,
      usagePercent: tokensUsed / limit,
      requestCount: 5,
      isUnlimited: false,
      isCustomLimit: false,
      hardStopEnabled: true,
      entitlementType: 'trial' as const,
      bucketType: 'trial' as const,
      blockedReason: null,
      trialAvailable: true,
      trialStartedAt: new Date().toISOString(),
      trialConsumedAt: null,
    },
  };
}

export function fullAccessState(tokensUsed = 50_000) {
  const limit = 500_000;
  return {
    enabled: true,
    launcherVisible: true,
    entitlementType: 'full' as const,
    trialAvailable: false,
    trialEnabled: true,
    trialStartedAt: null,
    trialConsumedAt: null,
    trialTokenLimit: 100_000,
    trialTokensUsed: 0,
    trialRemaining: 100_000,
    blockedReason: null,
    usage: {
      totalTokensUsed: tokensUsed,
      tokenLimit: limit,
      remaining: limit - tokensUsed,
      usagePercent: tokensUsed / limit,
      requestCount: 20,
      isUnlimited: false,
      isCustomLimit: false,
      hardStopEnabled: true,
      entitlementType: 'full' as const,
      bucketType: 'monthly' as const,
      blockedReason: null,
      trialAvailable: false,
      trialStartedAt: null,
      trialConsumedAt: null,
    },
  };
}

export function exceededAccessState() {
  const limit = 500_000;
  return {
    enabled: true,
    launcherVisible: true,
    entitlementType: 'full' as const,
    trialAvailable: false,
    trialEnabled: true,
    trialStartedAt: null,
    trialConsumedAt: null,
    trialTokenLimit: 100_000,
    trialTokensUsed: 0,
    trialRemaining: 100_000,
    blockedReason: 'monthly_limit_reached',
    usage: {
      totalTokensUsed: limit,
      tokenLimit: limit,
      remaining: 0,
      usagePercent: 1,
      requestCount: 100,
      isUnlimited: false,
      isCustomLimit: false,
      hardStopEnabled: true,
      entitlementType: 'full' as const,
      bucketType: 'monthly' as const,
      blockedReason: 'monthly_limit_reached',
      trialAvailable: false,
      trialStartedAt: null,
      trialConsumedAt: null,
    },
  };
}

export function lockedTrialConsumedAccessState() {
  return {
    enabled: false,
    launcherVisible: true,
    entitlementType: 'locked' as const,
    trialAvailable: false,
    trialEnabled: true,
    trialStartedAt: '2025-01-01T00:00:00.000Z',
    trialConsumedAt: '2025-01-02T00:00:00.000Z',
    trialTokenLimit: 100_000,
    trialTokensUsed: 100_000,
    trialRemaining: 0,
    blockedReason: 'trial_exhausted',
    usage: null,
  };
}

/* ── AI Usage / Quota ── */

export function usageSummary(tokensUsed = 50_000, limit = 500_000) {
  return {
    totalTokensUsed: tokensUsed,
    tokenLimit: limit,
    remaining: limit - tokensUsed,
    usagePercent: tokensUsed / limit,
    requestCount: 20,
    isUnlimited: false,
    isCustomLimit: false,
    hardStopEnabled: true,
    entitlementType: 'full' as const,
    bucketType: 'monthly' as const,
    blockedReason: null,
    trialAvailable: false,
    trialStartedAt: null,
    trialConsumedAt: null,
  };
}

export function unlimitedUsageSummary() {
  return {
    totalTokensUsed: 250_000,
    tokenLimit: null,
    remaining: null,
    usagePercent: 0,
    requestCount: 50,
    isUnlimited: true,
    isCustomLimit: false,
    hardStopEnabled: false,
    entitlementType: 'full' as const,
    bucketType: 'monthly' as const,
    blockedReason: null,
    trialAvailable: false,
    trialStartedAt: null,
    trialConsumedAt: null,
  };
}

/* ── Parse Results ── */

export function successfulParseResult() {
  return {
    intent: 'transaction.add',
    entity: 'transaction',
    operation: 'add',
    confidence: 0.92,
    fields: {
      transaction: {
        amount: 450,
        type: 'expense',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        dateIso: new Date().toISOString(),
        description: 'Groceries shopping',
      },
    },
    missingFields: [],
    ambiguities: [],
    resolutions: [],
    requiresConfirmation: true,
    originalText: 'spent 450 on groceries from cash',
  };
}

export function ambiguousParseResult() {
  return {
    intent: 'transaction.add',
    entity: 'transaction',
    operation: 'add',
    confidence: 0.75,
    fields: {
      transaction: {
        amount: 200,
        type: 'expense',
        description: 'Uber ride',
        dateIso: new Date().toISOString(),
      },
    },
    missingFields: ['transaction.accountId'],
    ambiguities: [
      {
        key: 'transaction.accountId',
        status: 'ambiguous',
        query: 'cash',
        options: [
          { id: 'acc-1', name: 'Cash Wallet' },
          { id: 'acc-2', name: 'Cash Reserve' },
        ],
      },
    ],
    resolutions: [
      {
        key: 'transaction.accountId',
        status: 'ambiguous',
        query: 'cash',
        options: [
          { id: 'acc-1', name: 'Cash Wallet' },
          { id: 'acc-2', name: 'Cash Reserve' },
        ],
      },
    ],
    requiresConfirmation: true,
    originalText: 'spent 200 on uber from cash',
  };
}

/* ── Admin Stats ── */

export function adminStats() {
  return {
    totalUsers: 125,
    activeThisMonth: 78,
    aiEnabled: 42,
    aiDisabled: 83,
    roles: {
      superadmin: 1,
      admin: 3,
      manager: 8,
      user: 113,
    },
  };
}

/* ── Admin AI Usage Summary ── */

export function adminAiUsageSummary() {
  return {
    month: '2026-04',
    totalTokensUsed: 1_250_000,
    totalRequests: 450,
    activeAiUsers: 42,
    avgTokensPerUser: 29_762,
    topUsers: [
      { id: 'u1', name: 'Alice', tokensUsed: 120_000 },
      { id: 'u2', name: 'Bob', tokensUsed: 95_000 },
    ],
    globalSettings: {
      defaultMonthlyTokenLimit: 500_000,
      defaultTrialTokenLimit: 100_000,
      defaultAiHardStop: true,
      trialEnabled: true,
      openaiReportedTokens: 1_300_000,
      openaiReportedMonth: '2026-04',
    },
  };
}

/* ── Admin Users List ── */

export function adminUsersList(users?: Partial<MockUser>[]) {
  const defaults = [
    {
      id: 'u1', name: 'Alice Johnson', email: 'alice@test.com', avatar: '',
      aiAssistantEnabled: true, aiEntitlementType: 'full' as const,
      aiTrialAvailable: false, role: 'user',
      createdAt: '2025-11-01T00:00:00Z', lastLoginAt: '2026-04-10T12:00:00Z',
      aiTokenUsage: {
        totalTokensUsed: 120_000, tokenLimit: 500_000, remaining: 380_000,
        usagePercent: 0.24, requestCount: 40, lastAiActivity: '2026-04-10T11:00:00Z',
        isUnlimited: false, isCustomLimit: false,
      },
    },
    {
      id: 'u2', name: 'Bob Smith', email: 'bob@test.com', avatar: '',
      aiAssistantEnabled: false, aiEntitlementType: 'locked' as const,
      aiTrialAvailable: true, role: 'user',
      createdAt: '2025-12-15T00:00:00Z', lastLoginAt: '2026-04-09T08:00:00Z',
      aiTokenUsage: {
        totalTokensUsed: 0, tokenLimit: 500_000, remaining: 500_000,
        usagePercent: 0, requestCount: 0, lastAiActivity: null,
        isUnlimited: false, isCustomLimit: false,
      },
    },
    {
      id: 'u3', name: 'Carol Davis', email: 'carol@test.com', avatar: '',
      aiAssistantEnabled: true, aiEntitlementType: 'trial' as const,
      aiTrialAvailable: true, aiTrialStartedAt: '2026-04-01T00:00:00Z', role: 'admin',
      createdAt: '2026-01-01T00:00:00Z', lastLoginAt: '2026-04-11T09:00:00Z',
      aiTokenUsage: {
        totalTokensUsed: 45_000, tokenLimit: 100_000, remaining: 55_000,
        usagePercent: 0.45, requestCount: 15, lastAiActivity: '2026-04-11T08:30:00Z',
        isUnlimited: false, isCustomLimit: false, bucketType: 'trial' as const,
      },
    },
  ];

  return {
    users: users ?? defaults,
    pagination: { nextCursor: null, hasMore: false, limit: 50 },
    meta: { scanned: 3, maxScanReached: false },
  };
}

/* ── User role ── */

export function roleResponse(role: string) {
  return { role };
}

/* ── Global AI Settings ── */

export function globalAiSettings() {
  return {
    defaultMonthlyTokenLimit: 500_000,
    defaultTrialTokenLimit: 100_000,
    defaultAiHardStop: true,
    trialEnabled: true,
    openaiReportedTokens: 1_300_000,
    openaiReportedMonth: '2026-04',
  };
}
