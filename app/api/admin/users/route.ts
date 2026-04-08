import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import {
  decodeCursor,
  encodeCursor,
  getSortValue,
  normalizeAdminUserRecord,
  parseAdminUserListParams,
  userMatchesFilters,
} from '@/lib/admin-user-filters';

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const { limit, cursor, sortField, sortDirection, filters } = parseAdminUserListParams(url);

  try {
    const usersCollection = adminDb.collection('users');
    let query = usersCollection
      .orderBy(sortField, sortDirection)
      .orderBy('__name__', sortDirection);

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded.id) {
        query = query.startAfter(decoded.sortValue, decoded.id);
      }
    }

    const maxScan = 1200;
    const batchSize = 200;
    let scanned = 0;
    const matched: Array<{
      id: string;
      name?: string;
      email?: string;
      avatar?: string;
      aiAssistantEnabled: boolean;
      createdAt?: string;
      lastLoginAt?: string;
      sortValue: string;
    }> = [];
    let hasMore = false;
    let exhausted = false;

    while (!exhausted && scanned < maxScan && matched.length < limit + 1) {
      const snapshot = await query.limit(batchSize).get();
      if (snapshot.empty) {
        exhausted = true;
        break;
      }

      for (const doc of snapshot.docs) {
        scanned += 1;
        const normalized = normalizeAdminUserRecord({
          id: doc.id,
          ...(doc.data() as Record<string, unknown>),
        });
        if (userMatchesFilters(normalized, filters)) {
          matched.push({
            ...normalized,
            sortValue: getSortValue(normalized, sortField),
          });
          if (matched.length >= limit + 1) break;
        }
      }

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (!lastDoc || snapshot.size < batchSize) {
        exhausted = true;
      } else {
        query = usersCollection
          .orderBy(sortField, sortDirection)
          .orderBy('__name__', sortDirection)
          .startAfter(lastDoc.get(sortField) ?? '', lastDoc.id);
      }
    }

    if (matched.length > limit) {
      hasMore = true;
    }

    const users = matched.slice(0, limit).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      aiAssistantEnabled: user.aiAssistantEnabled,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));

    const lastVisible = users[users.length - 1];
    const nextCursor = hasMore && lastVisible
      ? encodeCursor({
          sortValue: getSortValue(lastVisible, sortField),
          id: lastVisible.id,
        })
      : null;

    return NextResponse.json({
      users,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
      meta: {
        scanned,
        maxScanReached: scanned >= maxScan,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list users' },
      { status: 500 },
    );
  }
}
