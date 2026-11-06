import { openDB, type IDBPDatabase } from 'idb';
import type { Entity } from '@domain/entities';
import type { Repositories, RepositoryKey, Repository } from '@domain/ports';

const DB_NAME = 'presupuesto-hogar';
const DB_VERSION = 1;
const STORES: readonly RepositoryKey[] = [
  'people',
  'cards',
  'purchases',
  'fixedIncomes',
  'variableIncomes',
  'fixedExpenses',
  'variableExpenses',
];

export const openBudgetDatabase = (name = DB_NAME): Promise<IDBPDatabase> =>
  openDB(name, DB_VERSION, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
      }
    },
  });

/** Adaptador de persistencia local en el navegador (un object store por agregado). */
export class IndexedDbRepository<T extends Entity> implements Repository<T> {
  constructor(
    private readonly db: Promise<IDBPDatabase>,
    private readonly store: RepositoryKey,
  ) {}

  async findAll(): Promise<T[]> {
    return (await this.db).getAll(this.store);
  }

  async findById(id: string): Promise<T | undefined> {
    return (await this.db).get(this.store, id);
  }

  async save(entity: T): Promise<void> {
    await (await this.db).put(this.store, entity);
  }

  async delete(id: string): Promise<void> {
    await (await this.db).delete(this.store, id);
  }

  async replaceAll(entities: readonly T[]): Promise<void> {
    const tx = (await this.db).transaction(this.store, 'readwrite');
    await tx.store.clear();
    await Promise.all(entities.map((e) => tx.store.put(e)));
    await tx.done;
  }
}

export const createIndexedDbRepositories = (dbName?: string): Repositories => {
  const db = openBudgetDatabase(dbName);
  const repo = <T extends Entity>(store: RepositoryKey) => new IndexedDbRepository<T>(db, store);
  return {
    people: repo('people'),
    cards: repo('cards'),
    purchases: repo('purchases'),
    fixedIncomes: repo('fixedIncomes'),
    variableIncomes: repo('variableIncomes'),
    fixedExpenses: repo('fixedExpenses'),
    variableExpenses: repo('variableExpenses'),
  };
};
