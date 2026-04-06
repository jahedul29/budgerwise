'use client';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun, Monitor, Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/LogoMark';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';
import { localDb } from '@/lib/dexie';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { syncStatus, lastSyncTime } = useUIStore();

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
    } catch (err) {
      toast.error('Export failed');
    }
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
    } catch (err) {
      toast.error('Export failed');
    }
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
    } catch (err) {
      toast.error('Failed to clear data');
    }
  };

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

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
        className="px-4 py-4 lg:px-8 lg:py-6 space-y-5 lg:max-w-2xl"
      >
        {/* Theme */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100/60 dark:border-white/[0.04]">
              <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-widest">Appearance</p>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                {themes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`flex flex-1 flex-col items-center gap-2 rounded-xl p-3 transition-all ${
                      theme === t.value
                        ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-500/10 dark:ring-primary-400'
                        : 'bg-surface-light dark:bg-white/[0.03] hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <t.icon className={`h-5 w-5 ${theme === t.value ? 'text-primary-500' : 'text-navy-400'}`} />
                    <span className={`text-xs font-semibold ${theme === t.value ? 'text-primary-600 dark:text-primary-400' : 'text-navy-500 dark:text-navy-300'}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sync Status */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100/60 dark:border-white/[0.04]">
              <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-widest">Sync</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-500 dark:text-navy-200">Status</span>
                <span className="text-sm font-semibold capitalize text-navy-800 dark:text-navy-50">{syncStatus}</span>
              </div>
              {lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-navy-500 dark:text-navy-200">Last Synced</span>
                  <span className="text-sm text-navy-400 dark:text-navy-300">{lastSyncTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100/60 dark:border-white/[0.04]">
              <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-widest">Data</p>
            </div>
            <div className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2.5 rounded-xl h-11 text-navy-700 dark:text-navy-100 border-gray-200/60 dark:border-white/[0.06]" onClick={handleExportCSV}>
                <Download className="h-4 w-4 text-primary-500" />
                Export as CSV
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2.5 rounded-xl h-11 text-navy-700 dark:text-navy-100 border-gray-200/60 dark:border-white/[0.06]" onClick={handleExportJSON}>
                <Download className="h-4 w-4 text-accent" />
                Export as JSON Backup
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 rounded-xl h-11 text-expense border-expense/20 hover:bg-expense/5 hover:text-expense"
                onClick={handleClearData}
              >
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </Button>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl p-5 text-center">
            <LogoMark className="mx-auto mb-3 h-12 w-12 shadow-glow-sm" />
            <p className="text-sm font-display font-bold text-navy-800 dark:text-navy-50">BudgetWise</p>
            <p className="text-xs text-navy-400 dark:text-navy-300 mt-1">Version 1.0.0</p>
            <p className="text-xs text-navy-300 dark:text-navy-400 mt-2">Smart budgeting, beautiful insights</p>
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
