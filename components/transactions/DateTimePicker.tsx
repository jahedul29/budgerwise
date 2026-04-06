'use client';
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ChevronUp,
  ChevronDown,
  Sparkles,
  RotateCcw,
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
  isSameMonth,
  isSameDay,
  isToday as isTodayFn,
  isYesterday,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
} from 'date-fns';

interface DateTimePickerProps {
  value: string; // "yyyy-MM-dd'T'HH:mm"
  onChange: (value: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => (value ? new Date(value) : new Date()), [value]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  const hours = getHours(selectedDate);
  const minutes = getMinutes(selectedDate);
  const isPM = hours >= 12;
  const displayHour = hours % 12 || 12;

  const updateDate = useCallback(
    (newDate: Date) => {
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    },
    [onChange],
  );

  const selectDay = (day: Date) => {
    const next = new Date(day);
    next.setHours(hours, minutes, 0, 0);
    updateDate(next);
  };

  const changeHour = (delta: number) => {
    let h = hours + delta;
    if (h < 0) h = 23;
    if (h > 23) h = 0;
    updateDate(setHours(selectedDate, h));
  };

  const changeMinute = (delta: number) => {
    let m = minutes + delta;
    if (m < 0) m = 55;
    if (m > 59) m = 0;
    updateDate(setMinutes(selectedDate, m));
  };

  const toggleAMPM = () => {
    updateDate(setHours(selectedDate, isPM ? hours - 12 : hours + 12));
  };

  const setToNow = () => {
    updateDate(new Date());
    setViewMonth(startOfMonth(new Date()));
  };

  const setToYesterday = () => {
    const y = addDays(new Date(), -1);
    y.setHours(hours, minutes, 0, 0);
    updateDate(y);
    setViewMonth(startOfMonth(y));
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const days: Date[] = [];
    let current = gridStart;
    while (current <= gridEnd) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [viewMonth]);

  return (
    <div>
      {/* Collapsed preview — tappable */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group w-full rounded-2xl border border-gray-200/70 bg-white/80 p-3.5 text-left shadow-sm transition-all hover:border-primary-400/50 hover:shadow-md focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-primary-500/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 transition-colors group-hover:bg-primary-500/15">
              <CalendarDays className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-300 dark:text-navy-400">
                Date & Time
              </p>
              <p className="text-sm font-bold font-display text-navy-800 dark:text-navy-50 mt-0.5">
                {isTodayFn(selectedDate)
                  ? 'Today'
                  : isYesterday(selectedDate)
                    ? 'Yesterday'
                    : format(selectedDate, 'EEE, MMM d')}
                <span className="mx-1.5 text-navy-200 dark:text-navy-600">at</span>
                {format(selectedDate, 'h:mm a')}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-navy-300 dark:text-navy-500"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </div>
      </button>

      {/* Expanded picker */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-gray-200/70 bg-white/90 p-4 shadow-lg backdrop-blur-xl dark:border-white/[0.06] dark:bg-surface-elevated/90">
              {/* Quick presets */}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={setToNow}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    isTodayFn(selectedDate)
                      ? 'gradient-primary text-white shadow-glow-sm'
                      : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Now
                </button>
                <button
                  type="button"
                  onClick={setToYesterday}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    isYesterday(selectedDate)
                      ? 'gradient-primary text-white shadow-glow-sm'
                      : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                  Yesterday
                </button>
              </div>

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
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const selected = isSameDay(day, selectedDate);
                  const today = isTodayFn(day);

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        selected
                          ? 'gradient-primary text-white shadow-glow-sm font-bold'
                          : today
                            ? 'bg-primary-50 text-primary-600 font-bold dark:bg-primary-500/10 dark:text-primary-400'
                            : inMonth
                              ? 'text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-white/[0.06]'
                              : 'text-navy-200 dark:text-navy-600'
                      }`}
                    >
                      {format(day, 'd')}
                      {today && !selected && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-gray-200/60 dark:border-white/[0.06]" />

              {/* Time picker */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1 text-navy-300 dark:text-navy-500">
                  <Clock3 className="h-4 w-4 text-primary-500" />
                </div>

                {/* Hours */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => changeHour(1)}
                    className="rounded-lg p-1 text-navy-300 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:text-navy-500 dark:hover:text-navy-200"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <div className="flex h-10 w-12 items-center justify-center rounded-xl bg-surface-light text-lg font-display font-bold text-navy-800 dark:bg-white/[0.06] dark:text-navy-50">
                    {String(displayHour).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    onClick={() => changeHour(-1)}
                    className="rounded-lg p-1 text-navy-300 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:text-navy-500 dark:hover:text-navy-200"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <span className="text-lg font-display font-bold text-navy-300 dark:text-navy-500">
                  :
                </span>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => changeMinute(5)}
                    className="rounded-lg p-1 text-navy-300 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:text-navy-500 dark:hover:text-navy-200"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <div className="flex h-10 w-12 items-center justify-center rounded-xl bg-surface-light text-lg font-display font-bold text-navy-800 dark:bg-white/[0.06] dark:text-navy-50">
                    {String(minutes).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    onClick={() => changeMinute(-5)}
                    className="rounded-lg p-1 text-navy-300 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-white/[0.06] dark:text-navy-500 dark:hover:text-navy-200"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* AM/PM toggle */}
                <button
                  type="button"
                  onClick={toggleAMPM}
                  className="ml-1 flex flex-col overflow-hidden rounded-xl border border-gray-200/60 dark:border-white/[0.08]"
                >
                  <span
                    className={`px-3 py-1.5 text-[11px] font-bold tracking-wider transition-all ${
                      !isPM
                        ? 'gradient-primary text-white'
                        : 'bg-surface-light text-navy-400 dark:bg-white/[0.04] dark:text-navy-400'
                    }`}
                  >
                    AM
                  </span>
                  <span
                    className={`px-3 py-1.5 text-[11px] font-bold tracking-wider transition-all ${
                      isPM
                        ? 'gradient-primary text-white'
                        : 'bg-surface-light text-navy-400 dark:bg-white/[0.04] dark:text-navy-400'
                    }`}
                  >
                    PM
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
