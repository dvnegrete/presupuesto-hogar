import { useMemo } from 'react';
import { useBudget } from '../di/BudgetContext';
import { Empty, Section } from '../components/ui';
import { dateLabel, money, monthName, monthShort } from '../format';

const PROJECTION_MONTHS = 6;

export const SummaryPage = ({ goTo }: { goTo: (tab: 'income' | 'expenses' | 'cards') => void }) => {
  const { data, services, month } = useBudget();
  const summary = useMemo(() => services.getMonthlySummary.execute(month, data), [services, month, data]);
  const projection = useMemo(() => services.getProjection.execute(month, PROJECTION_MONTHS, data), [services, month, data]);

  const income = summary.incomes.totalCents;
  const { fixedCents, variableCents, installmentsCents, totalCents: spent } = summary.expenses;
  const balance = summary.balanceCents;
  const scale = Math.max(income, spent, 1);
  const pct = (cents: number) => `${(cents / scale) * 100}%`;
  const isEmpty = income === 0 && spent === 0;

  const segments = [
    { key: 'fixed', label: 'Fijos', cents: fixedCents },
    { key: 'variable', label: 'Variables', cents: variableCents },
    { key: 'msi', label: 'Meses sin intereses', cents: installmentsCents },
  ];

  const maxProjected = Math.max(...projection.map((p) => Math.abs(p.balanceCents)), 1);

  return (
    <div className="page">
      <section className={`hero${balance < 0 ? ' hero-negative' : ''}`} aria-live="polite">
        {isEmpty ? (
          <>
            <h1 className="hero-title">Empieza por tus ingresos</h1>
            <p className="hero-sub">
              Agrega a las personas del hogar y sus ingresos; luego tus gastos y tarjetas. Aquí verás cuánto te queda a fin de{' '}
              {monthName(month)}.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => goTo('income')}>
                Agregar ingresos
              </button>
              <button className="btn" onClick={() => goTo('cards')}>
                Agregar tarjetas
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hero-kicker">{balance < 0 ? `Te faltan a fin de ${monthName(month)}` : `Te quedan a fin de ${monthName(month)}`}</p>
            <p className="hero-amount">{money(Math.abs(balance))}</p>
            <p className="hero-sub">
              Entran {money(income)} y salen {money(spent)}
              {income > 0 && ` (${Math.round((spent / income) * 100)}% de tus ingresos)`}.
            </p>

            <div className="flow" role="img" aria-label={`Ingresos ${money(income)}; fijos ${money(fixedCents)}, variables ${money(variableCents)}, meses sin intereses ${money(installmentsCents)}`}>
              <div className="flow-bar">
                {segments.map((s) => s.cents > 0 && <span key={s.key} className={`seg seg-${s.key}`} style={{ width: pct(s.cents) }} />)}
                {balance > 0 && <span className="seg seg-left" style={{ width: pct(balance) }} />}
              </div>
              {balance < 0 && <span className="flow-income-mark" style={{ left: pct(income) }} title="Tus ingresos llegan hasta aquí" />}
            </div>
            <ul className="legend">
              {segments.map((s) => (
                <li key={s.key}>
                  <span className={`dot seg-${s.key}`} />
                  {s.label} <strong>{money(s.cents, true)}</strong>
                </li>
              ))}
              <li>
                <span className={`dot ${balance >= 0 ? 'seg-left' : 'seg-over'}`} />
                {balance >= 0 ? 'Disponible' : 'Déficit'} <strong>{money(Math.abs(balance), true)}</strong>
              </li>
            </ul>

            {summary.releasedNextMonthCents > 0 && (
              <p className="callout">
                Este mes terminas de pagar mensualidades por {money(summary.releasedNextMonthCents)}; ese dinero queda libre a partir de{' '}
                {monthName(projection[1]?.month ?? month)}.
              </p>
            )}
          </>
        )}
      </section>

      <div className="grid">
        <Section title="Ingresos">
          {summary.incomes.byPerson.length === 0 ? (
            <Empty>Sin personas registradas.</Empty>
          ) : (
            <ul className="list">
              {summary.incomes.byPerson.map((p) => (
                <li key={p.personId} className="row row-stack">
                  <div className="row-line">
                    <span className="row-title">{p.personName}</span>
                    <span className="row-amount">{money(p.totalCents)}</span>
                  </div>
                  {p.lines.length > 0 && (
                    <ul className="sublist">
                      {p.lines.map((l) => (
                        <li key={l.id}>
                          <span>
                            {l.label}
                            {l.kind === 'fixed' && l.occurrences > 1 && <span className="muted"> × {l.occurrences} pagos</span>}
                            {l.kind === 'variable' && <span className="muted"> · variable</span>}
                          </span>
                          <span>{money(l.amountCents)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pagos de tarjeta a meses">
          {summary.expenses.installmentsByCard.length === 0 ? (
            <Empty>No hay mensualidades que pagar este mes.</Empty>
          ) : (
            <ul className="list">
              {summary.expenses.installmentsByCard.map((c) => (
                <li key={c.cardId} className="row row-stack">
                  <div className="row-line">
                    <span className="row-title">
                      {c.cardName} <span className="muted">· paga el {dateLabel(c.dueDate)}</span>
                    </span>
                    <span className="row-amount">{money(c.totalCents)}</span>
                  </div>
                  <ul className="sublist">
                    {c.lines.map((l) => (
                      <li key={l.purchaseId}>
                        <span>
                          {l.description}{' '}
                          <span className={l.isLast ? 'tag tag-last' : 'muted'}>{l.isLast ? 'última' : `${l.number} de ${l.of}`}</span>
                        </span>
                        <span>{money(l.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="En qué se va">
          {summary.expenses.byCategory.length === 0 ? (
            <Empty>Sin gastos este mes.</Empty>
          ) : (
            <ul className="bars">
              {summary.expenses.byCategory.map((c) => (
                <li key={c.category}>
                  <span className="bars-label">{c.category}</span>
                  <span className="bars-track">
                    <span style={{ width: `${(c.amountCents / summary.expenses.byCategory[0].amountCents) * 100}%` }} />
                  </span>
                  <span className="bars-value">{money(c.amountCents, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Los próximos meses">
        <p className="page-note">
          Cuenta tus ingresos fijos, gastos fijos y mensualidades ya comprometidas. Los ingresos y gastos variables solo aparecen si ya los registraste.
        </p>
        <ol className="projection">
          {projection.map((p) => {
            const negative = p.balanceCents < 0;
            return (
              <li key={p.month} className={negative ? 'is-negative' : ''}>
                <span className="projection-value">{money(p.balanceCents, true)}</span>
                <span className="projection-track">
                  <span style={{ height: `${(Math.abs(p.balanceCents) / maxProjected) * 100}%` }} />
                </span>
                <span className="projection-month">{monthShort(p.month)}</span>
                <span className="projection-msi" title="Mensualidades de ese mes">
                  MSI {money(p.expenses.installmentsCents, true)}
                </span>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
};
