/**
 * X8 — Langue de l'app dans les réglages système (Android 13+ « Langue de
 * l'application », iOS « Réglages › EventEz › Langue »).
 *
 * La déclaration vient d'expo-localization (`supportedLocales` : fr, en).
 * Ici, la synchronisation : quand la langue SYSTÈME de l'app change depuis la
 * dernière ouverture, c'est l'intention la plus récente de l'utilisateur — on
 * l'applique comme un choix explicite (mêmes clés que Paramètres › Langue),
 * puis on prévient le backend pour les e-mails et notifications.
 * Sans changement côté système, le choix fait dans l'app reste prioritaire.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n, { changeLanguage, LANGUAGE_EXPLICIT_KEY, LANGUAGE_STORAGE_KEY } from '../../i18n';

const LAST_SYSTEM_KEY = '@eventez_last_system_language';

export function systemLanguage(): 'fr' | 'en' | null {
  const code = getLocales()[0]?.languageCode;
  return code === 'fr' || code === 'en' ? code : null;
}

/**
 * Décision pure : faut-il basculer ? `previous` = langue système vue à la
 * dernière vérification (null au tout premier passage : on mémorise sans
 * basculer, pour ne pas écraser un choix fait avant cette version).
 */
export function languageToAdopt(previous: string | null, current: 'fr' | 'en' | null, active: string): 'fr' | 'en' | null {
  if (!current || previous == null || previous === current) return null;
  return active.startsWith(current) ? null : current;
}

export async function syncSystemLanguage(onChanged?: (lang: 'fr' | 'en') => void): Promise<void> {
  const current = systemLanguage();
  if (!current) return;
  try {
    const previous = await AsyncStorage.getItem(LAST_SYSTEM_KEY);
    const adopt = languageToAdopt(previous, current, String(i18n.language || ''));
    await AsyncStorage.setItem(LAST_SYSTEM_KEY, current);
    if (!adopt) return;
    await AsyncStorage.multiSet([
      [LANGUAGE_STORAGE_KEY, adopt],
      [LANGUAGE_EXPLICIT_KEY, 'true'],
    ]);
    await changeLanguage(adopt);
    onChanged?.(adopt);
  } catch {
    /* best-effort : la langue de l'app reste celle choisie dans Paramètres */
  }
}
