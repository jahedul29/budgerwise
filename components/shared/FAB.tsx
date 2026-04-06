'use client';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export function FAB() {
  const { setShowAddTransaction } = useUIStore();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => setShowAddTransaction(true)}
      className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow transition-shadow hover:shadow-glow-lg"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </motion.button>
  );
}
