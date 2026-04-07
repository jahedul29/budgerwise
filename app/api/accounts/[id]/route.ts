import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function misconfigured() {
  return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const session = await auth();
  const userKey = session?.user?.id;

  if (!userKey) {
    return unauthorized();
  }

  if (!isFirebaseAdminConfigured) {
    return misconfigured();
  }

  const accountId = context.params.id;
  if (!accountId) {
    return NextResponse.json({ error: 'Account id is required' }, { status: 400 });
  }

  await adminDb!
    .collection('users')
    .doc(userKey)
    .collection('accounts')
    .doc(accountId)
    .delete();

  return NextResponse.json({ ok: true });
}
