/**
 * Utilitaires média centralisés : sauvegarde en galerie et partage de fichiers.
 *
 * Deux mécanismes distincts, alignés sur les bonnes pratiques Expo 2026 et la
 * conformité Google Play (Android 13+, pas de permission de lecture large) :
 *
 *  - `saveToGallery(uri)` : ajoute une image/vidéo à la pellicule via
 *    expo-media-library en mode WRITE-ONLY + granularPermissions ['photo'].
 *    Ne demande JAMAIS READ_MEDIA_IMAGES/VIDEO (bloquées dans app.json).
 *
 *  - `shareFile(uri, opts)` : ouvre la share sheet native (expo-sharing).
 *    Aucune permission. L'utilisateur choisit « Enregistrer dans Fichiers »,
 *    « Photos », ou une app de partage.
 *
 *  - `downloadThenShare(url, filename, opts)` : télécharge un fichier distant
 *    dans le cache puis le partage (shareAsync n'accepte que du local).
 *
 * Tous renvoient un résultat structuré { ok, reason? } : l'appelant décide des
 * toasts (succès / permission refusée / erreur), avec ses propres clés i18n.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export type MediaActionReason =
  | 'permission_denied'
  | 'sharing_unavailable'
  | 'download_failed'
  | 'error';

export interface MediaActionResult {
  ok: boolean;
  reason?: MediaActionReason;
  /** message d'erreur brut (dev/debug), jamais affiché tel quel à l'utilisateur */
  detail?: string;
}

/**
 * Sauvegarde un fichier LOCAL (file://) dans la galerie photos.
 * @param uri chemin local du fichier (doit déjà être téléchargé)
 */
export async function saveToGallery(uri: string): Promise<MediaActionResult> {
  // Import dynamique : évite un hard-fail si le natif n'est pas linké (vieux
  // build). Dans ce cas on remonte 'error' et l'appelant peut proposer le partage.
  let MediaLibrary: any;
  try {
    MediaLibrary = require('expo-media-library');
  } catch {
    return { ok: false, reason: 'error', detail: 'expo-media-library unavailable' };
  }
  if (!MediaLibrary?.saveToLibraryAsync) {
    return { ok: false, reason: 'error', detail: 'saveToLibraryAsync missing' };
  }
  try {
    // writeOnly=true + granularPermissions=['photo'] : on ne réclame que l'ajout
    // à la pellicule, jamais la lecture de la galerie (conformité Play).
    const perm = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (!perm.granted) {
      return { ok: false, reason: 'permission_denied' };
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: 'error', detail: e?.message };
  }
}

/**
 * Ouvre la share sheet native pour un fichier LOCAL.
 */
export async function shareFile(
  uri: string,
  opts?: { mimeType?: string; dialogTitle?: string; UTI?: string },
): Promise<MediaActionResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, reason: 'sharing_unavailable' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: opts?.mimeType,
      dialogTitle: opts?.dialogTitle,
      UTI: opts?.UTI,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: 'error', detail: e?.message };
  }
}

/**
 * Télécharge un fichier distant dans le cache puis le partage.
 * @param url URL distante
 * @param filename nom de fichier cible (sera assaini)
 */
export async function downloadThenShare(
  url: string,
  filename: string,
  opts?: { mimeType?: string; dialogTitle?: string; UTI?: string },
): Promise<MediaActionResult> {
  const safeName = (filename || 'fichier').replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetUri = `${FileSystem.cacheDirectory}${safeName}`;
  try {
    const info = await FileSystem.getInfoAsync(targetUri);
    if (!info.exists) {
      const result = await FileSystem.downloadAsync(url, targetUri);
      if (!result.uri) return { ok: false, reason: 'download_failed' };
    }
    return shareFile(targetUri, { ...opts, dialogTitle: opts?.dialogTitle || filename });
  } catch (e: any) {
    return { ok: false, reason: 'download_failed', detail: e?.message };
  }
}

/**
 * Télécharge un fichier distant (image) dans le cache puis le sauve en galerie.
 */
export async function downloadThenSaveToGallery(
  url: string,
  filename: string,
): Promise<MediaActionResult> {
  const safeName = (filename || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetUri = `${FileSystem.cacheDirectory}${safeName}`;
  try {
    const info = await FileSystem.getInfoAsync(targetUri);
    if (!info.exists) {
      const result = await FileSystem.downloadAsync(url, targetUri);
      if (!result.uri) return { ok: false, reason: 'download_failed' };
    }
    return saveToGallery(targetUri);
  } catch (e: any) {
    return { ok: false, reason: 'download_failed', detail: e?.message };
  }
}
