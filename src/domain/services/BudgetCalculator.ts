import type {
  CreditCard,
  FixedExpense,
  FixedIncome,
  InstallmentPurchase,
  Person,
  VariableExpense,
  VariableIncome,
} from '../entities';
import { Money } from '../value-objects/Money';
import type { YearMonth } from '../value-objects/YearMonth';
import { IncomeSchedule } from './IncomeSchedule';
import { InstallmentScheduler } from './InstallmentScheduler';

/** Todo lo que el cálculo necesita; el dominio no sabe de dónde viene. */
export interface BudgetData {
  readonly people: readonly Person[];
  readonly cards: readonly CreditCard[];
  readonly purchases: readonly InstallmentPurchase[];
  readonly fixedIncomes: readonly FixedIncome[];
  readonly variableIncomes: readonly VariableIncome[];
  readonly fixedExpenses: readonly FixedExpense[];
  readonly variableExpenses: readonly VariableExpense[];
}

export interface IncomeLine {
  readonly id: string;
  readonly label: string;
  readonly kind: 'fixed' | 'variable';
  /** Número de pagos en el mes (quincenas, semanas…). 1 para variables. */
  readonly occurrences: number;
  readonly amountCents: number;
}

export interface PersonIncome {
  readonly personId: string;
  readonly personName: string;
  readonly fixedCents: number;
  readonly variableCents: number;
  readonly totalCents: number;
  readonly lines: readonly IncomeLine[];
}

export interface ExpenseLine {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly amountCents: number;
  readonly date?: string;
}

export interface InstallmentLine {
  readonly purchaseId: string;
  readonly description: string;
  readonly number: number;
  readonly of: number;
  readonly amountCents: number;
  readonly isLast: boolean;
}

export interface CardInstallments {
  readonly cardId: string;
  readonly cardName: string;
  readonly dueDate: string;
  readonly totalCents: number;
  readonly lines: readonly InstallmentLine[];
}

export interface CategoryTotal {
  readonly category: string;
  readonly amountCents: number;
}

export interface MonthlySummary {
  readonly month: string;
  readonly incomes: { readonly byPerson: readonly PersonIncome[]; readonly totalCents: number };
  readonly expenses: {
    readonly fixed: readonly ExpenseLine[];
    readonly variable: readonly ExpenseLine[];
    readonly installmentsByCard: readonly CardInstallments[];
    readonly fixedCents: number;
    readonly variableCents: number;
    readonly installmentsCents: number;
    readonly totalCents: number;
    readonly byCategory: readonly CategoryTotal[];
  };
  /** Ingresos − gastos. Lo que queda a fin de mes. */
  readonly balanceCents: number;
  /** Mensualidades que se liquidan este mes: dinero que se libera a partir del siguiente. */
  readonly releasedNextMonthCents: number;
}

export const INSTALLMENTS_CATEGORY = 'Meses sin intereses';

const total = (items: readonly { amountCents: number }[]): number =>
  Money.sum(items.map((i) => Money.fromCents(i.amountCents))).cents;

const inMonth = (isoDate: string, month: YearMonth): boolean => isoDate.startsWith(`${month.toKey()}-`);

export class BudgetCalculator {
  constructor(
    private readonly incomeSchedule = new IncomeSchedule(),
    private readonly installmentScheduler = new InstallmentScheduler(),
  ) {}

  calculate(month: YearMonth, data: BudgetData): MonthlySummary {
    const incomes = this.incomes(month, data);
    const fixed = this.fixedExpenses(month, data.fixedExpenses);
    const variable = data.variableExpenses
      .filter((e) => inMonth(e.date, month))
      .map((e) => ({ id: e.id, label: e.description, category: e.category, amountCents: e.amountCents, date: e.date }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const installmentsByCard = this.installments(month, data);

    const fixedCents = total(fixed);
    const variableCents = total(variable);
    const installmentsCents = installmentsByCard.reduce((acc, c) => acc + c.totalCents, 0);
    const expensesCents = fixedCents + variableCents + installmentsCents;

    return {
      month: month.toKey(),
      incomes,
      expenses: {
        fixed,
        variable,
        installmentsByCard,
        fixedCents,
        variableCents,
        installmentsCents,
        totalCents: expensesCents,
        byCategory: this.byCategory([...fixed, ...variable], installmentsCents),
      },
      balanceCents: incomes.totalCents - expensesCents,
      releasedNextMonthCents: installmentsByCard
        .flatMap((c) => c.lines)
        .filter((l) => l.isLast)
        .reduce((acc, l) => acc + l.amountCents, 0),
    };
  }

  /** Resumen de `count` meses a partir de `from` (útil para ver compromisos a futuro). */
  project(from: YearMonth, count: number, data: BudgetData): MonthlySummary[] {
    return Array.from({ length: count }, (_, i) => this.calculate(from.plus(i), data));
  }

  private incomes(month: YearMonth, data: BudgetData): MonthlySummary['incomes'] {
    const byPerson = data.people.map<PersonIncome>((person) => {
      const fixedLines = data.fixedIncomes
        .filter((inc) => inc.personId === person.id)
        .map<IncomeLine>((inc) => {
          const occurrences = this.incomeSchedule.paymentDates(inc, month).length;
          return {
            id: inc.id,
            label: inc.name,
            kind: 'fixed',
            occurrences,
            amountCents: Money.fromCents(inc.amountCents).multiply(occurrences).cents,
          };
        })
        .filter((l) => l.occurrences > 0);
      const variableLines = data.variableIncomes
        .filter((inc) => inc.personId === person.id && inMonth(inc.date, month))
        .map<IncomeLine>((inc) => ({ id: inc.id, label: inc.description, kind: 'variable', occurrences: 1, amountCents: inc.amountCents }));

      const fixedCents = total(fixedLines);
      const variableCents = total(variableLines);
      return {
        personId: person.id,
        personName: person.name,
        fixedCents,
        variableCents,
        totalCents: fixedCents + variableCents,
        lines: [...fixedLines, ...variableLines],
      };
    });
    return { byPerson, totalCents: byPerson.reduce((acc, p) => acc + p.totalCents, 0) };
  }

  private fixedExpenses(month: YearMonth, expenses: readonly FixedExpense[]): ExpenseLine[] {
    const key = month.toKey();
    return expenses
      .filter((e) => e.startMonth <= key && (!e.endMonth || key <= e.endMonth))
      .map((e) => ({ id: e.id, label: e.name, category: e.category, amountCents: e.amountCents }));
  }

  private installments(month: YearMonth, data: BudgetData): CardInstallments[] {
    return data.cards
      .map<CardInstallments | null>((card) => {
        const due = data.purchases
          .filter((p) => p.cardId === card.id)
          .flatMap((p) =>
            this.installmentScheduler.dueIn(p, card, month).map<InstallmentLine & { dueDate: string }>((inst) => ({
              purchaseId: p.id,
              description: p.description,
              number: inst.number,
              of: inst.of,
              amountCents: inst.amount.cents,
              isLast: inst.number === inst.of,
              dueDate: inst.dueDate.toISO(),
            })),
          );
        if (due.length === 0) return null;
        return {
          cardId: card.id,
          cardName: card.name,
          dueDate: due[0].dueDate,
          totalCents: total(due),
          lines: due.map<InstallmentLine>((l) => ({
            purchaseId: l.purchaseId,
            description: l.description,
            number: l.number,
            of: l.of,
            amountCents: l.amountCents,
            isLast: l.isLast,
          })),
        };
      })
      .filter((c): c is CardInstallments => c !== null);
  }

  private byCategory(lines: readonly ExpenseLine[], installmentsCents: number): CategoryTotal[] {
    const map = new Map<string, number>();
    for (const l of lines) map.set(l.category, (map.get(l.category) ?? 0) + l.amountCents);
    if (installmentsCents > 0) map.set(INSTALLMENTS_CATEGORY, (map.get(INSTALLMENTS_CATEGORY) ?? 0) + installmentsCents);
    return [...map.entries()]
      .map(([category, amountCents]) => ({ category, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents);
  }
}
