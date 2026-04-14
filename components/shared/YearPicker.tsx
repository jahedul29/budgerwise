'use client';
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface YearPickerProps {
  /** Value in "YYYY" format */
  value: string;
  onChange: (value: string) => void;
}

export function YearPicker({ value, onChange }: YearPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedYear = Number(value) || new Date().getFullYear();

  // Decade start: floor to nearest 10
  const [decadeStart, setDecadeStart] = useState(() => Math.floor(selectedYear / 10) * 10);

  const years = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => decadeStart - 1 + i);
  }, [decadeStart]);

  const selectYear = useCallback(
    (year: number) => {
      onChange(String(year));
      setOpen(false);
    },
    [onChange],
  );

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left border border-gray-200/70 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] shadow-sm transition-all hover:border-primary-400/50 hover:shadow-md focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 transition-colors group-hover:bg-primary-500/15">
          <CalendarDays className="h-4 w-4 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300 dark:text-navy-400">
            Budget Year
          </p>
          <p className="text-sm font-display font-bold text-navy-800 dark:text-navy-50">
            {value}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-navy-300 dark:text-navy-500"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-gray-200/70 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-white/[0.06] dark:bg-surface-elevated/95">
              {/* Decade navigation */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDecadeStart(decadeStart - 10)}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:hover:text-navy-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h4 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50">
                  {decadeStart - 1} – {decadeStart + 7}
                </h4>
                <button
                  type="button"
                  onClick={() => setDecadeStart(decadeStart + 10)}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:hover:text-navy-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Year grid */}
              <div className="grid grid-cols-3 gap-2">
                {years.map(year => {
                  const selected = year === selectedYear;
                  const isCurrent = year === currentYear;

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => selectYear(year)}
                      className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                        selected
                          ? 'gradient-primary text-white shadow-glow-sm'
                          : isCurrent
                            ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                            : 'text-navy-600 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      {year}
                      {isCurrent && !selected && (
                        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
