'use client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/currency';
import type { Transaction } from '@/types';

interface TransactionCardProps {
  transaction: Transaction;
  currency?: string;
  onClick?: () => void;
}

export function TransactionCard({ transaction, currency = 'BDT', onClick }: TransactionCardProps) {
  const isExpense = transaction.type === 'expense';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-navy-50/50 dark:hover:bg-white/[0.03] cursor-pointer group"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${transaction.categoryColor}15` }}
      >
        {transaction.categoryIcon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy-800 dark:text-navy-50">
          {transaction.description}
        </p>
        <p className="text-xs text-navy-400 dark:text-navy-300">
          {transaction.categoryName}
        </p>
      </div>
      <div className="w-[84px] shrink-0 text-right sm:w-[104px]">
        <p
          className={cn(
            'truncate text-[13px] font-display font-bold tabular-nums sm:text-sm',
            isExpense ? 'text-expense' : 'text-income'
          )}
        >
          {isExpense ? '-' : '+'}{formatAmount(transaction.amount, currency)}
        </p>
        <p className="truncate text-[10px] text-navy-400 dark:text-navy-300 sm:text-[11px]">
          {format(new Date(transaction.date), 'h:mm a')}
        </p>
      </div>
    </motion.div>
  );
}
