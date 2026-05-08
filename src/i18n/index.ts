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
 * 2. Override async via AsyncStorage : si l'utilisateur a déjà fait un choix
 *    (LanguagePickerScreen au premier launch ou SettingsScreen), on l'applique.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

export const LANGUAGE_STORAGE_KEY = '@eventez_language';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
// Default = anglais. Français uniquement si le device est explicitement en fr.
const initialLang: 'fr' | 'en' = deviceLocale === 'fr' ? 'fr' : 'en';

// Chargement initial : seulement la langue active (statique, dans le bundle).
const initialResources: Record<string, { translation: any }> = {};
if (initialLang === 'fr') {
  initialResources.fr = { translation: require('./locales/fr.json') };
} else {
  initialResources.en = { translation: require('./locales/en.json') };
}

i18n.use(initReactI18next).init({
  resources: initialResources,
  lng: initialLang,
  fallbackLng: initialLang, // Fallback sur la même langue au lieu de 'fr' force
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
export async function loadLanguage(lang: 'en' | 'fr'): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  const resources = lang === 'en'
    ? require('./locales/en.json')
    : require('./locales/fr.json');
  i18n.addResourceBundle(lang, 'translation', resources, true, true);
}

/**
 * Change la langue active. Charge la ressource si nécessaire.
 */
export async function changeLanguage(lang: 'en' | 'fr'): Promise<void> {
  await loadLanguage(lang);
  await i18n.changeLanguage(lang);
}

// Override async : si l'utilisateur a déjà fait un choix (LanguagePickerScreen
// au premier launch ou SettingsScreen), on l'applique au-dessus du default
// device-locale. Volontairement non-bloquant : i18next.init() est synchrone
// alors qu'AsyncStorage est async — on accepte qu'au tout premier render le
// fallback device locale soit affiché ~10-50ms avant l'override.
//
// AsyncStorage est require()-é paresseusement pour éviter de le charger pendant
// l'init du module (certains environnements de test ne mockent pas le module
// avant que i18n soit importé transitivement par les écrans).
(async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if ((stored === 'fr' || stored === 'en') && stored !== initialLang) {
      await changeLanguage(stored);
    }
  } catch (err) {
    if (__DEV__) console.warn('[i18n] async override skipped', err);
  }
})();

export default i18n;
