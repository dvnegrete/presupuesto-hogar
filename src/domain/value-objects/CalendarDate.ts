import { DomainError } from '../errors/DomainError';
import { YearMonth } from './YearMonth';

/** Fecha sin hora ni zona horaria (YYYY-MM-DD). Evita los desfases de `Date` con husos horarios. */
export class CalendarDate {
  private constructor(
    readonly year: number,
    readonly month: number,
    readonly day: number,
  ) {}

  static of(year: number, month: number, day: number): CalendarDate {
    const ym = YearMonth.of(year, month);
    if (!Number.isInteger(day) || day < 1 || day > ym.daysInMonth()) {
      throw new DomainError(`Día inválido: ${year}-${month}-${day}`);
    }
    return new CalendarDate(year, month, day);
  }

  static parse(iso: string): CalendarDate {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) throw new DomainError(`Fecha inválida: ${iso}`);
    return CalendarDate.of(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  /** Construye la fecha en `ym` con el día pedido, recortado al último día del mes (p. ej. 31 → 30 en noviembre). */
  static clamped(ym: YearMonth, day: number): CalendarDate {
    return CalendarDate.of(ym.year, ym.month, Math.min(day, ym.daysInMonth()));
  }

  get yearMonth(): YearMonth {
    return YearMonth.of(this.year, this.month);
  }

  /** 0 = domingo … 6 = sábado */
  weekday(): number {
    return new Date(Date.UTC(this.year, this.month - 1, this.day)).getUTCDay();
  }

  addDays(days: number): CalendarDate {
    const d = new Date(Date.UTC(this.year, this.month - 1, this.day + days));
    return CalendarDate.of(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  compare(other: CalendarDate): number {
    return this.toISO().localeCompare(other.toISO());
  }

  toISO(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
  }
}
