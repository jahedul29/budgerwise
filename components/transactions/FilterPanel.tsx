'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
          className="overflow-hidden border-b border-gray-100 dark:border-gray-800"
        >
          <div className="space-y-4 p-4">
            {/* Type Filter */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Type</Label>
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      filter.types.includes(t)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">From</Label>
                <Input
                  type="date"
                  onChange={e => {
                    const start = new Date(e.target.value);
                    setFilter({
                      dateRange: {
                        start,
                        end: filter.dateRange?.end || new Date(),
                      },
                    });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">To</Label>
                <Input
                  type="date"
                  onChange={e => {
                    const end = new Date(e.target.value);
                    setFilter({
                      dateRange: {
                        start: filter.dateRange?.start || new Date(0),
                        end,
                      },
                    });
                  }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Categories</Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 10).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const cats = filter.categories.includes(cat.id)
                        ? filter.categories.filter(c => c !== cat.id)
                        : [...filter.categories, cat.id];
                      setFilter({ categories: cats });
                    }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all ${
                      filter.categories.includes(cat.id)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Sort By</Label>
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      sortBy === opt.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetFilter} className="flex-1 gap-1">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button size="sm" onClick={() => setShowFilterPanel(false)} className="flex-1">
                Apply
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
