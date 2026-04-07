'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Wallet } from 'lucide-react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountForm } from '@/components/accounts/AccountForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/hooks/useCurrency';
import { localDb } from '@/lib/dexie';
import type { Account } from '@/types';
import toast from 'react-hot-toast';

export default function AccountsPage() {
  const { accounts, isLoading, addAccount, updateAccount, deleteAccount, getTotalBalance } = useAccounts();
  const { formatAmount } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [relatedTransactionsCount, setRelatedTransactionsCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openDeleteDialog = async (account: Account) => {
    const txCount = await localDb.transactions
      .where('accountId')
      .equals(account.id)
      .and((tx) => tx._syncStatus !== 'pending_delete')
      .count();

    setDeletingAccount(account);
    setRelatedTransactionsCount(txCount);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;

    setIsDeleting(true);
    try {
      await deleteAccount(deletingAccount.id);
      toast.success('Account deleted');
      setShowDeleteDialog(false);
      setDeletingAccount(null);
      setRelatedTransactionsCount(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
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
                  onDelete={() => openDeleteDialog(acc)}
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

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) {
            setDeletingAccount(null);
            setRelatedTransactionsCount(0);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Account</DialogTitle>
            <DialogDescription>
              {deletingAccount
                ? `Are you sure you want to delete "${deletingAccount.name}"?`
                : 'Are you sure you want to delete this account?'}
            </DialogDescription>
          </DialogHeader>

          {relatedTransactionsCount > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning-dark dark:text-warning">
              This account is used in {relatedTransactionsCount} transaction{relatedTransactionsCount === 1 ? '' : 's'}.
              Those transactions will remain for history, but this account will be removed.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 rounded-xl"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 rounded-xl bg-expense hover:bg-expense-dark text-white border-0"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
