import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { startUserAiTrial } from '@/lib/ai-usage';

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  try {
    const access = await startUserAiTrial(userId);
    return NextResponse.json(access);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start free trial' },
      { status: 400 },
    );
  }
}
