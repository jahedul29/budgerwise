import {
  format,
  endOfMonth,
  endOfYear,
  differenceInDays,
  getISOWeek,
  getISOWeekYear,
  addWeeks,
  subWeeks,
  startOfISOWeek,
  endOfISOWeek,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import type { BudgetPeriod } from '@/types';

/** Generate the periodKey for a given date and period type */
export function getPeriodKey(date: Date, period: BudgetPeriod): string {
  switch (period) {
    case 'weekly': {
      const week = getISOWeek(date);
      const year = getISOWeekYear(date);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    case 'monthly':
      return format(date, 'yyyy-MM');
    case 'yearly':
      return format(date, 'yyyy');
  }
}

/** Get the current periodKey for a period type */
export function getCurrentPeriodKey(period: BudgetPeriod): string {
  return getPeriodKey(new Date(), period);
}

/** Get start/end Date range for a periodKey + period type */
export function getPeriodRange(periodKey: string, period: BudgetPeriod): { start: Date; end: Date } {
  switch (period) {
    case 'weekly': {
      const match = periodKey.match(/^(\d{4})-W(\d{2})$/);
      if (!match) {
        // Fallback to current week if format is invalid
        const now = new Date();
        return { start: startOfISOWeek(now), end: endOfISOWeek(now) };
      }
      const year = Number(match[1]);
      const week = Number(match[2]);
      // Jan 4 is always in ISO week 1
      const jan4 = new Date(year, 0, 4);
      const startOfWeek1 = startOfISOWeek(jan4);
      const weekStart = addWeeks(startOfWeek1, week - 1);
      return { start: weekStart, end: endOfISOWeek(weekStart) };
    }
    case 'monthly': {
      const [y, m] = periodKey.split('-').map(Number);
      const date = new Date(y, m - 1, 1);
      return { start: startOfMonth(date), end: endOfMonth(date) };
    }
    case 'yearly': {
      const year = Number(periodKey);
      const date = new Date(year, 0, 1);
      return { start: startOfYear(date), end: endOfYear(date) };
    }
  }
}

/** Days remaining in the current period */
export function getDaysRemaining(period: BudgetPeriod): number {
  const now = new Date();
  switch (period) {
    case 'weekly':
      return differenceInDays(endOfISOWeek(now), now);
    case 'monthly':
      return differenceInDays(endOfMonth(now), now);
    case 'yearly':
      return differenceInDays(endOfYear(now), now);
  }
}

/** Human-readable remaining label */
export function getRemainingLabel(period: BudgetPeriod): string {
  const days = getDaysRemaining(period);
  if (period === 'yearly' && days > 60) {
    const months = Math.round(days / 30);
    return `~${months} months remaining`;
  }
  return `${days} day${days !== 1 ? 's' : ''} remaining`;
}

/** Human-readable label for a period key */
export function formatPeriodKey(periodKey: string | undefined, period: BudgetPeriod): string {
  if (!periodKey) return 'Not set';
  switch (period) {
    case 'weekly': {
      const { start, end } = getPeriodRange(periodKey, period);
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    case 'monthly': {
      const [y, m] = periodKey.split('-').map(Number);
      if (!y || !m) return periodKey;
      return format(new Date(y, m - 1, 1), 'MMMM yyyy');
    }
    case 'yearly':
      return periodKey;
  }
}
