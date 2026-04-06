'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, endOfMonth, differenceInDays } from 'date-fns';
import { Plus, Target } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/hooks/useCurrency';
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
  const { budgets, isLoading, addBudget, updateBudget, deleteBudget, getCurrentMonthBudgets } = useBudgets();
  const { transactions } = useTransactions();
  const { formatAmount } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const daysRemaining = differenceInDays(endOfMonth(now), now);

  const currentBudgets = getCurrentMonthBudgets();

  const budgetWithSpending = useMemo(() => {
    return currentBudgets.map(budget => {
      const spent = transactions
        .filter(t => {
          const txMonth = format(new Date(t.date), 'yyyy-MM');
          return t.type === 'expense' && t.categoryId === budget.categoryId && txMonth === currentMonth;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...budget, spent };
    });
  }, [currentBudgets, transactions, currentMonth]);

  const totalBudgeted = budgetWithSpending.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetWithSpending.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  const handleCreate = async (data: any) => {
    try {
      await addBudget(data);
      toast.success('Budget created!');
    } catch (err) {
      toast.error('Failed to create budget');
    }
  };

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
            {budgetWithSpending.map((budget, i) => (
              <motion.div
                key={budget.id}
                variants={fadeUp}
              >
                <BudgetCard
                  categoryName={budget.categoryName}
                  categoryIcon="📦"
                  spent={budget.spent}
                  budget={budget.amount}
                  daysRemaining={daysRemaining}
                  onEdit={() => { setEditingBudget(budget); setShowForm(true); }}
                  onDelete={() => handleDelete(budget.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <BudgetForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingBudget(null); }}
        onSubmit={editingBudget ? handleUpdate : handleCreate}
        budget={editingBudget}
      />
    </PageWrapper>
  );
}
