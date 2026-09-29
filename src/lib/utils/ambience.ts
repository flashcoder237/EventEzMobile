/**
 * S5 — Jetons visuels des trois registres d'ambiance (voir `getEventAmbience`
 * dans eventKind.ts). Ils ne changent que les FONDS, la FAMILLE DE TITRE et
 * l'ORDRE des sections — jamais le mouvement.
 *
 * Aucune police ajoutée : le serif de célébration est celui du système
 * (Georgia sur iOS, serif sur Android).
 */
import { Platform } from 'react-native';

/** Fond ivoire des célébrations (thème clair uniquement). */
export const CELEBRATION_IVORY = '#FBF8F1';

/** Filet doré sous le titre d'une célébration. */
export const CELEBRATION_GOLD = '#C9A961';

/** Serif système pour les titres de célébration. */
export const SERIF_FAMILY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string;
