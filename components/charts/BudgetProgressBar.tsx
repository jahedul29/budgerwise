'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/currency';

interface BudgetProgressBarProps {
  categoryName: string;
  categoryIcon: string;
  spent: number;
  budget: number;
  currency?: string;
}

export function BudgetProgressBar({
  categoryName,
  categoryIcon,
  spent,
  budget,
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
