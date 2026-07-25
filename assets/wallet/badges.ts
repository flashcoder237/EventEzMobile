import type { ImageSourcePropType } from 'react-native';

/**
 * Manifeste des badges officiels Wallet.
 *
 * Metro exige des `require()` LITTÉRAUX résolus au bundling : on ne peut pas
 * `require()` un fichier absent (ça casse le build). Ce module centralise donc le
 * branchement : par défaut tout est `null` → `AddToWalletButton` affiche le bouton
 * générique (fonctionnel, mais non conforme store).
 *
 * POUR ACTIVER LES BADGES OFFICIELS :
 *   1. Dépose les PNG dans ce dossier (cf. README.md — artworks Apple/Google tels
 *      quels, @1x/@2x/@3x, fond transparent).
 *   2. Décommente les require() correspondants ci-dessous.
 * Rien d'autre à toucher : le composant bascule automatiquement sur l'image.
 */

type Platform = 'apple' | 'google';
type Lang = 'fr' | 'en';

const BADGES: Record<Platform, Record<Lang, ImageSourcePropType | null>> = {
  apple: {
    // fr: require('./add-to-apple-wallet-fr.png'),
    // en: require('./add-to-apple-wallet-en.png'),
    fr: null,
    en: null,
  },
  google: {
    // fr: require('./save-to-google-wallet-fr.png'),
    // en: require('./save-to-google-wallet-en.png'),
    fr: null,
    en: null,
  },
};

/** Renvoie le badge officiel pour la plateforme + langue, ou null si non fourni. */
export function officialWalletBadge(
  platform: Platform,
  language: string,
): ImageSourcePropType | null {
  const lang: Lang = language === 'en' ? 'en' : 'fr';
  return BADGES[platform][lang];
}
