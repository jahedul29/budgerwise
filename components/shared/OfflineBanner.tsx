'use client';
import { WifiOff } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const { isOnline } = useUIStore();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warning/10 border-b border-warning/20 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-warning-dark dark:text-warning">
            <WifiOff className="h-3.5 w-3.5" />
            <span>You&apos;re offline. Changes will sync when you reconnect.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
