import { useEffect, useRef, type ReactNode } from 'react';

interface FormDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly submitLabel: string;
  readonly onClose: () => void;
  /** Recibe los valores del formulario; si devuelve true se cierra el diálogo. */
  readonly onSubmit: (values: Record<string, string>) => Promise<boolean>;
  readonly children: ReactNode;
}

/** Diálogo nativo (<dialog>): foco atrapado, Esc para cerrar y accesible sin dependencias. */
export const FormDialog = ({ open, title, submitLabel, onClose, onSubmit, children }: FormDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="dialog-title">
      {open && (
        <form
          method="dialog"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
            if (await onSubmit(values)) onClose();
          }}
        >
          <h2 id="dialog-title">{title}</h2>
          <div className="dialog-fields">{children}</div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {submitLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
};

interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly children: ReactNode;
}

export const Field = ({ label, hint, children }: FieldProps) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export const MoneyInput = ({ name, defaultValue }: { name: string; defaultValue?: string }) => (
  <span className="money-input">
    <span aria-hidden="true">$</span>
    <input name={name} type="number" inputMode="decimal" min="0.01" step="0.01" required defaultValue={defaultValue} />
  </span>
);

export const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="section">
    <header className="section-head">
      <h2>{title}</h2>
      {action}
    </header>
    {children}
  </section>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;

interface RowProps {
  readonly title: ReactNode;
  readonly detail?: ReactNode;
  readonly amount?: ReactNode;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly children?: ReactNode;
}

export const Row = ({ title, detail, amount, onEdit, onDelete, children }: RowProps) => (
  <li className="row">
    <div className="row-main">
      <span className="row-title">{title}</span>
      {detail && <span className="row-detail">{detail}</span>}
      {children}
    </div>
    {amount !== undefined && <span className="row-amount">{amount}</span>}
    {(onEdit || onDelete) && (
      <span className="row-actions">
        {onEdit && (
          <button type="button" className="btn btn-quiet btn-small" onClick={onEdit}>
            Editar
          </button>
        )}
        {onDelete && (
          <button type="button" className="btn btn-quiet btn-small btn-danger" onClick={onDelete}>
            Eliminar
          </button>
        )}
      </span>
    )}
  </li>
);
