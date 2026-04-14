'use client';
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfISOWeek,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  addMonths,
  subMonths,
  addDays,
  isSameDay,
  getDay,
} from 'date-fns';
import { getPeriodRange } from '@/lib/budget-periods';

interface WeekPickerProps {
  /** Value in "YYYY-Www" format (e.g., "2026-W15") */
  value: string;
  onChange: (value: string) => void;
}

function parseWeekKey(value: string): { year: number; week: number } {
  const match = value.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    const now = new Date();
    return { year: getISOWeekYear(now), week: getISOWeek(now) };
  }
  return { year: Number(match[1]), week: Number(match[2]) };
}

function toWeekKey(date: Date): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function WeekPicker({ value, onChange }: WeekPickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseWeekKey(value), [value]);

  // The month being viewed in the calendar
  const [viewDate, setViewDate] = useState(() => {
    const { start } = getPeriodRange(value, 'weekly');
    return start;
  });

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const selectWeek = useCallback(
    (date: Date) => {
      const key = toWeekKey(date);
      onChange(key);
      setOpen(false);
    },
    [onChange],
  );

  const displayLabel = useMemo(() => {
    const { start, end } = getPeriodRange(value, 'weekly');
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }, [value]);

  // Build calendar grid for the viewed month
  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(new Date(viewYear, viewMonth, 1));
    const monthEnd = endOfMonth(monthStart);

    // Start from the Monday of the week containing the 1st
    const calStart = startOfISOWeek(monthStart);

    const weeks: Date[][] = [];
    let current = calStart;

    while (current <= monthEnd || weeks.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(current);
        current = addDays(current, 1);
      }
      weeks.push(week);
      if (current > monthEnd && weeks.length >= 4) break;
    }

    return weeks;
  }, [viewYear, viewMonth]);

  const isSelectedWeek = (weekDays: Date[]) => {
    const weekKey = toWeekKey(weekDays[0]);
    return weekKey === value;
  };

  const isCurrentWeek = (weekDays: Date[]) => {
    const now = new Date();
    const weekKey = toWeekKey(weekDays[0]);
    return weekKey === toWeekKey(now);
  };

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
            Budget Week
          </p>
          <p className="text-sm font-display font-bold text-navy-800 dark:text-navy-50">
            {displayLabel}
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
              {/* Month navigation */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:hover:text-navy-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h4 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50">
                  {format(viewDate, 'MMMM yyyy')}
                </h4>
                <button
                  type="button"
                  onClick={() => setViewDate(addMonths(viewDate, 1))}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:hover:text-navy-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0 mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-navy-300 dark:text-navy-500 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Week rows */}
              <div className="space-y-1">
                {calendarWeeks.map((week, wi) => {
                  const selected = isSelectedWeek(week);
                  const current = isCurrentWeek(week);

                  return (
                    <button
                      key={wi}
                      type="button"
                      onClick={() => selectWeek(week[0])}
                      className={`w-full grid grid-cols-7 gap-0 rounded-xl py-1.5 transition-all ${
                        selected
                          ? 'gradient-primary text-white shadow-glow-sm'
                          : current
                            ? 'bg-primary-50 dark:bg-primary-500/10'
                            : 'hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      {week.map((day, di) => {
                        const isOutsideMonth = day.getMonth() !== viewMonth;
                        return (
                          <span
                            key={di}
                            className={`text-center text-xs font-medium ${
                              selected
                                ? isOutsideMonth ? 'text-white/50' : 'text-white'
                                : isOutsideMonth
                                  ? 'text-navy-200 dark:text-navy-600'
                                  : current
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-navy-600 dark:text-navy-200'
                            }`}
                          >
                            {day.getDate()}
                          </span>
                        );
                      })}
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
