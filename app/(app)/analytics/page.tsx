'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, getDay } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart';
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart';
import { SavingsAreaChart } from '@/components/charts/SavingsAreaChart';
import { SpendingRingChart } from '@/components/charts/SpendingRingChart';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { SpendingHeatmap } from '@/components/charts/SpendingHeatmap';
import { useTransactions } from '@/hooks/useTransactions';
import { formatAmount } from '@/lib/currency';

type Period = '1M' | '3M' | '6M' | '1Y';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function AnalyticsPage() {
  const { transactions } = useTransactions();
  const [period, setPeriod] = useState<Period>('6M');

  const monthsBack = period === '1M' ? 1 : period === '3M' ? 3 : period === '6M' ? 6 : 12;
  const now = new Date();

  const filteredTransactions = useMemo(() => {
    const start = startOfMonth(subMonths(now, monthsBack));
    return transactions.filter(t =>
      new Date(t.date) >= start && new Date(t.date) <= now
    );
  }, [transactions, monthsBack]);

  const monthlyData = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthTxs = filteredTransactions.filter(t =>
        isWithinInterval(new Date(t.date), { start, end })
      );
      months.push({
        month: format(date, 'MMM'),
        income: monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return months;
  }, [filteredTransactions, monthsBack]);

  const savingsData = useMemo(() =>
    monthlyData.map(m => ({ month: m.month, savings: m.income - m.expense })),
    [monthlyData]
  );

  const categoryBreakdown = useMemo(() => {
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const map = new Map<string, { name: string; value: number; color: string; icon: string }>();
    filteredTransactions
      .filter(t => t.type === 'expense' && isWithinInterval(new Date(t.date), { start: currentStart, end: currentEnd }))
      .forEach(t => {
        const existing = map.get(t.categoryId);
        if (existing) existing.value += t.amount;
        else map.set(t.categoryId, { name: t.categoryName, value: t.amount, color: t.categoryColor, icon: t.categoryIcon });
      });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = Array(7).fill(0);
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        totals[getDay(new Date(t.date))] += t.amount;
      });
    return days.map((day, i) => ({ day, amount: totals[i] }));
  }, [filteredTransactions]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgDailySpend = totalExpense / Math.max(monthsBack * 30, 1);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
  const biggestExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)[0];
  const mostUsedCategory = categoryBreakdown[0];

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="px-4 py-3 lg:px-8 lg:py-5">
          <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50 mb-3">Analytics</h1>
          <div className="flex gap-2 lg:max-w-xs">
            {(['1M', '3M', '6M', '1Y'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                  period === p
                    ? 'gradient-primary text-white shadow-glow-sm'
                    : 'bg-white/60 dark:bg-white/[0.04] text-navy-400 dark:text-navy-300 hover:text-navy-600 dark:hover:text-navy-100 border border-gray-200/60 dark:border-white/[0.06]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-4 py-4 lg:px-8 lg:py-6 space-y-5 lg:space-y-6"
      >
        {/* Quick Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="glass-card rounded-2xl p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <DollarSign className="h-4 w-4 text-accent" />
              </div>
            </div>
            <span className="text-xs font-medium text-navy-400 dark:text-navy-300">Avg Daily Spend</span>
            <p className="text-lg font-display font-bold text-navy-800 dark:text-navy-50 mt-0.5">{formatAmount(avgDailySpend)}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-income/10">
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
            </div>
            <span className="text-xs font-medium text-navy-400 dark:text-navy-300">Savings Rate</span>
            <p className={`text-lg font-display font-bold mt-0.5 ${savingsRate >= 0 ? 'text-income' : 'text-expense'}`}>
              {savingsRate.toFixed(1)}%
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-expense/10">
                <TrendingDown className="h-4 w-4 text-expense" />
              </div>
            </div>
            <span className="text-xs font-medium text-navy-400 dark:text-navy-300">Biggest Expense</span>
            <p className="text-sm font-display font-bold text-navy-800 dark:text-navy-50 truncate mt-0.5">
              {biggestExpense ? formatAmount(biggestExpense.amount) : '-'}
            </p>
            <p className="text-xs text-navy-400 dark:text-navy-300 truncate">{biggestExpense?.description || ''}</p>
          </div>
          <div className="glass-card rounded-2xl p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <PieChart className="h-4 w-4 text-warning" />
              </div>
            </div>
            <span className="text-xs font-medium text-navy-400 dark:text-navy-300">Top Category</span>
            <p className="text-sm font-display font-bold text-navy-800 dark:text-navy-50 truncate mt-0.5">
              {mostUsedCategory ? `${mostUsedCategory.icon} ${mostUsedCategory.name}` : '-'}
            </p>
            <p className="text-xs text-navy-400 dark:text-navy-300">{mostUsedCategory ? formatAmount(mostUsedCategory.value) : ''}</p>
          </div>
        </motion.div>

        {/* Charts - 2 column on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-5 lg:space-y-0">
          <motion.div variants={fadeUp}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-base font-display font-bold text-navy-800 dark:text-navy-50">Income vs Expenses</h3>
              </div>
              <div className="px-5 pb-5">
                <Tabs defaultValue="line">
                  <TabsList className="w-full mb-3">
                    <TabsTrigger value="line" className="flex-1">Line</TabsTrigger>
                    <TabsTrigger value="bar" className="flex-1">Bar</TabsTrigger>
                    <TabsTrigger value="area" className="flex-1">Savings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="line">
                    <IncomeExpenseChart data={monthlyData} />
                  </TabsContent>
                  <TabsContent value="bar">
                    <MonthlyBarChart data={monthlyData} />
                  </TabsContent>
                  <TabsContent value="area">
                    <SavingsAreaChart data={savingsData} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-base font-display font-bold text-navy-800 dark:text-navy-50">Spending by Category</h3>
              </div>
              <div className="px-5 pb-5">
                <Tabs defaultValue="donut">
                  <TabsList className="w-full mb-3">
                    <TabsTrigger value="donut" className="flex-1">Donut</TabsTrigger>
                    <TabsTrigger value="bars" className="flex-1">Bars</TabsTrigger>
                  </TabsList>
                  <TabsContent value="donut">
                    <SpendingRingChart data={categoryBreakdown.slice(0, 6)} />
                  </TabsContent>
                  <TabsContent value="bars">
                    <CategoryBarChart data={categoryBreakdown.slice(0, 8)} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Heatmap - full width */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-base font-display font-bold text-navy-800 dark:text-navy-50 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-500" />
                Spending by Day of Week
              </h3>
            </div>
            <div className="px-5 pb-5">
              <SpendingHeatmap data={dayOfWeekData} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
