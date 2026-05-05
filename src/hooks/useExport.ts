import { useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../api/config';
import { getAccessToken, ensureFreshAccessToken } from '../api/instance';
import {
  ExportFormat,
  FORMAT_EXT,
  FORMAT_MIME,
  FORMAT_UTI,
  FORMAT_LABEL,
  buildExportUrl,
  sanitizeFilename,
  mapExportError,
} from '../lib/utils/exportHelpers';

export type { ExportFormat };

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
  const { t } = useTranslation();

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
        const url = buildExportUrl(API_BASE_URL, endpoint, params, format);
        const ext = FORMAT_EXT[format];
        const safeName = sanitizeFilename(filename);
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
            dialogTitle: t('export.shareDialog', { format: FORMAT_LABEL[format] }),
            UTI: FORMAT_UTI[format],
          });
        } else {
          const filename = `${safeName}${ext}`;
          Alert.alert(
            t('export.successTitle'),
            Platform.OS === 'web'
              ? t('export.downloadedWeb', { filename })
              : t('export.downloadedToCache', { filename }),
          );
        }
      } catch (err: any) {
        const msg = mapExportError(err?.message || '', t);
        setError(msg);
        Alert.alert(t('common.error'), msg);
        if (__DEV__) console.error('[useExport]', err);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  return { exportData, loading, error };
}
