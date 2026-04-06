'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Wallet } from 'lucide-react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountForm } from '@/components/accounts/AccountForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/hooks/useCurrency';
import toast from 'react-hot-toast';

export default function AccountsPage() {
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount, getTotalBalance } = useAccounts();
  const { formatAmount } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const handleCreate = async (data: any) => {
    try {
      await addAccount(data);
      toast.success('Account created!');
    } catch (err) {
      toast.error('Failed to create account');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingAccount) return;
    try {
      await updateAccount(editingAccount.id, data);
      toast.success('Account updated!');
    } catch (err) {
      toast.error('Failed to update');
    }
    setEditingAccount(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
      toast.success('Account deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-5">
          <div className="flex items-center gap-3">
            <Link href="/more" className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors lg:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">Accounts</h1>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 rounded-xl gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 lg:px-8 lg:py-6">
        {/* Total Balance */}
        <div className="rounded-2xl gradient-hero p-5 text-center text-white shadow-glow">
          <p className="text-sm text-white/60 font-medium">Total Balance</p>
          <p className="text-3xl font-display font-bold mt-1">{formatAmount(getTotalBalance())}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-12 w-12" />}
            title="No accounts"
            description="Add your first account"
            action={
              <Button onClick={() => setShowForm(true)} className="gap-1.5 rounded-xl gradient-primary text-white border-0">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            }
          />
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {accounts.map((acc, i) => (
              <motion.div key={acc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <AccountCard
                  account={acc}
                  onEdit={() => { setEditingAccount(acc); setShowForm(true); }}
                  onDelete={() => handleDelete(acc.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AccountForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingAccount(null); }}
        onSubmit={editingAccount ? handleUpdate : handleCreate}
        account={editingAccount}
      />
    </PageWrapper>
  );
}
