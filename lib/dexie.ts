import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, Budget, Account } from '@/types';

export class BudgetWiseDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  budgets!: Table<Budget>;
  accounts!: Table<Account>;

  constructor() {
    super('BudgetWiseDB');
    this.version(1).stores({
      transactions: 'id, type, categoryId, accountId, date, paymentMethod, syncStatus, _syncStatus',
      categories: 'id, type, isDefault, _syncStatus',
      budgets: 'id, categoryId, month, period, _syncStatus',
      accounts: 'id, type, _syncStatus',
    });
  }
}

export const localDb = new BudgetWiseDB();
