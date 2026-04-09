export type AdminUserSortField = 'lastLoginAt' | 'createdAt' | 'name' | 'email';
export type AdminUserSortDirection = 'asc' | 'desc';
export type AdminUserAiStatusFilter = 'all' | 'enabled' | 'disabled';
export type AdminUserAccessStatusFilter = 'all' | 'full' | 'trial' | 'locked';
export type AdminUserTrialStatusFilter = 'all' | 'active' | 'available' | 'blocked';

export interface AdminUserFilters {
  q: string;
  aiStatus: AdminUserAiStatusFilter;
  accessStatus: AdminUserAccessStatusFilter;
  trialStatus: AdminUserTrialStatusFilter;
  createdFrom?: string;
  createdTo?: string;
  activeWithinDays?: number;
}

export interface AdminUserListParams {
  limit: number;
  cursor: string | null;
  sortField: AdminUserSortField;
  sortDirection: AdminUserSortDirection;
  filters: AdminUserFilters;
}

export interface AdminUserRawRecord {
  id: string;
  name?: unknown;
  email?: unknown;
  avatar?: unknown;
  aiAssistantEnabled?: unknown;
  aiEntitlementType?: unknown;
  aiTrialAvailable?: unknown;
  aiTrialStartedAt?: unknown;
  aiTrialConsumedAt?: unknown;
  createdAt?: unknown;
  lastLoginAt?: unknown;
}

function toStringOrEmpty(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toIsoDateStart(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toIsoDateEnd(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function parseAdminUserListParams(url: URL): AdminUserListParams {
  const limit = parsePositiveInt(url.searchParams.get('limit'), 25, 100);
  const cursor = url.searchParams.get('cursor');

  const sortFieldParam = url.searchParams.get('sortField');
  const sortDirectionParam = url.searchParams.get('sortDirection');
  const sortField: AdminUserSortField =
    sortFieldParam === 'createdAt' || sortFieldParam === 'name' || sortFieldParam === 'email'
      ? sortFieldParam
      : 'lastLoginAt';
  const sortDirection: AdminUserSortDirection = sortDirectionParam === 'asc' ? 'asc' : 'desc';

  const aiStatusParam = url.searchParams.get('aiStatus');
  const aiStatus: AdminUserAiStatusFilter =
    aiStatusParam === 'enabled' || aiStatusParam === 'disabled' ? aiStatusParam : 'all';
  const accessStatusParam = url.searchParams.get('accessStatus');
  const accessStatus: AdminUserAccessStatusFilter =
    accessStatusParam === 'full' || accessStatusParam === 'trial' || accessStatusParam === 'locked'
      ? accessStatusParam
      : 'all';
  const trialStatusParam = url.searchParams.get('trialStatus');
  const trialStatus: AdminUserTrialStatusFilter =
    trialStatusParam === 'active' || trialStatusParam === 'available' || trialStatusParam === 'blocked'
      ? trialStatusParam
      : 'all';

  const activeWithinDaysRaw = url.searchParams.get('activeWithinDays');
  const activeWithinDaysParsed = activeWithinDaysRaw ? Number(activeWithinDaysRaw) : NaN;
  const activeWithinDays = Number.isFinite(activeWithinDaysParsed) && activeWithinDaysParsed > 0
    ? Math.floor(activeWithinDaysParsed)
    : undefined;

  return {
    limit,
    cursor: cursor || null,
    sortField,
    sortDirection,
    filters: {
      q: (url.searchParams.get('q') || '').trim(),
      aiStatus,
      accessStatus,
      trialStatus,
      createdFrom: url.searchParams.get('createdFrom') || undefined,
      createdTo: url.searchParams.get('createdTo') || undefined,
      activeWithinDays,
    },
  };
}

export function normalizeAdminUserRecord(raw: AdminUserRawRecord) {
  return {
    id: raw.id,
    name: toStringOrEmpty(raw.name) || undefined,
    email: toStringOrEmpty(raw.email) || undefined,
    avatar: toStringOrEmpty(raw.avatar) || undefined,
    aiAssistantEnabled: Boolean(raw.aiAssistantEnabled),
    aiEntitlementType:
      raw.aiEntitlementType === 'trial' || raw.aiEntitlementType === 'full'
        ? raw.aiEntitlementType
        : 'locked',
    aiTrialAvailable: raw.aiTrialAvailable !== false,
    aiTrialStartedAt: toStringOrEmpty(raw.aiTrialStartedAt) || undefined,
    aiTrialConsumedAt: toStringOrEmpty(raw.aiTrialConsumedAt) || undefined,
    createdAt: toStringOrEmpty(raw.createdAt) || undefined,
    lastLoginAt: toStringOrEmpty(raw.lastLoginAt) || undefined,
  };
}

export function userMatchesFilters(
  user: ReturnType<typeof normalizeAdminUserRecord>,
  filters: AdminUserFilters,
  now = new Date(),
) {
  if (filters.aiStatus === 'enabled' && !user.aiAssistantEnabled) return false;
  if (filters.aiStatus === 'disabled' && user.aiAssistantEnabled) return false;

  const effectiveAccessStatus =
    user.aiAssistantEnabled ? 'full' : user.aiEntitlementType === 'trial' ? 'trial' : 'locked';
  if (filters.accessStatus !== 'all' && effectiveAccessStatus !== filters.accessStatus) return false;

  if (filters.trialStatus !== 'all') {
    if (user.aiAssistantEnabled) return false;
    const effectiveTrialStatus =
      user.aiEntitlementType === 'trial'
        ? 'active'
        : user.aiTrialAvailable
          ? 'available'
          : 'blocked';
    if (effectiveTrialStatus !== filters.trialStatus) return false;
  }

  const query = filters.q.toLowerCase();
  if (query) {
    const haystack = `${user.id} ${user.name ?? ''} ${user.email ?? ''}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  const createdFromIso = toIsoDateStart(filters.createdFrom);
  const createdToIso = toIsoDateEnd(filters.createdTo);
  if (createdFromIso || createdToIso) {
    const createdAt = user.createdAt;
    if (!createdAt) return false;
    if (createdFromIso && createdAt < createdFromIso) return false;
    if (createdToIso && createdAt > createdToIso) return false;
  }

  if (filters.activeWithinDays) {
    if (!user.lastLoginAt) return false;
    const lastLogin = new Date(user.lastLoginAt);
    if (Number.isNaN(lastLogin.getTime())) return false;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - filters.activeWithinDays);
    if (lastLogin < cutoff) return false;
  }

  return true;
}

export function encodeCursor(payload: { sortValue: string; id: string }) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string) {
  const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
    sortValue?: unknown;
    id?: unknown;
  };
  return {
    sortValue: typeof parsed.sortValue === 'string' ? parsed.sortValue : '',
    id: typeof parsed.id === 'string' ? parsed.id : '',
  };
}

export function getSortValue(
  user: ReturnType<typeof normalizeAdminUserRecord>,
  sortField: AdminUserSortField,
) {
  if (sortField === 'createdAt') return user.createdAt ?? '';
  if (sortField === 'name') return user.name ?? '';
  if (sortField === 'email') return user.email ?? '';
  return user.lastLoginAt ?? '';
}
