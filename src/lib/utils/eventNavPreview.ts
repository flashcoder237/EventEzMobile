/**
 * Aperçu d'événement transmis en paramètre de navigation vers EventDetails.
 *
 * Les cartes de liste (Discover, recherche, suivis…) possèdent déjà le titre,
 * la bannière, la date et le lieu : on les passe à l'écran détail pour qu'il
 * affiche l'en-tête INSTANTANÉMENT pendant que le détail complet se charge en
 * arrière-plan, au lieu d'un squelette plein écran.
 *
 * Contraintes :
 *  - params de navigation = état sérialisé (persistance de navigation) → on ne
 *    garde qu'une poignée de champs PRIMITIFS (pas la description, pas les
 *    ticket_types, pas l'organisateur) ;
 *  - aucune fonction, aucun objet backend brut.
 *
 * Ce n'est JAMAIS une source de vérité : l'écran ne s'en sert que pour
 * l'affichage d'attente, les actions attendent l'event complet.
 */

import type { Event } from '../../types';

export interface EventNavPreview {
  id: string;
  slug?: string;
  title?: string;
  banner_image?: string;
  banner_placeholder?: string;
  display_image?: string;
  start_date?: string;
  end_date?: string;
  location_type?: Event['location_type'];
  location_name?: string;
  location_city?: string;
  location_country?: string;
  event_type?: Event['event_type'];
  is_free?: boolean;
  ticket_price_range?: string;
  category?: {
    id?: number;
    name?: string;
    slug?: string;
    default_event_image?: string;
    default_event_image_placeholder?: string;
  };
}

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

/**
 * Extrait l'aperçu minimal d'un event de liste. Tolérant aux shapes partiels
 * (event_details imbriqués, catégorie parfois id seul) : tout champ au mauvais
 * type est simplement omis. Les data URIs LQIP très lourds sont ignorés pour
 * ne pas gonfler l'état de navigation persisté.
 */
export function toEventPreview(event: Partial<Event> | null | undefined): EventNavPreview | undefined {
  if (!event || event.id === undefined || event.id === null) return undefined;
  const cat: any = event.category;
  const smallUri = (v: unknown) => {
    const s = str(v);
    return s && s.length <= 4096 ? s : undefined;
  };
  const preview: EventNavPreview = {
    id: String(event.id),
    slug: str(event.slug),
    title: str(event.title),
    banner_image: str(event.banner_image),
    banner_placeholder: smallUri(event.banner_placeholder),
    display_image: str(event.display_image),
    start_date: str(event.start_date),
    end_date: str(event.end_date),
    location_type: str(event.location_type) as EventNavPreview['location_type'],
    location_name: str(event.location_name),
    location_city: str(event.location_city),
    location_country: str(event.location_country),
    event_type: str(event.event_type) as EventNavPreview['event_type'],
    is_free: typeof event.is_free === 'boolean' ? event.is_free : undefined,
    ticket_price_range: str(event.ticket_price_range),
    category: cat && typeof cat === 'object'
      ? {
          id: typeof cat.id === 'number' ? cat.id : undefined,
          name: str(cat.name),
          slug: str(cat.slug),
          default_event_image: str(cat.default_event_image),
          default_event_image_placeholder: smallUri(cat.default_event_image_placeholder),
        }
      : undefined,
  };
  // Retire les clés undefined (état de navigation plus compact / JSON propre).
  Object.keys(preview).forEach((k) => {
    if ((preview as any)[k] === undefined) delete (preview as any)[k];
  });
  if (preview.category) {
    Object.keys(preview.category).forEach((k) => {
      if ((preview.category as any)[k] === undefined) delete (preview.category as any)[k];
    });
  }
  return preview;
}
