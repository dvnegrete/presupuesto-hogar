import { useState } from 'react';
import { YearMonth } from '@domain/value-objects/YearMonth';
import { useBudget } from './di/BudgetContext';
import { currentMonthKey, monthLabel } from './format';
import { CardsPage } from './pages/CardsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { IncomePage } from './pages/IncomePage';
import { SettingsPage } from './pages/SettingsPage';
import { SummaryPage } from './pages/SummaryPage';

type Tab = 'summary' | 'income' | 'expenses' | 'cards' | 'settings';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Resumen' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'cards', label: 'Tarjetas y MSI' },
  { id: 'settings', label: 'Respaldo' },
];

export const App = () => {
  const { month, setMonth, loading, notice } = useBudget();
  const [tab, setTab] = useState<Tab>('summary');
  const shift = (n: number) => setMonth(YearMonth.parse(month).plus(n).toKey());
  const isCurrent = month === currentMonthKey();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Presupuesto del hogar</div>
        <div className="month-picker" role="group" aria-label="Mes del presupuesto">
          <button className="btn btn-quiet btn-icon" onClick={() => shift(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <span className="month-current">{monthLabel(month)}</span>
          <button className="btn btn-quiet btn-icon" onClick={() => shift(1)} aria-label="Mes siguiente">
            ›
          </button>
          {!isCurrent && (
            <button className="btn btn-quiet btn-small" onClick={() => setMonth(currentMonthKey())}>
              Hoy
            </button>
          )}
        </div>
        <nav className="tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {loading ? (
          <p className="empty">Cargando…</p>
        ) : (
          <>
            {tab === 'summary' && <SummaryPage goTo={setTab} />}
            {tab === 'income' && <IncomePage />}
            {tab === 'expenses' && <ExpensesPage />}
            {tab === 'cards' && <CardsPage />}
            {tab === 'settings' && <SettingsPage />}
          </>
        )}
      </main>

      {notice && (
        <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}
    </div>
  );
};
