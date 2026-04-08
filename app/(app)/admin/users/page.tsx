'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowDownAZ,
  ArrowUpAZ,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crown,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { DateRangePicker, type DateRange } from '@/components/shared/DateRangePicker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import toast from 'react-hot-toast';

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  aiAssistantEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
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

  const currentCursor = pageCursors[pageIndex] ?? null;

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBulkLoading(false);
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
          </div>
        </div>
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
                users.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="glass-card rounded-xl p-4 flex items-center gap-3"
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

                    <button
                      type="button"
                      onClick={() => toggleAI(user.id, !user.aiAssistantEnabled)}
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
                ))
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
    </PageWrapper>
  );
}
