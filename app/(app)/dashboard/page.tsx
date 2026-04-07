'use client';
import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Eye, EyeOff, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SpendingRingChart } from '@/components/charts/SpendingRingChart';
import { BudgetProgressBar } from '@/components/charts/BudgetProgressBar';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { FAB } from '@/components/shared/FAB';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/hooks/useCurrency';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { useUIStore } from '@/store/uiStore';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import React from 'react';

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DashboardPage() {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { getCurrentMonthBudgets } = useBudgets();
  const { accounts, getTotalBalance } = useAccounts();
  const { categories } = useCategories();
  const { formatAmount } = useCurrency();
  const [hideBalance, setHideBalance] = React.useState(false);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthTransactions = useMemo(() => {
    return transactions.filter(t =>
      isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
    );
  }, [transactions, monthStart, monthEnd]);

  const monthIncome = useMemo(() =>
    monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [monthTransactions]
  );

  const monthExpense = useMemo(() =>
    monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [monthTransactions]
  );

  const netFlow = monthIncome - monthExpense;

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; icon: string }>();
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const existing = map.get(t.categoryId);
        if (existing) {
          existing.value += t.amount;
        } else {
          map.set(t.categoryId, {
            name: t.categoryName,
            value: t.amount,
            color: t.categoryColor,
            icon: t.categoryIcon,
          });
        }
      });
    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [monthTransactions]);

  const budgetData = useMemo(() => {
    const budgets = getCurrentMonthBudgets();
    return budgets.map(budget => {
      const spent = monthTransactions
        .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...budget, spent };
    });
  }, [getCurrentMonthBudgets, monthTransactions]);

  const recentTransactions = transactions.slice(0, 7);
  const totalBalance = getTotalBalance();

  return (
    <PageWrapper>
      <Header />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-4 py-4 lg:px-8 lg:py-6 space-y-5 lg:space-y-6"
      >
        {/* ===== HERO BALANCE CARD ===== */}
        <motion.div variants={fadeUp}>
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 lg:p-8 text-white shadow-glow">
            {/* Decorative orbs */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary-400/20 blur-xl" />
            <div className="absolute top-1/2 right-1/4 h-20 w-20 rounded-full bg-accent/10 blur-lg animate-pulse-glow" />

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-200" />
                  <p className="text-sm font-medium text-white/70">Total Balance</p>
                </div>
                <button
                  onClick={() => setHideBalance(!hideBalance)}
                  className="text-white/50 hover:text-white transition-colors rounded-lg p-1.5 hover:bg-white/10"
                >
                  {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <motion.p
                key={totalBalance}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl lg:text-5xl font-display font-bold tracking-tight"
              >
                {hideBalance ? '••••••' : formatAmount(totalBalance)}
              </motion.p>
              <p className="mt-2 text-sm text-white/50">{format(now, 'MMMM yyyy')}</p>

              {/* Net flow indicator */}
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm">
                {netFlow >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-income" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-expense" />
                )}
                <span className={netFlow >= 0 ? 'text-income' : 'text-expense-light'}>
                  {netFlow >= 0 ? '+' : ''}{formatAmount(netFlow)}
                </span>
                <span className="text-white/40 ml-0.5">this month</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== INCOME / EXPENSE CARDS ===== */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:gap-4">
          <div className="glass-card rounded-2xl p-4 lg:p-5 hover-lift">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-income/15">
              <ArrowUpRight className="h-5 w-5 text-income" />
            </div>
            <p className="text-xs font-medium text-navy-400 dark:text-navy-300">Income</p>
            <p className="text-xl lg:text-2xl font-display font-bold text-income mt-0.5">{formatAmount(monthIncome)}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 lg:p-5 hover-lift">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-expense/15">
              <ArrowDownRight className="h-5 w-5 text-expense" />
            </div>
            <p className="text-xs font-medium text-navy-400 dark:text-navy-300">Expenses</p>
            <p className="text-xl lg:text-2xl font-display font-bold text-expense mt-0.5">{formatAmount(monthExpense)}</p>
          </div>
        </motion.div>

        {/* ===== ACCOUNTS CAROUSEL ===== */}
        {accounts.length > 0 && (
          <motion.div variants={fadeUp} className="overflow-x-auto scrollbar-hide -mx-4 px-4 lg:-mx-8 lg:px-8">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {accounts.map((account, i) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[calc((100vw-2.75rem)/2)] sm:w-44 lg:w-48 shrink-0 glass-card rounded-2xl p-4 hover-lift cursor-pointer group"
                >
                  <span className="text-2xl">{account.icon}</span>
                  <p className="mt-2 text-xs font-medium text-navy-400 dark:text-navy-300 truncate">{account.name}</p>
                  <p className="text-base font-bold font-display text-navy-800 dark:text-navy-50 mt-0.5">
                    {formatAmount(account.balance)}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== DESKTOP: 2 COLUMN LAYOUT / MOBILE: STACKED ===== */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-5 lg:space-y-0">
          {/* Spending Chart */}
          {spendingByCategory.length > 0 && (
            <motion.div variants={fadeUp}>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-display font-bold text-navy-800 dark:text-navy-50">Spending Breakdown</h3>
                  <Link href="/analytics" className="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                    Details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="px-5 pb-5">
                  <SpendingRingChart data={spendingByCategory} />
                  <div className="mt-4 space-y-2.5">
                    {spendingByCategory.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-sm group">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-surface-card" style={{ backgroundColor: item.color }} />
                          <span className="text-navy-500 dark:text-navy-200 group-hover:text-navy-700 dark:group-hover:text-navy-50 transition-colors">
                            {item.icon} {item.name}
                          </span>
                        </span>
                        <span className="font-semibold font-display text-navy-700 dark:text-navy-100">{formatAmount(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Budget Progress */}
          {budgetData.length > 0 && (
            <motion.div variants={fadeUp}>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-display font-bold text-navy-800 dark:text-navy-50">Budget Progress</h3>
                  <Link href="/budgets" className="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="px-5 pb-5 space-y-4">
                  {budgetData.slice(0, 4).map(budget => (
                    <BudgetProgressBar
                      key={budget.id}
                      categoryName={budget.categoryName}
                      categoryIcon={categories.find(c => c.id === budget.categoryId)?.icon || '📦'}
                      spent={budget.spent}
                      budget={budget.amount}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ===== RECENT TRANSACTIONS ===== */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-navy-800 dark:text-navy-50">Recent Transactions</h3>
              <Link href="/transactions" className="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-2 pb-3">
              {txLoading ? (
                <div className="px-3 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="px-3">
                  <EmptyState
                    icon={<Wallet className="h-12 w-12" />}
                    title="No transactions yet"
                    description="Tap the + button to add your first transaction"
                  />
                </div>
              ) : (
                <div>
                  {recentTransactions.map(tx => (
                    <TransactionCard key={tx.id} transaction={tx} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <FAB />
      <AddTransactionSheet />
    </PageWrapper>
  );
}
