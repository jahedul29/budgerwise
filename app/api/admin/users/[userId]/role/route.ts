import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

const VALID_ROLES = ['superadmin', 'admin', 'manager', 'user'] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized — superadmin access required' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const { userId } = await params;

  // Can't change own role
  if (session.user.email?.trim().toLowerCase() === userId.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role. Must be: superadmin, admin, manager, or user' }, { status: 400 });
  }

  const userRef = adminDb.collection('users').doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await userRef.update({
    role: body.role,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, userId, role: body.role });
}
