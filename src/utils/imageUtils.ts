/**
 * Helpers images mobile : resolution URL + placeholder LQIP.
 *
 * Les placeholders proviennent du backend (data URI JPEG base64 ~800 bytes).
 * Utilises avec expo-image via la prop `placeholder`.
 */
import { getMediaUrl } from '../api';

// Placeholder data URI neutre (gris clair 10x10, 43 bytes) utilise en fallback
// quand le backend n'a pas encore genere de LQIP pour une image donnee.
export const DEFAULT_BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhCgAKAIAAAO/v7wAAACH5BAAAAAAALAAAAAAKAAoAAAIIhI+py+0PYysAOw==';

type EventLike = {
  display_image?: string | null;
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
    | null;
};

/**
 * Retourne l'URL absolue de l'image d'un evenement.
 * Cascade : display_image -> banner_image -> category.default_event_image.
 */
export function getEventImageUri(event: EventLike): string | null {
  const path =
    event.display_image ||
    event.banner_image ||
    (event.category && typeof event.category === 'object'
      ? event.category.default_event_image
      : null);
  return getMediaUrl(path ?? null);
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
export function getEventImageProps(event: EventLike) {
  return {
    source: getEventImageUri(event),
    placeholder: getEventPlaceholder(event),
  };
}
