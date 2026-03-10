/**
 * i18n Configuration
 *
 * Uses i18next + react-i18next with expo-localization for device locale detection.
 * Default language: French (fr)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import fr from './locales/fr.json';
import en from './locales/en.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'fr';

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: deviceLocale === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
