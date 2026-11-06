import type { FixedIncome, IncomeFrequency, Person, VariableIncome } from '@domain/entities';
import { useBudget } from '../di/BudgetContext';
import { Empty, Field, FormDialog, MoneyInput, Row, Section } from '../components/ui';
import { dateLabel, FREQUENCY_LABEL, money, monthName, toCents, toPesosInput, todayISO } from '../format';
import { useEditor } from '../hooks/useEditor';
import { useConfirmDelete } from '../components/ConfirmProvider';

export const IncomePage = () => {
  const { data, services, run, month } = useBudget();
  const confirmDelete = useConfirmDelete();
  const personEditor = useEditor<Person>();
  const fixedEditor = useEditor<FixedIncome>();
  const variableEditor = useEditor<VariableIncome>();
  const personName = (id: string) => data.people.find((p) => p.id === id)?.name ?? '—';
  const monthVariable = data.variableIncomes.filter((v) => v.date.startsWith(month));
  const noPeople = data.people.length === 0;
  const defaultPerson = data.people[0]?.id;

  const personSelect = (value?: string) => (
    <Field label="¿Quién lo recibe?">
      <select name="personId" required defaultValue={value ?? defaultPerson}>
        {data.people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="page">
      <Section
        title="Personas que aportan"
        action={
          <button className="btn" onClick={() => personEditor.openNew()}>
            Agregar persona
          </button>
        }
      >
        {noPeople ? (
          <Empty>Agrega a las personas del hogar que reciben ingresos; después podrás asignarles sus ingresos.</Empty>
        ) : (
          <ul className="list">
            {data.people.map((p) => (
              <Row
                key={p.id}
                title={p.name}
                onEdit={() => personEditor.openEdit(p)}
                onDelete={async () => (await confirmDelete(p.name)) && run(() => services.deletePerson.execute(p.id), 'Persona eliminada')}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Ingresos fijos"
        action={
          <button className="btn" disabled={noPeople} onClick={() => fixedEditor.openNew({ frequency: 'biweekly' })}>
            Agregar ingreso fijo
          </button>
        }
      >
        {data.fixedIncomes.length === 0 ? (
          <Empty>Sueldos, rentas que cobras, pensiones: todo lo que llega con regularidad.</Empty>
        ) : (
          <ul className="list">
            {data.fixedIncomes.map((inc) => (
              <Row
                key={inc.id}
                title={inc.name}
                detail={`${personName(inc.personId)} · ${FREQUENCY_LABEL[inc.frequency]} desde ${dateLabel(inc.startDate)}${inc.endDate ? ` hasta ${dateLabel(inc.endDate)}` : ''}`}
                amount={`${money(inc.amountCents)} c/pago`}
                onEdit={() => fixedEditor.openEdit(inc)}
                onDelete={async () => (await confirmDelete(inc.name)) && run(() => services.deleteFixedIncome.execute(inc.id), 'Ingreso eliminado')}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Ingresos variables de ${monthName(month)}`}
        action={
          <button className="btn" disabled={noPeople} onClick={() => variableEditor.openNew()}>
            Registrar ingreso
          </button>
        }
      >
        {monthVariable.length === 0 ? (
          <Empty>Registra aquí lo que ya recibiste este mes fuera de lo fijo: proyectos, bonos, ventas.</Empty>
        ) : (
          <ul className="list">
            {monthVariable.map((inc) => (
              <Row
                key={inc.id}
                title={inc.description}
                detail={`${personName(inc.personId)} · ${dateLabel(inc.date)}`}
                amount={money(inc.amountCents)}
                onEdit={() => variableEditor.openEdit(inc)}
                onDelete={async () => (await confirmDelete(inc.description)) && run(() => services.deleteVariableIncome.execute(inc.id), 'Ingreso eliminado')}
              />
            ))}
          </ul>
        )}
      </Section>

      <FormDialog
        open={personEditor.isOpen}
        title={personEditor.isNew ? 'Agregar persona' : 'Editar persona'}
        submitLabel="Guardar persona"
        onClose={personEditor.close}
        onSubmit={(v) => run(() => services.savePerson.execute({ id: personEditor.target?.id, name: v.name }), 'Persona guardada')}
      >
        <Field label="Nombre">
          <input name="name" required autoFocus defaultValue={personEditor.target?.name} />
        </Field>
      </FormDialog>

      <FormDialog
        open={fixedEditor.isOpen}
        title={fixedEditor.isNew ? 'Agregar ingreso fijo' : 'Editar ingreso fijo'}
        submitLabel="Guardar ingreso"
        onClose={fixedEditor.close}
        onSubmit={(v) =>
          run(
            () =>
              services.saveFixedIncome.execute({
                id: fixedEditor.target?.id,
                personId: v.personId,
                name: v.name,
                amountCents: toCents(v.amount),
                frequency: v.frequency as IncomeFrequency,
                startDate: v.startDate,
                endDate: v.endDate || undefined,
              }),
            'Ingreso guardado',
          )
        }
      >
        {personSelect(fixedEditor.target?.personId)}
        <Field label="Concepto">
          <input name="name" required placeholder="Sueldo" defaultValue={fixedEditor.target?.name} />
        </Field>
        <div className="field-pair">
          <Field label="Monto de cada pago">
            <MoneyInput name="amount" defaultValue={fixedEditor.target?.amountCents ? toPesosInput(fixedEditor.target.amountCents) : undefined} />
          </Field>
          <Field label="Frecuencia" hint="Quincenal se cuenta los días 15 y último de mes">
            <select name="frequency" defaultValue={fixedEditor.target?.frequency}>
              {Object.entries(FREQUENCY_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="field-pair">
          <Field label="Desde" hint="Si es semanal, define el día de la semana">
            <input name="startDate" type="date" required defaultValue={fixedEditor.target?.startDate ?? `${month}-01`} />
          </Field>
          <Field label="Hasta (opcional)">
            <input name="endDate" type="date" defaultValue={fixedEditor.target?.endDate} />
          </Field>
        </div>
      </FormDialog>

      <FormDialog
        open={variableEditor.isOpen}
        title={variableEditor.isNew ? 'Registrar ingreso variable' : 'Editar ingreso variable'}
        submitLabel="Guardar ingreso"
        onClose={variableEditor.close}
        onSubmit={(v) =>
          run(
            () =>
              services.saveVariableIncome.execute({
                id: variableEditor.target?.id,
                personId: v.personId,
                description: v.description,
                amountCents: toCents(v.amount),
                date: v.date,
              }),
            'Ingreso guardado',
          )
        }
      >
        {personSelect(variableEditor.target?.personId)}
        <Field label="Descripción">
          <input name="description" required placeholder="Proyecto freelance" defaultValue={variableEditor.target?.description} />
        </Field>
        <div className="field-pair">
          <Field label="Monto">
            <MoneyInput name="amount" defaultValue={variableEditor.target?.amountCents ? toPesosInput(variableEditor.target.amountCents) : undefined} />
          </Field>
          <Field label="Fecha en que lo recibiste">
            <input name="date" type="date" required defaultValue={variableEditor.target?.date ?? (todayISO().startsWith(month) ? todayISO() : `${month}-01`)} />
          </Field>
        </div>
      </FormDialog>
    </div>
  );
};
