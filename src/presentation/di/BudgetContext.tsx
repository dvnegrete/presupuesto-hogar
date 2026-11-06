import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Container } from '@composition/container';
import type { BudgetData } from '@domain/services/BudgetCalculator';
import { currentMonthKey } from '../format';

const EMPTY: BudgetData = {
  people: [],
  cards: [],
  purchases: [],
  fixedIncomes: [],
  variableIncomes: [],
  fixedExpenses: [],
  variableExpenses: [],
};

interface BudgetContextValue {
  readonly services: Container;
  readonly data: BudgetData;
  readonly loading: boolean;
  readonly month: string;
  readonly setMonth: (key: string) => void;
  /** Ejecuta una mutación, recarga datos y avisa. Devuelve `true` si salió bien. */
  readonly run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
  readonly notice: { kind: 'ok' | 'error'; text: string } | null;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export const BudgetProvider = ({ services, children }: { services: Container; children: ReactNode }) => {
  const [data, setData] = useState<BudgetData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonthKey);
  const [notice, setNotice] = useState<BudgetContextValue['notice']>(null);

  const reload = useCallback(async () => {
    setData(await services.loadData.execute());
    setLoading(false);
  }, [services]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), notice.kind === 'error' ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const run = useCallback<BudgetContextValue['run']>(
    async (action, success) => {
      try {
        await action();
        await reload();
        if (success) setNotice({ kind: 'ok', text: success });
        return true;
      } catch (e) {
        setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Algo salió mal' });
        return false;
      }
    },
    [reload],
  );

  const value = useMemo(() => ({ services, data, loading, month, setMonth, run, notice }), [services, data, loading, month, run, notice]);
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudget = (): BudgetContextValue => {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget debe usarse dentro de <BudgetProvider>');
  return ctx;
};
