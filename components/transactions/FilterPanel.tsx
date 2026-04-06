'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategories } from '@/hooks/useCategories';
import { useUIStore } from '@/store/uiStore';

export function FilterPanel() {
  const { showFilterPanel, setShowFilterPanel } = useUIStore();
  const { filter, setFilter, resetFilter, setSortBy, sortBy } = useTransactionStore();
  const { categories } = useCategories();

  return (
    <AnimatePresence>
      {showFilterPanel && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-gray-100/60 dark:border-white/[0.04]"
        >
          <div className="space-y-4 p-4 lg:px-8">
            {/* Type Filter */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-400 dark:text-navy-300 mb-2 block">Type</Label>
              <div className="flex gap-2">
                {['income', 'expense', 'transfer'].map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      const types = filter.types.includes(t)
                        ? filter.types.filter(x => x !== t)
                        : [...filter.types, t];
                      setFilter({ types });
                    }}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      filter.types.includes(t)
                        ? 'gradient-primary text-white shadow-glow-sm'
                        : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.08] border border-gray-200/60 dark:border-white/[0.06]'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-400 dark:text-navy-300 mb-2 block">Date Range</Label>
              <DateRangePicker
                inline
                value={filter.dateRange}
                onChange={(range) => setFilter({ dateRange: range })}
              />
            </div>

            {/* Category Filter */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-400 dark:text-navy-300 mb-2 block">Categories</Label>
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
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
                      filter.categories.includes(cat.id)
                        ? 'gradient-primary text-white shadow-sm'
                        : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.08] border border-gray-200/60 dark:border-white/[0.06]'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-400 dark:text-navy-300 mb-2 block">Sort By</Label>
              <div className="flex gap-2">
                {[
                  { value: 'date_desc', label: 'Newest' },
                  { value: 'date_asc', label: 'Oldest' },
                  { value: 'amount_desc', label: 'Highest' },
                  { value: 'amount_asc', label: 'Lowest' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value as any)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      sortBy === opt.value
                        ? 'gradient-primary text-white shadow-glow-sm'
                        : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.08] border border-gray-200/60 dark:border-white/[0.06]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilter}
                className="flex-1 gap-1.5 rounded-xl border-gray-200/60 dark:border-white/[0.06] text-navy-500 dark:text-navy-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => setShowFilterPanel(false)}
                className="flex-1 rounded-xl gradient-primary text-white border-0 shadow-glow-sm"
              >
                Apply
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
