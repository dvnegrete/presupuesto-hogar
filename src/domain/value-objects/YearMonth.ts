import { DomainError } from '../errors/DomainError';

/** Mes calendario (unidad del presupuesto). Serializa como "YYYY-MM". */
export class YearMonth {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  static of(year: number, month: number): YearMonth {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new DomainError(`Mes inválido: ${year}-${month}`);
    }
    return new YearMonth(year, month);
  }

  static parse(key: string): YearMonth {
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match) throw new DomainError(`Mes inválido: ${key}`);
    return YearMonth.of(Number(match[1]), Number(match[2]));
  }

  plus(months: number): YearMonth {
    const index = this.year * 12 + (this.month - 1) + months;
    return YearMonth.of(Math.floor(index / 12), (index % 12) + 1);
  }

  /** Meses de `this` a `other` (positivo si `other` es posterior). */
  monthsUntil(other: YearMonth): number {
    return other.year * 12 + other.month - (this.year * 12 + this.month);
  }

  daysInMonth(): number {
    return new Date(Date.UTC(this.year, this.month, 0)).getUTCDate();
  }

  equals(other: YearMonth): boolean {
    return this.year === other.year && this.month === other.month;
  }

  compare(other: YearMonth): number {
    return this.toKey().localeCompare(other.toKey());
  }

  toKey(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
}
