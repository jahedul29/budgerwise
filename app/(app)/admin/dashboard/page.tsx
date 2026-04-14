'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Crown,
  Loader2,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Zap,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AdminTabs } from '@/components/admin/AdminTabs';
import toast from 'react-hot-toast';

interface UsageSummary {
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
  defaultTrialTokenLimit: number;
  openaiReportedTokens: number | null;
}

interface UserStats {
  totalUsers: number;
  aiEnabledUsers: number;
  activeLastWeek: number;
  activeLastMonth: number;
  roles: { superadmins: number; admins: number; managers: number; users: number };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Global AI settings
  const [showSettings, setShowSettings] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<{
    defaultMonthlyTokenLimit: number;
    defaultTrialTokenLimit: number;
    defaultAiHardStop: boolean;
    trialEnabled?: boolean;
    openaiReportedTokens?: number | null;
  } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fmtTokens = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '--';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, statsRes] = await Promise.all([
        fetch('/api/admin/ai-usage-summary'),
        fetch('/api/admin/stats'),
      ]);

      if (usageRes.status === 403 || statsRes.status === 403) {
        router.replace('/dashboard');
        toast.error('Admin access required');
        return;
      }

      const [usageData, statsData] = await Promise.all([
        usageRes.ok ? usageRes.json() : null,
        statsRes.ok ? statsRes.json() : null,
      ]);

      if (usageData) setUsage(usageData);
      if (statsData) setStats(statsData);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadGlobalSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/ai-settings');
      const data = await res.json().catch(() => null);
      if (res.ok && data) setGlobalSettings(data);
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
      fetchData();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (showSettings && !globalSettings) loadGlobalSettings();
  }, [showSettings, globalSettings, loadGlobalSettings]);

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
              <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">
                Admin
              </h1>
            </div>
          </div>
        </div>
        <AdminTabs />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          <span className="text-sm text-navy-400">Loading dashboard...</span>
        </div>
      ) : (
        <div className="px-4 py-4 lg:px-8 lg:py-6 space-y-4">
          {/* ── User Stats ── */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary-500', bg: 'from-primary-500/10 to-primary-500/5' },
                { label: 'Active (7d)', value: stats.activeLastWeek, icon: Activity, color: 'text-emerald-500', bg: 'from-emerald-500/10 to-emerald-500/5' },
                { label: 'Active (30d)', value: stats.activeLastMonth, icon: Activity, color: 'text-sky-500', bg: 'from-sky-500/10 to-sky-500/5' },
                { label: 'AI Enabled', value: stats.aiEnabledUsers, icon: Bot, color: 'text-violet-500', bg: 'from-violet-500/10 to-violet-500/5' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-3.5"
                >
                  <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${stat.bg} mb-2`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-navy-800 dark:text-navy-50 tabular-nums">{stat.value}</p>
                  <p className="text-[11px] text-navy-400 dark:text-navy-500 mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Role Breakdown ── */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">Team Roles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Superadmin', count: stats.roles.superadmins, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                  { label: 'Admin', count: stats.roles.admins, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
                  { label: 'Manager', count: stats.roles.managers, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
                  { label: 'User', count: stats.roles.users, color: 'bg-navy-100/60 dark:bg-white/[0.04] text-navy-500 dark:text-navy-400 border-navy-200/50 dark:border-white/[0.06]' },
                ].map((role) => (
                  <div key={role.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] font-semibold ${role.color}`}>
                    <span>{role.label}</span>
                    <span className="tabular-nums">{role.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── AI Usage Summary ── */}
          {usage && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">
                  AI Token Usage — {(() => { const [y, m] = usage.month.split('-'); return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); })()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-navy-400 dark:text-navy-500">Total Used</p>
                  <p className="text-xl font-bold text-navy-800 dark:text-navy-50 tabular-nums">{fmtTokens(usage.totalTokensUsed)}</p>
                  <p className="text-[10px] text-navy-300 dark:text-navy-600 tabular-nums">of {fmtTokens(usage.totalAllocatedTokens)} allocated</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-navy-400 dark:text-navy-500">Remaining</p>
                  <p className={`text-xl font-bold tabular-nums ${
                    usage.totalAllocatedTokens > 0 && usage.totalTokensUsed / usage.totalAllocatedTokens >= 0.9 ? 'text-expense' : 'text-income dark:text-emerald-400'
                  }`}>
                    {fmtTokens(Math.max(0, usage.totalAllocatedTokens - usage.totalTokensUsed))}
                  </p>
                  {usage.totalAllocatedTokens > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-navy-100 dark:bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usage.totalTokensUsed / usage.totalAllocatedTokens >= 0.9 ? 'bg-expense' :
                            usage.totalTokensUsed / usage.totalAllocatedTokens >= 0.75 ? 'bg-warning' : 'bg-primary-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.round((usage.totalTokensUsed / usage.totalAllocatedTokens) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-navy-400 tabular-nums">
                        {Math.min(Math.round((usage.totalTokensUsed / usage.totalAllocatedTokens) * 100), 100)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-navy-400 dark:text-navy-500">Requests</p>
                  <p className="text-xl font-bold text-navy-800 dark:text-navy-50 tabular-nums">{usage.totalRequests.toLocaleString()}</p>
                  <p className="text-[10px] text-navy-300 dark:text-navy-600">{usage.activeAiUsers} active user{usage.activeAiUsers !== 1 ? 's' : ''}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-navy-400 dark:text-navy-500">Input / Output</p>
                  <p className="text-sm font-bold text-navy-800 dark:text-navy-50 tabular-nums leading-tight mt-1 whitespace-nowrap">
                    {fmtTokens(usage.totalInputTokens)} <span className="text-navy-300 dark:text-navy-600 font-normal">/</span> {fmtTokens(usage.totalOutputTokens)}
                  </p>
                  <p className="text-[10px] text-navy-300 dark:text-navy-600">
                    {usage.totalEnabledUsers} enabled{usage.totalUnlimitedUsers > 0 ? ` · ${usage.totalUnlimitedUsers} unlimited` : ''}
                  </p>
                </div>
              </div>

              {/* OpenAI cross-check */}
              {usage.openaiReportedTokens != null && (() => {
                const diff = usage.openaiReportedTokens - usage.totalTokensUsed;
                const absDiff = Math.abs(diff);
                const pct = usage.openaiReportedTokens > 0 ? Math.round((absDiff / usage.openaiReportedTokens) * 100) : 0;
                const hasGap = pct > 5;
                return (
                  <div className={`mt-3 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${hasGap ? 'bg-warning/[0.06] border border-warning/20' : 'bg-surface-light/50 dark:bg-white/[0.02] border border-gray-200/40 dark:border-white/[0.04]'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${hasGap ? 'text-warning-dark dark:text-warning' : 'text-navy-500 dark:text-navy-400'}`}>
                        OpenAI reported: {fmtTokens(usage.openaiReportedTokens)}
                      </span>
                      <span className="text-[10px] text-navy-400">vs tracked: {fmtTokens(usage.totalTokensUsed)}</span>
                    </div>
                    {hasGap ? (
                      <span className="text-[10px] font-semibold text-warning-dark dark:text-warning">
                        {diff > 0 ? `${fmtTokens(absDiff)} untracked` : `${fmtTokens(absDiff)} over-tracked`} ({pct}% gap)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-income dark:text-emerald-400">In sync</span>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ── Global AI Token Settings (collapsible) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-4 hover:border-primary-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                  <Settings className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Global AI Token Settings</p>
                  <p className="text-[11px] text-navy-400 dark:text-navy-500">Default limits, hard stop, OpenAI cross-check</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-navy-400 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSettings && (
              <div className="mt-2 rounded-xl border border-primary-500/20 bg-primary-500/[0.03] dark:bg-primary-500/[0.05] p-4 space-y-3">
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

                    <div>
                      <label className="block text-[11px] font-medium text-navy-500 dark:text-navy-400 mb-1">
                        Default Trial Token Limit
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={globalSettings.defaultTrialTokenLimit}
                        onChange={(e) => setGlobalSettings({ ...globalSettings, defaultTrialTokenLimit: Number(e.target.value) || 0 })}
                        className="w-full sm:w-64 h-9 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-3 text-sm text-navy-800 dark:text-navy-100 focus:outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/15"
                      />
                      <p className="text-[10px] text-navy-400 mt-1">
                        Applies to new trial activations only. Currently: {fmtTokens(globalSettings.defaultTrialTokenLimit)} tokens
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
            )}
          </motion.div>

          {/* Quick link to manage users */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/admin/users"
              className="flex items-center justify-between rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-4 hover:border-primary-500/20 hover:bg-primary-500/[0.02] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-500/5">
                  <ShieldCheck className="h-4 w-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-navy-800 dark:text-navy-50">Manage Users & Roles</p>
                  <p className="text-[11px] text-navy-400 dark:text-navy-500">AI access, token limits, and role assignments</p>
                </div>
              </div>
              <span className="text-navy-300 dark:text-navy-600 group-hover:text-primary-500 transition-colors text-[18px]">&rarr;</span>
            </Link>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
}
