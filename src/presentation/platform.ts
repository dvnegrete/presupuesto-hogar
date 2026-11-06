/**
 * Capacidades del entorno donde corre la UI.
 * El visor de artefactos de Claude bloquea descargas iniciadas por la página (CSP frame-src),
 * así que ahí el respaldo se exporta por portapapeles en lugar de archivo.
 */
const EMBEDDED_HOSTS = ['.claudeusercontent.com'];

export const canDownloadFiles = (): boolean =>
  typeof window !== 'undefined' && !EMBEDDED_HOSTS.some((h) => window.location.hostname.endsWith(h));
