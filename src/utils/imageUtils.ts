/**
 * Helpers images mobile : resolution URL + placeholder LQIP + variantes
 * redimensionnées + prefetch.
 *
 * Les placeholders proviennent du backend (data URI JPEG base64 ~800 bytes).
 * Utilises avec expo-image via la prop `placeholder`.
 */
import { Image } from 'expo-image';
import { getMediaUrl } from '../api';

// Placeholder data URI neutre (gris clair 10x10, 43 bytes) utilise en fallback
// quand le backend n'a pas encore genere de LQIP pour une image donnee.
export const DEFAULT_BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhCgAKAIAAAO/v7wAAACH5BAAAAAAALAAAAAAKAAoAAAIIhI+py+0PYysAOw==';

type EventLike = {
  display_image?: string | null;
  display_image_thumb?: string | null;
  display_image_medium?: string | null;
  banner_image?: string | null;
  display_placeholder?: string | null;
  banner_placeholder?: string | null;
  category?:
    | {
        default_event_image?: string | null;
        default_event_image_placeholder?: string | null;
        [key: string]: any;
      }
    | string
    | number
    | null;
};

/**
 * Taille d'image d'événement :
 *  - `thumb`  : WebP 400px — petites cartes de liste (horizontales, compactes, carte)
 *  - `medium` : WebP 960px — héros, carrousel vedette, cartes pleine largeur
 *  - `full`   : image originale
 */
export type EventImageSize = 'thumb' | 'medium' | 'full';

function fullImagePath(event: EventLike): string | null {
  return (
    event.display_image ||
    event.banner_image ||
    (event.category && typeof event.category === 'object'
      ? event.category.default_event_image
      : null) ||
    null
  );
}

/**
 * URL absolue de l'image d'un événement à la taille demandée.
 * Les variantes (`display_image_thumb` / `display_image_medium`) sont `null`
 * tant que le backend ne les a pas générées : on retombe alors sur la taille
 * supérieure, puis sur l'original (display_image → banner_image → catégorie).
 */
export function getEventImageUrl(
  event: EventLike | null | undefined,
  size: EventImageSize = 'full',
): string | null {
  if (!event) return null;
  let path: string | null | undefined = null;
  if (size === 'thumb') path = event.display_image_thumb || event.display_image_medium;
  else if (size === 'medium') path = event.display_image_medium;
  return getMediaUrl((path || fullImagePath(event)) ?? null);
}

/**
 * Retourne l'URL absolue de l'image d'un evenement (originale).
 * Cascade : display_image -> banner_image -> category.default_event_image.
 */
export function getEventImageUri(event: EventLike): string | null {
  return getEventImageUrl(event, 'full');
}

/**
 * Retourne le placeholder LQIP d'un evenement (data URI JPEG blurre).
 * Cascade : display_placeholder -> banner_placeholder -> category -> default.
 */
export function getEventPlaceholder(event: EventLike): string {
  if (event.display_placeholder) return event.display_placeholder;
  if (event.banner_placeholder) return event.banner_placeholder;
  if (
    event.category &&
    typeof event.category === 'object' &&
    event.category.default_event_image_placeholder
  ) {
    return event.category.default_event_image_placeholder;
  }
  return DEFAULT_BLUR_DATA_URL;
}

/**
 * Shortcut : retourne `{ uri, placeholder }` pret a etre spread dans expo-image.
 * Usage : <Image {...getEventImageProps(event)} contentFit="cover" transition={300} />
 */
export function getEventImageProps(event: EventLike, size: EventImageSize = 'full') {
  return {
    source: getEventImageUrl(event, size),
    placeholder: getEventPlaceholder(event),
  };
}

// ─── Prefetch ────────────────────────────────────────────────────────────────
// Garde-fou anti « prefetch storm » : chaque URL n'est demandée qu'une fois par
// session (Set borné), et un lot est plafonné à PREFETCH_BATCH_MAX URLs.
const PREFETCH_BATCH_MAX = 10;
const PREFETCH_MEMO_MAX = 300;
const prefetched = new Set<string>();

function markPrefetched(url: string) {
  if (prefetched.size >= PREFETCH_MEMO_MAX) {
    // Set conserve l'ordre d'insertion → on évince la plus ancienne.
    const oldest = prefetched.values().next().value;
    if (oldest !== undefined) prefetched.delete(oldest);
  }
  prefetched.add(url);
}

/** Prefetch (memory-disk) d'une liste d'URLs, dédupliquée et plafonnée. */
export function prefetchImageUrls(urls: Array<string | null | undefined>, max = PREFETCH_BATCH_MAX): void {
  const batch: string[] = [];
  for (const u of urls) {
    if (batch.length >= max) break;
    if (!u || u.startsWith('data:') || prefetched.has(u) || batch.includes(u)) continue;
    batch.push(u);
  }
  if (batch.length === 0) return;
  batch.forEach(markPrefetched);
  try {
    const p = (Image as any)?.prefetch?.(batch, 'memory-disk');
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    // Prefetch = optimisation pure : jamais bloquant.
  }
}

/**
 * À appeler sur `onPressIn` d'une carte : précharge l'image du héros de
 * l'écran détail (medium, sinon originale) pendant l'animation de press.
 */
export function prefetchEventHero(event: EventLike | null | undefined): void {
  if (!event) return;
  prefetchImageUrls([getEventImageUrl(event, 'medium')], 1);
}

/** Précharge les vignettes d'une page de liste qui vient d'arriver (≤ 10). */
export function prefetchEventThumbs(events: Array<EventLike | null | undefined>, max = PREFETCH_BATCH_MAX): void {
  prefetchImageUrls(
    events.slice(0, max).map((e) => getEventImageUrl(e, 'thumb')),
    max,
  );
}
