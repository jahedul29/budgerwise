'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const MAX_PULL = 96;
const TRIGGER_PULL = 64;

export function PullToRefresh() {
  const { showAddTransaction } = useUIStore();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const touchIdentifierRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    const resetGesture = () => {
      startYRef.current = null;
      activeRef.current = false;
      touchIdentifierRef.current = null;
      setPullDistance(0);
    };

    const findTouch = (event: TouchEvent) => {
      if (touchIdentifierRef.current === null) return event.touches[0] ?? event.changedTouches[0] ?? null;
      for (const touch of Array.from(event.touches)) {
        if (touch.identifier === touchIdentifierRef.current) return touch;
      }
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier === touchIdentifierRef.current) return touch;
      }
      return null;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (isRefreshing || showAddTransaction) return;
      if (window.scrollY > 0) return;

      const touch = event.touches[0];
      if (!touch) return;

      startYRef.current = touch.clientY;
      touchIdentifierRef.current = touch.identifier;
      activeRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!activeRef.current || startYRef.current === null) return;
      if (window.scrollY > 0) {
        resetGesture();
        return;
      }

      const touch = findTouch(event);
      if (!touch) return;

      const delta = touch.clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      const damped = Math.min(MAX_PULL, delta * 0.45);
      setPullDistance(damped);

      if (damped > 2) {
        event.preventDefault();
      }
    };

    const triggerRefresh = () => {
      setIsRefreshing(true);
      setPullDistance(TRIGGER_PULL);
      // Match native browser pull-to-refresh behavior.
      window.location.reload();
    };

    const onTouchEnd = () => {
      if (!activeRef.current) {
        resetGesture();
        return;
      }

      const shouldRefresh = pullDistance >= TRIGGER_PULL && !showAddTransaction;
      resetGesture();

      if (shouldRefresh) {
        triggerRefresh();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isRefreshing, showAddTransaction, pullDistance]);

  const visible = pullDistance > 0 || isRefreshing;
  const progress = Math.min(1, pullDistance / TRIGGER_PULL);
  const opacity = isRefreshing ? 1 : progress;
  const translateY = Math.min(56, pullDistance * 0.7);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[70] flex justify-center lg:hidden"
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <div className="mt-2 rounded-full border border-gray-200/70 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur dark:border-white/[0.08] dark:bg-surface-elevated/90">
        <RefreshCw
          className={cn(
            'h-4 w-4 text-primary-500 transition-transform',
            isRefreshing && 'animate-spin',
          )}
          style={{
            opacity,
            transform: `rotate(${isRefreshing ? 360 : progress * 240}deg)`,
          }}
        />
      </div>
    </div>
  );
}
