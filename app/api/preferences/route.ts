import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

function userPrefsDoc(userId: string) {
  return adminDb!.collection('users').doc(userId).collection('settings').doc('preferences');
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isFirebaseAdminConfigured) return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });

  const doc = await userPrefsDoc(userId).get();
  const data = doc.exists ? doc.data() : {};
  return NextResponse.json({ preferences: data ?? {} });
}

export async function PUT(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isFirebaseAdminConfigured) return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });

  const body = await request.json() as Record<string, unknown>;
  await userPrefsDoc(userId).set(body, { merge: true });
  return NextResponse.json({ ok: true });
}
