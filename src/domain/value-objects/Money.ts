import { DomainError } from '../errors/DomainError';

/**
 * Cantidad monetaria en centavos (entero) para evitar errores de punto flotante.
 * Inmutable.
 */
export class Money {
  private constructor(readonly cents: number) {}

  static zero(): Money {
    return new Money(0);
  }

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) throw new DomainError('Los centavos deben ser enteros');
    return new Money(cents);
  }

  static fromPesos(pesos: number): Money {
    if (!Number.isFinite(pesos)) throw new DomainError('Monto inválido');
    return new Money(Math.round(pesos * 100));
  }

  static sum(items: readonly Money[]): Money {
    return items.reduce((acc, m) => acc.add(m), Money.zero());
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  multiply(factor: number): Money {
    if (!Number.isInteger(factor)) throw new DomainError('El factor debe ser entero');
    return new Money(this.cents * factor);
  }

  /** Divide en `parts` partes que suman exactamente el total; el residuo se reparte en las primeras. */
  split(parts: number): Money[] {
    if (!Number.isInteger(parts) || parts < 1) throw new DomainError('Número de partes inválido');
    const base = Math.trunc(this.cents / parts);
    const remainder = this.cents - base * parts;
    return Array.from({ length: parts }, (_, i) => new Money(base + (i < remainder ? 1 : 0)));
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  toPesos(): number {
    return this.cents / 100;
  }
}
