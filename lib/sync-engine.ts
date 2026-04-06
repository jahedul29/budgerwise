'use client';
import { localDb } from './dexie';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import type { Transaction, Category, Budget, Account } from '@/types';

type SyncableTable = 'transactions' | 'categories' | 'budgets' | 'accounts';

export class SyncEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private getCollectionRef(tableName: SyncableTable) {
    return collection(db, 'users', this.userId, tableName);
  }

  async syncAll(): Promise<void> {
    await this.pushChanges();
    await this.pullChanges();
  }

  async pushChanges(): Promise<void> {
    const tables: SyncableTable[] = ['transactions', 'categories', 'budgets', 'accounts'];

    for (const tableName of tables) {
      const table = localDb[tableName];

      // Push creates
      const pendingCreates = await table
        .where('_syncStatus')
        .equals('pending_create')
        .toArray();
      for (const record of pendingCreates) {
        try {
          const docRef = doc(this.getCollectionRef(tableName), record.id);
          const { _syncStatus, ...data } = record as any;
          await setDoc(docRef, {
            ...data,
            date: data.date ? Timestamp.fromDate(new Date(data.date)) : null,
            createdAt: Timestamp.fromDate(new Date(data.createdAt)),
            updatedAt: data.updatedAt ? Timestamp.fromDate(new Date(data.updatedAt)) : null,
          });
          await table.update(record.id, { _syncStatus: 'synced', syncStatus: 'synced' } as any);
        } catch (error) {
          console.error(`Failed to sync create for ${tableName}:`, error);
        }
      }

      // Push updates
      const pendingUpdates = await table
        .where('_syncStatus')
        .equals('pending_update')
        .toArray();
      for (const record of pendingUpdates) {
        try {
          const docRef = doc(this.getCollectionRef(tableName), record.id);
          const { _syncStatus, ...data } = record as any;
          await setDoc(docRef, {
            ...data,
            date: data.date ? Timestamp.fromDate(new Date(data.date)) : null,
            createdAt: Timestamp.fromDate(new Date(data.createdAt)),
            updatedAt: data.updatedAt ? Timestamp.fromDate(new Date(data.updatedAt)) : null,
          }, { merge: true });
          await table.update(record.id, { _syncStatus: 'synced', syncStatus: 'synced' } as any);
        } catch (error) {
          console.error(`Failed to sync update for ${tableName}:`, error);
        }
      }

      // Push deletes
      const pendingDeletes = await table
        .where('_syncStatus')
        .equals('pending_delete')
        .toArray();
      for (const record of pendingDeletes) {
        try {
          const docRef = doc(this.getCollectionRef(tableName), record.id);
          await deleteDoc(docRef);
          await table.delete(record.id);
        } catch (error) {
          console.error(`Failed to sync delete for ${tableName}:`, error);
        }
      }
    }
  }

  async pullChanges(): Promise<void> {
    const tables: SyncableTable[] = ['transactions', 'categories', 'budgets', 'accounts'];

    for (const tableName of tables) {
      try {
        const snapshot = await getDocs(this.getCollectionRef(tableName));
        const remoteRecords = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate?.() || data.date,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            _syncStatus: 'synced',
          };
        });

        const table = localDb[tableName];
        for (const remote of remoteRecords) {
          const local = await table.get(remote.id);
          if (!local) {
            await table.add(remote as any);
          } else if (local._syncStatus === 'synced') {
            // Only overwrite if local hasn't been modified
            await table.put(remote as any);
          }
          // If local has pending changes, keep local version (last-write-wins on next push)
        }
      } catch (error) {
        console.error(`Failed to pull ${tableName}:`, error);
      }
    }
  }
}
