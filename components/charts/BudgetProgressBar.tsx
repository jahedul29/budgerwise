'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/currency';
import type { BudgetPeriod } from '@/types';

const periodBadgeStyles: Record<BudgetPeriod, string> = {
  weekly: 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent-light',
  monthly: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
  yearly: 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
};

interface BudgetProgressBarProps {
  categoryName: string;
  categoryIcon: string;
  spent: number;
  budget: number;
  period?: BudgetPeriod;
  currency?: string;
}

export function BudgetProgressBar({
  categoryName,
  categoryIcon,
  spent,
  budget,
  period,
  currency = 'BDT',
}: BudgetProgressBarProps) {
  const percentage = Math.min((spent / budget) * 100, 100);
  const overBudget = spent > budget;

  const getColor = () => {
    if (percentage > 85) return 'bg-expense';
    if (percentage > 60) return 'bg-warning';
    return 'bg-primary-500';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-navy-700 dark:text-navy-100">
          <span>{categoryIcon}</span>
          {categoryName}
          {period && (
            <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize tracking-wide leading-none', periodBadgeStyles[period])}>
              {period}
            </span>
          )}
        </span>
        <span className={cn('text-xs font-display font-bold', overBudget ? 'text-expense' : 'text-navy-400 dark:text-navy-300')}>
          {formatAmount(spent, currency)} / {formatAmount(budget, currency)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-light dark:bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          className={cn('h-full rounded-full', getColor())}
        />
      </div>
    </div>
  );
}
