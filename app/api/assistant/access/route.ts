import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ enabled: false });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ enabled: false });
  }

  const doc = await adminDb.collection('users').doc(userId).get();
  const enabled = doc.exists ? Boolean(doc.data()?.aiAssistantEnabled) : false;

  return NextResponse.json({ enabled });
}
