import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getUserAiAccessState } from '@/lib/ai-usage';
import {
  assistantExecuteRequestSchema,
  assistantExecuteResultSchema,
} from '@/lib/assistant/schemas';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function misconfigured() {
  return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
}

function invalid(message: string, issues?: unknown) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();
  if (!isFirebaseAdminConfigured) return misconfigured();

  const accessState = await getUserAiAccessState(userId);
  if (!accessState.enabled) {
    return NextResponse.json({ error: 'AI assistant access not enabled' }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = assistantExecuteRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalid('Invalid request payload', parsed.error.issues);
  }

  if (!parsed.data.confirmed) {
    return invalid('Action must be confirmed before execution');
  }

  const [entity, operation] = parsed.data.intent.split('.') as [string, string];
  const nowIso = new Date().toISOString();
  const userRef = adminDb!.collection('users').doc(userId);

  if (parsed.data.intent === 'transaction.add') {
    const tx = parsed.data.fields.transaction;
    const requiresCategory = tx?.type !== 'transfer';
    if (!tx?.amount || !tx.type || !tx.accountId || !tx.description || (requiresCategory && !tx.categoryId)) {
      return invalid('Missing required transaction fields');
    }

    const [categoryDoc, accountDoc, transferAccountDoc] = await Promise.all([
      tx.type === 'transfer' ? null : userRef.collection('categories').doc(tx.categoryId!).get(),
      userRef.collection('accounts').doc(tx.accountId).get(),
      tx.type === 'transfer' && tx.transferAccountId
        ? userRef.collection('accounts').doc(tx.transferAccountId).get()
        : null,
    ]);

    if (tx.type === 'transfer') {
      if (!tx.transferAccountId) return invalid('Destination account is required for transfer');
      if (tx.transferAccountId === tx.accountId) return invalid('Source and destination accounts must be different');
      if (!transferAccountDoc?.exists) return invalid('Destination account not found');
    } else if (!categoryDoc?.exists) {
      return invalid('Category not found');
    }
    if (!accountDoc.exists) return invalid('Account not found');

    const category = categoryDoc?.data() as { name?: string; icon?: string; color?: string } | undefined;
    const transactionId = tx.id || crypto.randomUUID();
    const amount = tx.amount;

    await userRef.collection('transactions').doc(transactionId).set({
      id: transactionId,
      amount,
      type: tx.type,
      categoryId: tx.type === 'transfer' ? 'transfer' : tx.categoryId,
      categoryName: tx.type === 'transfer' ? 'Transfer' : (category?.name ?? tx.categoryName ?? 'Category'),
      categoryIcon: tx.type === 'transfer' ? '↔️' : (category?.icon ?? '📦'),
      categoryColor: tx.type === 'transfer' ? '#118AB2' : (category?.color ?? '#06D6A0'),
      accountId: tx.accountId,
      ...(tx.type === 'transfer'
        ? {
            transferAccountId: tx.transferAccountId,
            transferAccountName: (transferAccountDoc?.data() as { name?: string } | undefined)?.name ?? tx.transferAccountName ?? 'Account',
          }
        : {}),
      description: tx.description,
      notes: tx.notes ?? undefined,
      date: tx.dateIso ?? nowIso,
      tags: [],
      isRecurring: false,
      syncStatus: 'synced',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (tx.type === 'transfer' && tx.transferAccountId) {
      await Promise.all([
        userRef.collection('accounts').doc(tx.accountId).update({
          balance: FieldValue.increment(-amount),
          updatedAt: nowIso,
        }),
        userRef.collection('accounts').doc(tx.transferAccountId).update({
          balance: FieldValue.increment(amount),
          updatedAt: nowIso,
        }),
      ]);
    } else {
      const delta = tx.type === 'expense' ? -amount : tx.type === 'income' ? amount : 0;
      if (delta !== 0) {
        await userRef.collection('accounts').doc(tx.accountId).update({
          balance: FieldValue.increment(delta),
          updatedAt: nowIso,
        });
      }
    }

    return NextResponse.json(assistantExecuteResultSchema.parse({
      ok: true,
      entity,
      operation,
      message: tx.type === 'transfer' ? 'Transfer added' : 'Transaction added',
      affectedIds: tx.type === 'transfer' && tx.transferAccountId ? [transactionId, tx.accountId, tx.transferAccountId] : [transactionId, tx.accountId],
    }));
  }

  if (parsed.data.intent === 'transaction.update') {
    const tx = parsed.data.fields.transaction;
    if (!tx?.id) return invalid('transaction.id is required');

    const txDocRef = userRef.collection('transactions').doc(tx.id);
    const currentDoc = await txDocRef.get();
    if (!currentDoc.exists) return invalid('Transaction not found');

    const current = currentDoc.data() as {
      amount: number;
      type: string;
      accountId: string;
    };

    const nextType = tx.type ?? current.type;
    if (current.type === 'transfer' || nextType === 'transfer') {
      return invalid('Updating transfers is not supported by the assistant yet');
    }
    const nextAmount = tx.amount ?? current.amount;
    const nextAccountId = tx.accountId ?? current.accountId;
    if (tx.accountId) {
      const nextAccountDoc = await userRef.collection('accounts').doc(tx.accountId).get();
      if (!nextAccountDoc.exists) return invalid('Account not found');
    }
    if (tx.categoryId) {
      const nextCategoryDoc = await userRef.collection('categories').doc(tx.categoryId).get();
      if (!nextCategoryDoc.exists) return invalid('Category not found');
    }
    const oldDelta = current.type === 'expense' ? -current.amount : current.type === 'income' ? current.amount : 0;
    const newDelta = nextType === 'expense' ? -nextAmount : nextType === 'income' ? nextAmount : 0;

    await txDocRef.set({
      ...(tx.amount !== undefined ? { amount: tx.amount } : {}),
      ...(tx.type ? { type: tx.type } : {}),
      ...(tx.categoryId ? { categoryId: tx.categoryId } : {}),
      ...(tx.categoryName ? { categoryName: tx.categoryName } : {}),
      ...(tx.accountId ? { accountId: tx.accountId } : {}),
      ...(tx.dateIso ? { date: tx.dateIso } : {}),
      ...(tx.description ? { description: tx.description } : {}),
      ...(tx.notes !== undefined ? { notes: tx.notes } : {}),
      updatedAt: nowIso,
    }, { merge: true });

    if (current.accountId === nextAccountId) {
      const delta = newDelta - oldDelta;
      if (delta !== 0) {
        await userRef.collection('accounts').doc(nextAccountId).update({
          balance: FieldValue.increment(delta),
          updatedAt: nowIso,
        });
      }
    } else {
      if (oldDelta !== 0) {
        await userRef.collection('accounts').doc(current.accountId).update({
          balance: FieldValue.increment(-oldDelta),
          updatedAt: nowIso,
        });
      }
      if (newDelta !== 0) {
        await userRef.collection('accounts').doc(nextAccountId).update({
          balance: FieldValue.increment(newDelta),
          updatedAt: nowIso,
        });
      }
    }

    return NextResponse.json(assistantExecuteResultSchema.parse({
      ok: true,
      entity,
      operation,
      message: 'Transaction updated',
      affectedIds: [tx.id],
    }));
  }

  if (parsed.data.intent.startsWith('account.')) {
    const account = parsed.data.fields.account;
    const accountsRef = userRef.collection('accounts');
    if (parsed.data.intent === 'account.add') {
      if (!account?.name || !account.type) return invalid('Missing account fields');
      const id = account.id || crypto.randomUUID();
      await accountsRef.doc(id).set({
        id,
        name: account.name,
        type: account.type,
        balance: 0,
        currency: account.currency ?? 'BDT',
        color: account.color ?? '#06D6A0',
        icon: account.icon ?? '💵',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      return NextResponse.json(assistantExecuteResultSchema.parse({
        ok: true, entity, operation, message: 'Account added', affectedIds: [id],
      }));
    }
    if (!account?.id) return invalid('account.id is required');
    if (parsed.data.intent === 'account.update') {
      const existing = await accountsRef.doc(account.id).get();
      if (!existing.exists) return invalid('Account not found');
      await accountsRef.doc(account.id).set({
        ...(account.name ? { name: account.name } : {}),
        ...(account.type ? { type: account.type } : {}),
        ...(account.currency ? { currency: account.currency } : {}),
        ...(account.color ? { color: account.color } : {}),
        ...(account.icon ? { icon: account.icon } : {}),
        updatedAt: nowIso,
      }, { merge: true });
      return NextResponse.json(assistantExecuteResultSchema.parse({
        ok: true,
        entity,
        operation,
        message: 'Account updated',
        affectedIds: [account.id],
      }));
    }
    return invalid('Unsupported account action');
  }

  if (parsed.data.intent.startsWith('category.')) {
    const category = parsed.data.fields.category;
    const categoriesRef = userRef.collection('categories');
    if (parsed.data.intent === 'category.add') {
      if (!category?.name || !category.type) return invalid('Missing category fields');
      const id = category.id || crypto.randomUUID();
      await categoriesRef.doc(id).set({
        id,
        name: category.name,
        icon: category.icon ?? '📦',
        color: category.color ?? '#06D6A0',
        type: category.type,
        isDefault: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      return NextResponse.json(assistantExecuteResultSchema.parse({
        ok: true, entity, operation, message: 'Category added', affectedIds: [id],
      }));
    }
    if (!category?.id) return invalid('category.id is required');
    if (parsed.data.intent === 'category.update') {
      const existing = await categoriesRef.doc(category.id).get();
      if (!existing.exists) return invalid('Category not found');
      await categoriesRef.doc(category.id).set({
        ...(category.name ? { name: category.name } : {}),
        ...(category.icon ? { icon: category.icon } : {}),
        ...(category.color ? { color: category.color } : {}),
        ...(category.type ? { type: category.type } : {}),
        updatedAt: nowIso,
      }, { merge: true });
      return NextResponse.json(assistantExecuteResultSchema.parse({
        ok: true, entity, operation, message: 'Category updated', affectedIds: [category.id],
      }));
    }
    return invalid('Unsupported category action');
  }

  if (parsed.data.intent.startsWith('budget.')) {
    const budget = parsed.data.fields.budget;
    const budgetsRef = userRef.collection('budgets');
    if (parsed.data.intent === 'budget.add') {
      if (!budget?.categoryId || !budget.amount || !budget.period || !budget.month) {
        return invalid('Missing budget fields');
      }
      const categoryDoc = await userRef.collection('categories').doc(budget.categoryId).get();
      const category = categoryDoc.data() as { name?: string } | undefined;
      const id = budget.id || crypto.randomUUID();
      await budgetsRef.doc(id).set({
        id,
        categoryId: budget.categoryId,
        categoryName: category?.name ?? budget.categoryName ?? 'Category',
        amount: budget.amount,
        period: budget.period,
        month: budget.month,
        alertThreshold: budget.alertThreshold ?? 80,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      return NextResponse.json(assistantExecuteResultSchema.parse({
        ok: true, entity, operation, message: 'Budget added', affectedIds: [id],
      }));
    }
    if (!budget?.id) return invalid('budget.id is required');
    if (parsed.data.intent === 'budget.update') {
      const existing = await budgetsRef.doc(budget.id).get();
      if (!existing.exists) return invalid('Budget not found');
      if (budget.categoryId) {
        const categoryDoc = await userRef.collection('categories').doc(budget.categoryId).get();
        if (!categoryDoc.exists) return invalid('Category not found');
      }
      await budgetsRef.doc(budget.id).set({
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
        ...(budget.categoryName ? { categoryName: budget.categoryName } : {}),
        ...(budget.amount !== undefined ? { amount: budget.amount } : {}),
        ...(budget.period ? { period: budget.period } : {}),
        ...(budget.month ? { month: budget.month } : {}),
        ...(budget.alertThreshold !== undefined ? { alertThreshold: budget.alertThreshold } : {}),
        updatedAt: nowIso,
      }, { merge: true });
      return NextResponse.json(assistantExecuteResultSchema.parse({
        ok: true, entity, operation, message: 'Budget updated', affectedIds: [budget.id],
      }));
    }
    return invalid('Unsupported budget action');
  }

  return invalid('Unsupported intent');
}
