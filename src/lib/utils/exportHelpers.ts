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

/** Catégorie d'erreur d'export — sortie de `classifyExportError`. */
export type ExportErrorKind = 'session_expired' | 'forbidden' | 'not_available' | 'network' | 'unknown';

/**
 * Catégorise un message d'erreur brut (axios / native module).
 * Ordre des regex matters : les codes HTTP avant les mots-clés génériques (un
 * 401 contient parfois "Unauthorized").
 *
 * Pure → testable sans i18n. Le hook React appelle `mapExportError` qui mappe
 * la catégorie vers le texte traduit.
 */
export function classifyExportError(rawMsg: string): ExportErrorKind {
  const msg = rawMsg || '';
  const lower = msg.toLowerCase();

  if (msg.includes('401') || lower.includes('unauthor')) return 'session_expired';
  if (msg.includes('403') || lower.includes('forbidden')) return 'forbidden';
  if (msg.includes('404')) return 'not_available';
  if (lower.includes('network') || lower.includes('timeout')) return 'network';
  return 'unknown';
}

// Fallback français si pas de translator fourni — préserve le comportement
// existant pour les callers non-React (services, tests).
const DEFAULT_FR_MESSAGES: Record<ExportErrorKind, string> = {
  session_expired: 'Session expirée. Reconnectez-vous puis réessayez.',
  forbidden: 'Vous n\'avez pas les droits pour exporter ces données.',
  not_available: 'Cette exportation n\'est pas disponible.',
  network: 'Connexion impossible. Vérifiez votre réseau et réessayez.',
  unknown: 'Erreur lors de l\'export.',
};

const I18N_KEYS: Record<ExportErrorKind, string> = {
  session_expired: 'exportErrors.sessionExpired',
  forbidden: 'exportErrors.forbidden',
  not_available: 'exportErrors.notAvailable',
  network: 'exportErrors.network',
  unknown: 'exportErrors.generic',
};

/**
 * Mappe un message d'erreur brut vers un message utilisateur.
 *
 * - Si `translate` (de useTranslation) est fourni → message traduit i18n.
 * - Sinon → fallback français hardcodé (compat existante).
 * - Pour `unknown`, on préfère renvoyer le message brut s'il est non vide
 *   (utile pour debug : "Le fichier exporté est vide" reste plus parlant
 *   que "Erreur lors de l'export").
 */
export function mapExportError(
  rawMsg: string,
  translate?: (key: string) => string,
): string {
  const kind = classifyExportError(rawMsg);
  if (kind === 'unknown' && rawMsg) return rawMsg;
  if (translate) return translate(I18N_KEYS[kind]);
  return DEFAULT_FR_MESSAGES[kind];
}
