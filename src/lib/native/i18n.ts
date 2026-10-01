/**
 * Chaînes du lot natif (widgets, Live Activities, tuile, partage, agenda,
 * réglages), dans un namespace i18next À PART : `native`.
 *
 * Pourquoi pas fr.json/en.json : (1) le lot natif vit sur sa branche, un
 * namespace séparé évite tout conflit de fusion avec les ~3 600 clés
 * existantes ; (2) `ensureBundledLanguage` teste `hasResourceBundle(lang,
 * 'translation')` — ajouter nos clés dans `translation` empêcherait le
 * chargement paresseux de en.json. Ici on n'y touche pas.
 *
 * Ton : vouvoiement, comme le reste de l'app.
 */
import i18n from '../../i18n';

export const NATIVE_NS = 'native';

const fr = {
  widget: {
    header: 'Prochain billet',
    empty: 'Aucun billet à venir',
    live: 'En cours',
    tile: 'Mon prochain billet',
  },
  liveActivity: {
    countdown: 'Ouverture des portes dans',
    live: 'Portes ouvertes · en cours',
    liveShort: 'Live',
    checkins: 'accueillis depuis ce téléphone',
    checkinsWithCapacity: 'accueillis',
  },
  share: {
    notEventez: 'Ce lien ne mène pas à un événement EventEz.',
  },
  calendar: {
    addNative: 'Ajouter à mon agenda',
    addNativeHint: 'Directement dans le calendrier de votre téléphone',
    added: 'Ajouté à votre agenda',
    failed: 'Impossible d’ouvrir votre agenda. Essayez Google Agenda ou le fichier .ics.',
  },
};

const en: typeof fr = {
  widget: {
    header: 'Next ticket',
    empty: 'No upcoming tickets',
    live: 'Happening now',
    tile: 'My next ticket',
  },
  liveActivity: {
    countdown: 'Doors open in',
    live: 'Doors open · happening now',
    liveShort: 'Live',
    checkins: 'checked in from this phone',
    checkinsWithCapacity: 'checked in',
  },
  share: {
    notEventez: 'This link doesn’t lead to an EventEz event.',
  },
  calendar: {
    addNative: 'Add to my calendar',
    addNativeHint: 'Straight into your phone’s calendar',
    added: 'Added to your calendar',
    failed: 'Couldn’t open your calendar. Try Google Calendar or the .ics file.',
  },
};

let registered = false;

/** Idempotent. Appelé par chaque module natif avant sa première traduction. */
export function registerNativeStrings(): void {
  if (registered) return;
  registered = true;
  i18n.addResourceBundle('fr', NATIVE_NS, fr, true, true);
  i18n.addResourceBundle('en', NATIVE_NS, en, true, true);
}

/** Traduction hors composant React (services, ponts natifs). */
export function tn(key: string, options?: Record<string, unknown>): string {
  registerNativeStrings();
  return i18n.t(key, { ns: NATIVE_NS, ...(options || {}) }) as string;
}

/** Langue active ramenée à fr/en (formats de date). */
export function nativeLocale(): 'fr-FR' | 'en-GB' {
  return String(i18n.language || 'fr').startsWith('en') ? 'en-GB' : 'fr-FR';
}

export const __nativeStringsForTests = { fr, en };
