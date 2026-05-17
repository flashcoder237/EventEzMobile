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

// Mappings region → exemples. Les villes choisies doivent etre :
//   1. Reconnaissables par la majorite des habitants du pays
//   2. Evocatrices du tissu d'evenements (concerts/conf/soirees), pas
//      uniquement administratives
//   3. Distinctes (pas 2x la meme ville)
const REGION_HINTS: Record<string, SlideHints> = {
  // ── Afrique francophone — marche historique principal ──
  CM: { cityA: 'Bonanjo', cityB: 'Yaoundé' },        // Douala + Yaoundé
  CI: { cityA: 'Cocody', cityB: 'Abidjan' },         // Côte d'Ivoire
  SN: { cityA: 'Plateau', cityB: 'Dakar' },          // Sénégal
  BJ: { cityA: 'Cotonou', cityB: 'Porto-Novo' },     // Bénin
  TG: { cityA: 'Lomé', cityB: 'Kara' },              // Togo
  BF: { cityA: 'Ouagadougou', cityB: 'Bobo-Dioulasso' }, // Burkina
  ML: { cityA: 'Bamako', cityB: 'Sikasso' },         // Mali
  CD: { cityA: 'Kinshasa', cityB: 'Lubumbashi' },    // RDC
  CG: { cityA: 'Brazzaville', cityB: 'Pointe-Noire' }, // Congo
  GA: { cityA: 'Libreville', cityB: 'Port-Gentil' }, // Gabon
  GN: { cityA: 'Conakry', cityB: 'Kankan' },         // Guinée
  MG: { cityA: 'Antananarivo', cityB: 'Tamatave' },  // Madagascar

  // ── Afrique anglophone ──
  KE: { cityA: 'Westlands', cityB: 'Nairobi' },
  GH: { cityA: 'Osu', cityB: 'Accra' },
  NG: { cityA: 'Victoria Island', cityB: 'Lagos' },
  UG: { cityA: 'Kampala', cityB: 'Entebbe' },
  ZA: { cityA: 'Sandton', cityB: 'Cape Town' },

  // ── Europe francophone + Canada FR ──
  FR: { cityA: 'Paris', cityB: 'Marseille' },
  BE: { cityA: 'Bruxelles', cityB: 'Anvers' },
  CH: { cityA: 'Genève', cityB: 'Lausanne' },
  LU: { cityA: 'Luxembourg', cityB: 'Esch-sur-Alzette' },
  MC: { cityA: 'Monaco', cityB: 'Monte-Carlo' },

  // ── Amerique du Nord anglophone ──
  US: { cityA: 'Brooklyn', cityB: 'Austin' },
  CA: { cityA: 'Toronto', cityB: 'Montréal' },

  // ── Europe anglo / autres ──
  GB: { cityA: 'Shoreditch', cityB: 'Manchester' },
  IE: { cityA: 'Dublin', cityB: 'Cork' },
  AU: { cityA: 'Sydney', cityB: 'Melbourne' },
  NZ: { cityA: 'Auckland', cityB: 'Wellington' },

  // ── Europe continentale ──
  DE: { cityA: 'Berlin', cityB: 'Hambourg' },
  ES: { cityA: 'Madrid', cityB: 'Barcelone' },
  IT: { cityA: 'Rome', cityB: 'Milan' },
  PT: { cityA: 'Lisbonne', cityB: 'Porto' },
  NL: { cityA: 'Amsterdam', cityB: 'Rotterdam' },
};

/**
 * Retourne les indices regionaux pour les slides d'onboarding, ou `null` si la
 * region du device n'est pas mappee. Quand `null`, le screen doit utiliser ses
 * textes neutres ("Pres de chez toi" / "Near you").
 */
export function getRegionalSlideHints(): SlideHints | null {
  try {
    const locale = getLocales()[0];
    const region = locale?.regionCode?.toUpperCase();
    if (!region) return null;
    return REGION_HINTS[region] || null;
  } catch {
    // expo-localization peut throw sur certains contextes (web, simulateur
    // mal configure) — on fallback proprement plutot que de crasher l'onboarding.
    return null;
  }
}
