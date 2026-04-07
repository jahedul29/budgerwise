'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Crown,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403) {
        router.replace('/dashboard');
        toast.error('Admin access required');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [router]);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, aiAssistantEnabled: enabled } : u)),
      );
      toast.success(`AI assistant ${enabled ? 'enabled' : 'disabled'} for ${userId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const enabledCount = users.filter((u) => u.aiAssistantEnabled).length;

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
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
              <div>
                <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">
                  Admin
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-navy-400 dark:text-navy-300">
            <Shield className="h-3.5 w-3.5" />
            <span>{users.length} users</span>
            <span className="text-navy-200 dark:text-navy-600">|</span>
            <Bot className="h-3.5 w-3.5 text-primary-500" />
            <span>{enabledCount} AI enabled</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full rounded-xl border border-gray-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] pl-10 pr-4 py-2.5 text-sm text-navy-800 dark:text-navy-50 placeholder:text-navy-400/50 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            <span className="text-sm text-navy-400">Loading users...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-expense/20 bg-expense/[0.06] p-4 text-center">
            <p className="text-sm text-expense">{error}</p>
          </div>
        )}

        {/* User List */}
        {!loading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Users className="h-10 w-10 text-navy-300 dark:text-navy-500" />
                <p className="text-sm text-navy-400">
                  {search ? 'No users match your search' : 'No users found'}
                </p>
              </div>
            ) : (
              filtered.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-xl p-4 flex items-center gap-3 group"
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0 ring-2 ring-gray-200/50 dark:ring-white/[0.06]">
                    <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                    <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-sm font-semibold">
                      {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
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
                      <span className="text-[10px] text-navy-400 dark:text-navy-500 whitespace-nowrap hidden sm:inline">
                        Last login {fmtDate(user.lastLoginAt)}
                      </span>
                    </div>
                  </div>

                  {/* AI Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleAI(user.id, !user.aiAssistantEnabled)}
                    disabled={toggling === user.id}
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
        )}
      </div>
    </PageWrapper>
  );
}
