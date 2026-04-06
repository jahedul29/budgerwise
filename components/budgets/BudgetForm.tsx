'use client';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthPicker } from '@/components/shared/MonthPicker';
import { useCategories } from '@/hooks/useCategories';
import type { Budget } from '@/types';

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  budget?: Budget;
}

export function BudgetForm({ open, onClose, onSubmit, budget }: BudgetFormProps) {
  const { getCategoriesByType } = useCategories();
  const expenseCategories = getCategoriesByType('expense');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      categoryId: budget?.categoryId || '',
      categoryName: budget?.categoryName || '',
      amount: budget?.amount || '',
      period: budget?.period || 'monthly',
      month: budget?.month || format(new Date(), 'yyyy-MM'),
      alertThreshold: budget?.alertThreshold || 80,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const monthValue = watch('month');

  const handleFormSubmit = (data: any) => {
    const category = expenseCategories.find(c => c.id === data.categoryId);
    onSubmit({
      ...data,
      amount: parseFloat(data.amount),
      alertThreshold: parseInt(data.alertThreshold),
      categoryName: category?.name || data.categoryName,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{budget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
          <DialogDescription className="text-navy-400 dark:text-navy-300">Set a spending limit for a category</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* Category */}
          <div>
            <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Category</Label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto scrollbar-hide p-0.5 -m-0.5">
              {expenseCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setValue('categoryId', cat.id); setValue('categoryName', cat.name); }}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs font-medium transition-all ${
                    selectedCategoryId === cat.id
                      ? 'border-2 border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-500/10'
                      : 'border-2 border-transparent bg-surface-light dark:bg-white/[0.03] hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="truncate w-full text-center text-navy-600 dark:text-navy-200">{cat.name}</span>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('categoryId', { required: true })} />
            {errors.categoryId && <p className="mt-1 text-xs text-expense">Select a category</p>}
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1 block">Budget Amount</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-display font-bold text-navy-300 dark:text-navy-500">৳</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-8 rounded-xl text-base font-display font-bold"
                {...register('amount', { required: true })}
              />
            </div>
            {errors.amount && <p className="mt-1 text-xs text-expense">Amount is required</p>}
          </div>

          {/* Period */}
          <div>
            <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Period</Label>
            <div className="flex gap-1.5 rounded-xl bg-surface-light dark:bg-white/[0.04] p-1">
              {['weekly', 'monthly', 'yearly'].map(p => (
                <label
                  key={p}
                  className={`flex-1 cursor-pointer rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
                    watch('period') === p
                      ? 'gradient-primary text-white shadow-sm'
                      : 'text-navy-400 dark:text-navy-300 hover:text-navy-600 dark:hover:text-navy-100'
                  }`}
                >
                  <input type="radio" {...register('period')} value={p} className="sr-only" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Month */}
          <MonthPicker
            value={monthValue}
            onChange={(v) => setValue('month', v)}
          />

          {/* Alert Threshold */}
          <div>
            <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1 block">Alert at (%)</Label>
            <div className="relative">
              <Input
                type="number"
                min="1"
                max="100"
                className="rounded-xl pr-8"
                {...register('alertThreshold')}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-navy-300 dark:text-navy-500">%</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl border-gray-200/60 dark:border-white/[0.06] text-navy-500 dark:text-navy-300">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 rounded-xl gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow transition-shadow">
              {budget ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
