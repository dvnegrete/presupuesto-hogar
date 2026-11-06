import {
  createCreditCard,
  createFixedExpense,
  createFixedIncome,
  createInstallmentPurchase,
  createPerson,
  createVariableExpense,
  createVariableIncome,
  type Entity,
} from '@domain/entities';
import { DomainError } from '@domain/errors/DomainError';
import type { Repositories, Repository, RepositoryKey } from '@domain/ports';
import type { BudgetData } from '@domain/services/BudgetCalculator';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  readonly app: 'presupuesto-hogar';
  readonly version: number;
  readonly exportedAt: string;
  readonly data: BudgetData;
}

/** Fábrica de validación por colección: al importar se revalida todo con las reglas del dominio. */
const FACTORIES: { [K in RepositoryKey]: (props: never) => Entity } = {
  people: createPerson,
  cards: createCreditCard,
  purchases: createInstallmentPurchase,
  fixedIncomes: createFixedIncome,
  variableIncomes: createVariableIncome,
  fixedExpenses: createFixedExpense,
  variableExpenses: createVariableExpense,
};

const KEYS = Object.keys(FACTORIES) as RepositoryKey[];

export class ExportBackup {
  constructor(private readonly loadData: () => Promise<BudgetData>) {}

  async execute(now: Date = new Date()): Promise<BackupFile> {
    return { app: 'presupuesto-hogar', version: BACKUP_VERSION, exportedAt: now.toISOString(), data: await this.loadData() };
  }
}

/** Reemplaza todos los datos por los del respaldo, validando antes de escribir nada. */
export class ImportBackup {
  constructor(private readonly repos: Repositories) {}

  async execute(raw: unknown): Promise<void> {
    const file = raw as Partial<BackupFile>;
    if (file?.app !== 'presupuesto-hogar' || typeof file.data !== 'object' || file.data === null) {
      throw new DomainError('El archivo no es un respaldo de esta app');
    }
    if ((file.version ?? 0) > BACKUP_VERSION) throw new DomainError('El respaldo es de una versión más nueva de la app');

    const data = file.data as unknown as Record<RepositoryKey, unknown>;
    const validated = Object.fromEntries(
      KEYS.map((key) => {
        const items = Array.isArray(data[key]) ? (data[key] as never[]) : [];
        return [key, items.map((item) => FACTORIES[key](item))];
      }),
    ) as Record<RepositoryKey, Entity[]>;

    await Promise.all(KEYS.map((key) => (this.repos[key] as unknown as Repository<Entity>).replaceAll(validated[key])));
  }
}
