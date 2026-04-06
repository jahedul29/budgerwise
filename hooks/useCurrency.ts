import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/store/uiStore';
import { formatAmount as rawFormatAmount, getCurrencySymbol as rawGetSymbol } from '@/lib/currency';

export function useCurrency() {
  const currency = useUIStore((s) => s.currency);
  const hydrated = useUIStore((s) => s._currencyHydrated);
  const setCurrencyStore = useUIStore((s) => s.setCurrency);
  const hydrateCurrency = useUIStore((s) => s.hydrateCurrency);
  const { data: session } = useSession();
  const hasPulled = useRef(false);

  // Step 1: hydrate from localStorage on first client render
  useEffect(() => {
    if (!hydrated) {
      hydrateCurrency();
    }
  }, [hydrated, hydrateCurrency]);

  // Step 2: pull remote preference once authenticated
  useEffect(() => {
    if (!session?.user || hasPulled.current) return;
    hasPulled.current = true;

    fetch('/api/preferences')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferences?: { currency?: string } } | null) => {
        if (data?.preferences?.currency) {
          setCurrencyStore(data.preferences.currency);
        }
      })
      .catch(() => {
        // Offline or not configured — keep local value
      });
  }, [session, setCurrencyStore]);

  // Push to remote when user changes currency
  const setCurrency = useCallback(
    (code: string) => {
      setCurrencyStore(code);

      fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: code }),
      }).catch(() => {
        // Offline — localStorage already updated
      });
    },
    [setCurrencyStore],
  );

  const fmt = useCallback(
    (amount: number) => rawFormatAmount(amount, currency),
    [currency],
  );

  const symbol = rawGetSymbol(currency);

  return { currency, setCurrency, formatAmount: fmt, symbol };
}
