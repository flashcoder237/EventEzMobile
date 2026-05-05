/**
 * Helpers purs (sans deps natives) extraits de `useExport`.
 *
 * Le hook `useExport` reste responsable du I/O (téléchargement, partage,
 * gestion du token JWT). Ces helpers couvrent ce qui est pure logique :
 * construction d'URL, mapping format → extension/MIME, mapping erreur →
 * message utilisateur. Tout est testable sans mocker `expo-file-system`.
 */

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export const FORMAT_EXT: Record<ExportFormat, string> = {
  csv: '.csv',
  excel: '.xlsx',
  pdf: '.pdf',
};

export const FORMAT_MIME: Record<ExportFormat, string> = {
  csv: 'text/csv',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export const FORMAT_UTI: Record<ExportFormat, string | undefined> = {
  csv: 'public.comma-separated-values-text',
  excel: 'org.openxmlformats.spreadsheetml.sheet',
  pdf: 'com.adobe.pdf',
};

export const FORMAT_LABEL: Record<ExportFormat, string> = {
  csv: 'CSV',
  excel: 'Excel',
  pdf: 'PDF',
};

/**
 * Construit l'URL d'export à partir du base URL, de l'endpoint, des params
 * arbitraires et du format.
 *
 * - Encode correctement clés/valeurs via `URLSearchParams` (espaces, accents).
 * - Filtre les valeurs `undefined`/`null`/`''` pour ne pas envoyer de params vides.
 * - Utilise `export_format` et NON `format` : DRF interprète `?format=csv`
 *   comme une format-suffix negotiation et raise Http404 si pas de renderer
 *   CSV global. L'action backend lit `export_format` en priorité.
 * - Préserve une éventuelle query string déjà présente dans l'endpoint.
 */
export function buildExportUrl(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string>,
  format: ExportFormat,
): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') {
      qs.set(k, String(v));
    }
  }
  qs.set('export_format', format);
  return `${trimmedBase}${path}${path.includes('?') ? '&' : '?'}${qs.toString()}`;
}

/**
 * Sanitize un nom de fichier pour le filesystem cache : remplace tout caractère
 * non alphanumérique (hors `_`/`-`) par `_`, tronque à 60 chars.
 */
export function sanitizeFilename(filename: string): string {
  return (filename || 'export').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}

/**
 * Mappe un message d'erreur brut (axios / native module) vers un message
 * utilisateur en français. Ordre des regex matters : les codes HTTP avant les
 * mots-clés génériques (un 401 contient parfois "Unauthorized").
 */
export function mapExportError(rawMsg: string): string {
  const msg = rawMsg || '';
  const lower = msg.toLowerCase();

  if (msg.includes('401') || lower.includes('unauthor')) {
    return 'Session expirée. Reconnectez-vous puis réessayez.';
  }
  if (msg.includes('403') || lower.includes('forbidden')) {
    return 'Vous n\'avez pas les droits pour exporter ces données.';
  }
  if (msg.includes('404')) {
    return 'Cette exportation n\'est pas disponible.';
  }
  if (lower.includes('network') || lower.includes('timeout')) {
    return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
  }
  return msg || 'Erreur lors de l\'export.';
}
