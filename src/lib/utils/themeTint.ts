/**
 * S4 — Teinte d'événement (`theme_tint`, calculée côté serveur).
 *
 * `base` porte du texte blanc lisible (≥ 4,5:1), `onDark` reste lisible sur un
 * fond sombre. Repli : indigo de marque.
 *
 * Règles d'usage :
 *   - ambiance seulement (halo, en-tête de billet, filet, pastille) ; le
 *     dégradé de marque garde le sens « actif / réussi » ;
 *   - JAMAIS sur le QR ni sous lui (fond blanc imposé pour le scan).
 *
 * Miroir de `eventez-frontend/src/lib/utils/themeTint.ts`.
 */
export interface ThemeTint {
  base: string;
  onDark: string;
  onLight: string;
  source: 'document_style' | 'brand' | 'banner' | 'default' | string;
}

export const DEFAULT_TINT = '#4F46E5';
const HEX = /^#[0-9a-f]{6}$/i;

type TintInput = Partial<ThemeTint> | null | undefined;

export function tintBase(tint: TintInput): string {
  return tint?.base && HEX.test(tint.base) ? tint.base : DEFAULT_TINT;
}

export function tintOnDark(tint: TintInput): string {
  return tint?.onDark && HEX.test(tint.onDark) ? tint.onDark : tintBase(tint);
}

/** Teinte adaptée au thème courant (sombre → `onDark`). */
export function tintFor(tint: TintInput, isDark: boolean): string {
  return isDark ? tintOnDark(tint) : tintBase(tint);
}

/** `#RRGGBB` + alpha (0–1) → `#RRGGBBAA`, pour halos et fonds atténués. */
export function tintAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return `${HEX.test(hex) ? hex : DEFAULT_TINT}${a.toString(16).padStart(2, '0')}`;
}

/** Récupère la teinte d'un objet événement ou d'une inscription qui l'embarque. */
export function eventTint(source: any): ThemeTint | null {
  if (!source) return null;
  return (
    source.theme_tint ||
    source.event?.theme_tint ||
    source.event_detail?.theme_tint ||
    source.event_details?.theme_tint ||
    null
  );
}
