import type { FixedIncome, IncomeFrequency } from '../entities';
import { CalendarDate } from '../value-objects/CalendarDate';
import type { YearMonth } from '../value-objects/YearMonth';

/**
 * Estrategia que devuelve las fechas de pago "candidatas" de un ingreso fijo en un mes.
 * Agregar una frecuencia nueva = registrar otra estrategia (abierto/cerrado).
 */
export interface FrequencyPolicy {
  candidateDates(income: FixedIncome, month: YearMonth): CalendarDate[];
}

const monthly: FrequencyPolicy = {
  candidateDates: (income, month) => [CalendarDate.clamped(month, CalendarDate.parse(income.startDate).day)],
};

/** Quincenal al estilo nómina mexicana: día 15 y último día del mes. */
const biweekly: FrequencyPolicy = {
  candidateDates: (_income, month) => [CalendarDate.of(month.year, month.month, 15), CalendarDate.clamped(month, 31)],
};

/** Semanal: cada 7 días a partir de la fecha de inicio. */
const weekly: FrequencyPolicy = {
  candidateDates: (income, month) => {
    const start = CalendarDate.parse(income.startDate);
    const firstOfMonth = CalendarDate.of(month.year, month.month, 1);
    const offset = (start.weekday() - firstOfMonth.weekday() + 7) % 7;
    const dates: CalendarDate[] = [];
    for (let d = firstOfMonth.addDays(offset); d.yearMonth.equals(month); d = d.addDays(7)) dates.push(d);
    return dates;
  },
};

export const DEFAULT_FREQUENCY_POLICIES: Readonly<Record<IncomeFrequency, FrequencyPolicy>> = { monthly, biweekly, weekly };

export class IncomeSchedule {
  constructor(private readonly policies: Readonly<Record<IncomeFrequency, FrequencyPolicy>> = DEFAULT_FREQUENCY_POLICIES) {}

  /** Fechas en que se recibe el ingreso dentro de `month`, respetando su vigencia. */
  paymentDates(income: FixedIncome, month: YearMonth): CalendarDate[] {
    const start = CalendarDate.parse(income.startDate);
    const end = income.endDate ? CalendarDate.parse(income.endDate) : undefined;
    return this.policies[income.frequency]
      .candidateDates(income, month)
      .filter((d) => d.compare(start) >= 0 && (!end || d.compare(end) <= 0));
  }
}
