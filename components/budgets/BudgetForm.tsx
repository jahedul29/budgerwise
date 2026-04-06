'use client';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
          <DialogDescription>Set a spending limit for a category</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Category */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Category</Label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {expenseCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setValue('categoryId', cat.id); setValue('categoryName', cat.name); }}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 text-xs transition-all ${
                    selectedCategoryId === cat.id
                      ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-900/30'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="truncate w-full text-center">{cat.name}</span>
                </button>
              ))}
            </div>
            <input type="hidden" {...register('categoryId', { required: true })} />
            {errors.categoryId && <p className="mt-1 text-xs text-expense">Select a category</p>}
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Budget Amount</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter budget amount"
              {...register('amount', { required: true })}
            />
            {errors.amount && <p className="mt-1 text-xs text-expense">Amount is required</p>}
          </div>

          {/* Period */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Period</Label>
            <div className="flex gap-2">
              {['weekly', 'monthly', 'yearly'].map(p => (
                <label
                  key={p}
                  className={`flex-1 cursor-pointer rounded-lg py-2 text-center text-sm font-medium transition-all
                    ${watch('period') === p ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                  <input type="radio" {...register('period')} value={p} className="sr-only" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Month */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Month</Label>
            <Input type="month" {...register('month')} />
          </div>

          {/* Alert Threshold */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Alert at (%)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              {...register('alertThreshold')}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{budget ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
