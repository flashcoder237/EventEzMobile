/**
 * Recherche PARTAGEABLE — mappe une URL web de recherche filtrée vers un état de
 * navigation EventSearch pré-filtré.
 *
 * URLs reconnues : `/events?…` (liste filtrée) et `/search?…`. Query params
 * alignés sur le web (`search`/`query`/`q`, `city`, `category`, `price`,
 * `date_preset`, `location_type`). React Navigation `config.screens` n'accepte
 * qu'UN path par écran (EventSearch = `events/in/:city`), d'où ce mapping manuel
 * pour les URLs à query string.
 *
 * Retourne un objet route (à insérer dans le state de navigation) ou null si
 * l'URL n'est pas une recherche filtrée.
 */

export interface SearchDeepLinkParams {
  query?: string;
  city?: string;
  category?: number;
  price?: 'free' | 'paid';
  datePreset?: 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';
  locationType?: 'in_person' | 'online' | 'hybrid';
}

const DATE_PRESETS = ['today', 'tomorrow', 'weekend', 'week', 'month'];
const LOCATION_TYPES = ['in_person', 'online', 'hybrid'];

/** Parse la query d'une URL de recherche → params EventSearch (sans le routing). */
export function parseSearchParams(path: string): SearchDeepLinkParams | null {
  const qIndex = path.indexOf('?');
  const pathname = (qIndex === -1 ? path : path.slice(0, qIndex)).replace(/\/+$/, '');
  // Seules la liste d'événements et /search sont des recherches — jamais un
  // détail /events/{id}.
  if (pathname !== '/events' && pathname !== '/search') return null;
  if (qIndex === -1) {
    // /search sans query = écran de recherche vide (params vides mais reconnu).
    return pathname === '/search' ? {} : null;
  }

  const sp = new URLSearchParams(path.slice(qIndex + 1));
  const params: SearchDeepLinkParams = {};

  const query = sp.get('search') || sp.get('query') || sp.get('q');
  if (query) params.query = query;

  const city = sp.get('city');
  if (city) params.city = city;

  const category = sp.get('category');
  if (category && /^\d+$/.test(category)) params.category = Number(category);

  const price = sp.get('price');
  if (price === 'free' || price === 'paid') params.price = price;

  const datePreset = sp.get('date_preset') || sp.get('datePreset');
  if (datePreset && DATE_PRESETS.includes(datePreset)) {
    params.datePreset = datePreset as SearchDeepLinkParams['datePreset'];
  }

  const locationType = sp.get('location_type') || sp.get('locationType');
  if (locationType && LOCATION_TYPES.includes(locationType)) {
    params.locationType = locationType as SearchDeepLinkParams['locationType'];
  }

  // /events?… doit avoir AU MOINS un filtre reconnu pour être traité comme une
  // recherche (sinon /events tout court est la liste, pas une recherche ciblée).
  // /search est toujours accepté.
  if (pathname === '/events' && Object.keys(params).length === 0) return null;
  return params;
}

/** Retourne l'état de navigation (route EventSearch) ou null. */
export function buildSearchState(path: string): { routes: Array<{ name: string; params?: SearchDeepLinkParams }> } | null {
  const params = parseSearchParams(path);
  if (params === null) return null;
  return {
    routes: [{ name: 'EventSearch', params: Object.keys(params).length ? params : undefined }],
  };
}
