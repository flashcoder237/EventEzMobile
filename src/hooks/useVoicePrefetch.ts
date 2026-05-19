/**
 * useVoicePrefetch — telecharge automatiquement les voice attachments en
 * arriere-plan vers le FileSystem cache local, pour que le tap "play"
 * soit instantane au lieu d'attendre le stream HTTP.
 *
 * Strategie :
 *  - Scan `messages` au mount + a chaque changement (nouveau msg WS)
 *  - Telecharge les voices non encore caches, max N en parallele
 *  - LRU : on garde max 20 voices caches (~100MB worst case, voice = 5MB max)
 *  - Skip total si reseau lent ou offline (preferer le stream a la demande)
 *  - Utilise expo-file-system/legacy (compatible Expo 52)
 *
 * Lookup synchrone via getCachedVoiceUri(remoteUrl) — le player utilise le
 * fichier local si dispo, sinon stream HTTP normal.
 */
import { useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { useNetworkSpeed } from './useNetworkSpeed';

const MAX_CACHED_VOICES = 20;
const MAX_PARALLEL_DOWNLOADS = 3;
const CACHE_DIR = `${FileSystem.cacheDirectory}voice_cache/`;

// Map remoteUrl -> localUri (en memoire, partage entre tous les composants
// qui importent ce module). Persiste tant que l'app vit ; les fichiers
// physiques survivent au redemarrage de l'app (cache OS), on rehydrate
// la map au prochain mount via scanDir().
const cacheMap = new Map<string, string>();
// Ordre LRU : derniere cle utilisee en queue. Pour l'eviction.
const lruOrder: string[] = [];
// Fichiers en cours de download — evite les races (meme URL lancee 2x)
const inFlight = new Set<string>();

let dirInitialized = false;

async function ensureCacheDir(): Promise<void> {
  if (dirInitialized) return;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
    dirInitialized = true;
  } catch {
    // FS unavailable — on degrade silencieusement, le stream HTTP prend le relai
  }
}

/**
 * Nom de fichier deterministe pour une URL distante. Hash FNV-style +
 * longueur pour minimiser les collisions. Pas reversible — la rehydratation
 * apres restart se fait via getInfoAsync() dans downloadOne() (si le fichier
 * existe deja sur disque, on saute le download et on map juste).
 */
function urlToFilename(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  const ext = url.split('.').pop()?.split('?')[0]?.slice(0, 5) || 'm4a';
  return `v_${Math.abs(hash).toString(36)}_${url.length}.${ext}`;
}

function touchLRU(url: string): void {
  const idx = lruOrder.indexOf(url);
  if (idx !== -1) lruOrder.splice(idx, 1);
  lruOrder.push(url);
}

async function evictIfNeeded(): Promise<void> {
  while (lruOrder.length > MAX_CACHED_VOICES) {
    const oldest = lruOrder.shift();
    if (!oldest) break;
    const local = cacheMap.get(oldest);
    cacheMap.delete(oldest);
    if (local) {
      try {
        await FileSystem.deleteAsync(local, { idempotent: true });
      } catch {
        // silent
      }
    }
  }
}

async function downloadOne(remoteUrl: string): Promise<void> {
  if (cacheMap.has(remoteUrl) || inFlight.has(remoteUrl)) return;
  inFlight.add(remoteUrl);
  try {
    await ensureCacheDir();
    const filename = urlToFilename(remoteUrl);
    const local = `${CACHE_DIR}${filename}`;
    // Si fichier deja sur disque (sans entree map — corner case), on le map
    const info = await FileSystem.getInfoAsync(local);
    if (info.exists) {
      cacheMap.set(remoteUrl, local);
      touchLRU(remoteUrl);
      return;
    }
    const result = await FileSystem.downloadAsync(remoteUrl, local);
    if (result.status === 200) {
      cacheMap.set(remoteUrl, local);
      touchLRU(remoteUrl);
      await evictIfNeeded();
    }
  } catch {
    // Download failed (404, network) — silent, le stream HTTP prendra le relai
  } finally {
    inFlight.delete(remoteUrl);
  }
}

/**
 * Lookup synchrone : retourne l'URI locale si le voice est deja cache,
 * sinon l'URL distante (pour fallback streaming).
 */
export function getCachedVoiceUri(remoteUrl: string | null | undefined): string {
  if (!remoteUrl) return '';
  const local = cacheMap.get(remoteUrl);
  if (local) {
    touchLRU(remoteUrl);
    return local;
  }
  return remoteUrl;
}

// ============================================================================
// SENT VOICE CACHE — pour les voices QUE NOUS VENONS D'ENVOYER
// ============================================================================
// Le useVoicePrefetch ci-dessus prefetche les voices DISTANTS (recus). Mais
// pour les voices que NOUS venons d'envoyer, on a deja le file:// local sur
// disque (le fichier enregistre par le micro). C'est gachis de le re-streamer
// depuis le backend juste apres l'upload — d'autant que le backend peut etre
// lent a servir le fichier juste apres ecriture (cache CDN froid, etc.) →
// l'user voit le player "tourner" sans son.
//
// Solution : indexer le file:// local par attachment_id du backend, des que
// l'upload renvoie l'id. La lecture utilise ce local en priorite. Cleanup :
// au logout (cf clearSentVoiceCache) ; sinon TTL via LRU 50 entries
// (~5MB/voice ≈ 250MB worst case, mais en pratique l'user n'envoie pas tant
// de voices d'affilée).
const sentVoiceMap = new Map<string, string>(); // attachment_id → file://...
const sentLruOrder: string[] = [];
const MAX_SENT_VOICES = 50;

function touchSentLRU(attachmentId: string): void {
  const idx = sentLruOrder.indexOf(attachmentId);
  if (idx !== -1) sentLruOrder.splice(idx, 1);
  sentLruOrder.push(attachmentId);
}

/**
 * A appeler juste apres un upload voice reussi pour memoriser que ce
 * `attachment_id` correspond au fichier local `localUri` du sender. Le player
 * preferera ce local au stream distant.
 */
export function registerSentVoice(attachmentId: string | null | undefined, localUri: string): void {
  if (!attachmentId || !localUri || !localUri.startsWith('file:')) return;
  sentVoiceMap.set(String(attachmentId), localUri);
  touchSentLRU(String(attachmentId));
  // Eviction LRU
  while (sentLruOrder.length > MAX_SENT_VOICES) {
    const oldest = sentLruOrder.shift();
    if (oldest) sentVoiceMap.delete(oldest);
  }
}

/**
 * Lookup synchrone : si on a envoye ce voice nous-meme, retourne le file://
 * local (jouable instantanement). Sinon, null.
 */
export function getSentVoiceUri(attachmentId: string | null | undefined): string | null {
  if (!attachmentId) return null;
  const local = sentVoiceMap.get(String(attachmentId));
  if (local) {
    touchSentLRU(String(attachmentId));
    return local;
  }
  return null;
}

/**
 * Purge le cache sent-voice. Appele au logout (privacy cross-account).
 */
export function clearSentVoiceCache(): void {
  sentVoiceMap.clear();
  sentLruOrder.length = 0;
}

/**
 * Purge tout le cache disque + memoire. A appeler au logout (cross-account
 * privacy : eviter d'exposer des voices d'un user a un autre).
 */
export async function clearVoiceCache(): Promise<void> {
  cacheMap.clear();
  lruOrder.length = 0;
  inFlight.clear();
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    dirInitialized = false;
  } catch {
    // silent
  }
}

/**
 * Hook a monter dans ConversationScreen. Scanne `messages` et declenche le
 * download en arriere-plan des voices non encore caches. Skip si reseau
 * lent ou offline.
 */
export function useVoicePrefetch(messages: any[]): void {
  const { isOffline, isSlowCellular } = useNetworkSpeed();
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isOffline || isSlowCellular) return;
    if (!messages || messages.length === 0) return;

    // Collecte des URLs de voice non encore traitees
    const queue: string[] = [];
    for (const msg of messages) {
      if (msg.is_deleted) continue;
      const voice = (msg.attachments || []).find(
        (a: any) => a.attachment_type === 'voice',
      );
      if (!voice) continue;
      const uri = typeof voice.file === 'string' ? voice.file : voice.file?.uri;
      if (!uri) continue;
      // Skip local files (pending optimistic sends — file://)
      if (uri.startsWith('file://')) continue;
      if (processedRef.current.has(uri)) continue;
      processedRef.current.add(uri);
      queue.push(uri);
    }

    if (queue.length === 0) return;

    // Telecharge MAX_PARALLEL en simultane, par batch
    let cancelled = false;
    (async () => {
      await ensureCacheDir();
      for (let i = 0; i < queue.length; i += MAX_PARALLEL_DOWNLOADS) {
        if (cancelled) return;
        const batch = queue.slice(i, i + MAX_PARALLEL_DOWNLOADS);
        await Promise.allSettled(batch.map((url) => downloadOne(url)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, isOffline, isSlowCellular]);
}
