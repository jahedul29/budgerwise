import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const usersSnap = await adminDb.collection('users').select(
    'aiAssistantEnabled', 'role', 'lastLoginAt',
  ).get();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalUsers = 0;
  let aiEnabledUsers = 0;
  let activeLastWeek = 0;
  let activeLastMonth = 0;
  let superadmins = 0;
  let admins = 0;
  let managers = 0;

  for (const doc of usersSnap.docs) {
    totalUsers += 1;
    const data = doc.data();

    if (data.aiAssistantEnabled) aiEnabledUsers += 1;

    if (data.role === 'superadmin') {
      superadmins += 1;
    } else if (data.role === 'admin') {
      admins += 1;
    } else if (data.role === 'manager') {
      managers += 1;
    }

    if (typeof data.lastLoginAt === 'string') {
      const lastLogin = new Date(data.lastLoginAt);
      if (!isNaN(lastLogin.getTime())) {
        if (lastLogin >= sevenDaysAgo) activeLastWeek += 1;
        if (lastLogin >= thirtyDaysAgo) activeLastMonth += 1;
      }
    }
  }

  return NextResponse.json({
    totalUsers,
    aiEnabledUsers,
    activeLastWeek,
    activeLastMonth,
    roles: { superadmins, admins, managers, users: totalUsers - superadmins - admins - managers },
  });
}
