'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/currency';
import { Trash2, Edit } from 'lucide-react';

import type { BudgetPeriod } from '@/types';

const periodBadgeStyles: Record<BudgetPeriod, string> = {
  weekly: 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent-light',
  monthly: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
  yearly: 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
};

interface BudgetCardProps {
  categoryName: string;
  categoryIcon: string;
  spent: number;
  budget: number;
  period: BudgetPeriod;
  daysRemaining: number;
  remainingLabel?: string;
  currency?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function BudgetCard({
  categoryName,
  categoryIcon,
  spent,
  budget,
  period,
  daysRemaining,
  remainingLabel,
  currency = 'BDT',
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const percentage = Math.min((spent / budget) * 100, 100);
  const overBudget = spent > budget;
  const remaining = budget - spent;

  const getBarColor = () => {
    if (percentage > 85) return 'bg-expense';
    if (percentage > 60) return 'bg-warning';
    return 'bg-primary-500';
  };

  const getBarBg = () => {
    if (percentage > 85) return 'bg-expense/10';
    if (percentage > 60) return 'bg-warning/10';
    return 'bg-primary-500/10';
  };

  return (
    <div className="glass-card rounded-2xl p-4 hover-lift group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-105', getBarBg())}>
            {categoryIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-navy-800 dark:text-navy-50">{categoryName}</p>
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize tracking-wide', periodBadgeStyles[period])}>
                {period}
              </span>
            </div>
            <p className="text-xs text-navy-400 dark:text-navy-300">{remainingLabel ?? `${daysRemaining} days remaining`}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {onEdit && (
            <button onClick={onEdit} className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.04] hover:text-navy-600 dark:hover:text-navy-100 transition-colors">
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="rounded-lg p-1.5 text-navy-300 hover:bg-expense/10 hover:text-expense transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-navy-400 dark:text-navy-300">
            {formatAmount(spent, currency)} of {formatAmount(budget, currency)}
          </span>
          <span className={cn('font-display font-bold', overBudget ? 'text-expense' : 'text-navy-700 dark:text-navy-100')}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-light dark:bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
            className={cn('h-full rounded-full', getBarColor())}
          />
        </div>
      </div>

      <p className={cn('text-sm font-medium', overBudget ? 'text-expense' : 'text-navy-500 dark:text-navy-300')}>
        {overBudget
          ? `Over budget by ${formatAmount(Math.abs(remaining), currency)}`
          : `${formatAmount(remaining, currency)} remaining`}
      </p>
    </div>
  );
}
