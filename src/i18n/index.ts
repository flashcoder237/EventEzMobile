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

/**
 * Promise resoue UNE FOIS quand l'override AsyncStorage (choix utilisateur
 * persiste depuis LanguagePicker ou SettingsScreen) a ete applique. Le boot
 * doit l'attendre pour eviter qu'un cold start affiche la device locale alors
 * que l'utilisateur avait choisi une autre langue dans une session anterieure.
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
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') {
      if (stored !== initialLang) {
        await changeLanguage(stored);
      }
      // Si stored === initialLang : rien a faire, mais log debug pour
      // confirmer que la preference utilisateur a bien ete trouvee.
      if (__DEV__) console.log(`[i18n] resolved language: ${stored} (stored override)`);
    } else if (__DEV__) {
      console.log(`[i18n] resolved language: ${initialLang} (device locale, no stored pref)`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[i18n] async override skipped', err);
  }
})();

export default i18n;
