import type {
  CreditCard,
  Entity,
  FixedExpense,
  FixedIncome,
  InstallmentPurchase,
  Person,
  VariableExpense,
  VariableIncome,
} from '../entities';

/** Puerto de persistencia genérico. Los adaptadores (IndexedDB, API REST, memoria) lo implementan. */
export interface Repository<T extends Entity> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | undefined>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  replaceAll(entities: readonly T[]): Promise<void>;
}

/** Agrupa los repositorios por agregado. Cada caso de uso depende solo de los que necesita. */
export interface Repositories {
  readonly people: Repository<Person>;
  readonly cards: Repository<CreditCard>;
  readonly purchases: Repository<InstallmentPurchase>;
  readonly fixedIncomes: Repository<FixedIncome>;
  readonly variableIncomes: Repository<VariableIncome>;
  readonly fixedExpenses: Repository<FixedExpense>;
  readonly variableExpenses: Repository<VariableExpense>;
}

export type RepositoryKey = keyof Repositories;

export interface IdGenerator {
  next(): string;
}
