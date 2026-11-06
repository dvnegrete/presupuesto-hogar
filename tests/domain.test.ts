import { describe, expect, it } from 'vitest';
import { createCreditCard, createFixedIncome, createInstallmentPurchase } from '@domain/entities';
import { DomainError } from '@domain/errors/DomainError';
import { BudgetCalculator, type BudgetData } from '@domain/services/BudgetCalculator';
import { IncomeSchedule } from '@domain/services/IncomeSchedule';
import { InstallmentScheduler } from '@domain/services/InstallmentScheduler';
import { Money } from '@domain/value-objects/Money';
import { YearMonth } from '@domain/value-objects/YearMonth';

const ym = YearMonth.parse;

describe('Money', () => {
  it('reparte el residuo para que las partes sumen el total', () => {
    const parts = Money.fromCents(1000).split(3).map((m) => m.cents);
    expect(parts).toEqual([334, 333, 333]);
    expect(parts.reduce((a, b) => a + b)).toBe(1000);
  });

  it('convierte pesos a centavos sin errores de flotante', () => {
    expect(Money.fromPesos(0.1 + 0.2).cents).toBe(30);
  });
});

describe('InstallmentScheduler', () => {
  const scheduler = new InstallmentScheduler();
  // Corte día 10, pago día 30 → se paga el mismo mes del corte
  const sameMonthCard = createCreditCard({ id: 'c1', name: 'Oro', cutoffDay: 10, paymentDay: 30 });
  // Corte día 25, pago día 15 → se paga el mes siguiente al corte
  const nextMonthCard = createCreditCard({ id: 'c2', name: 'Azul', cutoffDay: 25, paymentDay: 15 });

  it('una compra antes del corte entra en el corte de ese mes', () => {
    const p = createInstallmentPurchase({ id: 'p', cardId: 'c1', description: 'TV', totalCents: 120000, months: 3, purchaseDate: '2026-11-05' });
    const due = scheduler.schedule(p, sameMonthCard).map((i) => i.dueDate.toISO());
    expect(due).toEqual(['2026-11-30', '2026-12-30', '2027-01-30']);
  });

  it('una compra el mismo día del corte entra en ese corte', () => {
    const p = createInstallmentPurchase({ id: 'p', cardId: 'c1', description: 'TV', totalCents: 30000, months: 3, purchaseDate: '2026-11-10' });
    expect(scheduler.schedule(p, sameMonthCard)[0].cutoffDate.toISO()).toBe('2026-11-10');
  });

  it('una compra después del corte pasa al corte del mes siguiente', () => {
    const p = createInstallmentPurchase({ id: 'p', cardId: 'c1', description: 'TV', totalCents: 30000, months: 3, purchaseDate: '2026-11-11' });
    expect(scheduler.schedule(p, sameMonthCard)[0].dueDate.toISO()).toBe('2026-12-30');
  });

  it('si el día de pago es menor al de corte, se paga el mes siguiente', () => {
    const p = createInstallmentPurchase({ id: 'p', cardId: 'c2', description: 'Laptop', totalCents: 60000, months: 6, purchaseDate: '2026-11-20' });
    const s = scheduler.schedule(p, nextMonthCard);
    expect(s[0].cutoffDate.toISO()).toBe('2026-11-25');
    expect(s[0].dueDate.toISO()).toBe('2026-12-15');
    expect(s[5].dueDate.toISO()).toBe('2027-05-15');
  });

  it('recorta días inexistentes al fin de mes (corte 31 en febrero)', () => {
    const card = createCreditCard({ id: 'c3', name: 'X', cutoffDay: 31, paymentDay: 20 });
    const p = createInstallmentPurchase({ id: 'p', cardId: 'c3', description: 'Y', totalCents: 20000, months: 2, purchaseDate: '2027-02-10' });
    const s = scheduler.schedule(p, card);
    expect(s[0].cutoffDate.toISO()).toBe('2027-02-28');
    expect(s[0].dueDate.toISO()).toBe('2027-03-20');
  });

  it('rechaza MSI con menos de 2 meses', () => {
    expect(() =>
      createInstallmentPurchase({ id: 'p', cardId: 'c1', description: 'X', totalCents: 100, months: 1, purchaseDate: '2026-11-01' }),
    ).toThrow(DomainError);
  });
});

describe('IncomeSchedule', () => {
  const schedule = new IncomeSchedule();
  const base = { id: 'i', personId: 'p', name: 'Sueldo', amountCents: 100 };

  it('quincenal = 15 y último día del mes', () => {
    const inc = createFixedIncome({ ...base, frequency: 'biweekly', startDate: '2026-01-01' });
    expect(schedule.paymentDates(inc, ym('2026-02')).map((d) => d.toISO())).toEqual(['2026-02-15', '2026-02-28']);
  });

  it('quincenal que inicia a mitad de mes solo cuenta la segunda quincena', () => {
    const inc = createFixedIncome({ ...base, frequency: 'biweekly', startDate: '2026-11-20' });
    expect(schedule.paymentDates(inc, ym('2026-11'))).toHaveLength(1);
  });

  it('semanal cuenta los días de la semana de inicio dentro del mes', () => {
    // 2026-10-02 es viernes; noviembre 2026 tiene 4 viernes (6, 13, 20, 27)
    const inc = createFixedIncome({ ...base, frequency: 'weekly', startDate: '2026-10-02' });
    expect(schedule.paymentDates(inc, ym('2026-11')).map((d) => d.day)).toEqual([6, 13, 20, 27]);
  });

  it('respeta la fecha de fin', () => {
    const inc = createFixedIncome({ ...base, frequency: 'monthly', startDate: '2026-01-05', endDate: '2026-03-31' });
    expect(schedule.paymentDates(inc, ym('2026-04'))).toHaveLength(0);
    expect(schedule.paymentDates(inc, ym('2026-03'))).toHaveLength(1);
  });
});

describe('BudgetCalculator', () => {
  const data: BudgetData = {
    people: [
      { id: 'a', name: 'Damian' },
      { id: 'b', name: 'Ana' },
    ],
    cards: [{ id: 'c', name: 'Oro', cutoffDay: 10, paymentDay: 30 }],
    purchases: [
      { id: 'p1', cardId: 'c', description: 'Refri', totalCents: 1200000, months: 12, purchaseDate: '2026-01-05' },
      { id: 'p2', cardId: 'c', description: 'Celular', totalCents: 600000, months: 6, purchaseDate: '2026-11-01' },
    ],
    fixedIncomes: [
      { id: 'f1', personId: 'a', name: 'Sueldo', amountCents: 1500000, frequency: 'biweekly', startDate: '2026-01-01' },
      { id: 'f2', personId: 'b', name: 'Sueldo', amountCents: 2000000, frequency: 'monthly', startDate: '2026-01-01' },
    ],
    variableIncomes: [{ id: 'v1', personId: 'a', description: 'Freelance', amountCents: 500000, date: '2026-11-18' }],
    fixedExpenses: [
      { id: 'e1', name: 'Renta', category: 'Vivienda', amountCents: 1200000, startMonth: '2026-01' },
      { id: 'e2', name: 'Gym', category: 'Salud', amountCents: 80000, startMonth: '2026-01', endMonth: '2026-10' },
    ],
    variableExpenses: [{ id: 'x1', description: 'Súper', category: 'Comida', amountCents: 400000, date: '2026-11-03' }],
  };

  const summary = new BudgetCalculator().calculate(ym('2026-11'), data);

  it('suma ingresos fijos y variables por persona', () => {
    const damian = summary.incomes.byPerson.find((p) => p.personId === 'a')!;
    expect(damian.fixedCents).toBe(3000000);
    expect(damian.variableCents).toBe(500000);
    expect(summary.incomes.totalCents).toBe(5500000);
  });

  it('excluye gastos fijos fuera de vigencia', () => {
    expect(summary.expenses.fixed.map((e) => e.id)).toEqual(['e1']);
  });

  it('agrupa las mensualidades por tarjeta y detecta la última', () => {
    const card = summary.expenses.installmentsByCard[0];
    expect(card.dueDate).toBe('2026-11-30');
    expect(card.lines.map((l) => `${l.description} ${l.number}/${l.of}`)).toEqual(['Refri 11/12', 'Celular 1/6']);
    expect(summary.expenses.installmentsCents).toBe(100000 + 100000);
  });

  it('calcula lo que queda a fin de mes', () => {
    // 55,000 − (12,000 renta + 4,000 súper + 2,000 MSI) = 37,000
    expect(summary.balanceCents).toBe(3700000);
  });

  it('proyecta la liberación de mensualidades', () => {
    const [, dec, jan] = new BudgetCalculator().project(ym('2026-11'), 3, data);
    expect(dec.releasedNextMonthCents).toBe(100000); // Refri 12/12
    expect(jan.expenses.installmentsCents).toBe(100000); // solo Celular
  });
});
