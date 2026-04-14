'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Target, AlertTriangle } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/hooks/useCurrency';
import { useUIStore } from '@/store/uiStore';
import { getPeriodRange, getRemainingLabel, getDaysRemaining, getCurrentPeriodKey } from '@/lib/budget-periods';
import toast from 'react-hot-toast';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function BudgetsPage() {
  const { budgets, isLoading, addBudget, updateBudget, deleteBudget, getCurrentPeriodBudgets } = useBudgets();
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { formatAmount } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [draftBudget, setDraftBudget] = useState<any>(null);

  // Duplicate budget warning state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existing: any;
    newData: any;
  } | null>(null);

  // Category icon lookup
  const categoryIconMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.id, c.icon));
    return map;
  }, [categories]);

  // Consume assistant draft if present
  const assistantDraft = useUIStore((s) => s.assistantBudgetDraft);
  const clearDraft = useUIStore((s) => s.setAssistantBudgetDraft);
  useEffect(() => {
    if (assistantDraft?.source === 'assistant') {
      setDraftBudget({
        categoryId: assistantDraft.categoryId ?? '',
        categoryName: assistantDraft.categoryName ?? '',
        amount: assistantDraft.amount ?? '',
        period: assistantDraft.period ?? 'monthly',
        month: assistantDraft.month ?? getCurrentPeriodKey(assistantDraft.period ?? 'monthly'),
        alertThreshold: assistantDraft.alertThreshold ?? 80,
      });
      setEditingBudget(null);
      setShowForm(true);
      clearDraft(null);
    }
  }, [assistantDraft, clearDraft]);

  const now = new Date();

  const currentBudgets = getCurrentPeriodBudgets();

  const budgetWithSpending = useMemo(() => {
    return currentBudgets.map(budget => {
      const { start, end } = getPeriodRange(budget.month, budget.period);
      const spent = transactions
        .filter(t => {
          if (t.type !== 'expense' || t.categoryId !== budget.categoryId) return false;
          const txDate = new Date(t.date);
          return txDate >= start && txDate <= end;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...budget,
        spent,
        remainingLabel: getRemainingLabel(budget.period),
        daysRemaining: getDaysRemaining(budget.period),
      };
    });
  }, [currentBudgets, transactions]);

  const totalBudgeted = budgetWithSpending.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetWithSpending.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  const handleCreate = useCallback(async (data: any) => {
    // Check for existing budget with same category + period type + period key
    const existing = budgets.find(
      b => b.categoryId === data.categoryId && b.period === data.period && b.month === data.month
    );

    if (existing) {
      setDuplicateWarning({ existing, newData: data });
      return;
    }

    try {
      await addBudget(data);
      toast.success('Budget created!');
    } catch (err) {
      toast.error('Failed to create budget');
    }
  }, [budgets, addBudget]);

  const handleReplaceExisting = useCallback(async () => {
    if (!duplicateWarning) return;
    const { existing, newData } = duplicateWarning;
    try {
      await deleteBudget(existing.id);
      await addBudget(newData);
      toast.success('Budget replaced!');
    } catch (err) {
      toast.error('Failed to replace budget');
    }
    setDuplicateWarning(null);
  }, [duplicateWarning, deleteBudget, addBudget]);


  const handleUpdate = async (data: any) => {
    if (!editingBudget) return;
    try {
      await updateBudget(editingBudget.id, data);
      toast.success('Budget updated!');
    } catch (err) {
      toast.error('Failed to update budget');
    }
    setEditingBudget(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      toast.success('Budget deleted');
    } catch (err) {
      toast.error('Failed to delete budget');
    }
  };

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-5">
          <div>
            <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">Budgets</h1>
            <p className="text-xs lg:text-sm text-navy-400 dark:text-navy-300">{format(now, 'MMMM yyyy')}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 rounded-xl gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow"
          >
            <Plus className="h-4 w-4" />
            New Budget
          </Button>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-4 py-4 lg:px-8 lg:py-6 space-y-5 lg:space-y-6"
      >
        {/* Summary Cards */}
        {budgetWithSpending.length > 0 && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 lg:gap-4">
            <div className="glass-card rounded-2xl p-3 lg:p-4 text-center hover-lift">
              <p className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1">Budgeted</p>
              <p className="text-sm lg:text-lg font-display font-bold text-navy-800 dark:text-navy-50">{formatAmount(totalBudgeted)}</p>
            </div>
            <div className="glass-card rounded-2xl p-3 lg:p-4 text-center hover-lift">
              <p className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1">Spent</p>
              <p className="text-sm lg:text-lg font-display font-bold text-expense">{formatAmount(totalSpent)}</p>
            </div>
            <div className="glass-card rounded-2xl p-3 lg:p-4 text-center hover-lift">
              <p className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1">Remaining</p>
              <p className={`text-sm lg:text-lg font-display font-bold ${totalRemaining >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatAmount(totalRemaining)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Budget Cards */}
        {isLoading ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : budgetWithSpending.length === 0 ? (
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="No budgets yet"
            description="Create your first budget to start tracking your spending limits"
            action={
              <Button onClick={() => setShowForm(true)} className="gap-1.5 rounded-xl gradient-primary text-white border-0">
                <Plus className="h-4 w-4" />
                Create Budget
              </Button>
            }
          />
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {budgetWithSpending.map((budget) => (
              <motion.div key={budget.id} variants={fadeUp}>
                <BudgetCard
                  categoryName={budget.categoryName}
                  categoryIcon={categoryIconMap.get(budget.categoryId) ?? '📦'}
                  spent={budget.spent}
                  budget={budget.amount}
                  period={budget.period}
                  daysRemaining={budget.daysRemaining}
                  remainingLabel={budget.remainingLabel}
                  onEdit={() => { setEditingBudget(budget); setShowForm(true); }}
                  onDelete={() => handleDelete(budget.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <BudgetForm
        key={editingBudget?.id ?? draftBudget?.categoryId ?? 'new'}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingBudget(null); setDraftBudget(null); }}
        onSubmit={editingBudget ? handleUpdate : handleCreate}
        budget={editingBudget ?? draftBudget}
      />

      {/* Duplicate Budget Warning Modal */}
      <Dialog open={!!duplicateWarning} onOpenChange={() => setDuplicateWarning(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <DialogTitle className="font-display text-center">Budget Already Exists</DialogTitle>
            <DialogDescription className="text-center text-navy-400 dark:text-navy-300">
              A <span className="font-semibold text-navy-600 dark:text-navy-200">{duplicateWarning?.existing?.period}</span> budget for{' '}
              <span className="font-semibold text-navy-600 dark:text-navy-200">{duplicateWarning?.existing?.categoryName}</span>{' '}
              already exists with an amount of{' '}
              <span className="font-semibold text-navy-600 dark:text-navy-200">
                {duplicateWarning?.existing?.amount?.toLocaleString()}
              </span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleReplaceExisting}
              className="w-full rounded-xl gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow"
            >
              Replace Existing
            </Button>
            <Button
              variant="outline"
              onClick={() => setDuplicateWarning(null)}
              className="w-full rounded-xl border-gray-200/60 dark:border-white/[0.06] text-navy-400 dark:text-navy-400"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
