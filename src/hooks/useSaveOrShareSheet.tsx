/**
 * Hook `useSaveOrShareSheet` — propose « Enregistrer » / « Partager » pour un
 * fichier LOCAL déjà généré (billet PDF, récap, image).
 *
 * Remplace les boutons « Télécharger » qui, avant, ouvraient directement la
 * share sheet sans laisser le choix. Ici, un tap ouvre un bottom sheet :
 *   - image  → « Enregistrer dans la galerie » + « Partager »
 *   - fichier (PDF, ics, csv…) → « Partager » (la share sheet native inclut
 *     déjà « Enregistrer dans Fichiers »)
 *
 * Les toasts (succès / permission refusée / erreur) sont gérés ici via
 * useFeedback, avec les clés i18n du namespace `media`.
 *
 * Usage :
 *   const { open, sheet } = useSaveOrShareSheet();
 *   // ...
 *   <Button onPress={() => open({ uri, kind: 'pdf', mimeType: 'application/pdf', title })} />
 *   {sheet}
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import EventActionsSheet, { EventAction } from '../components/organizer/EventActionsSheet';
import { useFeedback } from '../contexts/FeedbackContext';
import { saveToGallery, shareFile, MediaActionResult } from '../lib/media/mediaActions';

export interface SaveOrSharePayload {
  /** URI LOCAL du fichier (file://…) déjà généré/téléchargé */
  uri: string;
  /** 'image' → propose la sauvegarde galerie ; sinon partage seul */
  kind: 'image' | 'pdf' | 'file';
  mimeType?: string;
  /** UTI iOS (ex: 'com.adobe.pdf') pour un partage plus précis */
  UTI?: string;
  /** Titre du dialogue de partage + du sheet */
  title?: string;
}

export function useSaveOrShareSheet() {
  const { t } = useTranslation();
  const { toastSuccess, toastError, showError } = useFeedback();
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<SaveOrSharePayload | null>(null);

  const open = useCallback((p: SaveOrSharePayload) => {
    setPayload(p);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  // Traduit un résultat d'action média en toast/modale approprié.
  const report = useCallback(
    (res: MediaActionResult, successMsg?: string) => {
      if (res.ok) {
        if (successMsg) toastSuccess(successMsg);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* ignore */ }
        return;
      }
      switch (res.reason) {
        case 'permission_denied':
          showError(t('media.permissionDeniedTitle'), t('media.permissionDeniedMessage'));
          break;
        case 'sharing_unavailable':
          toastError(t('media.sharingUnavailable'));
          break;
        case 'download_failed':
          toastError(t('media.downloadFailed'));
          break;
        default:
          toastError(t('media.genericError'));
      }
    },
    [t, toastSuccess, toastError, showError],
  );

  const handleSave = useCallback(async () => {
    close();
    if (!payload) return;
    // Petit délai pour laisser le sheet se fermer avant l'éventuel prompt de permission.
    const res = await saveToGallery(payload.uri);
    // Si le natif media-library est absent → on retombe sur le partage.
    if (!res.ok && res.reason === 'error') {
      const shareRes = await shareFile(payload.uri, {
        mimeType: payload.mimeType, UTI: payload.UTI, dialogTitle: payload.title,
      });
      report(shareRes);
      return;
    }
    report(res, t('media.savedToGallery'));
  }, [payload, close, report, t]);

  const handleShare = useCallback(async () => {
    close();
    if (!payload) return;
    const res = await shareFile(payload.uri, {
      mimeType: payload.mimeType, UTI: payload.UTI, dialogTitle: payload.title,
    });
    report(res);
  }, [payload, close, report]);

  const actions: EventAction[] = [];
  if (payload?.kind === 'image') {
    actions.push({ label: t('media.saveToGallery'), icon: 'download-outline', onPress: handleSave });
  }
  actions.push({ label: t('media.share'), icon: 'share-outline', onPress: handleShare });

  const sheet = (
    <EventActionsSheet
      visible={visible}
      onClose={close}
      title={payload?.title || t('media.sheetTitle')}
      sections={[{ actions }]}
    />
  );

  return { open, sheet };
}

export default useSaveOrShareSheet;
