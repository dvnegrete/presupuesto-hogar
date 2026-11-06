import { useMemo } from 'react';
import type { CreditCard, InstallmentPurchase } from '@domain/entities';
import { useBudget } from '../di/BudgetContext';
import { Empty, Field, FormDialog, MoneyInput, Row, Section } from '../components/ui';
import { dateLabel, money, monthName, toCents, toPesosInput, todayISO } from '../format';
import { useEditor } from '../hooks/useEditor';
import { useConfirmDelete } from '../components/ConfirmProvider';

export const CardsPage = () => {
  const { data, services, run, month } = useBudget();
  const confirmDelete = useConfirmDelete();
  const cardEditor = useEditor<CreditCard>();
  const purchaseEditor = useEditor<InstallmentPurchase>();
  const statuses = useMemo(() => services.getPurchaseStatuses.execute(month, data), [services, month, data]);

  return (
    <div className="page">
      <Section
        title="Tarjetas de crédito"
        action={
          <button className="btn" onClick={() => cardEditor.openNew()}>
            Agregar tarjeta
          </button>
        }
      >
        {data.cards.length === 0 && (
          <Empty>Agrega tus tarjetas con su día de corte y de pago; así cada mensualidad cae en el mes en que realmente la pagas.</Empty>
        )}
        <div className="cards">
          {data.cards.map((card) => {
            const purchases = data.purchases.filter((p) => p.cardId === card.id);
            const active = purchases.filter((p) => (statuses.get(p.id)?.remainingCents ?? 0) > 0);
            const pendingCents = active.reduce((acc, p) => acc + (statuses.get(p.id)?.remainingCents ?? 0), 0);
            return (
              <article key={card.id} className="card">
                <header className="card-head">
                  <div>
                    <h3>{card.name}</h3>
                    <p className="row-detail">
                      Corte el día {card.cutoffDay} · paga el día {card.paymentDay}
                      {card.paymentDay <= card.cutoffDay ? ' del mes siguiente' : ''}
                    </p>
                  </div>
                  <div className="card-total">
                    <span className="row-detail">Por pagar en MSI</span>
                    <strong>{money(pendingCents)}</strong>
                  </div>
                </header>

                {purchases.length === 0 ? (
                  <Empty>Sin compras a meses en esta tarjeta.</Empty>
                ) : (
                  <ul className="list">
                    {purchases.map((p) => {
                      const s = statuses.get(p.id);
                      const done = s && s.remainingCents === 0;
                      return (
                        <Row
                          key={p.id}
                          title={p.description}
                          detail={
                            s &&
                            (done
                              ? `Liquidada el ${dateLabel(s.lastDueDate)}`
                              : s.paidCount === 0
                                ? `Primera mensualidad: ${dateLabel(s.firstDueDate)} · última: ${dateLabel(s.lastDueDate)}`
                                : `Llevas ${s.paidCount} de ${p.months} a ${monthName(month)} · faltan ${money(s.remainingCents)} · última: ${dateLabel(s.lastDueDate)}`)
                          }
                          amount={s ? `${money(s.installmentCents)} × ${p.months}` : undefined}
                          onEdit={() => purchaseEditor.openEdit(p)}
                          onDelete={async () => (await confirmDelete(p.description)) && run(() => services.deletePurchase.execute(p.id), 'Compra eliminada')}
                        >
                          {s && (
                            <span className={`progress${done ? ' progress-done' : ''}`} aria-hidden="true">
                              <span style={{ width: `${(s.paidCount / p.months) * 100}%` }} />
                            </span>
                          )}
                        </Row>
                      );
                    })}
                  </ul>
                )}

                <footer className="card-actions">
                  <button className="btn btn-primary" onClick={() => purchaseEditor.openNew({ cardId: card.id })}>
                    Agregar compra a MSI
                  </button>
                  <button className="btn btn-quiet" onClick={() => cardEditor.openEdit(card)}>
                    Editar tarjeta
                  </button>
                  <button
                    className="btn btn-quiet btn-danger"
                    onClick={async () => (await confirmDelete(`la tarjeta ${card.name}`)) && run(() => services.deleteCard.execute(card.id), 'Tarjeta eliminada')}
                  >
                    Eliminar
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </Section>

      <FormDialog
        open={cardEditor.isOpen}
        title={cardEditor.isNew ? 'Agregar tarjeta' : 'Editar tarjeta'}
        submitLabel="Guardar tarjeta"
        onClose={cardEditor.close}
        onSubmit={(v) =>
          run(
            () =>
              services.saveCard.execute({
                id: cardEditor.target?.id,
                name: v.name,
                cutoffDay: Number(v.cutoffDay),
                paymentDay: Number(v.paymentDay),
              }),
            'Tarjeta guardada',
          )
        }
      >
        <Field label="Nombre" hint="Para reconocerla; no captures el número de tarjeta">
          <input name="name" required placeholder="BBVA Azul" defaultValue={cardEditor.target?.name} />
        </Field>
        <div className="field-pair">
          <Field label="Día de corte">
            <input name="cutoffDay" type="number" min="1" max="31" required defaultValue={cardEditor.target?.cutoffDay} />
          </Field>
          <Field label="Día límite de pago" hint="Si es menor al corte, cae el mes siguiente">
            <input name="paymentDay" type="number" min="1" max="31" required defaultValue={cardEditor.target?.paymentDay} />
          </Field>
        </div>
      </FormDialog>

      <FormDialog
        open={purchaseEditor.isOpen}
        title={purchaseEditor.isNew ? 'Agregar compra a meses sin intereses' : 'Editar compra a MSI'}
        submitLabel="Guardar compra"
        onClose={purchaseEditor.close}
        onSubmit={(v) =>
          run(
            () =>
              services.savePurchase.execute({
                id: purchaseEditor.target?.id,
                cardId: v.cardId,
                description: v.description,
                totalCents: toCents(v.total),
                months: Number(v.months),
                purchaseDate: v.purchaseDate,
              }),
            'Compra guardada',
          )
        }
      >
        <Field label="Tarjeta">
          <select name="cardId" required defaultValue={purchaseEditor.target?.cardId}>
            {data.cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="¿Qué compraste?">
          <input name="description" required placeholder="Refrigerador" defaultValue={purchaseEditor.target?.description} />
        </Field>
        <div className="field-pair">
          <Field label="Monto total">
            <MoneyInput name="total" defaultValue={purchaseEditor.target?.totalCents ? toPesosInput(purchaseEditor.target.totalCents) : undefined} />
          </Field>
          <Field label="Meses">
            <input name="months" type="number" min="2" max="48" required list="msi-months" defaultValue={purchaseEditor.target?.months ?? 12} />
            <datalist id="msi-months">
              {[3, 6, 9, 12, 18, 24].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Fecha de compra" hint="Define en qué corte entra la primera mensualidad">
          <input name="purchaseDate" type="date" required defaultValue={purchaseEditor.target?.purchaseDate ?? todayISO()} />
        </Field>
      </FormDialog>
    </div>
  );
};
