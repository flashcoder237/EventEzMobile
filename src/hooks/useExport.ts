import { useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';
import { getAccessToken, ensureFreshAccessToken } from '../api/instance';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

const FORMAT_EXT: Record<ExportFormat, string> = {
  csv: '.csv',
  excel: '.xlsx',
  pdf: '.pdf',
};

const FORMAT_MIME: Record<ExportFormat, string> = {
  csv: 'text/csv',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const FORMAT_UTI: Record<ExportFormat, string | undefined> = {
  csv: 'public.comma-separated-values-text',
  excel: 'org.openxmlformats.spreadsheetml.sheet',
  pdf: 'com.adobe.pdf',
};

function buildExportUrl(
  endpoint: string,
  params: Record<string, string>,
  format: ExportFormat,
): string {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // URLSearchParams encode correctement clés et valeurs (même avec espaces / accents).
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') {
      qs.set(k, String(v));
    }
  }
  // Utiliser `export_format` et NON `format` : DRF interprete `?format=csv`
  // comme une format-suffix negotiation et, faute de renderer CSV global,
  // `BaseContentNegotiation.filter_renderers` raise Http404. L'action backend
  // lit `export_format` en priorite (apps/registrations/views.py:1153).
  qs.set('export_format', format);
  return `${baseUrl}${path}${path.includes('?') ? '&' : '?'}${qs.toString()}`;
}

/**
 * Hook d'export (CSV / Excel / PDF) avec partage système.
 *
 * Utilise `File.downloadFileAsync` (expo-file-system) qui télécharge le binaire
 * NATIVEMENT — pas de marshaling JS via arraybuffer/btoa, pas de risque que
 * Hermes/RN renvoie le binaire en string et corrompe le fichier (problème
 * connu de axios + responseType: 'arraybuffer' en RN).
 *
 * Le token JWT est récupéré (rafraîchi si besoin) et passé en header. Sur 401
 * on retente une fois avec un access token frais.
 */
export function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (
      endpoint: string,
      format: ExportFormat,
      filename: string,
      params: Record<string, string> = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const url = buildExportUrl(endpoint, params, format);
        const ext = FORMAT_EXT[format];
        const safeName = (filename || 'export').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
        const target = new File(Paths.cache, `${safeName}${ext}`);

        const buildHeaders = (token: string | null): Record<string, string> => ({
          Accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        });

        const tryDownload = async (token: string | null) => {
          // idempotent: true → écrase si le fichier existe déjà (cache).
          return File.downloadFileAsync(url, target, {
            headers: buildHeaders(token),
            idempotent: true,
          });
        };

        let token = await getAccessToken();
        let downloaded;
        try {
          downloaded = await tryDownload(token);
        } catch (firstErr: any) {
          // downloadFileAsync rejette avec un message contenant le code HTTP.
          // Si c'est un 401, on tente un refresh puis un retry unique.
          const msg = String(firstErr?.message || '');
          if (msg.includes('401') || msg.toLowerCase().includes('unauthor')) {
            const fresh = await ensureFreshAccessToken();
            if (fresh) {
              if (__DEV__) console.log('[useExport] 401 -> refreshed, retrying');
              downloaded = await tryDownload(fresh);
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }

        // Vérifs post-download : un fichier vide ou inexistant indique un
        // problème (réponse HTML d'erreur convertie sans contenu, etc.)
        if (!downloaded || !downloaded.exists) {
          throw new Error('Le fichier n\'a pas pu être créé.');
        }
        if ((downloaded.size ?? 0) === 0) {
          // Nettoyer le fichier vide pour ne pas polluer le cache
          try { downloaded.delete(); } catch { /* ignore */ }
          throw new Error('Le fichier exporté est vide.');
        }

        // Partage système (iOS share sheet / Android intent picker)
        const sharingAvailable = await Sharing.isAvailableAsync();
        if (sharingAvailable) {
          await Sharing.shareAsync(downloaded.uri, {
            mimeType: FORMAT_MIME[format],
            dialogTitle: `Exporter en ${format.toUpperCase()}`,
            UTI: FORMAT_UTI[format],
          });
        } else {
          Alert.alert(
            'Export réussi',
            Platform.OS === 'web'
              ? `Téléchargé : ${safeName}${ext}`
              : `Fichier enregistré dans le cache : ${safeName}${ext}`,
          );
        }
      } catch (err: any) {
        const rawMsg = err?.message || '';
        // Mapper les erreurs natives en messages plus utiles à l'utilisateur.
        let msg = 'Erreur lors de l\'export.';
        if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('unauthor')) {
          msg = 'Session expirée. Reconnectez-vous puis réessayez.';
        } else if (rawMsg.includes('403') || rawMsg.toLowerCase().includes('forbidden')) {
          msg = 'Vous n\'avez pas les droits pour exporter ces données.';
        } else if (rawMsg.includes('404')) {
          msg = 'Cette exportation n\'est pas disponible.';
        } else if (rawMsg.toLowerCase().includes('network') || rawMsg.toLowerCase().includes('timeout')) {
          msg = 'Connexion impossible. Vérifiez votre réseau et réessayez.';
        } else if (rawMsg) {
          msg = rawMsg;
        }
        setError(msg);
        Alert.alert('Erreur', msg);
        if (__DEV__) console.error('[useExport]', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { exportData, loading, error };
}
