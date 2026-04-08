'use client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  RotateCcw,
  X,
} from 'lucide-react';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategories } from '@/hooks/useCategories';
import { useUIStore } from '@/store/uiStore';

export function FilterPanel() {
  const { showFilterPanel } = useUIStore();
  const { filter, setFilter, resetFilter, setSortBy, sortBy } = useTransactionStore();
  const { categories } = useCategories();

  const hasActiveFilters = Boolean(
    filter.types.length > 0 ||
    filter.categories.length > 0 ||
    filter.dateRange ||
    sortBy !== 'date_desc',
  );

  return (
    <AnimatePresence>
      {showFilterPanel && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-3 lg:px-8 space-y-3">
            {/* ── Main filter toolbar ── */}
            <div className="rounded-xl border border-gray-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm shadow-card p-3 space-y-3">
              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-400/70 dark:text-navy-500 flex items-center gap-1.5 mr-0.5">
                  <Filter className="h-3 w-3" />
                  <span className="hidden sm:inline">Filters</span>
                </span>

                {/* Type pills */}
                <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
                  {['income', 'expense', 'transfer'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        const types = filter.types.includes(t)
                          ? filter.types.filter(x => x !== t)
                          : [...filter.types, t];
                        setFilter({ types });
                      }}
                      className={`rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                        filter.types.includes(t)
                          ? 'bg-white dark:bg-white/[0.10] text-navy-800 dark:text-navy-50 shadow-sm'
                          : 'text-navy-400 dark:text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Date range */}
                <div className="relative z-30">
                  <DateRangePicker
                    inline
                    value={filter.dateRange}
                    onChange={(range) => setFilter({ dateRange: range })}
                  />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1.5 sm:ml-auto">
                  <div className="inline-flex rounded-xl bg-surface-light/80 dark:bg-white/[0.03] p-0.5 border border-gray-200/40 dark:border-white/[0.04]">
                    {[
                      { value: 'date_desc', label: 'Newest' },
                      { value: 'date_asc', label: 'Oldest' },
                      { value: 'amount_desc', label: 'Highest' },
                      { value: 'amount_asc', label: 'Lowest' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value as typeof sortBy)}
                        className={`rounded-[10px] px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                          sortBy === opt.value
                            ? 'bg-white dark:bg-white/[0.10] text-navy-800 dark:text-navy-50 shadow-sm'
                            : 'text-navy-400 dark:text-navy-400 hover:text-navy-600 dark:hover:text-navy-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => { resetFilter(); setSortBy('date_desc'); }}
                      className="h-8 px-2.5 flex items-center gap-1.5 rounded-xl text-[12px] font-medium text-navy-400 dark:text-navy-500 hover:text-expense dark:hover:text-expense hover:bg-expense/[0.06] transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category chips */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.slice(0, 12).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const cats = filter.categories.includes(cat.id)
                          ? filter.categories.filter(c => c !== cat.id)
                          : [...filter.categories, cat.id];
                        setFilter({ categories: cats });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all border ${
                        filter.categories.includes(cat.id)
                          ? 'bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-primary-700 dark:text-primary-300 border-primary-500/20'
                          : 'bg-white/80 dark:bg-white/[0.03] text-navy-500 dark:text-navy-400 border-gray-200/40 dark:border-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.08]'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Active filter tags ── */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {filter.types.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15"
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    <button
                      type="button"
                      onClick={() => setFilter({ types: filter.types.filter(x => x !== t) })}
                      className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {filter.categories.map(catId => {
                  const cat = categories.find(c => c.id === catId);
                  if (!cat) return null;
                  return (
                    <span
                      key={catId}
                      className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15"
                    >
                      {cat.icon} {cat.name}
                      <button
                        type="button"
                        onClick={() => setFilter({ categories: filter.categories.filter(c => c !== catId) })}
                        className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {filter.dateRange && (
                  <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                    Date range
                    <button
                      type="button"
                      onClick={() => setFilter({ dateRange: undefined })}
                      className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {sortBy !== 'date_desc' && (
                  <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-lg bg-primary-500/[0.08] dark:bg-primary-500/[0.10] text-[11px] font-semibold text-primary-700 dark:text-primary-300 border border-primary-500/15">
                    Sort: {sortBy.replace('_', ' ')}
                    <button
                      type="button"
                      onClick={() => setSortBy('date_desc')}
                      className="p-0.5 rounded-md hover:bg-primary-500/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
