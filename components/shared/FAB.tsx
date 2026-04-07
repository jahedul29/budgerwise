'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export function FAB() {
  const { setShowAddTransaction } = useUIStore();
  const [aiVisible, setAiVisible] = useState(false);

  useEffect(() => {
    fetch('/api/assistant/access')
      .then((res) => res.json())
      .then((data) => setAiVisible(Boolean(data.enabled)))
      .catch(() => setAiVisible(false));
  }, []);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => setShowAddTransaction(true)}
      className={`fixed right-4 lg:right-8 z-40 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow transition-all hover:shadow-glow-lg ${
        aiVisible
          ? 'bottom-[9.25rem] lg:bottom-[6.25rem]'
          : 'bottom-20 lg:bottom-8'
      }`}
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </motion.button>
  );
}
