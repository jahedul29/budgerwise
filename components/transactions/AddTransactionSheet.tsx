'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInputButton } from '@/components/shared/VoiceInputButton';
import type { TransactionType, PaymentMethod } from '@/types';
import toast from 'react-hot-toast';

const paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'bank_transfer', label: 'Bank', icon: '🏦' },
  { value: 'mobile_banking', label: 'Mobile', icon: '📱' },
  { value: 'other', label: 'Other', icon: '💫' },
];

export function AddTransactionSheet() {
  const { showAddTransaction, setShowAddTransaction } = useUIStore();
  const { addTransaction } = useTransactions();
  const { categories, getCategoriesByType } = useCategories();
  const { accounts, updateBalance } = useAccounts();
  const [type, setType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      amount: '',
      description: '',
      notes: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      accountId: '',
    },
  });

  const filteredCategories = getCategoriesByType(type === 'transfer' ? 'expense' : type);

  const onSubmit = async (data: any) => {
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    if (!data.accountId && accounts.length > 0) {
      data.accountId = accounts[0].id;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        amount: parseFloat(data.amount),
        type,
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        accountId: data.accountId || accounts[0]?.id || '',
        description: data.description,
        notes: data.notes || undefined,
        date: new Date(data.date),
        paymentMethod: selectedPayment,
        tags: [],
        isRecurring: false,
      });

      const amount = parseFloat(data.amount);
      if (type === 'expense') {
        await updateBalance(data.accountId || accounts[0]?.id, -amount);
      } else if (type === 'income') {
        await updateBalance(data.accountId || accounts[0]?.id, amount);
      }

      toast.success('Transaction added!');
      reset();
      setSelectedCategory('');
      setShowAddTransaction(false);
    } catch (error) {
      toast.error('Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {showAddTransaction && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-md"
            onClick={() => setShowAddTransaction(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-elevated lg:left-auto lg:right-0 lg:w-[480px] lg:rounded-tl-3xl lg:rounded-tr-none"
          >
            {/* Drag Handle */}
            <div className="sticky top-0 z-10 flex justify-center bg-white/80 backdrop-blur-xl pt-3 pb-2 dark:bg-surface-elevated/80 lg:hidden">
              <div className="h-1.5 w-12 rounded-full bg-navy-200 dark:bg-navy-600" />
            </div>

            <div className="px-5 pb-8 lg:px-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-display font-bold text-navy-900 dark:text-navy-50">Add Transaction</h2>
                <div className="flex items-center gap-2">
                  <VoiceInputButton />
                  <button
                    onClick={() => setShowAddTransaction(false)}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Amount */}
                <div className="text-center py-4 rounded-2xl bg-surface-light/50 dark:bg-white/[0.02]">
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300">Amount</Label>
                  <div className="mt-2 flex items-center justify-center">
                    <span className="text-3xl font-display font-light text-navy-300 mr-1">৳</span>
                    <input
                      {...register('amount', { required: true })}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-48 border-none bg-transparent text-center text-4xl font-display font-bold text-navy-900 outline-none placeholder:text-navy-200 dark:text-white dark:placeholder:text-navy-600"
                    />
                  </div>
                  {errors.amount && <p className="mt-1 text-xs text-expense">Amount is required</p>}
                </div>

                {/* Type Toggle */}
                <div className="flex gap-1.5 rounded-xl bg-surface-light dark:bg-white/[0.04] p-1">
                  {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setType(t); setSelectedCategory(''); }}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                        type === t
                          ? t === 'expense'
                            ? 'gradient-expense text-white shadow-sm'
                            : t === 'income'
                            ? 'gradient-income text-white shadow-sm'
                            : 'gradient-primary text-white shadow-sm'
                          : 'text-navy-400 dark:text-navy-300'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Category Picker */}
                <div>
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Category</Label>
                  <div className="grid grid-cols-4 gap-2 p-1 -m-1 max-h-32 overflow-y-auto scrollbar-hide">
                    {filteredCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 border-transparent p-2.5 text-xs font-medium transition-all ${
                          selectedCategory === cat.id
                            ? 'border-2 border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-500/10'
                            : 'bg-surface-light dark:bg-white/[0.03] hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="truncate w-full text-center text-navy-600 dark:text-navy-200">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account */}
                <div>
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Account</Label>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {accounts.map(acc => (
                      <label
                        key={acc.id}
                        className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-gray-200/60 dark:border-white/[0.06] px-3 py-2.5 text-sm font-medium transition-all has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-500/10 hover:bg-navy-50 dark:hover:bg-white/[0.03]"
                      >
                        <input type="radio" {...register('accountId')} value={acc.id} className="sr-only" defaultChecked={accounts[0]?.id === acc.id} />
                        <span>{acc.icon}</span>
                        <span className="text-navy-700 dark:text-navy-100">{acc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1 block">Date</Label>
                  <Input type="date" {...register('date')} className="rounded-xl" />
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Payment Method</Label>
                  <div className="flex gap-2">
                    {paymentMethods.map(pm => (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() => setSelectedPayment(pm.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                          selectedPayment === pm.value
                            ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-500/10 dark:ring-primary-400'
                            : 'bg-surface-light dark:bg-white/[0.03] hover:bg-navy-50 dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-lg">{pm.icon}</span>
                        <span className="text-navy-600 dark:text-navy-200">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1 block">Description</Label>
                  <Input {...register('description', { required: true })} placeholder="What was this for?" className="rounded-xl" />
                  {errors.description && <p className="mt-1 text-xs text-expense">Description is required</p>}
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1 block">Notes (optional)</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes..." rows={2} className="rounded-xl" />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-2xl gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow transition-shadow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Add Transaction'}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
