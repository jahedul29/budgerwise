'use client';
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  subDays,
  isSameMonth,
  isSameDay,
  isToday as isTodayFn,
  isWithinInterval,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
} from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

interface Preset {
  label: string;
  getRange: () => DateRange;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  /** Compact inline mode (no border wrapper, used inside filter panels) */
  inline?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const PRESETS: Preset[] = [
  {
    label: 'Today',
    getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
  },
  {
    label: 'Yesterday',
    getRange: () => {
      const y = subDays(new Date(), 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    },
  },
  {
    label: 'Last 7 days',
    getRange: () => ({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) }),
  },
  {
    label: 'Last 30 days',
    getRange: () => ({ start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) }),
  },
  {
    label: 'This month',
    getRange: () => ({ start: startOfMonth(new Date()), end: endOfDay(new Date()) }),
  },
  {
    label: 'Last month',
    getRange: () => {
      const prev = subMonths(new Date(), 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    },
  },
  {
    label: 'Last 3 months',
    getRange: () => ({ start: startOfMonth(subMonths(new Date(), 2)), end: endOfDay(new Date()) }),
  },
  {
    label: 'Last 6 months',
    getRange: () => ({ start: startOfMonth(subMonths(new Date(), 5)), end: endOfDay(new Date()) }),
  },
  {
    label: 'This year',
    getRange: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: endOfDay(new Date()) }),
  },
];

export function DateRangePicker({ value, onChange, inline }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(value?.start ?? new Date()),
  );
  // During selection: first click sets selectionStart, second sets the range
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  const activePreset = useMemo(() => {
    if (!value) return null;
    return PRESETS.find((p) => {
      const r = p.getRange();
      return isSameDay(r.start, value.start) && isSameDay(r.end, value.end);
    })?.label ?? null;
  }, [value]);

  const applyPreset = useCallback(
    (preset: Preset) => {
      const range = preset.getRange();
      onChange(range);
      setViewMonth(startOfMonth(range.start));
      setSelectionStart(null);
    },
    [onChange],
  );

  const handleDayClick = useCallback(
    (day: Date) => {
      if (!selectionStart) {
        setSelectionStart(day);
      } else {
        const start = isBefore(day, selectionStart) ? day : selectionStart;
        const end = isAfter(day, selectionStart) ? day : selectionStart;
        onChange({ start: startOfDay(start), end: endOfDay(end) });
        setSelectionStart(null);
      }
    },
    [selectionStart, onChange],
  );

  const clear = useCallback(() => {
    onChange(undefined);
    setSelectionStart(null);
  }, [onChange]);

  // Compute visual range (including hover preview during selection)
  const visualRange = useMemo(() => {
    if (selectionStart && hoveredDay) {
      const s = isBefore(hoveredDay, selectionStart) ? hoveredDay : selectionStart;
      const e = isAfter(hoveredDay, selectionStart) ? hoveredDay : selectionStart;
      return { start: s, end: e };
    }
    return value ?? null;
  }, [selectionStart, hoveredDay, value]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const ms = startOfMonth(viewMonth);
    const me = endOfMonth(viewMonth);
    const gs = startOfWeek(ms);
    const ge = endOfWeek(me);
    const days: Date[] = [];
    let cur = gs;
    while (cur <= ge) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }, [viewMonth]);

  // Display label
  const displayLabel = useMemo(() => {
    if (!value) return 'All time';
    if (activePreset) return activePreset;
    return `${format(value.start, 'MMM d')} — ${format(value.end, 'MMM d, yyyy')}`;
  }, [value, activePreset]);

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`group flex items-center gap-2.5 rounded-xl text-left transition-all ${
        inline
          ? 'w-full px-3 py-2.5 bg-surface-light dark:bg-white/[0.04] hover:bg-navy-50 dark:hover:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.06]'
          : 'px-3.5 py-2.5 border border-gray-200/70 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.03] shadow-sm hover:border-primary-400/50 hover:shadow-md'
      } ${value ? 'border-primary-400/40 dark:border-primary-500/20' : ''}`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        value ? 'bg-primary-500/15 text-primary-500' : 'bg-surface-light dark:bg-white/[0.06] text-navy-300 dark:text-navy-500'
      }`}>
        <CalendarDays className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300 dark:text-navy-400">
          Date Range
        </p>
        <p className="text-sm font-bold font-display text-navy-800 dark:text-navy-50 truncate">
          {displayLabel}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            className="rounded-md p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-500 dark:hover:bg-white/[0.06] dark:text-navy-500 dark:hover:text-navy-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-navy-300 dark:text-navy-500"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </div>
    </button>
  );

  return (
    <div className="relative">
      {trigger}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-gray-200/70 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-white/[0.06] dark:bg-surface-elevated/95">
              {/* Presets */}
              <div className="mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-300 dark:text-navy-500">
                  Quick select
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        activePreset === preset.label
                          ? 'gradient-primary text-white shadow-glow-sm'
                          : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200/60 dark:border-white/[0.06]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-300 dark:text-navy-500">
                  or pick dates
                </span>
                <div className="flex-1 border-t border-gray-200/60 dark:border-white/[0.06]" />
              </div>

              {/* Selection hint */}
              {selectionStart && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 px-3 py-2 text-xs font-medium text-primary-700 dark:text-primary-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pick the end date — started from {format(selectionStart, 'MMM d')}
                </div>
              )}

              {/* Calendar header */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:hover:text-navy-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h4 className="text-sm font-display font-bold text-navy-800 dark:text-navy-50">
                  {format(viewMonth, 'MMMM yyyy')}
                </h4>
                <button
                  type="button"
                  onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                  className="rounded-lg p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:hover:text-navy-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday labels */}
              <div className="mb-1 grid grid-cols-7 gap-0">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-navy-300 dark:text-navy-500"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-0">
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const today = isTodayFn(day);

                  const isRangeStart = visualRange && isSameDay(day, visualRange.start);
                  const isRangeEnd = visualRange && isSameDay(day, visualRange.end);
                  const inRange =
                    visualRange &&
                    !isSameDay(visualRange.start, visualRange.end) &&
                    isWithinInterval(day, { start: visualRange.start, end: visualRange.end });
                  const isEndpoint = isRangeStart || isRangeEnd;
                  const isPickingStart = selectionStart && isSameDay(day, selectionStart);

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`relative flex h-9 w-full items-center justify-center text-xs font-medium transition-all ${
                        isEndpoint
                          ? 'z-10 text-white font-bold'
                          : inRange
                            ? 'text-primary-700 dark:text-primary-300 font-semibold'
                            : today && inMonth
                              ? 'text-primary-600 dark:text-primary-400 font-bold'
                              : inMonth
                                ? 'text-navy-700 hover:text-navy-900 dark:text-navy-200 dark:hover:text-white'
                                : 'text-navy-200 dark:text-navy-600'
                      }`}
                    >
                      {/* Range background band */}
                      {inRange && !isEndpoint && (
                        <span className="absolute inset-0 bg-primary-100/70 dark:bg-primary-500/10" />
                      )}
                      {/* Start cap */}
                      {isRangeStart && inRange && !isSameDay(visualRange!.start, visualRange!.end) && (
                        <span className="absolute inset-y-0 right-0 left-1/2 bg-primary-100/70 dark:bg-primary-500/10" />
                      )}
                      {/* End cap */}
                      {isRangeEnd && inRange && !isSameDay(visualRange!.start, visualRange!.end) && (
                        <span className="absolute inset-y-0 left-0 right-1/2 bg-primary-100/70 dark:bg-primary-500/10" />
                      )}
                      {/* Endpoint circle */}
                      {isEndpoint && (
                        <span className="absolute inset-0.5 rounded-lg gradient-primary shadow-glow-sm" />
                      )}
                      {/* Picking-start pulse */}
                      {isPickingStart && !isRangeEnd && (
                        <span className="absolute inset-0.5 rounded-lg ring-2 ring-primary-400 animate-pulse" />
                      )}
                      <span className="relative z-10">{format(day, 'd')}</span>
                      {today && !isEndpoint && (
                        <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500 z-10" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected range summary */}
              {value && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-light/80 dark:bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-display font-bold text-navy-800 dark:text-navy-50">
                      {format(value.start, 'MMM d, yyyy')}
                    </span>
                    <span className="text-navy-300 dark:text-navy-500">—</span>
                    <span className="font-display font-bold text-navy-800 dark:text-navy-50">
                      {format(value.end, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-expense hover:bg-expense/10 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
