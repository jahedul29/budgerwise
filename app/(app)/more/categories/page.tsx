'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Tag, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCategories } from '@/hooks/useCategories';
import type { CategoryType } from '@/types';
import toast from 'react-hot-toast';

const colors = ['#F97316', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899', '#F59E0B', '#10B981', '#06D6A0', '#14B8A6', '#64748B', '#A855F7', '#F43F5E'];
const emojiIcons = ['🍔', '🚗', '🏠', '💊', '🎮', '🛍️', '💡', '📚', '✈️', '💼', '🐾', '🎁', '📦', '💰', '💻', '📈', '🏦', '💵', '🎯', '🏋️', '🎵', '📷', '🎬', '☕', '🍕', '🚌', '🏥', '🧹', '📱', '🎂', '👶', '🐕', '🌍', '🎨', '🔧', '📮'];

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, getCategoriesByType } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', icon: '📦', color: '#06D6A0', type: 'expense' as CategoryType });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast.success('Category updated!');
      } else {
        await addCategory(formData);
        toast.success('Category created!');
      }
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ name: '', icon: '📦', color: '#06D6A0', type: 'expense' });
    } catch (err) {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (cat: any) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setShowForm(true);
  };

  const renderList = (type: CategoryType) => {
    const cats = getCategoriesByType(type);
    if (cats.length === 0) {
      return (
        <EmptyState
          icon={<Tag className="h-10 w-10" />}
          title={`No ${type} categories`}
          description="Create one to get started"
        />
      );
    }
    return (
      <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {cats.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card flex items-center gap-3 rounded-xl p-3 group"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-105"
              style={{ backgroundColor: `${cat.color}15` }}
            >
              {cat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-navy-800 dark:text-navy-50">{cat.name}</p>
              {cat.isDefault && <Badge variant="secondary" className="mt-0.5 text-[10px]">Default</Badge>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(cat)} className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-50 dark:hover:bg-white/[0.04] hover:text-navy-600 dark:hover:text-navy-100 transition-colors">
                <Edit className="h-3.5 w-3.5" />
              </button>
              {!cat.isDefault && (
                <button onClick={() => handleDelete(cat.id)} className="rounded-lg p-1.5 text-navy-300 hover:bg-expense/10 hover:text-expense transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <PageWrapper>
      <div className="sticky top-0 z-30 glass-nav">
        <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-5">
          <div className="flex items-center gap-3">
            <Link href="/more" className="text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 transition-colors lg:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl lg:text-2xl font-display font-bold text-navy-900 dark:text-navy-50">Categories</h1>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingCategory(null); setFormData({ name: '', icon: '📦', color: '#06D6A0', type: 'expense' }); setShowForm(true); }}
            className="gap-1.5 rounded-xl gradient-primary text-white border-0 shadow-glow-sm hover:shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6">
        <Tabs defaultValue="expense">
          <TabsList className="w-full mb-4 lg:w-auto lg:mb-6">
            <TabsTrigger value="expense" className="flex-1 lg:flex-none lg:px-6">Expense ({getCategoriesByType('expense').length})</TabsTrigger>
            <TabsTrigger value="income" className="flex-1 lg:flex-none lg:px-6">Income ({getCategoriesByType('income').length})</TabsTrigger>
          </TabsList>
          <TabsContent value="expense">{renderList('expense')}</TabsContent>
          <TabsContent value="income">{renderList('income')}</TabsContent>
        </Tabs>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>Customize your transaction categories</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-1 block">Name</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Category name" className="rounded-xl" />
            </div>

            <div>
              <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Type</Label>
              <div className="flex gap-2">
                {(['expense', 'income'] as CategoryType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setFormData(p => ({ ...p, type: t }))}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      formData.type === t ? 'gradient-primary text-white shadow-sm' : 'bg-surface-light dark:bg-white/[0.04] text-navy-500 dark:text-navy-300'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Icon</Label>
              <div className="grid grid-cols-9 gap-1.5 max-h-32 overflow-y-auto scrollbar-hide">
                {emojiIcons.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setFormData(p => ({ ...p, icon: ic }))}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                      formData.icon === ic ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-500/10' : 'hover:bg-navy-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-navy-400 dark:text-navy-300 mb-2 block">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setFormData(p => ({ ...p, color: c }))}
                    className={`h-8 w-8 rounded-full transition-all ${
                      formData.color === c ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-elevated' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 rounded-xl bg-surface-light dark:bg-white/[0.03] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${formData.color}15` }}>
                {formData.icon}
              </div>
              <span className="font-medium text-navy-800 dark:text-navy-50">{formData.name || 'Category Name'}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-xl gradient-primary text-white border-0">{editingCategory ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
