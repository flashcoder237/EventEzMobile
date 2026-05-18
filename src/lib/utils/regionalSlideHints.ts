/**
 * regionalSlideHints — adapte les exemples textuels de l'onboarding selon la
 * region detectee du device (ISO 3166-1 alpha-2 via expo-localization).
 *
 * Pourquoi : EventEz est international mais l'onboarding gagne en proximite
 * quand on cite des lieux familiers. On ne charge PAS la geoloc GPS ici (on est
 * en pre-auth, pas de permission), on lit juste la `regionCode` du device qui
 * vient des reglages systeme (gratuit, instantane, pas de prompt).
 *
 * Le fallback "neutre" reste la regle quand la region est inconnue ou non
 * mappee — JAMAIS de mensonge "De Bonanjo a Yaounde" pour un user a Berlin.
 */
import { getLocales } from 'expo-localization';

export interface SlideHints {
  /** Ville/quartier "depart" — ex: "Bonanjo", "Paris", "Brooklyn" */
  cityA: string;
  /** Ville/quartier "arrivee" — ex: "Yaounde", "Marseille", "Austin" */
  cityB: string;
}

type LocalizedHint = {
  fr: SlideHints;
  en: SlideHints;
};

// Mappings region → exemples. Les villes choisies doivent etre :
//   1. Reconnaissables par la majorite des habitants du pays
//   2. Evocatrices du tissu d'evenements (concerts/conf/soirees), pas
//      uniquement administratives
//   3. Distinctes (pas 2x la meme ville)
// Format LocalizedHint : seulement les villes dont le nom DIFFERE entre FR/EN
// (Hambourg/Hamburg, Anvers/Antwerp, Lisbonne/Lisbon, ...) ont deux variantes.
// Toponymes locaux (Bonanjo, Cocody, Berlin, Paris) sont identiques partout.
const REGION_HINTS: Record<string, LocalizedHint> = {
  // ── Afrique francophone — marche historique principal ──
  CM: { fr: { cityA: 'Bonanjo', cityB: 'Yaoundé' },          en: { cityA: 'Bonanjo', cityB: 'Yaounde' } },
  CI: { fr: { cityA: 'Cocody', cityB: 'Abidjan' },           en: { cityA: 'Cocody', cityB: 'Abidjan' } },
  SN: { fr: { cityA: 'Plateau', cityB: 'Dakar' },            en: { cityA: 'Plateau', cityB: 'Dakar' } },
  BJ: { fr: { cityA: 'Cotonou', cityB: 'Porto-Novo' },       en: { cityA: 'Cotonou', cityB: 'Porto-Novo' } },
  TG: { fr: { cityA: 'Lomé', cityB: 'Kara' },                en: { cityA: 'Lome', cityB: 'Kara' } },
  BF: { fr: { cityA: 'Ouagadougou', cityB: 'Bobo-Dioulasso' }, en: { cityA: 'Ouagadougou', cityB: 'Bobo-Dioulasso' } },
  ML: { fr: { cityA: 'Bamako', cityB: 'Sikasso' },           en: { cityA: 'Bamako', cityB: 'Sikasso' } },
  CD: { fr: { cityA: 'Kinshasa', cityB: 'Lubumbashi' },      en: { cityA: 'Kinshasa', cityB: 'Lubumbashi' } },
  CG: { fr: { cityA: 'Brazzaville', cityB: 'Pointe-Noire' }, en: { cityA: 'Brazzaville', cityB: 'Pointe-Noire' } },
  GA: { fr: { cityA: 'Libreville', cityB: 'Port-Gentil' },   en: { cityA: 'Libreville', cityB: 'Port-Gentil' } },
  GN: { fr: { cityA: 'Conakry', cityB: 'Kankan' },           en: { cityA: 'Conakry', cityB: 'Kankan' } },
  MG: { fr: { cityA: 'Antananarivo', cityB: 'Tamatave' },    en: { cityA: 'Antananarivo', cityB: 'Toamasina' } },

  // ── Afrique anglophone ──
  KE: { fr: { cityA: 'Westlands', cityB: 'Nairobi' },          en: { cityA: 'Westlands', cityB: 'Nairobi' } },
  GH: { fr: { cityA: 'Osu', cityB: 'Accra' },                  en: { cityA: 'Osu', cityB: 'Accra' } },
  NG: { fr: { cityA: 'Victoria Island', cityB: 'Lagos' },      en: { cityA: 'Victoria Island', cityB: 'Lagos' } },
  UG: { fr: { cityA: 'Kampala', cityB: 'Entebbe' },            en: { cityA: 'Kampala', cityB: 'Entebbe' } },
  ZA: { fr: { cityA: 'Sandton', cityB: 'Le Cap' },             en: { cityA: 'Sandton', cityB: 'Cape Town' } },

  // ── Europe francophone + Canada FR ──
  FR: { fr: { cityA: 'Paris', cityB: 'Marseille' },            en: { cityA: 'Paris', cityB: 'Marseille' } },
  BE: { fr: { cityA: 'Bruxelles', cityB: 'Anvers' },           en: { cityA: 'Brussels', cityB: 'Antwerp' } },
  CH: { fr: { cityA: 'Genève', cityB: 'Lausanne' },            en: { cityA: 'Geneva', cityB: 'Lausanne' } },
  LU: { fr: { cityA: 'Luxembourg', cityB: 'Esch-sur-Alzette' }, en: { cityA: 'Luxembourg', cityB: 'Esch-sur-Alzette' } },
  MC: { fr: { cityA: 'Monaco', cityB: 'Monte-Carlo' },         en: { cityA: 'Monaco', cityB: 'Monte Carlo' } },

  // ── Amerique du Nord anglophone ──
  US: { fr: { cityA: 'Brooklyn', cityB: 'Austin' },            en: { cityA: 'Brooklyn', cityB: 'Austin' } },
  CA: { fr: { cityA: 'Toronto', cityB: 'Montréal' },           en: { cityA: 'Toronto', cityB: 'Montreal' } },

  // ── Europe anglo / autres ──
  GB: { fr: { cityA: 'Shoreditch', cityB: 'Manchester' },      en: { cityA: 'Shoreditch', cityB: 'Manchester' } },
  IE: { fr: { cityA: 'Dublin', cityB: 'Cork' },                en: { cityA: 'Dublin', cityB: 'Cork' } },
  AU: { fr: { cityA: 'Sydney', cityB: 'Melbourne' },           en: { cityA: 'Sydney', cityB: 'Melbourne' } },
  NZ: { fr: { cityA: 'Auckland', cityB: 'Wellington' },        en: { cityA: 'Auckland', cityB: 'Wellington' } },

  // ── Europe continentale (les noms FR/EN divergent ici) ──
  DE: { fr: { cityA: 'Berlin', cityB: 'Hambourg' },            en: { cityA: 'Berlin', cityB: 'Hamburg' } },
  ES: { fr: { cityA: 'Madrid', cityB: 'Barcelone' },           en: { cityA: 'Madrid', cityB: 'Barcelona' } },
  IT: { fr: { cityA: 'Rome', cityB: 'Milan' },                 en: { cityA: 'Rome', cityB: 'Milan' } },
  PT: { fr: { cityA: 'Lisbonne', cityB: 'Porto' },             en: { cityA: 'Lisbon', cityB: 'Porto' } },
  NL: { fr: { cityA: 'Amsterdam', cityB: 'Rotterdam' },        en: { cityA: 'Amsterdam', cityB: 'Rotterdam' } },
};

/**
 * Retourne les indices regionaux pour les slides d'onboarding, ou `null` si la
 * region du device n'est pas mappee. Quand `null`, le screen doit utiliser ses
 * textes neutres ("Pres de chez toi" / "Near you").
 *
 * @param language Langue active de l'app ('fr' | 'en' | autre). Si omise ou
 *   non supportee, fallback sur 'fr' (locale principale historique).
 */
export function getRegionalSlideHints(language?: string): SlideHints | null {
  try {
    const locale = getLocales()[0];
    const region = locale?.regionCode?.toUpperCase();
    if (!region) return null;
    const hint = REGION_HINTS[region];
    if (!hint) return null;
    const lang = (language || '').toLowerCase().startsWith('en') ? 'en' : 'fr';
    return hint[lang];
  } catch {
    // expo-localization peut throw sur certains contextes (web, simulateur
    // mal configure) — on fallback proprement plutot que de crasher l'onboarding.
    return null;
  }
}
