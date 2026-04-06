'use client';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Moon, Sun, Monitor, Download, RefreshCw,
  Trash2, Check, CloudCog, AlertTriangle, Palette, Coins,
  Database, RefreshCcw, FileDown, FileJson, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/LogoMark';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useCurrency } from '@/hooks/useCurrency';
import { currencies } from '@/lib/currency';
import toast from 'react-hot-toast';
import { localDb } from '@/lib/dexie';

const popularCurrencies = [
  'USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY',
  'CAD', 'AUD', 'SGD', 'AED', 'SAR', 'CNY',
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { syncStatus, syncError, lastSyncTime, syncNow, isSyncing } = useUIStore();
  const { currency, setCurrency, symbol } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleExportCSV = async () => {
    try {
      const transactions = await localDb.transactions.toArray();
      const headers = 'Date,Type,Category,Description,Amount,Payment Method,Notes\n';
      const csv = transactions.map(t =>
        `${new Date(t.date).toLocaleDateString()},${t.type},${t.categoryName},${t.description},${t.amount},${t.paymentMethod},${t.notes || ''}`
      ).join('\n');
      const blob = new Blob([headers + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgetwise-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    } catch { toast.error('Export failed'); }
  };

  const handleExportJSON = async () => {
    try {
      const data = {
        transactions: await localDb.transactions.toArray(),
        categories: await localDb.categories.toArray(),
        budgets: await localDb.budgets.toArray(),
        accounts: await localDb.accounts.toArray(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgetwise-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported!');
    } catch { toast.error('Export failed'); }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure? This will delete ALL local data. This cannot be undone.')) return;
    try {
      await localDb.transactions.clear();
      await localDb.categories.clear();
      await localDb.budgets.clear();
      await localDb.accounts.clear();
      toast.success('All data cleared');
      window.location.reload();
    } catch { toast.error('Failed to clear data'); }
  };

  const handleManualSync = async () => {
    if (!syncNow) { toast.error('Sync is not ready yet'); return; }
    const didSync = await syncNow();
    if (didSync) toast.success('Sync completed');
    else toast.error('Sync failed');
  };

  const themes = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Bright & clean' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { value: 'system', label: 'Auto', icon: Monitor, desc: 'Match your OS' },
  ];

  const currencyInfo = currencies.find(c => c.code === currency);
  const visibleCurrencies = showAllCurrencies ? popularCurrencies : popularCurrencies.slice(0, 6);

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-8 lg:py-5">
          <Link href="/more" className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">Settings</h1>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-4 py-5 lg:px-8 lg:py-8 max-w-xl lg:max-w-2xl mx-auto space-y-8"
      >
        {/* ─── APPEARANCE ─── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10">
              <Palette className="h-3.5 w-3.5 text-primary-500" />
            </div>
            <h2 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50 tracking-tight">Appearance</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(t => {
              const isActive = mounted && theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl p-4 transition-all duration-200 ${
                    isActive
                      ? 'glass-card ring-2 ring-primary-500 dark:ring-primary-400 shadow-glow-sm'
                      : 'glass-card hover:shadow-card-hover'
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? 'gradient-primary text-white shadow-sm'
                      : 'bg-surface-light dark:bg-white/[0.06] text-navy-400 dark:text-navy-300'
                  }`}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs font-bold ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-navy-700 dark:text-navy-100'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-navy-400 dark:text-navy-400">{t.desc}</span>
                  {isActive && (
                    <motion.div
                      layoutId="themeCheck"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full gradient-primary shadow-sm"
                      transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ─── CURRENCY ─── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                <Coins className="h-3.5 w-3.5 text-warning" />
              </div>
              <h2 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50 tracking-tight">Currency</h2>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-500/10 px-2.5 py-1 text-[10px] font-bold text-primary-600 dark:text-primary-400">
              <CloudCog className="h-3 w-3" />
              Synced
            </span>
          </div>

          {/* Current currency highlight */}
          <div className="glass-card rounded-2xl p-4 mb-3 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-500/5 dark:bg-primary-500/[0.03]" />
            <div className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-warning/5 dark:bg-warning/[0.03]" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white text-xl font-display font-bold shadow-glow-sm">
                {mounted ? symbol : '৳'}
              </div>
              <div className="flex-1">
                <p className="text-lg font-display font-bold text-navy-800 dark:text-navy-50">
                  {currencyInfo?.name ?? 'Bangladeshi Taka'}
                </p>
                <p className="text-xs font-semibold text-navy-400 dark:text-navy-300 mt-0.5">
                  {mounted ? currency : 'BDT'} — Used for all amounts
                </p>
              </div>
            </div>
          </div>

          {/* Currency grid */}
          <div className="grid grid-cols-3 gap-2">
            {visibleCurrencies.map(code => {
              const c = currencies.find(x => x.code === code);
              if (!c) return null;
              const isActive = mounted && currency === code;
              return (
                <motion.button
                  key={code}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (!isActive) {
                      setCurrency(code);
                      toast.success(`Currency changed to ${c.name}`);
                    }
                  }}
                  className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all ${
                    isActive
                      ? 'glass-card ring-2 ring-primary-500 dark:ring-primary-400'
                      : 'bg-surface-light/80 dark:bg-white/[0.03] hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className={`text-lg font-display font-bold leading-none ${
                    isActive ? 'text-primary-600 dark:text-primary-400' : 'text-navy-500 dark:text-navy-200'
                  }`}>
                    {c.symbol}
                  </span>
                  <span className={`text-[11px] font-bold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-navy-700 dark:text-navy-100'}`}>
                    {code}
                  </span>
                  <span className="text-[9px] text-navy-400 dark:text-navy-400 truncate max-w-full leading-tight">
                    {c.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="currencyCheck"
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full gradient-primary shadow-sm"
                      transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
          {!showAllCurrencies && (
            <button
              onClick={() => setShowAllCurrencies(true)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/5 transition-colors"
            >
              Show all currencies
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>

        {/* ─── SYNC ─── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <RefreshCcw className="h-3.5 w-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50 tracking-tight">Sync</h2>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-500 dark:text-navy-200">Status</span>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    syncStatus === 'synced' ? 'bg-income' :
                    syncStatus === 'error' ? 'bg-expense' :
                    syncStatus === 'syncing' ? 'bg-primary-500 animate-pulse' :
                    syncStatus === 'offline' ? 'bg-warning' :
                    'bg-navy-300'
                  }`} />
                  <span className={`text-sm font-semibold capitalize ${
                    syncStatus === 'synced' ? 'text-income' :
                    syncStatus === 'error' ? 'text-expense' :
                    syncStatus === 'syncing' ? 'text-primary-500' :
                    'text-navy-800 dark:text-navy-50'
                  }`}>
                    {syncStatus}
                  </span>
                </div>
              </div>
              {lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-navy-500 dark:text-navy-200">Last synced</span>
                  <span className="text-sm text-navy-400 dark:text-navy-300">
                    {mounted ? lastSyncTime.toLocaleTimeString() : ''}
                  </span>
                </div>
              )}
              {syncError && (
                <div className="flex items-start gap-2 rounded-xl border border-expense/20 bg-expense/5 px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-expense shrink-0 mt-0.5" />
                  <p className="text-xs text-expense leading-relaxed">{syncError}</p>
                </div>
              )}
            </div>
            <div className="px-4 pb-4">
              <Button
                onClick={handleManualSync}
                disabled={!syncNow || isSyncing}
                className={`w-full justify-center gap-2 rounded-xl h-11 text-sm font-semibold transition-all ${
                  syncStatus === 'error'
                    ? 'bg-expense hover:bg-expense-dark text-white border-0'
                    : 'gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : syncStatus === 'error' ? 'Retry Sync' : 'Sync Now'}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ─── DATA ─── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-income/10">
              <Database className="h-3.5 w-3.5 text-income" />
            </div>
            <h2 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50 tracking-tight">Data</h2>
          </div>
          <div className="glass-card rounded-2xl divide-y divide-gray-100/60 dark:divide-white/[0.04] overflow-hidden">
            <button
              onClick={handleExportCSV}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all hover:bg-navy-50/50 dark:hover:bg-white/[0.03] group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 group-hover:bg-primary-500/15 transition-colors">
                <FileDown className="h-4.5 w-4.5 text-primary-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy-800 dark:text-navy-50">Export as CSV</p>
                <p className="text-[11px] text-navy-400 dark:text-navy-300 mt-0.5">Transactions as spreadsheet</p>
              </div>
              <ChevronRight className="h-4 w-4 text-navy-200 dark:text-navy-600 group-hover:text-navy-400 dark:group-hover:text-navy-300 transition-colors" />
            </button>
            <button
              onClick={handleExportJSON}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all hover:bg-navy-50/50 dark:hover:bg-white/[0.03] group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
                <FileJson className="h-4.5 w-4.5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy-800 dark:text-navy-50">Export as JSON</p>
                <p className="text-[11px] text-navy-400 dark:text-navy-300 mt-0.5">Full backup of all data</p>
              </div>
              <ChevronRight className="h-4 w-4 text-navy-200 dark:text-navy-600 group-hover:text-navy-400 dark:group-hover:text-navy-300 transition-colors" />
            </button>
          </div>

          {/* Danger zone */}
          <div className="mt-3">
            <button
              onClick={handleClearData}
              className="flex w-full items-center gap-3.5 rounded-2xl border-2 border-dashed border-expense/20 hover:border-expense/40 px-4 py-3.5 text-left transition-all hover:bg-expense/[0.03] group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense/8 group-hover:bg-expense/12 transition-colors">
                <Trash2 className="h-4.5 w-4.5 text-expense/70 group-hover:text-expense transition-colors" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-expense/80 group-hover:text-expense transition-colors">Clear All Data</p>
                <p className="text-[11px] text-expense/40 group-hover:text-expense/60 transition-colors mt-0.5">Permanently delete everything locally</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* ─── ABOUT ─── */}
        <motion.div variants={fadeUp} className="pt-2 pb-4">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-glow">
              <LogoMark className="h-6.5 w-6.5" />
            </div>
            <p className="text-lg font-display font-extrabold tracking-tight text-navy-800 dark:text-navy-50">BudgetWise</p>
            <p className="text-[11px] font-semibold text-navy-300 dark:text-navy-400 mt-1 tracking-wide uppercase">Version 1.0.0</p>
            <p className="text-xs text-navy-400 dark:text-navy-300 mt-3 max-w-[240px] leading-relaxed">
              Smart budgeting with beautiful insights. Your finances, under control.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
