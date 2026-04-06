'use client';
import { motion } from 'framer-motion';
import { Trash2, Edit } from 'lucide-react';
import { formatAmount } from '@/lib/currency';
import type { Account } from '@/types';

interface AccountCardProps {
  account: Account;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const typeLabels: Record<string, string> = {
    cash: 'Cash',
    mobile_banking: 'Mobile Banking',
    bank: 'Bank Account',
    credit_card: 'Credit Card',
  };

  return (
    <div className="glass-card flex items-center gap-4 rounded-2xl p-4 hover-lift group">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${account.color}15` }}
      >
        {account.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy-800 dark:text-navy-50">{account.name}</p>
        <p className="text-xs text-navy-400 dark:text-navy-300">{typeLabels[account.type] || account.type}</p>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-navy-800 dark:text-navy-50">
          {formatAmount(account.balance, account.currency)}
        </p>
        <div className="mt-1 flex gap-1 justify-end">
          {onEdit && (
            <button onClick={onEdit} className="rounded-lg p-1 text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.04] hover:text-navy-600 dark:hover:text-navy-100 transition-colors">
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="rounded-lg p-1 text-navy-300 hover:bg-expense/10 hover:text-expense transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
