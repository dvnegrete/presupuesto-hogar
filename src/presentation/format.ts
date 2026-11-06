import { Money } from '@domain/value-objects/Money';
import { YearMonth } from '@domain/value-objects/YearMonth';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const currencyShort = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const monthFmt = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthShortFmt = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' });
const dateFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateYearFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const money = (cents: number, short = false): string =>
  (short ? currencyShort : currency).format(Money.fromCents(cents).toPesos());

export const toCents = (pesos: string | number): number => Money.fromPesos(Number(pesos)).cents;
export const toPesosInput = (cents: number): string => String(Money.fromCents(cents).toPesos());

const utc = (key: string) => {
  const ym = YearMonth.parse(key);
  return new Date(Date.UTC(ym.year, ym.month - 1, 1));
};

export const monthLabel = (key: string): string => monthFmt.format(utc(key));
export const monthName = (key: string): string => monthFmt.format(utc(key)).replace(/ de \d{4}$/, '');
export const monthShort = (key: string): string => monthShortFmt.format(utc(key)).replace('.', '');
/** "15 dic"; agrega el año cuando no es el año en curso ("15 dic 2027"). */
export const dateLabel = (iso: string): string => {
  const fmt = iso.slice(0, 4) === String(new Date().getFullYear()) ? dateFmt : dateYearFmt;
  return fmt.format(new Date(`${iso}T00:00:00Z`)).replace('.', '').replace(' de ', ' ').replace(' de ', ' ');
};

const pad = (n: number) => String(n).padStart(2, '0');
export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const currentMonthKey = (): string => todayISO().slice(0, 7);

export const FREQUENCY_LABEL = { monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal' } as const;
