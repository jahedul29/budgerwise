import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import {
  normalizeRecordForClient,
  normalizeRecordForServer,
  type SyncPullPayload,
  type SyncPushPayload,
  type SyncRecord,
  type SyncableTable,
} from '@/lib/sync-payload';

const tables: SyncableTable[] = ['transactions', 'categories', 'budgets', 'accounts'];

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function misconfigured() {
  return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
}

function userCollection(userKey: string, table: SyncableTable) {
  return adminDb!.collection('users').doc(userKey).collection(table);
}

export async function GET() {
  const session = await auth();
  const userKey = session?.user?.id;

  if (!userKey) {
    return unauthorized();
  }

  if (!isFirebaseAdminConfigured) {
    return misconfigured();
  }

  const data = {} as SyncPullPayload['data'];

  for (const table of tables) {
    const snapshot = await userCollection(userKey, table).get();
    data[table] = snapshot.docs.map((doc) =>
      normalizeRecordForClient<SyncRecord>({
        ...doc.data(),
        id: doc.id,
      })
    );
  }

  return NextResponse.json<SyncPullPayload>({ data });
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

  const body = await request.json() as SyncPushPayload;

  for (const table of tables) {
    const changes = body.changes?.[table];

    if (!changes) {
      continue;
    }

    for (const record of changes.create ?? []) {
      await userCollection(userKey, table)
        .doc(record.id)
        .set({
          ...normalizeRecordForServer(record),
          updatedAt: new Date().toISOString(),
        });
    }

    for (const record of changes.update ?? []) {
      await userCollection(userKey, table)
        .doc(record.id)
        .set({
          ...normalizeRecordForServer(record),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
    }

    for (const id of changes.delete ?? []) {
      await userCollection(userKey, table).doc(id).delete();
    }
  }

  return NextResponse.json({ ok: true });
}
