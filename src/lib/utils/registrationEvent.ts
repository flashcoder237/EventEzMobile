/**
 * Événement d'une inscription, quelle que soit la forme reçue.
 *
 * L'API renvoie l'événement imbriqué dans `event_detail` (RegistrationSerializer)
 * et `event` = UUID. Certains écrans lisaient `event_details` (avec un « s » —
 * la forme des SUIVIS, pas des inscriptions) : le billet était alors mis en
 * cache hors ligne avec le titre de repli et une date vide, et écrasait la
 * bonne entrée (cache dédoublonné par id de billet).
 */
export interface RegistrationEvent {
  id: string;
  slug?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
}

export function registrationEvent(reg: any): RegistrationEvent {
  if (!reg) return { id: '' };
  const nested =
    [reg.event_detail, reg.event_details, reg.event].find((e) => e && typeof e === 'object') || null;
  const id = String(nested?.id ?? reg.event_id ?? (typeof reg.event === 'string' ? reg.event : '') ?? '');
  return {
    id,
    slug: nested?.slug || undefined,
    title: nested?.title || reg.event_title || undefined,
    start_date: nested?.start_date || reg.event_start_date || undefined,
    end_date: nested?.end_date || reg.event_end_date || undefined,
  };
}
