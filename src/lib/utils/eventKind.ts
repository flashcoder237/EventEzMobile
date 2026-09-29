/**
 * Détection du « genre » d'un événement (mariage, salon).
 *
 * Ce n'est PAS `event_type` (qui vaut `billetterie` / `inscription`, et décrit
 * le mode de vente). Un mariage est un événement d'inscription comme un autre
 * pour le moteur de billetterie ; ce qui le distingue, ce sont les modules
 * qu'il débloque : RSVP, plan de table, cagnotte.
 *
 * Cette détection était dupliquée mot pour mot dans six fichiers (trois web,
 * trois mobile), ce qui posait deux problèmes :
 *
 *  1. Un mariage classé dans une autre catégorie — « Religieux & Spirituel »
 *     pour une cérémonie à l'église, cas parfaitement légitime — perdait
 *     SILENCIEUSEMENT tous ses modules. D'où le repli sur le tag « Mariage »,
 *     qui donne à l'organisateur un moyen de se rattraper.
 *  2. Toute correction devait être appliquée six fois, et ne l'était jamais.
 *
 * Les modules mariage restent en OPT-IN par la catégorie (ou le tag) : ce
 * n'est pas un type d'événement à part entière. Le jour où le mariage devient
 * un vrai attribut d'`Event` côté backend, ce module est le seul endroit à
 * changer.
 */

/** Forme minimale acceptée — web et mobile ont des types d'`Event` distincts. */
interface CategoryLike {
  slug?: string | null;
  name?: string | null;
}
interface TagLike {
  slug?: string | null;
  name?: string | null;
}
export interface EventKindInput {
  category?: CategoryLike | null;
  tags?: TagLike[] | null;
}

const WEDDING_PATTERN = /mariage|wedding|celebration|célébration/i;
const EXHIBITION_PATTERN = /salon|exhibition|expo|foire|trade[-\s]?show/i;

function categorySignal(event: EventKindInput | null | undefined): string {
  return `${event?.category?.slug || ''} ${event?.category?.name || ''}`;
}

function tagSignal(event: EventKindInput | null | undefined): string {
  if (!Array.isArray(event?.tags)) return '';
  return event!.tags!.map((t) => `${t?.slug || ''} ${t?.name || ''}`).join(' ');
}

/**
 * Un mariage / une célébration privée : débloque RSVP, plan de table, cagnotte.
 *
 * La catégorie reste le signal principal. Le tag sert de RATTRAPAGE pour les
 * mariages rangés ailleurs — sans lui, l'organisateur n'a aucun moyen de
 * récupérer ses modules, et rien à l'écran ne lui dit pourquoi ils manquent.
 */
export function isWeddingEvent(event: EventKindInput | null | undefined): boolean {
  if (!event) return false;
  return (
    WEDDING_PATTERN.test(categorySignal(event)) || WEDDING_PATTERN.test(tagSignal(event))
  );
}

/** Un salon / une foire : débloque exposants, stands, capture de leads. */
export function isExhibitionEvent(event: EventKindInput | null | undefined): boolean {
  if (!event) return false;
  return (
    EXHIBITION_PATTERN.test(categorySignal(event)) ||
    EXHIBITION_PATTERN.test(tagSignal(event))
  );
}

/**
 * Repère la catégorie « mariage » dans une liste de catégories (préréglage et
 * suggestion de visibilité dans le formulaire de création). Distinct de
 * `isWeddingEvent` : ici on inspecte une CATÉGORIE, pas un événement — il n'y
 * a donc aucun tag sur lequel se replier.
 */
export function findWeddingCategory<T extends CategoryLike & { id?: unknown }>(
  categories: T[] | null | undefined,
): T | undefined {
  if (!Array.isArray(categories)) return undefined;
  return categories.find((c) =>
    WEDDING_PATTERN.test(`${c?.slug || ''} ${c?.name || ''}`),
  );
}

/**
 * S5 — Registre d'ambiance d'un événement.
 *
 * Trois registres seulement, pas un par catégorie : ils changent le FOND, la
 * FAMILLE DE TITRE et l'ORDRE des sections, jamais le mouvement.
 *   - `celebration` : mariages, anniversaires, baptêmes (ivoire, serif, filet doré) ;
 *   - `night`       : concerts, soirées, festivals (fond sombre, la couleur ressort) ;
 *   - `knowledge`   : conférences, formations, ateliers (sobre, agenda et
 *                     intervenants remontés).
 * En cas de doute : `neutral` (le design par défaut, inchangé).
 */
export type EventAmbience = 'celebration' | 'night' | 'knowledge' | 'neutral';

const CELEBRATION_PATTERN =
  /mariage|wedding|c[ée]l[ée]bration|anniversaire|birthday|bapt[êe]me|baptism|fian[çc]ailles|engagement/i;
const NIGHT_PATTERN =
  /concert|musique|music|soir[ée]e|nightlife|night|club|festival|\bdj\b|party|spectacle|show/i;
const KNOWLEDGE_PATTERN =
  /conf[ée]rence|conference|formation|atelier|workshop|s[ée]minaire|seminar|meetup|summit|sommet|tech|[ée]ducation|business|masterclass|webinar|colloque|forum/i;

export function getEventAmbience(event: EventKindInput | null | undefined): EventAmbience {
  if (!event) return 'neutral';
  const category = categorySignal(event);
  // La catégorie prime ; les tags ne servent qu'à départager un événement
  // sans catégorie reconnue.
  if (CELEBRATION_PATTERN.test(category)) return 'celebration';
  if (KNOWLEDGE_PATTERN.test(category)) return 'knowledge';
  if (NIGHT_PATTERN.test(category)) return 'night';
  const tags = tagSignal(event);
  if (CELEBRATION_PATTERN.test(tags)) return 'celebration';
  if (KNOWLEDGE_PATTERN.test(tags)) return 'knowledge';
  if (NIGHT_PATTERN.test(tags)) return 'night';
  return 'neutral';
}
