'use client';
import type { BudgetPeriod } from '@/types';
import { WeekPicker } from '@/components/shared/WeekPicker';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { YearPicker } from '@/components/shared/YearPicker';

interface BudgetPeriodPickerProps {
  period: BudgetPeriod;
  value: string;
  onChange: (value: string) => void;
}

export function BudgetPeriodPicker({ period, value, onChange }: BudgetPeriodPickerProps) {
  switch (period) {
    case 'weekly':
      return <WeekPicker value={value} onChange={onChange} />;
    case 'monthly':
      return <MonthPicker value={value} onChange={onChange} />;
    case 'yearly':
      return <YearPicker value={value} onChange={onChange} />;
  }
}
