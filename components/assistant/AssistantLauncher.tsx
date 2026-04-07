'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  Mic,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  X,
  Wallet,
  Tag,
  PiggyBank,
  CreditCard,
  Calendar,
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useUIStore } from '@/store/uiStore';
import { SYNC_COMPLETE_EVENT } from '@/lib/sync-events';
import type { AssistantParseResult } from '@/lib/assistant/schemas';

/* ─── Speech Recognition types ─── */

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return (
    (window as Window & { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ||
    null
  );
}

/* ─── Helpers ─── */

function fmtPercent(v: number) {
  return `${Math.round(v * 100)}%`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return 'Not set';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `${date}, ${time}`;
  } catch {
    return iso;
  }
}

/** Converts ISO string to datetime-local input value (YYYY-MM-DDThh:mm) in local time */
function isoToDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/** Converts a datetime-local input value back to ISO string */
function datetimeLocalToIso(value: string): string {
  if (!value) return new Date().toISOString();
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function getEntityIcon(entity: string) {
  switch (entity) {
    case 'transaction': return <CreditCard className="h-3.5 w-3.5" />;
    case 'account': return <Wallet className="h-3.5 w-3.5" />;
    case 'category': return <Tag className="h-3.5 w-3.5" />;
    case 'budget': return <PiggyBank className="h-3.5 w-3.5" />;
    default: return <Zap className="h-3.5 w-3.5" />;
  }
}

function getOperationLabel(op: string) {
  switch (op) {
    case 'add': return 'Create';
    case 'update': return 'Update';
    case 'delete': return 'Delete';
    default: return op;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── Styled Select ─── */

function StyledSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-navy-800 dark:text-navy-50 transition-all duration-200 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 hover:border-white/[0.12] hover:bg-white/[0.06]"
      >
        <option value="" className="bg-surface-card text-navy-200">{placeholder}</option>
        {children}
      </select>
      <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-navy-300" />
    </div>
  );
}

/* ─── Styled Input ─── */

function StyledInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-navy-800 dark:text-navy-50 placeholder:text-navy-400/60 dark:placeholder:text-navy-300/40 transition-all duration-200 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 hover:border-white/[0.12] hover:bg-white/[0.06]"
    />
  );
}

/* ─── Confirmation Row (read-only summary line) ─── */

function ConfirmRow({
  label,
  value,
  icon,
  missing,
  onEdit,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  missing?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-navy-400 dark:text-navy-400 shrink-0">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider text-navy-400 dark:text-navy-400 shrink-0 w-20">{label}</span>
        {missing ? (
          <span className="text-sm text-warning italic">Not set</span>
        ) : (
          <span className="text-sm font-medium text-navy-800 dark:text-navy-100 truncate">{value}</span>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="opacity-60 lg:opacity-0 lg:group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-lg text-navy-400 hover:text-primary-500 hover:bg-primary-500/10 transition-all"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ─── Voice Indicator ─── */

function VoicePulse() {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute h-10 w-10 rounded-full bg-primary-500/20"
        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-7 w-7 rounded-full bg-primary-500/30"
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />
      <Mic className="relative h-4 w-4 text-primary-400" />
    </div>
  );
}

/* ─── Thinking Dots ─── */

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary-400"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─── */

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [listening, setListening] = useState(false);
  const [parseResult, setParseResult] = useState<AssistantParseResult | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Check if AI assistant is enabled for this user
  useEffect(() => {
    fetch('/api/assistant/access')
      .then((res) => res.json())
      .then((data) => setAiEnabled(Boolean(data.enabled)))
      .catch(() => setAiEnabled(false));
  }, []);

  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();
  const {
    setShowAddTransaction, setAssistantTransactionDraft,
    setAssistantCategoryDraft, setAssistantAccountDraft, setAssistantBudgetDraft,
    syncNow,
  } = useUIStore();
  const router = useRouter();

  const requiresResolution = useMemo(
    () => (parseResult?.ambiguities.length ?? 0) > 0 || (parseResult?.missingFields.length ?? 0) > 0,
    [parseResult],
  );

  // Lookup helpers
  const accountName = useCallback((id: string | undefined) => {
    if (!id) return '';
    const a = accounts.find((acc) => acc.id === id);
    return a ? `${a.icon} ${a.name}` : id;
  }, [accounts]);

  const categoryName = useCallback((id: string | undefined) => {
    if (!id) return '';
    const c = categories.find((cat) => cat.id === id);
    return c ? `${c.icon} ${c.name}` : id;
  }, [categories]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const startVoice = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error('Voice recognition is not supported on this browser');
      return;
    }

    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast.error('Voice input failed');
    };
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      toast.success('Voice captured');
    };

    rec.start();
  }, []);

  const handleParse = useCallback(async () => {
    if (!input.trim()) {
      toast.error('Type or speak a command first');
      return;
    }

    setParsing(true);
    setParseResult(null);
    setEditingField(null);
    try {
      const response = await fetch('/api/assistant/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.trim(),
          locale: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          nowIso: new Date().toISOString(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error ?? 'Failed to parse command');
      }
      const result = data as AssistantParseResult;

      // If all required fields are resolved with no ambiguities, auto-execute or open form
      if (result.ambiguities.length === 0 && result.missingFields.length === 0) {
        // transaction.add → open the transaction form directly
        if (result.intent === 'transaction.add' && result.fields.transaction) {
          const tx = result.fields.transaction;
          if (tx.amount && tx.type && tx.accountId && tx.categoryId && tx.description) {
            setAssistantTransactionDraft({
              amount: tx.amount,
              type: tx.type,
              accountId: tx.accountId,
              categoryId: tx.categoryId,
              paymentMethod: tx.paymentMethod ?? 'cash',
              dateIso: tx.dateIso ?? new Date().toISOString(),
              description: tx.description,
              notes: tx.notes,
              source: 'assistant',
            });
            setShowAddTransaction(true);
            setOpen(false);
            setInput('');
            toast.success('Transaction form ready');
            return;
          }
        }

        // category add → set draft, navigate to categories page
        if (result.intent === 'category.add' && result.fields.category?.name && result.fields.category.type) {
          const cat = result.fields.category;
          setAssistantCategoryDraft({
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            source: 'assistant',
          });
          setOpen(false);
          setInput('');
          router.push('/more/categories');
          toast.success('Category form ready — review and submit');
          return;
        }

        // account add → set draft, navigate to accounts page
        if (result.intent === 'account.add' && result.fields.account?.name && result.fields.account.type) {
          const acc = result.fields.account;
          setAssistantAccountDraft({
            name: acc.name,
            type: acc.type,
            balance: acc.balance,
            currency: acc.currency,
            icon: acc.icon,
            color: acc.color,
            source: 'assistant',
          });
          setOpen(false);
          setInput('');
          router.push('/more/accounts');
          toast.success('Account form ready — review and submit');
          return;
        }

        // budget add → set draft, navigate to budgets page
        if (result.intent === 'budget.add' && result.fields.budget?.categoryId && result.fields.budget.amount) {
          const bud = result.fields.budget;
          setAssistantBudgetDraft({
            categoryId: bud.categoryId,
            categoryName: bud.categoryName,
            amount: bud.amount,
            period: bud.period ?? 'monthly',
            month: bud.month,
            alertThreshold: bud.alertThreshold,
            source: 'assistant',
          });
          setOpen(false);
          setInput('');
          router.push('/budgets');
          toast.success('Budget form ready — review and submit');
          return;
        }
      }

      setParseResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse command');
    } finally {
      setParsing(false);
    }
  }, [input, setAssistantTransactionDraft, setShowAddTransaction]);

  const resolveAmbiguity = useCallback((key: string, id: string) => {
    if (!parseResult) return;
    const next = structuredClone(parseResult) as AssistantParseResult;
    if (key === 'transaction.accountId' && next.fields.transaction) next.fields.transaction.accountId = id;
    if (key === 'transaction.categoryId' && next.fields.transaction) next.fields.transaction.categoryId = id;
    if (key === 'budget.categoryId' && next.fields.budget) next.fields.budget.categoryId = id;

    next.ambiguities = next.ambiguities.filter((a) => a.key !== key);
    next.resolutions = next.resolutions.map((r) => (r.key === key ? { ...r, status: 'resolved', resolvedId: id } : r));
    next.missingFields = next.missingFields.filter((f) => f !== key);
    setParseResult(next);
    setEditingField(null);
  }, [parseResult]);

  const updateTransactionField = useCallback((field: string, value: string) => {
    if (!parseResult?.fields.transaction) return;
    const next = structuredClone(parseResult) as AssistantParseResult;
    const tx = next.fields.transaction!;
    if (field === 'amount') tx.amount = Number(value);
    if (field === 'description') tx.description = value;
    if (field === 'notes') tx.notes = value;
    if (field === 'type') tx.type = value as typeof tx.type;
    if (field === 'paymentMethod') tx.paymentMethod = value as typeof tx.paymentMethod;
    if (field === 'dateIso') tx.dateIso = datetimeLocalToIso(value);
    if (field === 'accountId') tx.accountId = value;
    if (field === 'categoryId') tx.categoryId = value;

    const requiredKey = `transaction.${field}`;
    if (value && value.trim()) {
      next.missingFields = next.missingFields.filter((f) => f !== requiredKey);
      next.ambiguities = next.ambiguities.filter((a) => a.key !== requiredKey);
      next.resolutions = next.resolutions.map((resolution) =>
        resolution.key === requiredKey ? { ...resolution, status: 'resolved', resolvedId: value } : resolution,
      );
    }
    setParseResult(next);
  }, [parseResult]);

  const updateEntityField = useCallback((
    entity: 'transaction' | 'account' | 'category' | 'budget',
    field: string,
    value: string,
  ) => {
    if (!parseResult) return;
    const next = structuredClone(parseResult) as AssistantParseResult;
    const target = next.fields[entity];
    if (!target) return;

    const numericFields = new Set(['amount', 'balance', 'alertThreshold']);
    (target as Record<string, unknown>)[field] = numericFields.has(field) ? Number(value) : value;

    const requiredKey = `${entity}.${field}`;
    if (value && value.trim()) {
      next.missingFields = next.missingFields.filter((f) => f !== requiredKey);
      next.ambiguities = next.ambiguities.filter((a) => a.key !== requiredKey);
      next.resolutions = next.resolutions.map((resolution) =>
        resolution.key === requiredKey ? { ...resolution, status: 'resolved', resolvedId: value } : resolution,
      );
    }
    setParseResult(next);
  }, [parseResult]);

  const openTransactionDraftInForm = useCallback(() => {
    if (!parseResult?.fields.transaction) return;
    const tx = parseResult.fields.transaction;
    if (!tx.amount || !tx.type || !tx.accountId || !tx.categoryId || !tx.description) {
      toast.error('Please resolve required fields first');
      return;
    }

    setAssistantTransactionDraft({
      amount: tx.amount,
      type: tx.type,
      accountId: tx.accountId,
      categoryId: tx.categoryId,
      paymentMethod: tx.paymentMethod ?? 'cash',
      dateIso: tx.dateIso ?? new Date().toISOString(),
      description: tx.description,
      notes: tx.notes,
      source: 'assistant',
    });
    setShowAddTransaction(true);
    setOpen(false);
    toast.success('Transaction draft opened');
  }, [parseResult, setAssistantTransactionDraft, setShowAddTransaction]);

  const handleExecute = useCallback(async () => {
    if (!parseResult) return;
    if (requiresResolution) {
      toast.error('Resolve missing or ambiguous fields first');
      return;
    }

    if (parseResult.intent === 'transaction.add') {
      openTransactionDraftInForm();
      return;
    }

    setExecuting(true);
    try {
      const response = await fetch('/api/assistant/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: parseResult.intent,
          fields: parseResult.fields,
          confirmed: true,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error ?? 'Execution failed');
      }

      if (syncNow) {
        await syncNow();
      }
      window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT));
      toast.success(data.message || 'Action completed');
      setParseResult(null);
      setInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setExecuting(false);
    }
  }, [parseResult, requiresResolution, openTransactionDraftInForm, syncNow]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !parsing) {
      e.preventDefault();
      handleParse();
    }
  };

  const isDelete = parseResult?.operation === 'delete';
  const confidenceColor = (parseResult?.confidence ?? 0) >= 0.8
    ? 'text-income dark:text-income'
    : (parseResult?.confidence ?? 0) >= 0.5
    ? 'text-warning dark:text-warning'
    : 'text-expense dark:text-expense';

  /* ─── Inline edit field renderer ─── */
  const renderInlineEdit = (fieldKey: string) => {
    if (editingField !== fieldKey) return null;

    const tx = parseResult?.fields.transaction;
    const handleDone = () => setEditingField(null);

    switch (fieldKey) {
      case 'amount':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <StyledInput value={String(tx?.amount ?? '')} onChange={(v) => updateTransactionField('amount', v)} placeholder="Amount" type="number" />
            </div>
          </motion.div>
        );
      case 'type':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <StyledSelect value={tx?.type ?? ''} onChange={(v) => { updateTransactionField('type', v); handleDone(); }} placeholder="Select type">
                <option value="expense" className="bg-surface-card text-navy-100">Expense</option>
                <option value="income" className="bg-surface-card text-navy-100">Income</option>
                <option value="transfer" className="bg-surface-card text-navy-100">Transfer</option>
              </StyledSelect>
            </div>
          </motion.div>
        );
      case 'categoryId':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <StyledSelect value={tx?.categoryId ?? ''} onChange={(v) => { updateTransactionField('categoryId', v); handleDone(); }} placeholder="Select category">
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-surface-card text-navy-100">{c.icon} {c.name}</option>
                ))}
              </StyledSelect>
            </div>
          </motion.div>
        );
      case 'accountId':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <StyledSelect value={tx?.accountId ?? ''} onChange={(v) => { updateTransactionField('accountId', v); handleDone(); }} placeholder="Select account">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-surface-card text-navy-100">{a.icon} {a.name}</option>
                ))}
              </StyledSelect>
            </div>
          </motion.div>
        );
      case 'paymentMethod':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <StyledSelect value={tx?.paymentMethod ?? ''} onChange={(v) => { updateTransactionField('paymentMethod', v); handleDone(); }} placeholder="Payment method">
                <option value="cash" className="bg-surface-card text-navy-100">Cash</option>
                <option value="card" className="bg-surface-card text-navy-100">Card</option>
                <option value="bank_transfer" className="bg-surface-card text-navy-100">Bank transfer</option>
                <option value="mobile_banking" className="bg-surface-card text-navy-100">Mobile banking</option>
                <option value="other" className="bg-surface-card text-navy-100">Other</option>
              </StyledSelect>
            </div>
          </motion.div>
        );
      case 'dateIso':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <input
                type="datetime-local"
                value={isoToDatetimeLocalValue(tx?.dateIso)}
                onChange={(e) => { updateTransactionField('dateIso', e.target.value); handleDone(); }}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-navy-800 dark:text-navy-50 transition-all duration-200 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 [color-scheme:dark]"
              />
            </div>
          </motion.div>
        );
      case 'description':
        return (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-1 pb-0.5">
              <StyledInput value={tx?.description ?? ''} onChange={(v) => updateTransactionField('description', v)} placeholder="Description" />
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const paymentMethodLabel = (pm: string | undefined) => {
    switch (pm) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'bank_transfer': return 'Bank transfer';
      case 'mobile_banking': return 'Mobile banking';
      case 'other': return 'Other';
      default: return pm ?? 'Not set';
    }
  };

  // Don't render if AI access hasn't loaded or is disabled
  if (aiEnabled !== true) return null;

  return (
    <>
      {/* ─── AI Assistant FAB ─── */}
      {/* Same size as Add Transaction FAB (h-14 w-14), stacked above with 12px gap */}
      <div className="fixed z-40 bottom-20 right-4 lg:bottom-8 lg:right-8 h-14 w-14">
        {/* Outer glow pulse */}
        <motion.div
          className="absolute -inset-2 rounded-3xl"
          style={{ background: 'radial-gradient(circle, rgba(6,214,160,0.25) 0%, rgba(17,138,178,0.15) 50%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Spinning gradient border ring */}
        <motion.div
          className="absolute -inset-[2px] rounded-2xl"
          style={{
            background: 'conic-gradient(from 0deg, #06D6A0, #118AB2, #00F5D4, #FFD166, #06D6A0)',
            filter: 'blur(0.5px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Button body */}
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          className="relative h-14 w-14 flex items-center justify-center rounded-2xl overflow-hidden group"
          style={{ background: 'linear-gradient(145deg, #0a2a3c 0%, #0d1f2d 50%, #0a1628 100%)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.88 }}
          aria-label="Open assistant"
          title="Assistant"
        >
          {/* Animated mesh gradient overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(6,214,160,0.3) 0%, rgba(17,138,178,0.2) 40%, rgba(0,245,212,0.25) 70%, rgba(6,214,160,0.15) 100%)',
              backgroundSize: '200% 200%',
            }}
            animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Glass sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] via-transparent to-transparent" />

          {/* Inner glow on hover */}
          <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors duration-300" />

          {/* Icon */}
          <motion.div
            className="relative z-10"
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-6 w-6 text-primary-300 drop-shadow-[0_0_8px_rgba(6,214,160,0.5)]" strokeWidth={2} />
          </motion.div>
        </motion.button>
      </div>

      {/* ─── Backdrop ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* ─── Panel ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            className="fixed z-[75] bottom-0 inset-x-0 lg:bottom-6 lg:right-6 lg:left-auto lg:w-[460px]"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.8 }}
          >
            <div className="bg-white/90 dark:bg-[#0B1022]/95 backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.06] rounded-t-3xl lg:rounded-3xl shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden max-h-[85dvh] flex flex-col">

              {/* ─── Header ─── */}
              <div className="relative px-5 py-4 flex items-center justify-between shrink-0">
                {/* Gradient accent line */}
                <div className="absolute top-0 left-5 right-5 h-[2px] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full w-full"
                    style={{ background: 'linear-gradient(90deg, #06D6A0, #118AB2, #06D6A0)' }}
                    animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-accent/20 dark:from-primary-500/15 dark:to-accent/15">
                    <Sparkles className="h-4 w-4 text-primary-500" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold text-navy-900 dark:text-navy-50 tracking-tight">
                      Assistant
                    </h2>
                    <p className="text-[11px] text-navy-400 dark:text-navy-300 -mt-0.5">
                      Natural language commands
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-navy-400 dark:text-navy-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ─── Content (scrollable) ─── */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-5 space-y-3">

                {/* ─── Parse Result ─── */}
                <AnimatePresence mode="wait">
                  {/* Could not understand — show friendly guidance */}
                  {parseResult && parseResult.confidence === 0 && parseResult.missingFields.includes('clarification') && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                      className="space-y-3"
                    >
                      <div className="rounded-2xl border border-warning/20 bg-warning/[0.05] p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/15">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">
                              Couldn&apos;t understand that command
                            </p>
                            <p className="text-xs text-navy-500 dark:text-navy-300 mt-1 leading-relaxed">
                              Try being more specific. Include the <span className="font-semibold">action</span> and <span className="font-semibold">required details</span>:
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pl-[2.625rem]">
                          {[
                            { label: 'Transaction', example: 'I spent 200 taka on food from cash' },
                            { label: 'Category', example: 'Create an expense category called Transport' },
                            { label: 'Account', example: 'Add a bank account called Savings' },
                            { label: 'Budget', example: 'Set a monthly budget of 3000 for groceries' },
                          ].map((hint) => (
                            <button
                              key={hint.label}
                              type="button"
                              onClick={() => { setInput(hint.example); setParseResult(null); inputRef.current?.focus(); }}
                              className="w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] leading-snug text-navy-600 dark:text-navy-200 hover:bg-white/60 dark:hover:bg-white/[0.04] transition-colors group"
                            >
                              <span className="font-semibold text-navy-700 dark:text-navy-100">{hint.label}:</span>{' '}
                              <span className="text-navy-400 dark:text-navy-400 group-hover:text-navy-600 dark:group-hover:text-navy-200 transition-colors">&ldquo;{hint.example}&rdquo;</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setParseResult(null); inputRef.current?.focus(); }}
                        className="w-full inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-navy-600 dark:text-navy-200 hover:bg-white/[0.08] transition-colors"
                      >
                        Try again
                      </button>
                    </motion.div>
                  )}

                  {parseResult && !(parseResult.confidence === 0 && parseResult.missingFields.includes('clarification')) && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                      className="space-y-3"
                    >
                      {/* Intent Badge */}
                      <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            isDelete
                              ? 'bg-expense/10 text-expense dark:bg-expense/15 dark:text-expense'
                              : 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'
                          }`}>
                            {getEntityIcon(parseResult.entity)}
                            {getOperationLabel(parseResult.operation)} {parseResult.entity}
                          </span>
                        </div>
                        <span className={`text-xs font-mono font-semibold ${confidenceColor}`}>
                          {fmtPercent(parseResult.confidence)}
                        </span>
                      </motion.div>

                      {/* Ambiguities */}
                      {parseResult.ambiguities.map((amb, i) => (
                        <motion.div
                          key={amb.key}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="rounded-xl border border-warning/30 bg-warning/[0.06] p-3 space-y-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-warning" />
                            <p className="text-xs font-medium text-warning-dark dark:text-warning">
                              Ambiguous: {amb.key.split('.').pop()}
                            </p>
                          </div>
                          <StyledSelect
                            value=""
                            onChange={(v) => resolveAmbiguity(amb.key, v)}
                            placeholder="Select..."
                          >
                            {amb.options.map((opt) => (
                              <option key={opt.id} value={opt.id} className="bg-surface-card text-navy-100">
                                {opt.name}{opt.subtitle ? ` — ${opt.subtitle}` : ''}
                              </option>
                            ))}
                          </StyledSelect>
                        </motion.div>
                      ))}

                      {/* ─── Transaction Add: Confirmation Card ─── */}
                      {parseResult.intent === 'transaction.add' && parseResult.fields.transaction && (
                        <motion.div
                          className="rounded-2xl border border-white/[0.06] bg-white/50 dark:bg-white/[0.02] overflow-hidden"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          {/* Amount hero */}
                          <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-white/[0.04]">
                            <div className="flex items-baseline gap-2">
                              <span className={`text-2xl font-display font-bold tracking-tight ${
                                parseResult.fields.transaction.type === 'income'
                                  ? 'text-income-dark dark:text-income'
                                  : parseResult.fields.transaction.type === 'transfer'
                                  ? 'text-accent dark:text-accent'
                                  : 'text-expense-dark dark:text-expense'
                              }`}>
                                {parseResult.fields.transaction.amount
                                  ? `${parseResult.fields.transaction.type === 'income' ? '+' : parseResult.fields.transaction.type === 'transfer' ? '' : '-'}${parseResult.fields.transaction.amount.toLocaleString()}`
                                  : '—'
                                }
                              </span>
                              {parseResult.fields.transaction.type && (
                                <span className="text-xs font-medium text-navy-400 dark:text-navy-300 uppercase tracking-wider">
                                  {parseResult.fields.transaction.type}
                                </span>
                              )}
                              {!parseResult.fields.transaction.amount && (
                                <button type="button" onClick={() => setEditingField('amount')} className="text-xs text-warning hover:text-warning-dark transition-colors">
                                  Set amount
                                </button>
                              )}
                            </div>
                            {parseResult.fields.transaction.description && (
                              <p className="text-sm text-navy-600 dark:text-navy-200 mt-1">
                                {parseResult.fields.transaction.description}
                              </p>
                            )}
                            <AnimatePresence>{renderInlineEdit('amount')}</AnimatePresence>
                          </div>

                          {/* Detail rows */}
                          <div className="px-4 py-2 divide-y divide-gray-100/80 dark:divide-white/[0.03]">
                            <div>
                              <ConfirmRow
                                label="Category"
                                value={categoryName(parseResult.fields.transaction.categoryId)}
                                icon={<Tag className="h-3.5 w-3.5" />}
                                missing={!parseResult.fields.transaction.categoryId}
                                onEdit={() => setEditingField(editingField === 'categoryId' ? null : 'categoryId')}
                              />
                              <AnimatePresence>{renderInlineEdit('categoryId')}</AnimatePresence>
                            </div>
                            <div>
                              <ConfirmRow
                                label="Account"
                                value={accountName(parseResult.fields.transaction.accountId)}
                                icon={<Wallet className="h-3.5 w-3.5" />}
                                missing={!parseResult.fields.transaction.accountId}
                                onEdit={() => setEditingField(editingField === 'accountId' ? null : 'accountId')}
                              />
                              <AnimatePresence>{renderInlineEdit('accountId')}</AnimatePresence>
                            </div>
                            <div>
                              <ConfirmRow
                                label="Payment"
                                value={paymentMethodLabel(parseResult.fields.transaction.paymentMethod)}
                                icon={<CreditCard className="h-3.5 w-3.5" />}
                                missing={!parseResult.fields.transaction.paymentMethod}
                                onEdit={() => setEditingField(editingField === 'paymentMethod' ? null : 'paymentMethod')}
                              />
                              <AnimatePresence>{renderInlineEdit('paymentMethod')}</AnimatePresence>
                            </div>
                            <div>
                              <ConfirmRow
                                label="Date"
                                value={fmtDate(parseResult.fields.transaction.dateIso)}
                                icon={<Calendar className="h-3.5 w-3.5" />}
                                missing={!parseResult.fields.transaction.dateIso}
                                onEdit={() => setEditingField(editingField === 'dateIso' ? null : 'dateIso')}
                              />
                              <AnimatePresence>{renderInlineEdit('dateIso')}</AnimatePresence>
                            </div>
                            <div>
                              <ConfirmRow
                                label="Type"
                                value={capitalize(parseResult.fields.transaction.type ?? '')}
                                icon={<Zap className="h-3.5 w-3.5" />}
                                missing={!parseResult.fields.transaction.type}
                                onEdit={() => setEditingField(editingField === 'type' ? null : 'type')}
                              />
                              <AnimatePresence>{renderInlineEdit('type')}</AnimatePresence>
                            </div>
                            {(!parseResult.fields.transaction.description) && (
                              <div>
                                <ConfirmRow
                                  label="Note"
                                  value=""
                                  icon={<Pencil className="h-3.5 w-3.5" />}
                                  missing
                                  onEdit={() => setEditingField(editingField === 'description' ? null : 'description')}
                                />
                                <AnimatePresence>{renderInlineEdit('description')}</AnimatePresence>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* ─── Transaction Update ─── */}
                      {parseResult.intent === 'transaction.update' && parseResult.fields.transaction && (
                        <motion.div
                          className="rounded-2xl border border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 space-y-2.5"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          <StyledInput
                            value={parseResult.fields.transaction.id ?? ''}
                            onChange={(v) => updateEntityField('transaction', 'id', v)}
                            placeholder="Transaction ID"
                          />
                          <StyledInput
                            value={String(parseResult.fields.transaction.amount ?? '')}
                            onChange={(v) => updateEntityField('transaction', 'amount', v)}
                            placeholder="Amount"
                            type="number"
                          />
                          <StyledInput
                            value={parseResult.fields.transaction.description ?? ''}
                            onChange={(v) => updateEntityField('transaction', 'description', v)}
                            placeholder="Description"
                          />
                        </motion.div>
                      )}

                      {/* ─── Transaction Delete ─── */}
                      {parseResult.intent === 'transaction.delete' && (
                        <motion.div
                          className="rounded-2xl border border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 space-y-2.5"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          <div className="flex items-start gap-2 rounded-xl bg-expense/[0.06] border border-expense/20 p-3">
                            <AlertTriangle className="h-4 w-4 text-expense mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-expense">Permanent deletion</p>
                              <p className="text-[11px] text-expense/80 mt-0.5">
                                This will remove the transaction and adjust account balance.
                              </p>
                            </div>
                          </div>
                          <StyledInput
                            value={parseResult.fields.transaction?.id ?? ''}
                            onChange={(v) => updateEntityField('transaction', 'id', v)}
                            placeholder="Transaction ID"
                          />
                        </motion.div>
                      )}

                      {/* ─── Account CRUD ─── */}
                      {parseResult.intent.startsWith('account.') && parseResult.fields.account && (
                        <motion.div
                          className="rounded-2xl border border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 space-y-2.5"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          {parseResult.intent.endsWith('.delete') && (
                            <div className="flex items-start gap-2 rounded-xl bg-expense/[0.06] border border-expense/20 p-3">
                              <AlertTriangle className="h-4 w-4 text-expense mt-0.5 shrink-0" />
                              <p className="text-xs text-expense">This will permanently delete the account.</p>
                            </div>
                          )}
                          <StyledInput
                            value={parseResult.fields.account.id ?? ''}
                            onChange={(v) => updateEntityField('account', 'id', v)}
                            placeholder="Account ID (required for update/delete)"
                          />
                          {!parseResult.intent.endsWith('.delete') && (
                            <>
                              <StyledInput
                                value={parseResult.fields.account.name ?? ''}
                                onChange={(v) => updateEntityField('account', 'name', v)}
                                placeholder="Account name"
                              />
                              <StyledSelect
                                value={parseResult.fields.account.type ?? ''}
                                onChange={(v) => updateEntityField('account', 'type', v)}
                                placeholder="Select type"
                              >
                                <option value="cash" className="bg-surface-card text-navy-100">Cash</option>
                                <option value="mobile_banking" className="bg-surface-card text-navy-100">Mobile banking</option>
                                <option value="bank" className="bg-surface-card text-navy-100">Bank</option>
                                <option value="credit_card" className="bg-surface-card text-navy-100">Credit card</option>
                                <option value="loan" className="bg-surface-card text-navy-100">Loan</option>
                              </StyledSelect>
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* ─── Category CRUD ─── */}
                      {parseResult.intent.startsWith('category.') && parseResult.fields.category && (
                        <motion.div
                          className="rounded-2xl border border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 space-y-2.5"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          {parseResult.intent.endsWith('.delete') && (
                            <div className="flex items-start gap-2 rounded-xl bg-expense/[0.06] border border-expense/20 p-3">
                              <AlertTriangle className="h-4 w-4 text-expense mt-0.5 shrink-0" />
                              <p className="text-xs text-expense">This will permanently delete the category.</p>
                            </div>
                          )}
                          <StyledInput
                            value={parseResult.fields.category.id ?? ''}
                            onChange={(v) => updateEntityField('category', 'id', v)}
                            placeholder="Category ID (required for update/delete)"
                          />
                          {!parseResult.intent.endsWith('.delete') && (
                            <>
                              <StyledInput
                                value={parseResult.fields.category.name ?? ''}
                                onChange={(v) => updateEntityField('category', 'name', v)}
                                placeholder="Category name"
                              />
                              <StyledSelect
                                value={parseResult.fields.category.type ?? ''}
                                onChange={(v) => updateEntityField('category', 'type', v)}
                                placeholder="Select type"
                              >
                                <option value="expense" className="bg-surface-card text-navy-100">Expense</option>
                                <option value="income" className="bg-surface-card text-navy-100">Income</option>
                              </StyledSelect>
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* ─── Budget CRUD ─── */}
                      {parseResult.intent.startsWith('budget.') && parseResult.fields.budget && (
                        <motion.div
                          className="rounded-2xl border border-white/[0.06] bg-white/50 dark:bg-white/[0.02] p-4 space-y-2.5"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12 }}
                        >
                          {parseResult.intent.endsWith('.delete') && (
                            <div className="flex items-start gap-2 rounded-xl bg-expense/[0.06] border border-expense/20 p-3">
                              <AlertTriangle className="h-4 w-4 text-expense mt-0.5 shrink-0" />
                              <p className="text-xs text-expense">This will permanently delete the budget.</p>
                            </div>
                          )}
                          <StyledInput
                            value={parseResult.fields.budget.id ?? ''}
                            onChange={(v) => updateEntityField('budget', 'id', v)}
                            placeholder="Budget ID (required for update/delete)"
                          />
                          {!parseResult.intent.endsWith('.delete') && (
                            <>
                              <StyledInput
                                value={String(parseResult.fields.budget.amount ?? '')}
                                onChange={(v) => updateEntityField('budget', 'amount', v)}
                                placeholder="Budget amount"
                                type="number"
                              />
                              <StyledInput
                                value={parseResult.fields.budget.month ?? ''}
                                onChange={(v) => updateEntityField('budget', 'month', v)}
                                placeholder="Month (YYYY-MM)"
                              />
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* Missing Fields */}
                      {parseResult.missingFields.length > 0 && (
                        <motion.div
                          className="flex items-center gap-1.5 px-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                          <p className="text-[11px] text-warning-dark dark:text-warning">
                            Missing: {parseResult.missingFields.map((f) => f.split('.').pop()).join(', ')}
                          </p>
                        </motion.div>
                      )}

                      {/* Action Buttons */}
                      <motion.div
                        className="flex items-center gap-2 pt-1"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                      >
                        <button
                          type="button"
                          onClick={handleExecute}
                          disabled={executing}
                          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 ${
                            isDelete
                              ? 'bg-expense hover:bg-expense-dark shadow-lg shadow-expense/20'
                              : 'shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30'
                          }`}
                          style={!isDelete ? { background: 'linear-gradient(135deg, #06D6A0 0%, #118AB2 100%)' } : undefined}
                        >
                          {executing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {parseResult.intent === 'transaction.add' ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Confirm & Add
                                </>
                              ) : isDelete ? (
                                <>
                                  <AlertTriangle className="h-4 w-4" />
                                  Confirm Delete
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4" />
                                  Execute
                                </>
                              )}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setParseResult(null); setEditingField(null); }}
                          className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-navy-600 dark:text-navy-200 hover:bg-white/[0.08] transition-colors"
                        >
                          Reset
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── Idle State ─── */}
                {!parseResult && !parsing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {/* Example prompts per entity */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          label: 'Transaction',
                          count: transactions.length,
                          icon: CreditCard,
                          example: 'I spent 500 taka on food from cash today',
                          tooltip: 'Needs: amount, type (expense/income), category, account, description',
                        },
                        {
                          label: 'Account',
                          count: accounts.length,
                          icon: Wallet,
                          example: 'Add a cash account called Emergency Fund',
                          tooltip: 'Needs: name, type (cash/bank/mobile_banking/credit_card)',
                        },
                        {
                          label: 'Category',
                          count: categories.length,
                          icon: Tag,
                          example: 'Create an expense category called Groceries',
                          tooltip: 'Needs: name, type (expense/income)',
                        },
                        {
                          label: 'Budget',
                          count: budgets.length,
                          icon: PiggyBank,
                          example: 'Set a monthly budget of 5000 taka for food',
                          tooltip: 'Needs: amount, category, period (monthly/weekly/yearly)',
                        },
                      ].map((item, i) => (
                        <motion.button
                          type="button"
                          key={item.label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => { setInput(item.example); inputRef.current?.focus(); }}
                          title={item.tooltip}
                          className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-white/[0.06] bg-white/30 dark:bg-white/[0.02] px-3 py-2.5 text-left transition-all hover:border-primary-500/20 hover:bg-primary-500/[0.04]"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5">
                              <item.icon className="h-3.5 w-3.5 text-navy-400 dark:text-navy-300 group-hover:text-primary-500 transition-colors" />
                              <span className="text-xs font-semibold text-navy-700 dark:text-navy-200">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-navy-400 dark:text-navy-400">
                              {item.count}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug text-navy-400 dark:text-navy-400 group-hover:text-navy-600 dark:group-hover:text-navy-200 transition-colors line-clamp-2">
                            &ldquo;{item.example}&rdquo;
                          </p>
                          {/* Tooltip on hover — desktop only */}
                          <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hidden lg:block">
                            <div className="rounded-lg bg-navy-900 dark:bg-navy-800 px-2.5 py-1.5 text-[10px] text-white shadow-lg whitespace-nowrap">
                              {item.tooltip}
                            </div>
                            <div className="mx-auto h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-navy-900 dark:border-t-navy-800" />
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    <p className="text-[10px] text-navy-400/60 dark:text-navy-400/40 text-center">
                      Tap an example to try it, or type your own command
                    </p>
                  </motion.div>
                )}

                {/* Parsing state */}
                {parsing && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-8 gap-3"
                  >
                    <div className="relative">
                      <motion.div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(6,214,160,0.15), rgba(17,138,178,0.15))' }}
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="h-5 w-5 text-primary-500" />
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-navy-500 dark:text-navy-300">Parsing your command</span>
                      <ThinkingDots />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ─── Input Bar (pinned to bottom) ─── */}
              <div className="shrink-0 border-t border-gray-200/50 dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] px-4 py-3 safe-area-bottom">
                <div className="relative flex items-center gap-2">
                  {/* Glowing border wrapper */}
                  <div className="relative flex-1 group">
                    <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary-500/40 via-accent/40 to-primary-500/40 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-[1px]" />
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={parsing}
                      placeholder="Describe what you'd like to do..."
                      className="relative w-full rounded-xl border border-gray-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-4 py-2.5 pr-10 text-sm text-navy-800 dark:text-navy-50 placeholder:text-navy-400/50 dark:placeholder:text-navy-400/40 focus:outline-none focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {/* Voice button inside input */}
                    <button
                      type="button"
                      onClick={startVoice}
                      disabled={listening || parsing}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-navy-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title={listening ? 'Listening...' : 'Voice input'}
                    >
                      {listening ? <VoicePulse /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Send button */}
                  <motion.button
                    type="button"
                    onClick={handleParse}
                    disabled={parsing || !input.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #06D6A0 0%, #118AB2 100%)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    {parsing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
