/**
 * Entidades del dominio como datos planos e inmutables (serializables tal cual por cualquier adaptador
 * de persistencia). Las invariantes se garantizan en las fábricas `create*`, que son el único
 * punto de entrada para construir una entidad válida.
 * Los montos se guardan en centavos enteros.
 */
import { assert } from '../errors/DomainError';
import { CalendarDate } from '../value-objects/CalendarDate';
import { YearMonth } from '../value-objects/YearMonth';

export interface Entity {
  readonly id: string;
}

const required = (value: string | undefined, field: string): string => {
  const trimmed = (value ?? '').trim();
  assert(trimmed.length > 0, `${field} es obligatorio`);
  return trimmed;
};

const positiveCents = (cents: number, field: string): number => {
  assert(Number.isInteger(cents) && cents > 0, `${field} debe ser mayor a 0`);
  return cents;
};

const validDay = (day: number, field: string): number => {
  assert(Number.isInteger(day) && day >= 1 && day <= 31, `${field} debe estar entre 1 y 31`);
  return day;
};

const isoDate = (value: string, field: string): string => CalendarDate.parse(required(value, field)).toISO();
const monthKey = (value: string, field: string): string => YearMonth.parse(required(value, field)).toKey();

// ── Personas que aportan ingresos ───────────────────────────────────────────
export interface Person extends Entity {
  readonly name: string;
}

export const createPerson = (props: Person): Person => ({ id: props.id, name: required(props.name, 'El nombre') });

// ── Tarjetas de crédito ─────────────────────────────────────────────────────
export interface CreditCard extends Entity {
  readonly name: string;
  /** Día de corte (1-31; si el mes es más corto se usa su último día). */
  readonly cutoffDay: number;
  /** Día límite de pago. Si es menor o igual al día de corte, cae en el mes siguiente al corte. */
  readonly paymentDay: number;
}

export const createCreditCard = (props: CreditCard): CreditCard => {
  const cutoffDay = validDay(props.cutoffDay, 'El día de corte');
  const paymentDay = validDay(props.paymentDay, 'El día de pago');
  assert(cutoffDay !== paymentDay, 'El día de pago no puede ser igual al día de corte');
  return { id: props.id, name: required(props.name, 'El nombre de la tarjeta'), cutoffDay, paymentDay };
};

// ── Compras a meses sin intereses ───────────────────────────────────────────
export interface InstallmentPurchase extends Entity {
  readonly cardId: string;
  readonly description: string;
  readonly totalCents: number;
  readonly months: number;
  readonly purchaseDate: string;
}

export const createInstallmentPurchase = (props: InstallmentPurchase): InstallmentPurchase => {
  assert(Number.isInteger(props.months) && props.months >= 2 && props.months <= 48, 'Los meses deben estar entre 2 y 48');
  return {
    id: props.id,
    cardId: required(props.cardId, 'La tarjeta'),
    description: required(props.description, 'La descripción'),
    totalCents: positiveCents(props.totalCents, 'El monto total'),
    months: props.months,
    purchaseDate: isoDate(props.purchaseDate, 'La fecha de compra'),
  };
};

// ── Ingresos ────────────────────────────────────────────────────────────────
export type IncomeFrequency = 'monthly' | 'biweekly' | 'weekly';

export const INCOME_FREQUENCIES: readonly IncomeFrequency[] = ['monthly', 'biweekly', 'weekly'];

export interface FixedIncome extends Entity {
  readonly personId: string;
  readonly name: string;
  /** Monto de cada pago (por mes, por quincena o por semana según la frecuencia). */
  readonly amountCents: number;
  readonly frequency: IncomeFrequency;
  /** Desde cuándo aplica. En ingresos semanales define además el día de la semana. */
  readonly startDate: string;
  readonly endDate?: string;
}

export const createFixedIncome = (props: FixedIncome): FixedIncome => {
  assert(INCOME_FREQUENCIES.includes(props.frequency), 'Frecuencia inválida');
  const startDate = isoDate(props.startDate, 'La fecha de inicio');
  const endDate = props.endDate ? isoDate(props.endDate, 'La fecha de fin') : undefined;
  assert(!endDate || endDate >= startDate, 'La fecha de fin debe ser posterior al inicio');
  return {
    id: props.id,
    personId: required(props.personId, 'La persona'),
    name: required(props.name, 'El concepto'),
    amountCents: positiveCents(props.amountCents, 'El monto'),
    frequency: props.frequency,
    startDate,
    ...(endDate ? { endDate } : {}),
  };
};

export interface VariableIncome extends Entity {
  readonly personId: string;
  readonly description: string;
  readonly amountCents: number;
  readonly date: string;
}

export const createVariableIncome = (props: VariableIncome): VariableIncome => ({
  id: props.id,
  personId: required(props.personId, 'La persona'),
  description: required(props.description, 'La descripción'),
  amountCents: positiveCents(props.amountCents, 'El monto'),
  date: isoDate(props.date, 'La fecha'),
});

// ── Gastos ──────────────────────────────────────────────────────────────────
export interface FixedExpense extends Entity {
  readonly name: string;
  readonly category: string;
  readonly amountCents: number;
  /** Primer mes en que aplica (YYYY-MM). */
  readonly startMonth: string;
  /** Último mes en que aplica (YYYY-MM), opcional. */
  readonly endMonth?: string;
}

export const createFixedExpense = (props: FixedExpense): FixedExpense => {
  const startMonth = monthKey(props.startMonth, 'El mes de inicio');
  const endMonth = props.endMonth ? monthKey(props.endMonth, 'El mes de fin') : undefined;
  assert(!endMonth || endMonth >= startMonth, 'El mes de fin debe ser posterior al de inicio');
  return {
    id: props.id,
    name: required(props.name, 'El concepto'),
    category: required(props.category, 'La categoría'),
    amountCents: positiveCents(props.amountCents, 'El monto'),
    startMonth,
    ...(endMonth ? { endMonth } : {}),
  };
};

export interface VariableExpense extends Entity {
  readonly description: string;
  readonly category: string;
  readonly amountCents: number;
  readonly date: string;
}

export const createVariableExpense = (props: VariableExpense): VariableExpense => ({
  id: props.id,
  description: required(props.description, 'La descripción'),
  category: required(props.category, 'La categoría'),
  amountCents: positiveCents(props.amountCents, 'El monto'),
  date: isoDate(props.date, 'La fecha'),
});
