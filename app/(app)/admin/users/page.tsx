'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowDownAZ,
  ArrowUpAZ,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crown,
  Filter,
  Infinity as InfinityIcon,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { DateRangePicker, type DateRange } from '@/components/shared/DateRangePicker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface AiTokenUsage {
  totalTokensUsed: number;
  tokenLimit: number | null;
  remaining: number | null;
  usagePercent: number;
  requestCount: number;
  lastAiActivity: string | null;
  isUnlimited: boolean;
  isCustomLimit: boolean;
  bucketType?: 'trial' | 'monthly';
}

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  aiAssistantEnabled?: boolean;
  aiEntitlementType?: 'locked' | 'trial' | 'full';
  aiTrialAvailable?: boolean;
  aiTrialStartedAt?: string | null;
  aiTrialConsumedAt?: string | null;
  createdAt?: string;
  lastLoginAt?: string;
  role?: string;
  aiTokenUsage?: AiTokenUsage;
}

interface UsersResponse {
  users: UserRecord[];
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
  meta?: {
    scanned: number;
    maxScanReached: boolean;
  };
  error?: string;
}

type AiStatusFilter = 'all' | 'enabled' | 'disabled';
type AccessStatusFilter = 'all' | 'full' | 'trial' | 'locked';
type TrialStatusFilter = 'all' | 'active' | 'available' | 'blocked';
type SortField = 'lastLoginAt' | 'createdAt' | 'name' | 'email';
type SortDirection = 'asc' | 'desc';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isSuperAdmin } = useUserRole();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [blockingTrialUserId, setBlockingTrialUserId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<'enable' | 'disable' | 'block-trial' | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [aiStatus, setAiStatus] = useState<AiStatusFilter>('all');
  const [accessStatus, setAccessStatus] = useState<AccessStatusFilter>('all');
  const [trialStatus, setTrialStatus] = useState<TrialStatusFilter>('all');
  const [createdRange, setCreatedRange] = useState<DateRange | undefined>(undefined);
  const [activeWithinDays, setActiveWithinDays] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('lastLoginAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(25);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [maxScanReached, setMaxScanReached] = useState(false);

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiConfig, setAiConfig] = useState<{
    aiAssistantEnabled: boolean;
    aiEntitlementType: 'locked' | 'trial' | 'full';
    aiTrialAvailable: boolean;
    aiTrialStartedAt: string | null;
    aiTrialConsumedAt: string | null;
    aiTrialTokenLimit: number | null;
    aiTrialTokensUsed: number;
    aiTrialCompleted: boolean;
    aiUseCustomTokenLimit: boolean;
    aiMonthlyTokenLimit: number | null;
    aiUnlimited: boolean;
    aiHardStop: boolean | null;
  } | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  const currentCursor = pageCursors[pageIndex] ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
  }, [search, aiStatus, accessStatus, trialStatus, createdRange, activeWithinDays, sortField, sortDirection, pageSize]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('sortField', sortField);
      params.set('sortDirection', sortDirection);
      params.set('aiStatus', aiStatus);
      params.set('accessStatus', accessStatus);
      params.set('trialStatus', trialStatus);
      if (search) params.set('q', search);
      if (createdRange?.start) params.set('createdFrom', createdRange.start.toISOString().slice(0, 10));
      if (createdRange?.end) params.set('createdTo', createdRange.end.toISOString().slice(0, 10));
      if (activeWithinDays !== 'all') params.set('activeWithinDays', activeWithinDays);
      if (currentCursor) params.set('cursor', currentCursor);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.status === 403) {
        router.replace('/dashboard');
        toast.error('Admin access required');
        return;
      }

      const data = (await res.json().catch(() => null)) as UsersResponse | null;
      if (!res.ok || !data) throw new Error(data?.error || 'Failed to load users');

      setUsers(data.users || []);
      setNextCursor(data.pagination?.nextCursor || null);
      setHasMore(Boolean(data.pagination?.hasMore));
      setScannedCount(data.meta?.scanned ?? 0);
      setMaxScanReached(Boolean(data.meta?.maxScanReached));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [
    aiStatus,
    accessStatus,
    trialStatus,
    createdRange,
    currentCursor,
    pageSize,
    router,
    search,
    sortDirection,
    sortField,
    activeWithinDays,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleAI = async (userId: string, enabled: boolean) => {
    setToggling(userId);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || 'Failed to update AI access');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, aiAssistantEnabled: enabled } : u)));
      toast.success(`AI ${enabled ? 'enabled' : 'disabled'} for user`);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const bulkToggleAI = async (enabled: boolean) => {

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/users/bulk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_ai',
          enabled,
          filters: {
            q: search,
            aiStatus,
            accessStatus,
            trialStatus,
            createdFrom: createdRange?.start?.toISOString().slice(0, 10) || undefined,
            createdTo: createdRange?.end?.toISOString().slice(0, 10) || undefined,
            activeWithinDays: activeWithinDays === 'all' ? undefined : Number(activeWithinDays),
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || 'Bulk update failed');
      toast.success(`Updated ${data.updated} user(s)`);
      await fetchUsers();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkBlockTrial = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/users/bulk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block_trial',
          filters: {
            q: search,
            aiStatus,
            accessStatus,
            trialStatus,
            createdFrom: createdRange?.start?.toISOString().slice(0, 10) || undefined,
            createdTo: createdRange?.end?.toISOString().slice(0, 10) || undefined,
            activeWithinDays: activeWithinDays === 'all' ? undefined : Number(activeWithinDays),
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || 'Bulk trial block failed');
      toast.success(`Blocked trial for ${data.updated} user(s)`);
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk trial block failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const openUserDetail = async (user: UserRecord) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/ai-config`);
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setAiConfig({
          aiAssistantEnabled: Boolean(data.aiAssistantEnabled),
          aiEntitlementType: data.aiEntitlementType === 'trial' || data.aiEntitlementType === 'full' ? data.aiEntitlementType : 'locked',
          aiTrialAvailable: data.aiTrialAvailable !== false,
          aiTrialStartedAt: data.aiTrialStartedAt ?? null,
          aiTrialConsumedAt: data.aiTrialConsumedAt ?? null,
          aiTrialTokenLimit: data.aiTrialTokenLimit ?? null,
          aiTrialTokensUsed: data.aiTrialTokensUsed ?? 0,
          aiTrialCompleted: Boolean(data.aiTrialCompleted),
          aiUseCustomTokenLimit: Boolean(data.aiUseCustomTokenLimit),
          aiMonthlyTokenLimit: data.aiMonthlyTokenLimit ?? null,
          aiUnlimited: Boolean(data.aiUnlimited),
          aiHardStop: data.aiHardStop ?? null,
        });
      }
    } catch {
      toast.error('Failed to load AI config');
    } finally {
      setDetailLoading(false);
    }
  };

  const blockTrialForUser = async (userId: string) => {
    setBlockingTrialUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiTrialAvailable: false }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || 'Failed to block trial');

      setUsers((prev) => prev.map((u) => (
        u.id === userId
          ? {
              ...u,
              aiTrialAvailable: false,
              aiEntitlementType: u.aiEntitlementType === 'trial' ? 'locked' : u.aiEntitlementType,
            }
          : u
      )));
      setSelectedUser((prev) => (
        prev && prev.id === userId
          ? {
              ...prev,
              aiTrialAvailable: false,
              aiEntitlementType: prev.aiEntitlementType === 'trial' ? 'locked' : prev.aiEntitlementType,
            }
          : prev
      ));
      setAiConfig((prev) => (
        prev
          ? {
              ...prev,
              aiTrialAvailable: false,
              aiEntitlementType: prev.aiEntitlementType === 'trial' ? 'locked' : prev.aiEntitlementType,
            }
          : prev
      ));
      toast.success('Trial blocked for user');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to block trial');
    } finally {
      setBlockingTrialUserId(null);
    }
  };

  const saveAiConfig = async () => {
    if (!selectedUser || !aiConfig) return;
    setConfigSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('AI config updated');
      setSelectedUser(null);
      setAiConfig(null);
      fetchUsers();

    } catch {
      toast.error('Failed to save AI config');
    } finally {
      setConfigSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!selectedUser) return;
    setConfigSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToDefault: true }),
      });
      if (!res.ok) throw new Error('Failed to reset');
      setAiConfig((prev) => prev ? {
        ...prev,
        aiUseCustomTokenLimit: false,
        aiMonthlyTokenLimit: null,
        aiUnlimited: false,
        aiHardStop: null,
      } : prev);
      toast.success('Reset to default');
      fetchUsers();

    } catch {
      toast.error('Failed to reset');
    } finally {
      setConfigSaving(false);
    }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to change role');
      toast.success(`Role updated to ${role}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      if (selectedUser?.id === userId) setSelectedUser((prev) => prev ? { ...prev, role } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const goNext = () => {
    if (!nextCursor) return;
    const nextPageIndex = pageIndex + 1;
    setPageCursors((prev) => {
      const copy = [...prev];
      copy[nextPageIndex] = nextCursor;
      return copy;
    });
    setPageIndex(nextPageIndex);
  };

  const goPrevious = () => {
    if (pageIndex <= 0) return;
    setPageIndex((prev) => Math.max(0, prev - 1));
  };

  const enabledCount = useMemo(
    () => users.filter((u) => u.aiAssistantEnabled).length,
    [users],
  );

  const hasActiveFilters = Boolean(
    search ||
    aiStatus !== 'all' ||
    accessStatus !== 'all' ||
    trialStatus !== 'all' ||
    createdRange ||
    activeWithinDays !== 'all' ||
    sortField !== 'lastLoginAt' ||
    sortDirection !== 'desc',
  );

  const fmtTokens = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '--';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  /** percent is 0-1 decimal (e.g. 0.75 = 75%) */
  const getUsageColor = (percent: number) => {
    if (percent >= 1) return 'text-expense';
    if (percent >= 0.9) return 'text-orange-500';
    if (percent >= 0.75) return 'text-warning';
    return 'text-primary-500';
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUserAccessLabel = (user: UserRecord) => {
    if (user.aiEntitlementType === 'trial') {
      return { label: 'On Trial', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
    }
    if (user.aiTrialConsumedAt) {
      return { label: 'Trial Ended', className: 'bg-navy-100/80 dark:bg-white/[0.06] text-navy-500 dark:text-navy-300' };
    }
    if (user.aiTrialAvailable === false) {
      return { label: 'Trial Blocked', className: 'bg-expense/[0.10] text-expense' };
    }
    return { label: 'Trial Open', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' };
  };

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="flex items-center justify-between px-4 py-2 lg:px-8 lg:py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">
                Users
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-navy-400 dark:text-navy-300">
            <Shield className="h-3.5 w-3.5" />
            <span>{users.length} in page</span>
            <span className="text-navy-200 dark:text-navy-600">|</span>
            <Bot className="h-3.5 w-3.5 text-primary-500" />
            <span>{enabledCount} AI enabled</span>
          </div>
        </div>
        <AdminTabs />
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6 space-y-3">
        {/* ── Search + Filters ── */}
        <div className="relative z-20 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300 dark:text-navy-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or user id..."
              className="w-full h-10 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.03] pl-10 pr-9 text-[13px] text-navy-800 dark:text-navy-100 placeholder:text-navy-300/70 dark:placeholder:text-navy-500 focus:outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/15 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-navy-300 hover:text-navy-500 hover:bg-navy-100/60 dark:text-navy-500 dark:hover:text-navy-300 dark:hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-400/70 dark:text-navy-500 flex items-center gap-1.5 mr-0.5">
              <Filter className="h-3 w-3" />
              <span className="hidden sm:inline">Filters</span>
            </span>

            {/* AI Status */}
            <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
              {[
                { value: 'all', label: 'All' },
                { value: 'enabled', label: 'AI On' },
                { value: 'disabled', label: 'AI Off' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAiStatus(opt.value as AiStatusFilter)}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                    aiStatus === opt.value
                      ? 'bg-white dark:bg-white/[0.10] text-navy-800 dark:text-navy-50 shadow-sm'
                      : 'text-navy-400 dark:text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
              {[
                { value: 'all', label: 'Access: All' },
                { value: 'full', label: 'Full' },
                { value: 'trial', label: 'Trial' },
                { value: 'locked', label: 'Locked' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAccessStatus(opt.value as AccessStatusFilter)}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                    accessStatus === opt.value
                      ? 'bg-white dark:bg-white/[0.10] text-navy-800 dark:text-navy-50 shadow-sm'
                      : 'text-navy-400 dark:text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
              {[
                { value: 'all', label: 'Trial: All' },
                { value: 'active', label: 'Active' },
                { value: 'available', label: 'Open' },
                { value: 'blocked', label: 'Blocked' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrialStatus(opt.value as TrialStatusFilter)}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                    trialStatus === opt.value
                      ? 'bg-white dark:bg-white/[0.10] text-navy-800 dark:text-navy-50 shadow-sm'
                      : 'text-navy-400 dark:text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Activity */}
            <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
              {[
                { value: 'all', label: 'Any time' },
                { value: '7', label: '7d' },
                { value: '30', label: '30d' },
                { value: '90', label: '90d' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActiveWithinDays(opt.value)}
                  className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                    activeWithinDays === opt.value
                      ? 'bg-white dark:bg-white/[0.10] text-navy-800 dark:text-navy-50 shadow-sm'
                      : 'text-navy-400 dark:text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="relative z-30">
              <DateRangePicker inline value={createdRange} onChange={setCreatedRange} />
            </div>

            {/* Sort + Reset */}
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="h-8 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-2.5 text-[12px] font-medium text-navy-600 dark:text-navy-300 focus:outline-none focus:border-primary-500/40 cursor-pointer"
              >
                <option value="lastLoginAt">Last login</option>
                <option value="createdAt">Joined</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                className="h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] text-navy-400 dark:text-navy-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-500/30 transition-all"
                title={sortDirection === 'desc' ? 'Sort descending' : 'Sort ascending'}
              >
                {sortDirection === 'desc' ? (
                  <ArrowDownAZ className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpAZ className="h-3.5 w-3.5" />
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setAiStatus('all');
                    setAccessStatus('all');
                    setTrialStatus('all');
                    setCreatedRange(undefined);
                    setActiveWithinDays('all');
                    setSortField('lastLoginAt');
                    setSortDirection('desc');
                    setPageSize(25);
                  }}
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-xl text-[12px] font-medium text-navy-400 dark:text-navy-500 hover:text-expense dark:hover:text-expense hover:bg-expense/[0.06] transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Active filter tags + bulk actions ── */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                &ldquo;{search}&rdquo;
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); }} className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}
            {aiStatus !== 'all' && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                AI {aiStatus}
                <button type="button" onClick={() => setAiStatus('all')} className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}
            {accessStatus !== 'all' && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                Access {accessStatus}
                <button type="button" onClick={() => setAccessStatus('all')} className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}
            {trialStatus !== 'all' && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                Trial {trialStatus}
                <button type="button" onClick={() => setTrialStatus('all')} className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}
            {activeWithinDays !== 'all' && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                Active {activeWithinDays}d
                <button type="button" onClick={() => setActiveWithinDays('all')} className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}
            {createdRange && (
              <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                {fmtDate(createdRange.start.toISOString())} – {fmtDate(createdRange.end.toISOString())}
                <button type="button" onClick={() => setCreatedRange(undefined)} className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}

            <div className="h-4 w-px bg-gray-200/60 dark:bg-white/[0.06] mx-0.5" />

            {bulkConfirm === 'enable' ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-primary-600 dark:text-primary-400 font-medium">Enable AI for filtered users?</span>
                <button type="button" onClick={() => { setBulkConfirm(null); bulkToggleAI(true); }} disabled={bulkLoading} className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50">
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                </button>
                <button type="button" onClick={() => setBulkConfirm(null)} className="h-7 px-2 rounded-lg text-[11px] font-medium text-navy-400 hover:bg-navy-100/60 dark:hover:bg-white/[0.04]">Cancel</button>
              </span>
            ) : bulkConfirm === 'disable' ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-expense font-medium">Disable AI for filtered users?</span>
                <button type="button" onClick={() => { setBulkConfirm(null); bulkToggleAI(false); }} disabled={bulkLoading} className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-expense text-white hover:brightness-110 transition-colors disabled:opacity-50">
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                </button>
                <button type="button" onClick={() => setBulkConfirm(null)} className="h-7 px-2 rounded-lg text-[11px] font-medium text-navy-400 hover:bg-navy-100/60 dark:hover:bg-white/[0.04]">Cancel</button>
              </span>
            ) : bulkConfirm === 'block-trial' ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-expense font-medium">Block trial for filtered users?</span>
                <button type="button" onClick={() => { setBulkConfirm(null); bulkBlockTrial(); }} disabled={bulkLoading} className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-expense text-white hover:brightness-110 transition-colors disabled:opacity-50">
                  {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                </button>
                <button type="button" onClick={() => setBulkConfirm(null)} className="h-7 px-2 rounded-lg text-[11px] font-medium text-navy-400 hover:bg-navy-100/60 dark:hover:bg-white/[0.04]">Cancel</button>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setBulkConfirm('enable')}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-500/[0.08] transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Bulk enable
                </button>
                <button
                  type="button"
                  onClick={() => setBulkConfirm('block-trial')}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-expense hover:bg-expense/[0.08] transition-colors disabled:opacity-50"
                >
                  <ShieldX className="h-3 w-3" />
                  Block trial
                </button>
                <button
                  type="button"
                  onClick={() => setBulkConfirm('disable')}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-navy-500 dark:text-navy-400 hover:bg-navy-100/60 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                >
                  <ShieldX className="h-3 w-3" />
                  Bulk disable
                </button>
              </>
            )}
          </div>
        )}

        {maxScanReached && (
          <div className="rounded-xl border border-warning/20 bg-warning/[0.06] px-3.5 py-2.5 text-[12px] text-warning-dark dark:text-warning">
            Large result set — narrow your filters for more precise results.
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            <span className="text-sm text-navy-400">Loading users...</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-expense/20 bg-expense/[0.06] p-4 text-center">
            <p className="text-sm text-expense">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Users className="h-10 w-10 text-navy-300 dark:text-navy-500" />
                  <p className="text-sm text-navy-400">No users found for current filters</p>
                </div>
              ) : (
                users.map((user, i) => {
                  const usage = user.aiTokenUsage;
                  const accessBadge = getUserAccessLabel(user);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="glass-card rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:ring-1 hover:ring-primary-500/20 transition-all"
                      onClick={() => openUserDetail(user)}
                    >
                      <Avatar className="h-10 w-10 shrink-0 ring-2 ring-gray-200/50 dark:ring-white/[0.06]">
                        <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                        <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-sm font-semibold">
                          {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy-800 dark:text-navy-50 truncate">
                          {user.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-navy-400 dark:text-navy-300 truncate">
                          {user.email || user.id}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-navy-400 dark:text-navy-500 whitespace-nowrap">
                            Joined {fmtDate(user.createdAt)}
                          </span>
                          <span className="text-[10px] text-navy-400 dark:text-navy-500 whitespace-nowrap">
                            Last login {fmtDate(user.lastLoginAt)}
                          </span>
                          {accessBadge && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${accessBadge.className}`}>
                              {accessBadge.label}
                            </span>
                          )}
                          {user.role && user.role !== 'user' && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                              user.role === 'superadmin' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              user.role === 'admin' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                              'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            }`}>
                              {user.role}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Token usage summary */}
                      {usage && (user.aiAssistantEnabled || user.aiEntitlementType === 'trial') && (
                        <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 min-w-[100px]">
                          <div className="flex items-center gap-1">
                            <Zap className={`h-3 w-3 ${getUsageColor(usage.usagePercent)}`} />
                            <span className={`text-[11px] font-bold tabular-nums ${getUsageColor(usage.usagePercent)}`}>
                              {usage.isUnlimited ? (
                                <span className="flex items-center gap-0.5"><InfinityIcon className="h-3 w-3" /></span>
                              ) : usage.usagePercent >= 1 ? (
                                'Exceeded'
                              ) : (
                                `${Math.round(usage.usagePercent * 100)}%`
                              )}
                            </span>
                          </div>
                          <span className="text-[10px] text-navy-400 dark:text-navy-500 tabular-nums">
                            {fmtTokens(usage.totalTokensUsed)}{usage.isUnlimited ? '' : ` / ${fmtTokens(usage.tokenLimit)}`}
                          </span>
                          <span className="text-[9px] text-navy-300 dark:text-navy-600">
                            {usage.bucketType === 'trial' ? 'Free trial' : 'Monthly'}
                          </span>
                          {usage.requestCount > 0 && (
                            <span className="text-[9px] text-navy-300 dark:text-navy-600">
                              {usage.requestCount} req{usage.requestCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleAI(user.id, !user.aiAssistantEnabled); }}
                        disabled={toggling === user.id || bulkLoading}
                        className={`relative shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-50 ${
                          user.aiAssistantEnabled
                            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 hover:bg-primary-500/20'
                            : 'bg-navy-100/50 dark:bg-white/[0.04] text-navy-400 dark:text-navy-400 border border-transparent hover:border-navy-200 dark:hover:border-white/[0.08]'
                        }`}
                      >
                        {toggling === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : user.aiAssistantEnabled ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldX className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only sm:not-sr-only">
                          {user.aiAssistantEnabled ? 'AI On' : 'AI Off'}
                        </span>
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* ── Pagination ── */}
            <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] text-navy-400 dark:text-navy-400 tabular-nums">
                <span className="font-semibold text-navy-600 dark:text-navy-200">
                  Page {pageIndex + 1}
                </span>
                <span className="text-navy-200 dark:text-navy-600">&middot;</span>
                <span>
                  {users.length} result{users.length !== 1 ? 's' : ''}
                </span>
                {scannedCount > users.length && (
                  <>
                    <span className="text-navy-200 dark:text-navy-600">&middot;</span>
                    <span className="text-navy-300 dark:text-navy-500">{scannedCount} scanned</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-2 text-[12px] font-medium text-navy-500 dark:text-navy-400 focus:outline-none cursor-pointer"
                  aria-label="Items per page"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>

                <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
                  <button
                    type="button"
                    onClick={goPrevious}
                    disabled={pageIndex === 0 || loading}
                    className="h-7 w-7 flex items-center justify-center rounded-[10px] text-navy-400 dark:text-navy-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-navy-700 dark:hover:text-navy-100 hover:shadow-sm disabled:opacity-25 disabled:pointer-events-none transition-all"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="h-7 min-w-[1.75rem] px-2 flex items-center justify-center rounded-[10px] bg-white dark:bg-white/[0.10] text-[12px] font-bold text-navy-700 dark:text-navy-100 shadow-sm tabular-nums">
                    {pageIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!hasMore || !nextCursor || loading}
                    className="h-7 w-7 flex items-center justify-center rounded-[10px] text-navy-400 dark:text-navy-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-navy-700 dark:hover:text-navy-100 hover:shadow-sm disabled:opacity-25 disabled:pointer-events-none transition-all"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* ── User Detail Modal ── */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => { setSelectedUser(null); setAiConfig(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-white/[0.08] shadow-xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-white/[0.06] bg-white dark:bg-navy-900">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-gray-200/50 dark:ring-white/[0.06]">
                    <AvatarImage src={selectedUser.avatar || ''} alt={selectedUser.name || ''} />
                    <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-sm font-semibold">
                      {selectedUser.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-navy-800 dark:text-navy-50">{selectedUser.name || 'Unnamed'}</p>
                    <p className="text-[11px] text-navy-400">{selectedUser.email || selectedUser.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedUser(null); setAiConfig(null); }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-navy-100/60 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4 text-navy-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Role selector — superadmin only */}
                {isSuperAdmin && <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">Role</p>
                  {selectedUser.role === 'superadmin' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Superadmin
                      </span>
                      <span className="text-[10px] text-navy-400">Cannot be changed</span>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      {(['user', 'manager', 'admin'] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => changeRole(selectedUser.id, role)}
                          className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                            (selectedUser.role ?? 'user') === role
                              ? role === 'admin'
                                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                                : role === 'manager'
                                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                                  : 'bg-navy-100/60 dark:bg-white/[0.06] text-navy-600 dark:text-navy-300 border border-navy-200/50 dark:border-white/[0.08]'
                              : 'text-navy-400 dark:text-navy-500 border border-transparent hover:border-navy-200/50 dark:hover:border-white/[0.06] hover:bg-navy-50/50 dark:hover:bg-white/[0.02]'
                          }`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>}

                {/* Token usage summary */}
                {selectedUser.aiTokenUsage && (
                  <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">
                      {selectedUser.aiTokenUsage.bucketType === 'trial' ? 'Free Trial Usage' : 'Token Usage This Month'}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Used</p>
                        <p className="text-sm font-bold text-navy-800 dark:text-navy-50 tabular-nums">
                          {fmtTokens(selectedUser.aiTokenUsage.totalTokensUsed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Limit</p>
                        <p className="text-sm font-bold text-navy-800 dark:text-navy-50 tabular-nums">
                          {selectedUser.aiTokenUsage.isUnlimited ? <InfinityIcon className="h-4 w-4 inline" /> : fmtTokens(selectedUser.aiTokenUsage.tokenLimit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Remaining</p>
                        <p className="text-sm font-bold text-navy-800 dark:text-navy-50 tabular-nums">
                          {selectedUser.aiTokenUsage.isUnlimited ? <InfinityIcon className="h-4 w-4 inline" /> : fmtTokens(selectedUser.aiTokenUsage.remaining)}
                        </p>
                      </div>
                    </div>
                    {!selectedUser.aiTokenUsage.isUnlimited && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-semibold ${getUsageColor(selectedUser.aiTokenUsage.usagePercent)}`}>
                            {selectedUser.aiTokenUsage.bucketType === 'trial'
                              ? (selectedUser.aiTokenUsage.usagePercent >= 1 ? 'Free trial finished' : `${Math.round(selectedUser.aiTokenUsage.usagePercent * 100)}% of free trial used`)
                              : (selectedUser.aiTokenUsage.usagePercent >= 1 ? 'Limit exceeded' : `${Math.round(selectedUser.aiTokenUsage.usagePercent * 100)}% used`)}
                          </span>
                          <span className="text-[10px] text-navy-400">
                            {selectedUser.aiTokenUsage.requestCount} requests
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-navy-100 dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              selectedUser.aiTokenUsage.usagePercent >= 1
                                ? 'bg-expense'
                                : selectedUser.aiTokenUsage.usagePercent >= 0.9
                                  ? 'bg-orange-500'
                                  : selectedUser.aiTokenUsage.usagePercent >= 0.75
                                    ? 'bg-warning'
                                    : 'bg-primary-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.round(selectedUser.aiTokenUsage.usagePercent * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedUser.aiTokenUsage.isCustomLimit && (
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">Custom limit</span>
                    )}
                  </div>
                )}

                {aiConfig && (
                  <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">Trial Status</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Access</p>
                        <p className="text-sm font-bold text-navy-800 dark:text-navy-50">
                          {aiConfig.aiEntitlementType === 'full'
                            ? 'Full AI'
                            : aiConfig.aiEntitlementType === 'trial'
                              ? 'On Trial'
                              : aiConfig.aiTrialCompleted
                                ? 'Trial Ended'
                              : aiConfig.aiTrialAvailable
                                ? 'Trial Open'
                                : 'Trial Blocked'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Trial Tokens</p>
                        <p className="text-sm font-bold text-navy-800 dark:text-navy-50 tabular-nums">
                          {fmtTokens(aiConfig.aiTrialTokensUsed)} / {fmtTokens(aiConfig.aiTrialTokenLimit ?? 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Started</p>
                        <p className="text-[12px] text-navy-600 dark:text-navy-300">{fmtDate(aiConfig.aiTrialStartedAt ?? undefined)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-navy-400 dark:text-navy-500">Blocked/Ended</p>
                        <p className="text-[12px] text-navy-600 dark:text-navy-300">{fmtDate(aiConfig.aiTrialConsumedAt ?? undefined)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Config Controls */}
                {detailLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                  </div>
                ) : aiConfig && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">AI Configuration</p>

                    {/* AI Enabled */}
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 cursor-pointer">
                      <div>
                        <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">AI Assistant</p>
                        <p className="text-[11px] text-navy-400">Enable or disable AI access</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiConfig.aiAssistantEnabled}
                        onChange={(e) => setAiConfig({ ...aiConfig, aiAssistantEnabled: e.target.checked })}
                        className="h-4 w-4 rounded border-navy-300 text-primary-500 focus:ring-primary-500/20"
                      />
                    </label>

                    {!aiConfig.aiTrialCompleted && (
                      <>
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 cursor-pointer">
                          <div>
                            <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Free Trial Access</p>
                            <p className="text-[11px] text-navy-400">Turn this off to block the user from starting or continuing a free trial.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={aiConfig.aiTrialAvailable}
                            onChange={(e) => setAiConfig({ ...aiConfig, aiTrialAvailable: e.target.checked })}
                            className="h-4 w-4 rounded border-navy-300 text-primary-500 focus:ring-primary-500/20"
                          />
                        </label>

                        {!aiConfig.aiTrialAvailable && (
                          <button
                            type="button"
                            onClick={() => blockTrialForUser(selectedUser.id)}
                            disabled={blockingTrialUserId === selectedUser.id}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-semibold text-expense hover:bg-expense/[0.08] transition-colors disabled:opacity-50"
                          >
                            {blockingTrialUserId === selectedUser.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}
                            Trial blocked
                          </button>
                        )}
                      </>
                    )}

                    {/* Unlimited */}
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 cursor-pointer">
                      <div>
                        <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Unlimited Tokens</p>
                        <p className="text-[11px] text-navy-400">Bypass monthly token limit</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiConfig.aiUnlimited}
                        onChange={(e) => setAiConfig({ ...aiConfig, aiUnlimited: e.target.checked })}
                        className="h-4 w-4 rounded border-navy-300 text-primary-500 focus:ring-primary-500/20"
                      />
                    </label>

                    {/* Custom Token Limit */}
                    {!aiConfig.aiUnlimited && (
                      <>
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 cursor-pointer">
                          <div>
                            <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Custom Token Limit</p>
                            <p className="text-[11px] text-navy-400">Override the global default limit</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={aiConfig.aiUseCustomTokenLimit}
                            onChange={(e) => setAiConfig({ ...aiConfig, aiUseCustomTokenLimit: e.target.checked })}
                            className="h-4 w-4 rounded border-navy-300 text-primary-500 focus:ring-primary-500/20"
                          />
                        </label>

                        {aiConfig.aiUseCustomTokenLimit && (
                          <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3">
                            <label className="block text-[11px] font-medium text-navy-500 dark:text-navy-400 mb-1.5">
                              Monthly Token Limit
                            </label>
                            <input
                              type="number"
                              min={1000}
                              step={10000}
                              value={aiConfig.aiMonthlyTokenLimit ?? ''}
                              onChange={(e) => setAiConfig({ ...aiConfig, aiMonthlyTokenLimit: e.target.value ? Number(e.target.value) : null })}
                              placeholder="e.g. 500000"
                              className="w-full h-9 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-3 text-sm text-navy-800 dark:text-navy-100 placeholder:text-navy-300 focus:outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/15"
                            />
                          </div>
                        )}

                        {/* Hard Stop */}
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 cursor-pointer">
                          <div>
                            <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Hard Stop</p>
                            <p className="text-[11px] text-navy-400">Block requests when limit is exceeded (null = use global default)</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={aiConfig.aiHardStop === true}
                            onChange={(e) => setAiConfig({ ...aiConfig, aiHardStop: e.target.checked })}
                            className="h-4 w-4 rounded border-navy-300 text-primary-500 focus:ring-primary-500/20"
                          />
                        </label>
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={saveAiConfig}
                        disabled={configSaving}
                        className="flex-1 h-9 rounded-xl bg-primary-500 text-white text-[13px] font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {configSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={resetToDefault}
                        disabled={configSaving}
                        className="h-9 px-3 rounded-xl border border-gray-200/60 dark:border-white/[0.06] text-[13px] font-medium text-navy-500 dark:text-navy-400 hover:bg-navy-100/50 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
