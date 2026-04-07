'use client';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Account, AccountType } from '@/types';

const accountTypes: { value: AccountType; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'mobile_banking', label: 'Mobile Banking', icon: '📱' },
  { value: 'bank', label: 'Bank', icon: '🏦' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'loan', label: 'Loan', icon: '📉' },
];

const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#EC4899', '#6366F1', '#F43F5E', '#14B8A6'];
const icons = ['💵', '🏦', '💳', '📱', '🪙', '💰', '🏧', '💎'];

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  account?: Account;
}

export function AccountForm({ open, onClose, onSubmit, account }: AccountFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: account?.name || '',
      type: account?.type || 'cash',
      balance: account?.balance || 0,
      currency: account?.currency || 'BDT',
      color: account?.color || '#10B981',
      icon: account?.icon || '💵',
    },
  });

  const selectedType = watch('type');
  const selectedColor = watch('color');
  const selectedIcon = watch('icon');

  const handleFormSubmit = (data: any) => {
    onSubmit({ ...data, balance: parseFloat(data.balance) });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Account' : 'Add Account'}</DialogTitle>
          <DialogDescription>Manage your financial accounts</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Account Name</Label>
            <Input {...register('name', { required: true })} placeholder="e.g., Main Wallet" />
            {errors.name && <p className="mt-1 text-xs text-expense">Name is required</p>}
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue('type', t.value)}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-sm transition-all ${
                    selectedType === t.value
                      ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-900/30'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Initial Balance</Label>
            <Input type="number" step="0.01" {...register('balance')} />
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {icons.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setValue('icon', ic)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                    selectedIcon === ic ? 'bg-primary-50 ring-2 ring-primary-500' : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    selectedColor === c ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{account ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
