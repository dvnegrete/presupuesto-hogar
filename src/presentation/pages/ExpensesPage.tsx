import type { FixedExpense, VariableExpense } from '@domain/entities';
import { useBudget } from '../di/BudgetContext';
import { Empty, Field, FormDialog, MoneyInput, Row, Section } from '../components/ui';
import { dateLabel, money, monthLabel, monthName, toCents, toPesosInput, todayISO } from '../format';
import { useEditor } from '../hooks/useEditor';
import { useConfirmDelete } from '../components/ConfirmProvider';

const DEFAULT_CATEGORIES = ['Vivienda', 'Servicios', 'Comida', 'Transporte', 'Salud', 'Educación', 'Entretenimiento', 'Suscripciones', 'Otros'];

export const ExpensesPage = () => {
  const { data, services, run, month } = useBudget();
  const confirmDelete = useConfirmDelete();
  const fixedEditor = useEditor<FixedExpense>();
  const variableEditor = useEditor<VariableExpense>();
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...data.fixedExpenses.map((e) => e.category), ...data.variableExpenses.map((e) => e.category)])];
  const monthVariable = data.variableExpenses.filter((e) => e.date.startsWith(month));

  const categoryField = (value?: string) => (
    <Field label="Categoría">
      <input name="category" list="categories" required defaultValue={value} placeholder="Elige o escribe una" />
    </Field>
  );

  return (
    <div className="page">
      <datalist id="categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <p className="page-note">
        Las mensualidades sin intereses se capturan en <strong>Tarjetas y MSI</strong> y se suman solas al mes en que las pagas.
      </p>

      <Section
        title="Gastos fijos"
        action={
          <button className="btn" onClick={() => fixedEditor.openNew()}>
            Agregar gasto fijo
          </button>
        }
      >
        {data.fixedExpenses.length === 0 ? (
          <Empty>Renta, luz, internet, colegiaturas: lo que pagas cada mes por un monto similar.</Empty>
        ) : (
          <ul className="list">
            {data.fixedExpenses.map((e) => {
              const active = e.startMonth <= month && (!e.endMonth || month <= e.endMonth);
              return (
                <Row
                  key={e.id}
                  title={e.name}
                  detail={`${e.category} · desde ${monthLabel(e.startMonth)}${e.endMonth ? ` hasta ${monthLabel(e.endMonth)}` : ''}${active ? '' : ' · no aplica este mes'}`}
                  amount={money(e.amountCents)}
                  onEdit={() => fixedEditor.openEdit(e)}
                  onDelete={async () => (await confirmDelete(e.name)) && run(() => services.deleteFixedExpense.execute(e.id), 'Gasto eliminado')}
                />
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        title={`Gastos variables de ${monthName(month)}`}
        action={
          <button className="btn" onClick={() => variableEditor.openNew()}>
            Registrar gasto
          </button>
        }
      >
        {monthVariable.length === 0 ? (
          <Empty>Súper, gasolina, salidas. También puedes capturar un estimado al inicio del mes y ajustarlo después.</Empty>
        ) : (
          <ul className="list">
            {monthVariable.map((e) => (
              <Row
                key={e.id}
                title={e.description}
                detail={`${e.category} · ${dateLabel(e.date)}`}
                amount={money(e.amountCents)}
                onEdit={() => variableEditor.openEdit(e)}
                onDelete={async () => (await confirmDelete(e.description)) && run(() => services.deleteVariableExpense.execute(e.id), 'Gasto eliminado')}
              />
            ))}
          </ul>
        )}
      </Section>

      <FormDialog
        open={fixedEditor.isOpen}
        title={fixedEditor.isNew ? 'Agregar gasto fijo' : 'Editar gasto fijo'}
        submitLabel="Guardar gasto"
        onClose={fixedEditor.close}
        onSubmit={(v) =>
          run(
            () =>
              services.saveFixedExpense.execute({
                id: fixedEditor.target?.id,
                name: v.name,
                category: v.category,
                amountCents: toCents(v.amount),
                startMonth: v.startMonth,
                endMonth: v.endMonth || undefined,
              }),
            'Gasto guardado',
          )
        }
      >
        <Field label="Concepto">
          <input name="name" required placeholder="Renta" defaultValue={fixedEditor.target?.name} />
        </Field>
        <div className="field-pair">
          {categoryField(fixedEditor.target?.category)}
          <Field label="Monto mensual">
            <MoneyInput name="amount" defaultValue={fixedEditor.target?.amountCents ? toPesosInput(fixedEditor.target.amountCents) : undefined} />
          </Field>
        </div>
        <div className="field-pair">
          <Field label="Desde el mes">
            <input name="startMonth" type="month" required defaultValue={fixedEditor.target?.startMonth ?? month} />
          </Field>
          <Field label="Hasta el mes (opcional)">
            <input name="endMonth" type="month" defaultValue={fixedEditor.target?.endMonth} />
          </Field>
        </div>
      </FormDialog>

      <FormDialog
        open={variableEditor.isOpen}
        title={variableEditor.isNew ? 'Registrar gasto variable' : 'Editar gasto variable'}
        submitLabel="Guardar gasto"
        onClose={variableEditor.close}
        onSubmit={(v) =>
          run(
            () =>
              services.saveVariableExpense.execute({
                id: variableEditor.target?.id,
                description: v.description,
                category: v.category,
                amountCents: toCents(v.amount),
                date: v.date,
              }),
            'Gasto guardado',
          )
        }
      >
        <Field label="Descripción">
          <input name="description" required placeholder="Súper de la semana" defaultValue={variableEditor.target?.description} />
        </Field>
        <div className="field-pair">
          {categoryField(variableEditor.target?.category)}
          <Field label="Monto">
            <MoneyInput name="amount" defaultValue={variableEditor.target?.amountCents ? toPesosInput(variableEditor.target.amountCents) : undefined} />
          </Field>
        </div>
        <Field label="Fecha">
          <input name="date" type="date" required defaultValue={variableEditor.target?.date ?? (todayISO().startsWith(month) ? todayISO() : `${month}-01`)} />
        </Field>
      </FormDialog>
    </div>
  );
};
