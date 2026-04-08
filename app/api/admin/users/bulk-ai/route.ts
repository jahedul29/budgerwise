import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import {
  normalizeAdminUserRecord,
  userMatchesFilters,
  type AdminUserFilters,
} from '@/lib/admin-user-filters';

interface BulkBody {
  enabled?: boolean;
  filters?: AdminUserFilters;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as BulkBody | null;
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
  }

  const filters: AdminUserFilters = {
    q: body?.filters?.q?.trim() ?? '',
    aiStatus:
      body?.filters?.aiStatus === 'enabled' || body?.filters?.aiStatus === 'disabled'
        ? body.filters.aiStatus
        : 'all',
    createdFrom: body?.filters?.createdFrom || undefined,
    createdTo: body?.filters?.createdTo || undefined,
    activeWithinDays:
      typeof body?.filters?.activeWithinDays === 'number' && body.filters.activeWithinDays > 0
        ? Math.floor(body.filters.activeWithinDays)
        : undefined,
  };

  const maxUpdates = 1000;
  const usersRef = adminDb.collection('users');
  const nowIso = new Date().toISOString();

  let scanned = 0;
  let updated = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let truncated = false;

  while (updated < maxUpdates) {
    let query = usersRef.orderBy('__name__').limit(250);
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = adminDb.batch();
    let writesInBatch = 0;

    for (const doc of snapshot.docs) {
      scanned += 1;
      const normalized = normalizeAdminUserRecord({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      });

      if (!userMatchesFilters(normalized, filters)) continue;
      if (normalized.aiAssistantEnabled === body.enabled) continue;

      batch.update(doc.ref, {
        aiAssistantEnabled: body.enabled,
        updatedAt: nowIso,
      });
      writesInBatch += 1;
      updated += 1;

      if (updated >= maxUpdates) {
        truncated = true;
        break;
      }
    }

    if (writesInBatch > 0) {
      await batch.commit();
    }

    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (!cursor || snapshot.size < 250) break;
    if (truncated) break;
  }

  return NextResponse.json({
    ok: true,
    updated,
    scanned,
    truncated,
    maxUpdates,
    enabled: body.enabled,
  });
}
