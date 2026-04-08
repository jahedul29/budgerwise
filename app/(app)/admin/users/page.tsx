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
  Settings,
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
import { DateRangePicker, type DateRange } from '@/components/shared/DateRangePicker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';

interface AiTokenUsage {
  totalTokensUsed: number;
  tokenLimit: number | null;
  remaining: number | null;
  usagePercent: number;
  requestCount: number;
  lastAiActivity: string | null;
  isUnlimited: boolean;
  isCustomLimit: boolean;
}

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  aiAssistantEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
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
type SortField = 'lastLoginAt' | 'createdAt' | 'name' | 'email';
type SortDirection = 'asc' | 'desc';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [aiStatus, setAiStatus] = useState<AiStatusFilter>('all');
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
    aiUseCustomTokenLimit: boolean;
    aiMonthlyTokenLimit: number | null;
    aiUnlimited: boolean;
    aiHardStop: boolean | null;
  } | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  // Global AI settings state
  const [showSettings, setShowSettings] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<{ defaultMonthlyTokenLimit: number; defaultAiHardStop: boolean; openaiReportedTokens?: number | null } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Overall usage summary
  const [usageSummary, setUsageSummary] = useState<{
    month: string;
    totalTokensUsed: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalRequests: number;
    totalAllocatedTokens: number;
    totalEnabledUsers: number;
    totalUnlimitedUsers: number;
    activeAiUsers: number;
    defaultMonthlyTokenLimit: number;
    openaiReportedTokens: number | null;
  } | null>(null);

  const currentCursor = pageCursors[pageIndex] ?? null;

  const loadGlobalSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setGlobalSettings(data);
      }
    } catch {
      toast.error('Failed to load AI settings');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveGlobalSettings = async () => {
    if (!globalSettings) return;
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Global AI settings saved');
      fetchUsageSummary();
      fetchUsers();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (showSettings && !globalSettings) {
      loadGlobalSettings();
    }
  }, [showSettings, globalSettings, loadGlobalSettings]);

  const fetchUsageSummary = useCallback(() => {
    fetch('/api/admin/ai-usage-summary')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setUsageSummary(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
  }, [search, aiStatus, createdRange, activeWithinDays, sortField, sortDirection, pageSize]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('sortField', sortField);
      params.set('sortDirection', sortDirection);
      params.set('aiStatus', aiStatus);
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
    fetchUsageSummary();
  }, [fetchUsers, fetchUsageSummary]);

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
      fetchUsageSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const bulkToggleAI = async (enabled: boolean) => {
    const confirmed = window.confirm(
      `${enabled ? 'Enable' : 'Disable'} AI for users matching current filters?`,
    );
    if (!confirmed) return;

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/users/bulk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          filters: {
            q: search,
            aiStatus,
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
      fetchUsageSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed');
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
      fetchUsageSummary();
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
      fetchUsageSummary();
    } catch {
      toast.error('Failed to reset');
    } finally {
      setConfigSaving(false);
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
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`ml-1 p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-primary-500/10 text-primary-500' : 'text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 hover:bg-navy-100/60 dark:hover:bg-white/[0.04]'}`}
              title="AI Token Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Global AI Settings ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden px-4 pt-3 lg:px-8 lg:pt-4"
          >
            <div className="rounded-xl border border-primary-500/20 bg-primary-500/[0.03] dark:bg-primary-500/[0.05] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-500" />
                <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Global AI Token Settings</p>
              </div>

              {settingsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                </div>
              ) : globalSettings && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-navy-500 dark:text-navy-400 mb-1">
                      Default Monthly Token Limit (all users)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={10000}
                      value={globalSettings.defaultMonthlyTokenLimit}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, defaultMonthlyTokenLimit: Number(e.target.value) || 0 })}
                      className="w-full sm:w-64 h-9 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-3 text-sm text-navy-800 dark:text-navy-100 focus:outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/15"
                    />
                    <p className="text-[10px] text-navy-400 mt-1">
                      Currently: {fmtTokens(globalSettings.defaultMonthlyTokenLimit)} tokens/month
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={globalSettings.defaultAiHardStop}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, defaultAiHardStop: e.target.checked })}
                      className="h-4 w-4 rounded border-navy-300 text-primary-500 focus:ring-primary-500/20"
                    />
                    <div>
                      <p className="text-[13px] font-medium text-navy-800 dark:text-navy-50">Hard Stop (default)</p>
                      <p className="text-[10px] text-navy-400">Block AI requests when limit is exceeded</p>
                    </div>
                  </label>

                  <div className="pt-2 border-t border-gray-200/40 dark:border-white/[0.04]">
                    <label className="block text-[11px] font-medium text-navy-500 dark:text-navy-400 mb-1">
                      OpenAI Reported Tokens (manual cross-check)
                    </label>
                    <p className="text-[10px] text-navy-400 mb-1.5">
                      Enter the total tokens shown on your OpenAI dashboard for this month to spot tracking gaps.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={globalSettings.openaiReportedTokens ?? ''}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, openaiReportedTokens: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g. 12500"
                        className="w-full sm:w-64 h-9 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-3 text-sm text-navy-800 dark:text-navy-100 placeholder:text-navy-300 focus:outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/15"
                      />
                      {globalSettings.openaiReportedTokens != null && (
                        <button
                          type="button"
                          onClick={() => setGlobalSettings({ ...globalSettings, openaiReportedTokens: null })}
                          className="h-9 px-2.5 rounded-xl text-[11px] font-medium text-navy-400 hover:text-expense hover:bg-expense/[0.06] transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={saveGlobalSettings}
                    disabled={settingsSaving}
                    className="h-8 px-4 rounded-xl bg-primary-500 text-white text-[12px] font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {settingsSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Settings
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overall Usage Summary ── */}
      {usageSummary && (
        <div className="px-4 pt-3 lg:px-8 lg:pt-4">
          <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Zap className="h-3.5 w-3.5 text-primary-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">
                AI Usage — {usageSummary.month}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-0.5">
                <p className="text-[10px] text-navy-400 dark:text-navy-500">Total Used</p>
                <p className="text-lg font-bold text-navy-800 dark:text-navy-50 tabular-nums leading-tight">
                  {fmtTokens(usageSummary.totalTokensUsed)}
                </p>
                <p className="text-[10px] text-navy-300 dark:text-navy-600 tabular-nums">
                  of {fmtTokens(usageSummary.totalAllocatedTokens)} allocated
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-navy-400 dark:text-navy-500">Remaining</p>
                <p className={`text-lg font-bold tabular-nums leading-tight ${
                  usageSummary.totalAllocatedTokens > 0 && usageSummary.totalTokensUsed / usageSummary.totalAllocatedTokens >= 0.9
                    ? 'text-expense'
                    : 'text-income dark:text-emerald-400'
                }`}>
                  {fmtTokens(Math.max(0, usageSummary.totalAllocatedTokens - usageSummary.totalTokensUsed))}
                </p>
                {usageSummary.totalAllocatedTokens > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-navy-100 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usageSummary.totalTokensUsed / usageSummary.totalAllocatedTokens >= 0.9 ? 'bg-expense' :
                          usageSummary.totalTokensUsed / usageSummary.totalAllocatedTokens >= 0.75 ? 'bg-warning' :
                          'bg-primary-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((usageSummary.totalTokensUsed / usageSummary.totalAllocatedTokens) * 100))}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-navy-400 tabular-nums">
                      {Math.round((usageSummary.totalTokensUsed / usageSummary.totalAllocatedTokens) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-navy-400 dark:text-navy-500">Requests</p>
                <p className="text-lg font-bold text-navy-800 dark:text-navy-50 tabular-nums leading-tight">
                  {usageSummary.totalRequests.toLocaleString()}
                </p>
                <p className="text-[10px] text-navy-300 dark:text-navy-600">
                  {usageSummary.activeAiUsers} active user{usageSummary.activeAiUsers !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] text-navy-400 dark:text-navy-500">Input / Output</p>
                <p className="text-sm font-bold text-navy-800 dark:text-navy-50 tabular-nums leading-tight">
                  {fmtTokens(usageSummary.totalInputTokens)} <span className="text-navy-300 dark:text-navy-600 font-normal">/</span> {fmtTokens(usageSummary.totalOutputTokens)}
                </p>
                <p className="text-[10px] text-navy-300 dark:text-navy-600">
                  {usageSummary.totalEnabledUsers} enabled{usageSummary.totalUnlimitedUsers > 0 ? ` · ${usageSummary.totalUnlimitedUsers} unlimited` : ''}
                </p>
              </div>
            </div>

            {/* OpenAI cross-check */}
            {usageSummary.openaiReportedTokens != null && (() => {
              const diff = usageSummary.openaiReportedTokens - usageSummary.totalTokensUsed;
              const absDiff = Math.abs(diff);
              const pct = usageSummary.openaiReportedTokens > 0
                ? Math.round((absDiff / usageSummary.openaiReportedTokens) * 100)
                : 0;
              const hasGap = pct > 5;
              return (
                <div className={`mt-2.5 rounded-lg px-3 py-2 flex items-center justify-between ${hasGap ? 'bg-warning/[0.06] border border-warning/20' : 'bg-surface-light/50 dark:bg-white/[0.02] border border-gray-200/40 dark:border-white/[0.04]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold ${hasGap ? 'text-warning-dark dark:text-warning' : 'text-navy-500 dark:text-navy-400'}`}>
                      OpenAI reported: {fmtTokens(usageSummary.openaiReportedTokens)}
                    </span>
                    <span className="text-[10px] text-navy-400">vs tracked: {fmtTokens(usageSummary.totalTokensUsed)}</span>
                  </div>
                  {hasGap ? (
                    <span className="text-[10px] font-semibold text-warning-dark dark:text-warning">
                      {diff > 0 ? `${fmtTokens(absDiff)} untracked` : `${fmtTokens(absDiff)} over-tracked`} ({pct}% gap)
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-income dark:text-emerald-400">
                      In sync
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

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

            <button
              type="button"
              onClick={() => bulkToggleAI(true)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-500/[0.08] transition-colors disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
              Bulk enable
            </button>
            <button
              type="button"
              onClick={() => bulkToggleAI(false)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-navy-500 dark:text-navy-400 hover:bg-navy-100/60 dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            >
              <ShieldX className="h-3 w-3" />
              Bulk disable
            </button>
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
                        </div>
                      </div>

                      {/* Token usage summary */}
                      {usage && user.aiAssistantEnabled && (
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
                  className="p-1.5 rounded-lg hover:bg-navy-100/60 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4 text-navy-400" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Token usage summary */}
                {selectedUser.aiTokenUsage && (
                  <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-surface-light/50 dark:bg-white/[0.02] p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">Token Usage This Month</p>
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
                            {selectedUser.aiTokenUsage.usagePercent >= 1 ? 'Limit exceeded' : `${Math.round(selectedUser.aiTokenUsage.usagePercent * 100)}% used`}
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
