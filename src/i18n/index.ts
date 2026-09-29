/**
 * i18n Configuration
 *
 * Perf démarrage : seule la langue INITIALE (déduite de la locale device) est
 * évaluée au boot. fr.json (~380KB) et en.json (~350KB) restent tous deux
 * bundlés (base offline), mais la seconde n'est `require()`-ée qu'à la demande
 * (`ensureBundledLanguage`), soit :
 *  - quand l'utilisateur/la préférence stockée bascule dessus (`changeLanguage`),
 *  - en tâche de fond après le boot quand il s'agit de `en` (fallbackLng), pour
 *    qu'une clé FR manquante retombe bien sur l'anglais.
 * Metro embarque les deux JSON (require littéral, statiquement analysable) ;
 * seule leur ÉVALUATION est différée.
 *
 * Stratégie de résolution de la langue active :
 * 1. Init synchrone avec la langue du device (défaut = FR sauf si device = en)
 * 2. Override async via AsyncStorage (`i18nReady`) : si une préférence est déjà
 *    persistée (auto-détectée ou changée depuis Paramètres), on l'applique.
 * Les autres langues (es, pt…) sont chargées en OTA (cf. ./translations).
 *
 * NB : il n'y a PAS d'écran de choix de langue au premier launch. La langue est
 * auto-détectée depuis la locale du device (cf. RootNavigator) ; l'utilisateur
 * la change ensuite dans Paramètres. (Un ancien LanguagePickerScreen a été retiré.)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { getRemoteTranslation } from './translations';

export const LANGUAGE_STORAGE_KEY = '@eventez_language';

/**
 * Marque une langue CHOISIE EXPLICITEMENT par l'utilisateur (Onboarding ou
 * Paramètres), par opposition à une langue auto-détectée depuis la locale du
 * device et persistée silencieusement.
 *
 * Nécessaire car les deux écrivaient dans la même clé : impossible de savoir si
 * un `en` stocké venait d'un vrai choix ou d'une auto-détection. La migration
 * ci-dessous ne doit corriger QUE les auto-détections.
 */
export const LANGUAGE_EXPLICIT_KEY = '@eventez_language_explicit';

/**
 * Version de la migration de préférence de langue. Incrémenter invalide la
 * migration précédente et la rejoue une fois.
 */
const LANGUAGE_MIGRATION_KEY = '@eventez_language_migration';
const LANGUAGE_MIGRATION_VERSION = '1';

const deviceLocale = getLocales()[0]?.languageCode ?? 'fr';
// Default = FRANÇAIS, aligné sur le backend (apps/core/i18n.py DEFAULT_LANG='fr'
// et settings.LANGUAGE_CODE='fr'). Anglais uniquement si le device est
// explicitement en `en`.
//
// Avant : le défaut était `en`, si bien qu'un device réglé sur une langue
// tierce (ou mal détecté) affichait une UI anglaise ALORS QUE le backend
// répondait en français — d'où les écrans mi-anglais mi-français remontés par
// les testeurs (libellés i18next en EN, erreurs de validation en FR), et les
// catégories en anglais (le header `Accept-Language: en` était envoyé à l'API).
const initialLang: 'fr' | 'en' = deviceLocale === 'en' ? 'en' : 'fr';

// fr + en sont toujours bundlés : base offline + langue de fallback universelle.
// `require` DANS une fonction : Metro bundle les deux fichiers mais aucun n'est
// évalué tant qu'on ne l'appelle pas. Les littéraux doivent rester statiques.
function requireBundledTranslation(lang: 'fr' | 'en'): Record<string, any> {
  return lang === 'en' ? require('./locales/en.json') : require('./locales/fr.json');
}

/**
 * Ajoute à i18next la ressource bundlée `fr`/`en` si elle n'y est pas encore.
 * No-op pour toute autre langue (OTA, cf. loadLanguage) ou si déjà présente.
 */
export function ensureBundledLanguage(lang: string): void {
  if (lang !== 'fr' && lang !== 'en') return;
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  i18n.addResourceBundle(lang, 'translation', requireBundledTranslation(lang), true, true);
}

const initialResources: Record<string, { translation: any }> = {
  [initialLang]: { translation: requireBundledTranslation(initialLang) },
};

i18n.use(initReactI18next).init({
  resources: initialResources,
  lng: initialLang,
  fallbackLng: 'en', // toute clé/langue manquante → anglais (jamais de crash)
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

/**
 * Charge dynamiquement une langue secondaire et la rend disponible à i18next.
 * À appeler depuis SettingsScreen quand l'user choisit une autre langue.
 */
export async function loadLanguage(lang: string): Promise<void> {
  // fr/en : bundlées, évaluées à la demande (synchrone, pas de réseau).
  if (lang === 'en' || lang === 'fr') {
    ensureBundledLanguage(lang);
    return;
  }
  // Toute autre langue retombe sur fallbackLng ('en') pour les clés manquantes.
  ensureBundledLanguage('en');
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  // OTA + cache disque.
  const remote = await getRemoteTranslation(lang);
  if (remote) {
    i18n.addResourceBundle(lang, 'translation', remote, true, true);
  }
  // Indisponible (pas d'URL distante, offline, ou {lang}.json absent) : aucun
  // bundle ajouté → i18next retombe sur fallbackLng ('en'). Pas de crash.
}

/**
 * Change la langue active. Charge la ressource (OTA si besoin) puis l'applique.
 * Accepte n'importe quel code de langue ISO 639-1.
 */
export async function changeLanguage(lang: string): Promise<void> {
  await loadLanguage(lang);
  await i18n.changeLanguage(lang);
}

/**
 * Promise resoue UNE FOIS quand l'override AsyncStorage (préférence persistée :
 * auto-détectée au premier launch ou changée depuis SettingsScreen) a ete
 * applique. Le boot doit l'attendre pour eviter qu'un cold start affiche la
 * device locale alors que l'utilisateur avait choisi une autre langue dans une
 * session anterieure.
 *
 * Avant ce fix, l'override etait fait dans une IIFE fire-and-forget — un retard
 * ou un crash silencieux d'AsyncStorage laissait l'app figee sur la device
 * locale au lieu de la prefence utilisateur.
 *
 * AsyncStorage est require()-e paresseusement pour ne pas bloquer le module en
 * environnement de test ou il pourrait ne pas etre mocke.
 */
export const i18nReady: Promise<void> = (async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // Une seule lecture groupée (multiGet) au lieu de 3 getItem séquentiels :
    // ce bloc gate le premier rendu (App.tsx), chaque aller-retour natif compte.
    const entries: ReadonlyArray<readonly [string, string | null]> = await AsyncStorage.multiGet([
      LANGUAGE_STORAGE_KEY,
      LANGUAGE_MIGRATION_KEY,
      LANGUAGE_EXPLICIT_KEY,
    ]);
    const read = (key: string): string | null =>
      entries?.find?.((e) => e[0] === key)?.[1] ?? null;
    let stored = read(LANGUAGE_STORAGE_KEY);

    const migrated = read(LANGUAGE_MIGRATION_KEY);
    if (migrated !== LANGUAGE_MIGRATION_VERSION) {
      const explicit = read(LANGUAGE_EXPLICIT_KEY);
      // Écritures fire-and-forget : la valeur utile (`stored`) est déjà en
      // mémoire, inutile de bloquer le premier rendu sur le disque. Si le
      // process meurt avant l'écriture, la migration (idempotente) rejouera.
      const writes: [string, string][] = [[LANGUAGE_MIGRATION_KEY, LANGUAGE_MIGRATION_VERSION]];
      if (explicit !== 'true' && stored === 'en' && initialLang !== 'en') {
        stored = initialLang;
        writes.unshift([LANGUAGE_STORAGE_KEY, initialLang]);
        if (__DEV__) console.log('[i18n] migration: auto-detected "en" -> "fr"');
      }
      Promise.resolve(AsyncStorage.multiSet(writes)).catch(() => {});
    }

    if (stored && typeof stored === 'string') {
      // N'importe quelle langue stockée (fr/en bundlées, autres en OTA).
      if (stored !== initialLang) {
        await changeLanguage(stored);
      }
      if (__DEV__) console.log(`[i18n] resolved language: ${stored} (stored override)`);
    } else if (__DEV__) {
      console.log(`[i18n] resolved language: ${initialLang} (device locale, no stored pref)`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[i18n] async override skipped', err);
  }
  // Charge le fallback `en` HORS du chemin critique (après le premier rendu) :
  // filet pour une éventuelle clé absente de la langue active.
  if (i18n.language !== 'en') {
    setTimeout(() => {
      try { ensureBundledLanguage('en'); } catch { /* silent */ }
    }, 3000);
  }
})();

export default i18n;
