import { useRef, useState } from 'react';
import { useBudget } from '../di/BudgetContext';
import { useConfirm } from '../components/ConfirmProvider';
import { Section } from '../components/ui';
import { todayISO } from '../format';
import { canDownloadFiles } from '../platform';

export const SettingsPage = () => {
  const { services, run } = useBudget();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fallbackJson, setFallbackJson] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const downloads = canDownloadFiles();

  const backupJson = async () => JSON.stringify(await services.exportBackup.execute(), null, 2);

  const download = async () => {
    const url = URL.createObjectURL(new Blob([await backupJson()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `presupuesto-${todayISO()}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copy = async () => {
    const json = await backupJson();
    try {
      await navigator.clipboard.writeText(json);
      setFallbackJson(null);
      await run(async () => undefined, 'Respaldo copiado. Pégalo en un archivo .json o en una nota.');
    } catch {
      // Portapapeles bloqueado: se muestra el texto para copiarlo a mano.
      setFallbackJson(json);
    }
  };

  const restoreFrom = async (readJson: () => Promise<string>) => {
    if (!(await confirm('Restaurar reemplaza todos los datos actuales por los del respaldo.', 'Restaurar'))) return;
    const ok = await run(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readJson());
      } catch {
        throw new Error('El texto no es un JSON válido. Copia el respaldo completo, desde la primera { hasta la última }.');
      }
      await services.importBackup.execute(parsed);
    }, 'Respaldo restaurado');
    if (ok) {
      setPasted('');
      setPasteOpen(false);
    }
  };

  return (
    <div className="page">
      <Section title="Tus datos">
        <p className="prose">
          Todo se guarda solo en este navegador. No se envía a ningún servidor. Para cambiar de navegador o dispositivo, guarda un respaldo
          y restáuralo allá.
        </p>
        {!downloads && (
          <p className="prose">
            En esta vista no se pueden descargar archivos. Copia el respaldo y guárdalo en un archivo <code>.json</code> o en una nota; para
            restaurarlo, pégalo o elige ese archivo.
          </p>
        )}
        <div className="hero-actions">
          {downloads && (
            <button className="btn btn-primary" onClick={download}>
              Descargar respaldo
            </button>
          )}
          <button className={downloads ? 'btn' : 'btn btn-primary'} onClick={copy}>
            Copiar respaldo
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Restaurar desde archivo
          </button>
          <button className="btn" onClick={() => setPasteOpen((v) => !v)} aria-expanded={pasteOpen}>
            Pegar respaldo
          </button>
          <input
            ref={fileRef}
            id="restore-file"
            type="file"
            accept="application/json,.json,.txt"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void restoreFrom(() => file.text());
            }}
          />
        </div>

        {fallbackJson && (
          <label className="field backup-text">
            <span className="field-label">El portapapeles está bloqueado aquí. Selecciona todo el texto y cópialo.</span>
            <textarea id="backup-text" readOnly rows={10} value={fallbackJson} onFocus={(e) => e.currentTarget.select()} />
          </label>
        )}

        {pasteOpen && (
          <form
            className="backup-text"
            onSubmit={(e) => {
              e.preventDefault();
              void restoreFrom(async () => pasted);
            }}
          >
            <label className="field">
              <span className="field-label">Pega aquí el respaldo</span>
              <textarea id="paste-backup" rows={10} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"app":"presupuesto-hogar", …}' />
            </label>
            <div className="hero-actions">
              <button type="submit" className="btn btn-primary" disabled={!pasted.trim()}>
                Restaurar respaldo pegado
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
};
