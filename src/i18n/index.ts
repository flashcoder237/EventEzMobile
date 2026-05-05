/**
 * i18n Configuration
 *
 * Charge SEULEMENT la langue détectée du device au boot. L'autre langue est
 * chargée à la demande via `loadLanguage()` (e.g. depuis SettingsScreen quand
 * l'utilisateur change de langue manuellement).
 *
 * Gain : économise ~8KB de bundle pour la langue non utilisée. Surtout utile
 * si on ajoute d'autres langues plus tard (es, pt, etc.).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

const deviceLocale = getLocales()[0]?.languageCode ?? 'fr';
const initialLang: 'fr' | 'en' = deviceLocale === 'en' ? 'en' : 'fr';

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

export default i18n;
