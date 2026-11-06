import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ConfirmRequest {
  readonly message: string;
  readonly action: string;
  readonly resolve: (ok: boolean) => void;
}

type Confirm = (message: string, action?: string) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Confirmación dentro de la página (sin window.confirm, que algunos entornos embebidos bloquean). */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<Confirm>(
    (message, action = 'Eliminar') => new Promise((resolve) => setRequest({ message, action, resolve })),
    [],
  );

  useEffect(() => {
    if (request && ref.current && !ref.current.open) ref.current.showModal();
  }, [request]);

  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
    ref.current?.close();
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog ref={ref} className="dialog dialog-small" onCancel={() => answer(false)} aria-labelledby="confirm-text">
        {request && (
          <>
            <p id="confirm-text" className="confirm-text">
              {request.message}
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-quiet" onClick={() => answer(false)} autoFocus>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-destructive" onClick={() => answer(true)}>
                {request.action}
              </button>
            </div>
          </>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): Confirm => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
};

/** Atajo para borrar: "¿Eliminar X? …" */
export const useConfirmDelete = () => {
  const confirm = useConfirm();
  return (what: string) => confirm(`¿Eliminar ${what}? Esta acción no se puede deshacer.`);
};
