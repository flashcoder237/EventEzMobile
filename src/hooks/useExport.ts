import { useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { exportAPI } from '../api';

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

export function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(
    async (
      endpoint: string,
      format: ExportFormat,
      filename: string,
      params: Record<string, string> = {}
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await exportAPI.download(endpoint, {
          ...params,
          format,
        });

        const ext = FORMAT_EXT[format];
        const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Create file using new expo-file-system API
        const file = new File(Paths.cache, `${safeName}${ext}`);

        // Convert arraybuffer to base64 and write to file
        const uint8 = new Uint8Array(response.data);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);

        file.write(base64, { encoding: 'base64' });

        // Share the file
        const sharingAvailable = await Sharing.isAvailableAsync();
        if (sharingAvailable) {
          await Sharing.shareAsync(file.uri, {
            mimeType: FORMAT_MIME[format],
            dialogTitle: `Exporter en ${format.toUpperCase()}`,
          });
        } else {
          Alert.alert(
            'Export reussi',
            `Fichier enregistre : ${safeName}${ext}`,
            [{ text: 'OK' }]
          );
        }
      } catch (err: any) {
        const msg = err?.message || 'Erreur lors de l\'export';
        setError(msg);
        Alert.alert('Erreur', msg);
        if (__DEV__) console.error('[useExport]', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { exportData, loading, error };
}
