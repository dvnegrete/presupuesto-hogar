import type { CreditCard, InstallmentPurchase } from '../entities';
import { DomainError } from '../errors/DomainError';
import { CalendarDate } from '../value-objects/CalendarDate';
import { Money } from '../value-objects/Money';
import type { YearMonth } from '../value-objects/YearMonth';

export interface Installment {
  readonly purchaseId: string;
  /** 1-based */
  readonly number: number;
  readonly of: number;
  readonly amount: Money;
  readonly cutoffDate: CalendarDate;
  readonly dueDate: CalendarDate;
}

/**
 * Calcula en qué mes se paga cada mensualidad según el ciclo de la tarjeta:
 *  1. La compra entra en el primer corte en o después de la fecha de compra.
 *  2. Cada mensualidad siguiente cae en el corte del mes siguiente.
 *  3. Se paga en el día de pago posterior a ese corte (mismo mes si el día de pago > día de corte,
 *     si no, el mes siguiente).
 */
export class InstallmentScheduler {
  schedule(purchase: InstallmentPurchase, card: CreditCard): Installment[] {
    if (purchase.cardId !== card.id) throw new DomainError('La compra no pertenece a esta tarjeta');

    const firstCutoffMonth = this.firstCutoffMonth(CalendarDate.parse(purchase.purchaseDate), card);
    const amounts = Money.fromCents(purchase.totalCents).split(purchase.months);

    return amounts.map((amount, i) => {
      const cutoffMonth = firstCutoffMonth.plus(i);
      return {
        purchaseId: purchase.id,
        number: i + 1,
        of: purchase.months,
        amount,
        cutoffDate: CalendarDate.clamped(cutoffMonth, card.cutoffDay),
        dueDate: this.dueDateFor(cutoffMonth, card),
      };
    });
  }

  /** Mensualidades de la compra cuya fecha de pago cae en `month`. */
  dueIn(purchase: InstallmentPurchase, card: CreditCard, month: YearMonth): Installment[] {
    return this.schedule(purchase, card).filter((inst) => inst.dueDate.yearMonth.equals(month));
  }

  private firstCutoffMonth(purchaseDate: CalendarDate, card: CreditCard): YearMonth {
    const month = purchaseDate.yearMonth;
    const cutoffThisMonth = CalendarDate.clamped(month, card.cutoffDay);
    return purchaseDate.compare(cutoffThisMonth) <= 0 ? month : month.plus(1);
  }

  private dueDateFor(cutoffMonth: YearMonth, card: CreditCard): CalendarDate {
    const paymentMonth = card.paymentDay > card.cutoffDay ? cutoffMonth : cutoffMonth.plus(1);
    return CalendarDate.clamped(paymentMonth, card.paymentDay);
  }
}
