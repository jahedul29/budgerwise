'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { Search, SlidersHorizontal, List } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { FilterPanel } from '@/components/transactions/FilterPanel';
import { FAB } from '@/components/shared/FAB';
import { EmptyState } from '@/components/shared/EmptyState';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { useTransactions } from '@/hooks/useTransactions';
import { useTransactionStore } from '@/store/transactionStore';
import { useUIStore } from '@/store/uiStore';
import { useCurrency } from '@/hooks/useCurrency';

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

export default function TransactionsPage() {
  const { isLoading, getFilteredTransactions, setFilter } = useTransactions();
  const { filter } = useTransactionStore();
  const { showFilterPanel, setShowFilterPanel } = useUIStore();
  const { formatAmount } = useCurrency();

  const filteredTransactions = getFilteredTransactions();

  const grouped = useMemo(() => {
    const groups: Map<string, typeof filteredTransactions> = new Map();
    filteredTransactions.forEach(tx => {
      const key = format(new Date(tx.date), 'yyyy-MM-dd');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    });
    return Array.from(groups.entries());
  }, [filteredTransactions]);

  const activeFilterCount = [
    filter.types.length > 0,
    filter.categories.length > 0,
    filter.accounts.length > 0,
    filter.dateRange !== undefined,
    filter.amountRange !== undefined,
  ].filter(Boolean).length;

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="px-4 py-3 lg:px-8 lg:py-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">Transactions</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="relative rounded-xl"
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
          <div className="relative lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <Input
              placeholder="Search transactions..."
              value={filter.search}
              onChange={e => setFilter({ search: e.target.value })}
              className="pl-10 rounded-xl bg-white/60 dark:bg-white/[0.04] border-gray-200/60 dark:border-white/[0.06]"
            />
          </div>
        </div>
        <FilterPanel />
      </div>

      <div className="px-4 py-3 lg:px-8 lg:py-5">
        {isLoading ? (
          <div className="space-y-4 lg:max-w-2xl">
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<List className="h-12 w-12" />}
            title="No transactions found"
            description={filter.search ? 'Try adjusting your search or filters' : 'Add your first transaction to get started'}
          />
        ) : (
          <div className="space-y-5 lg:max-w-2xl">
            {grouped.map(([date, transactions]) => {
              const dayTotal = transactions.reduce((sum, tx) => {
                return sum + (tx.type === 'expense' ? -tx.amount : tx.type === 'income' ? tx.amount : 0);
              }, 0);

              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold text-navy-400 dark:text-navy-300 uppercase tracking-wider">
                      {getDateLabel(date)}
                    </p>
                    <span className={`text-xs font-display font-bold ${dayTotal >= 0 ? 'text-income' : 'text-expense'}`}>
                      {dayTotal >= 0 ? '+' : ''}{formatAmount(dayTotal)}
                    </span>
                  </div>
                  <div className="glass-card rounded-2xl overflow-hidden">
                    {transactions.map((tx, i) => (
                      <div key={tx.id}>
                        {i > 0 && <div className="mx-14 border-t border-gray-100/60 dark:border-white/[0.04]" />}
                        <TransactionCard transaction={tx} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            <p className="py-4 text-center text-xs text-navy-400 dark:text-navy-300">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <FAB />
      <AddTransactionSheet />
    </PageWrapper>
  );
}
