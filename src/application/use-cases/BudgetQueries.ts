import type { Repositories } from '@domain/ports';
import type { BudgetCalculator, BudgetData, MonthlySummary } from '@domain/services/BudgetCalculator';
import type { InstallmentScheduler } from '@domain/services/InstallmentScheduler';
import { YearMonth } from '@domain/value-objects/YearMonth';

/** Lee el estado completo del presupuesto desde los repositorios. */
export class LoadBudgetData {
  constructor(private readonly repos: Repositories) {}

  async execute(): Promise<BudgetData> {
    const [people, cards, purchases, fixedIncomes, variableIncomes, fixedExpenses, variableExpenses] = await Promise.all([
      this.repos.people.findAll(),
      this.repos.cards.findAll(),
      this.repos.purchases.findAll(),
      this.repos.fixedIncomes.findAll(),
      this.repos.variableIncomes.findAll(),
      this.repos.fixedExpenses.findAll(),
      this.repos.variableExpenses.findAll(),
    ]);
    const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es');
    return {
      people: people.sort(byName),
      cards: cards.sort(byName),
      purchases: purchases.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
      fixedIncomes,
      variableIncomes: variableIncomes.sort((a, b) => b.date.localeCompare(a.date)),
      fixedExpenses: fixedExpenses.sort(byName),
      variableExpenses: variableExpenses.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }
}

export class GetMonthlySummary {
  constructor(private readonly calculator: BudgetCalculator) {}

  execute(month: string, data: BudgetData): MonthlySummary {
    return this.calculator.calculate(YearMonth.parse(month), data);
  }
}

export interface PurchaseStatus {
  readonly purchaseId: string;
  readonly installmentCents: number;
  /** Mensualidades con fecha de pago hasta el mes consultado (inclusive). */
  readonly paidCount: number;
  readonly remainingCents: number;
  readonly firstDueDate: string;
  readonly lastDueDate: string;
  readonly nextDueDate?: string;
}

/** Estado de cada compra a MSI visto desde un mes: cuánto llevas pagado y cuánto falta. */
export class GetPurchaseStatuses {
  constructor(private readonly scheduler: InstallmentScheduler) {}

  execute(month: string, data: BudgetData): Map<string, PurchaseStatus> {
    const key = YearMonth.parse(month).toKey();
    const cards = new Map(data.cards.map((c) => [c.id, c]));
    const result = new Map<string, PurchaseStatus>();
    for (const p of data.purchases) {
      const card = cards.get(p.cardId);
      if (!card) continue;
      const schedule = this.scheduler.schedule(p, card);
      const paid = schedule.filter((i) => i.dueDate.yearMonth.toKey() <= key);
      const pending = schedule.slice(paid.length);
      result.set(p.id, {
        purchaseId: p.id,
        installmentCents: schedule[schedule.length - 1].amount.cents,
        paidCount: paid.length,
        remainingCents: pending.reduce((acc, i) => acc + i.amount.cents, 0),
        firstDueDate: schedule[0].dueDate.toISO(),
        lastDueDate: schedule[schedule.length - 1].dueDate.toISO(),
        nextDueDate: pending[0]?.dueDate.toISO(),
      });
    }
    return result;
  }
}

export class GetProjection {
  constructor(private readonly calculator: BudgetCalculator) {}

  execute(fromMonth: string, months: number, data: BudgetData): MonthlySummary[] {
    return this.calculator.project(YearMonth.parse(fromMonth), months, data);
  }
}
