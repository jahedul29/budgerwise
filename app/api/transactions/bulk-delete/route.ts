import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function misconfigured() {
  return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
}

function invalidRange() {
  return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
}

export async function POST(request: Request) {
  const session = await auth();
  const userKey = session?.user?.id;

  if (!userKey) {
    return unauthorized();
  }

  if (!isFirebaseAdminConfigured) {
    return misconfigured();
  }

  const body = await request.json().catch(() => null) as
    | { startDate?: string; endDate?: string }
    | null;

  const startDate = body?.startDate ? new Date(body.startDate) : null;
  const endDate = body?.endDate ? new Date(body.endDate) : null;

  if (
    !startDate ||
    !endDate ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    return invalidRange();
  }

  const transactionsRef = adminDb!.collection('users').doc(userKey).collection('transactions');
  const accountsRef = adminDb!.collection('users').doc(userKey).collection('accounts');
  const snapshot = await transactionsRef
    .where('date', '>=', startDate.toISOString())
    .where('date', '<=', endDate.toISOString())
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ ok: true, deletedCount: 0 });
  }

  const balanceAdjustments = new Map<string, number>();

  for (const doc of snapshot.docs) {
    const transaction = doc.data() as {
      accountId?: string;
      amount?: number;
      type?: string;
    };

    if (!transaction.accountId || typeof transaction.amount !== 'number') {
      continue;
    }

    const delta =
      transaction.type === 'expense'
        ? transaction.amount
        : transaction.type === 'income'
          ? -transaction.amount
          : 0;

    if (delta !== 0) {
      balanceAdjustments.set(
        transaction.accountId,
        (balanceAdjustments.get(transaction.accountId) ?? 0) + delta,
      );
    }
  }

  const updatedAt = new Date().toISOString();
  const accountSnapshots = balanceAdjustments.size > 0
    ? await Promise.all(
        Array.from(balanceAdjustments.keys()).map((accountId) =>
          accountsRef.doc(accountId).get(),
        ),
      )
    : [];
  const existingAccountIds = new Set(
    accountSnapshots.filter((doc) => doc.exists).map((doc) => doc.id),
  );

  let batch = adminDb!.batch();
  let batchOperations = 0;
  let batchCount = 0;

  const commitBatch = async () => {
    if (batchOperations === 0) {
      return;
    }

    await batch.commit();
    batch = adminDb!.batch();
    batchOperations = 0;
    batchCount += 1;
  };

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchOperations += 1;

    if (batchOperations >= 450) {
      await commitBatch();
    }
  }

  for (const [accountId, delta] of balanceAdjustments) {
    if (!existingAccountIds.has(accountId)) {
      continue;
    }

    batch.update(accountsRef.doc(accountId), {
      balance: FieldValue.increment(delta),
      updatedAt,
    });
    batchOperations += 1;

    if (batchOperations >= 450) {
      await commitBatch();
    }
  }

  await commitBatch();

  return NextResponse.json({
    ok: true,
    deletedCount: snapshot.size,
    batchCount,
  });
}
