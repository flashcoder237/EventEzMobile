/**
 * i18n Configuration
 *
 * Charge SEULEMENT la langue détectée du device au boot. L'autre langue est
 * chargée à la demande via `loadLanguage()` (e.g. depuis SettingsScreen quand
 * l'utilisateur change de langue manuellement).
 *
 * Gain : économise ~8KB de bundle pour la langue non utilisée. Surtout utile
 * si on ajoute d'autres langues plus tard (es, pt, etc.).
 *
 * Stratégie de résolution de la langue active :
 * 1. Init synchrone avec la langue du device (default = EN sauf si device locale = fr)
 * 2. Override async via AsyncStorage : si une préférence est déjà persistée
 *    (auto-détectée au premier launch par RootNavigator, ou changée depuis
 *    SettingsScreen), on l'applique.
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
// Les autres langues sont chargées en OTA à la demande (cf. ./translations).
const initialResources: Record<string, { translation: any }> = {
  en: { translation: require('./locales/en.json') },
  fr: { translation: require('./locales/fr.json') },
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
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  // fr/en sont déjà chargées (bundle). Toute autre langue : OTA + cache disque.
  if (lang === 'en' || lang === 'fr') return;
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
    let stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    // ── Migration one-shot : défaut EN → FR ────────────────────────────────
    // Les installs antérieures ont persisté `en` par simple auto-détection
    // (l'ancien défaut basculait en EN dès que la locale device n'était pas
    // exactement `fr`). Ces utilisateurs restaient bloqués sur une UI anglaise
    // pour toujours, même après correction du défaut. On re-dérive donc leur
    // préférence UNE FOIS — sans jamais toucher à un choix explicite.
    const migrated = await AsyncStorage.getItem(LANGUAGE_MIGRATION_KEY);
    if (migrated !== LANGUAGE_MIGRATION_VERSION) {
      const explicit = await AsyncStorage.getItem(LANGUAGE_EXPLICIT_KEY);
      if (explicit !== 'true' && stored === 'en' && initialLang !== 'en') {
        stored = initialLang;
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, initialLang);
        if (__DEV__) console.log('[i18n] migration: auto-detected "en" -> "fr"');
      }
      await AsyncStorage.setItem(LANGUAGE_MIGRATION_KEY, LANGUAGE_MIGRATION_VERSION);
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
})();

export default i18n;
