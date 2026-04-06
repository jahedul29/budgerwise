'use client';
import { localDb } from './dexie';
import {
  normalizeRecordForClient,
  normalizeRecordForServer,
  type SyncPullPayload,
  type SyncPushPayload,
  type SyncableTable,
} from './sync-payload';

export class SyncEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 15000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  }

  private async request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? `Sync request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async syncAll(): Promise<void> {
    await this.withTimeout(this.pushChanges(), 'Push sync');
    await this.withTimeout(this.pullChanges(), 'Pull sync');
  }

  async pushChanges(): Promise<void> {
    const tables: SyncableTable[] = ['transactions', 'categories', 'budgets', 'accounts'];
    const changes = {} as SyncPushPayload['changes'];

    for (const tableName of tables) {
      const table = localDb[tableName];

      // Push creates
      const pendingCreates = await table
        .where('_syncStatus')
        .equals('pending_create')
        .toArray();

      // Push updates
      const pendingUpdates = await table
        .where('_syncStatus')
        .equals('pending_update')
        .toArray();

      // Push deletes
      const pendingDeletes = await table
        .where('_syncStatus')
        .equals('pending_delete')
        .toArray();

      changes[tableName] = {
        create: pendingCreates.map((record) => normalizeRecordForServer(record)),
        update: pendingUpdates.map((record) => normalizeRecordForServer(record)),
        delete: pendingDeletes.map((record) => record.id),
      };
    }

    const hasChanges = tables.some((tableName) =>
      changes[tableName].create.length > 0 ||
      changes[tableName].update.length > 0 ||
      changes[tableName].delete.length > 0
    );

    if (!hasChanges) {
      return;
    }

    await this.request('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });

    for (const tableName of tables) {
      const table = localDb[tableName];

      for (const record of changes[tableName].create) {
        await table.update((record as { id: string }).id, { _syncStatus: 'synced', syncStatus: 'synced' } as never);
      }

      for (const record of changes[tableName].update) {
        await table.update((record as { id: string }).id, { _syncStatus: 'synced', syncStatus: 'synced' } as never);
      }

      for (const id of changes[tableName].delete) {
        await table.delete(id);
      }
    }
  }

  async pullChanges(): Promise<void> {
    const tables: SyncableTable[] = ['transactions', 'categories', 'budgets', 'accounts'];
    const response = await this.request<SyncPullPayload>('/api/sync');

    for (const tableName of tables) {
      const table = localDb[tableName];
      const remoteRecords = response.data[tableName] ?? [];

      for (const remoteRecord of remoteRecords) {
        const remote = normalizeRecordForClient(remoteRecord as unknown as Record<string, unknown>);
        const local = await table.get((remote as { id: string }).id);
        if (!local) {
          await table.add(remote as never);
        } else if (local._syncStatus === 'synced') {
          await table.put(remote as never);
        }
      }
    }
  }
}
