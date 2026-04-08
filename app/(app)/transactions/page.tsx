'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, List } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { FilterPanel } from '@/components/transactions/FilterPanel';
import { FAB } from '@/components/shared/FAB';
import { EmptyState } from '@/components/shared/EmptyState';
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

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100] as const;

export default function TransactionsPage() {
  const { isLoading, getFilteredTransactions, setFilter } = useTransactions();
  const { filter } = useTransactionStore();
  const { showFilterPanel, setShowFilterPanel } = useUIStore();
  const { formatAmount } = useCurrency();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(30);

  const filteredTransactions = getFilteredTransactions();

  const totalCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);

  const paginatedTransactions = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePageIndex, pageSize]);

  const grouped = useMemo(() => {
    const groups: Map<string, typeof paginatedTransactions> = new Map();
    paginatedTransactions.forEach(tx => {
      const key = format(new Date(tx.date), 'yyyy-MM-dd');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    });
    return Array.from(groups.entries());
  }, [paginatedTransactions]);

  const activeFilterCount = [
    filter.types.length > 0,
    filter.categories.length > 0,
    filter.accounts.length > 0,
    filter.dateRange !== undefined,
    filter.amountRange !== undefined,
  ].filter(Boolean).length;

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPageIndex(0);
  };

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
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200/60 bg-white/60 p-4 dark:border-white/[0.04] dark:bg-white/[0.02]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((__, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
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
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
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
                    className="min-w-0"
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
            </div>

            {/* ── Pagination ── */}
            <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] text-navy-400 dark:text-navy-400 tabular-nums">
                <span className="font-semibold text-navy-600 dark:text-navy-200">
                  Page {safePageIndex + 1}
                  <span className="font-normal text-navy-400 dark:text-navy-500"> of {totalPages}</span>
                </span>
                <span className="text-navy-200 dark:text-navy-600">&middot;</span>
                <span>
                  {totalCount} total
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="h-8 rounded-xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.03] px-2 text-[12px] font-medium text-navy-500 dark:text-navy-400 focus:outline-none cursor-pointer"
                  aria-label="Items per page"
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>

                <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setPageIndex(Math.max(0, safePageIndex - 1))}
                    disabled={safePageIndex === 0}
                    className="h-7 w-7 flex items-center justify-center rounded-[10px] text-navy-400 dark:text-navy-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-navy-700 dark:hover:text-navy-100 hover:shadow-sm disabled:opacity-25 disabled:pointer-events-none transition-all"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="h-7 min-w-[1.75rem] px-2 flex items-center justify-center rounded-[10px] bg-white dark:bg-white/[0.10] text-[12px] font-bold text-navy-700 dark:text-navy-100 shadow-sm tabular-nums">
                    {safePageIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPageIndex(Math.min(totalPages - 1, safePageIndex + 1))}
                    disabled={safePageIndex >= totalPages - 1}
                    className="h-7 w-7 flex items-center justify-center rounded-[10px] text-navy-400 dark:text-navy-400 hover:bg-white dark:hover:bg-white/[0.08] hover:text-navy-700 dark:hover:text-navy-100 hover:shadow-sm disabled:opacity-25 disabled:pointer-events-none transition-all"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <FAB />
    </PageWrapper>
  );
}
