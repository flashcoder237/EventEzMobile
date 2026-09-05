import { parseSearchParams, buildSearchState } from '../searchDeepLink';

describe('parseSearchParams', () => {
  it('ignore les URLs qui ne sont pas des recherches', () => {
    expect(parseSearchParams('/events/abc-123')).toBeNull(); // détail event
    expect(parseSearchParams('/organizers/5')).toBeNull();
    expect(parseSearchParams('/events')).toBeNull();          // liste sans filtre
    expect(parseSearchParams('/events/in/douala')).toBeNull(); // path city (géré ailleurs)
  });

  it('parse city + price + category', () => {
    const p = parseSearchParams('/events?city=douala&price=free&category=3');
    expect(p).toEqual({ city: 'douala', price: 'free', category: 3 });
  });

  it('accepte search / query / q comme requête texte', () => {
    expect(parseSearchParams('/events?search=jazz')).toEqual({ query: 'jazz' });
    expect(parseSearchParams('/events?query=jazz')).toEqual({ query: 'jazz' });
    expect(parseSearchParams('/events?q=jazz')).toEqual({ query: 'jazz' });
  });

  it('parse date_preset et location_type (valides seulement)', () => {
    expect(parseSearchParams('/events?date_preset=weekend&location_type=online'))
      .toEqual({ datePreset: 'weekend', locationType: 'online' });
    // Valeurs invalides ignorées.
    expect(parseSearchParams('/events?date_preset=bogus&city=paris'))
      .toEqual({ city: 'paris' });
  });

  it('ignore une catégorie non numérique et un prix invalide', () => {
    expect(parseSearchParams('/events?category=abc&price=maybe&city=lyon'))
      .toEqual({ city: 'lyon' });
  });

  it('/search est toujours reconnu, même vide', () => {
    expect(parseSearchParams('/search')).toEqual({});
    expect(parseSearchParams('/search?city=nairobi')).toEqual({ city: 'nairobi' });
  });

  it('tolère un slash final', () => {
    expect(parseSearchParams('/events/?city=accra')).toEqual({ city: 'accra' });
  });
});

describe('buildSearchState', () => {
  it('construit une route EventSearch avec params', () => {
    expect(buildSearchState('/events?city=douala&price=free')).toEqual({
      routes: [{ name: 'EventSearch', params: { city: 'douala', price: 'free' } }],
    });
  });

  it('route EventSearch sans params pour /search vide', () => {
    expect(buildSearchState('/search')).toEqual({
      routes: [{ name: 'EventSearch', params: undefined }],
    });
  });

  it('retourne null pour une URL non-recherche', () => {
    expect(buildSearchState('/events/xyz')).toBeNull();
  });
});
