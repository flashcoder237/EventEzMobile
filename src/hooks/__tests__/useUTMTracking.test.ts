/**
 * Format du payload d'attribution UTM.
 *
 * Bug observé en production (log 400 à chaque ouverture de fiche) :
 *
 *   {"landing_page":["Saisissez une URL valide."],
 *    "event":["La valeur « form-9-202608-784c12 » n'est pas un UUID valide."]}
 *
 * Deux causes indépendantes :
 *   1. `event` recevait le SLUG de la route, alors que la FK backend attend
 *      un UUID — corrigé en passant `event.id` côté écran ;
 *   2. `landing_page` envoyait `eventez://…`, refusé par le `URLField` Django
 *      qui n'accepte pas les schémas custom.
 *
 * Le `catch` du hook étant muet (volontairement : l'analytique ne doit pas
 * casser l'affichage), rien ne signalait l'échec — aucune visite mobile
 * n'était attribuée. Ces tests figent le format attendu.
 */
import { getEventUrl, WEB_BASE_URL } from '../../constants/urls';

describe('landing_page — URL acceptée par un URLField Django', () => {
  const UUID = '3f2b8c1e-5d4a-4f9b-8a7c-1e2d3f4a5b6c';

  it('utilise un schéma http(s), jamais le deep link `eventez://`', () => {
    const url = getEventUrl(UUID);
    expect(url).toMatch(/^https?:\/\//);
    expect(url.startsWith('eventez://')).toBe(false);
  });

  it('pointe vers la fiche web du même événement', () => {
    expect(getEventUrl(UUID)).toBe(`${WEB_BASE_URL}/events/${UUID}`);
  });

  it('produit une URL que `new URL()` sait analyser', () => {
    // C'est en substance ce que valide `URLField` côté Django.
    expect(() => new URL(getEventUrl(UUID))).not.toThrow();
    // Contre-exemple : le format précédent. `new URL` l'accepte (schéma
    // custom valide au sens WHATWG) mais Django le refuse — d'où le test
    // explicite sur le schéma ci-dessus plutôt que sur le seul parsing.
    expect(new URL(`eventez://events/${UUID}`).protocol).toBe('eventez:');
  });
});

describe('event — identifiant attendu par la FK backend', () => {
  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  it('un UUID est accepté', () => {
    expect(isUuid('3f2b8c1e-5d4a-4f9b-8a7c-1e2d3f4a5b6c')).toBe(true);
  });

  it('un slug d’événement ne l’est pas — c’était la cause du 400', () => {
    // Slug réel tiré du log de production.
    expect(isUuid('form-9-202608-784c12')).toBe(false);
    expect(isUuid('salon-tech-innov-douala-2026')).toBe(false);
  });
});
