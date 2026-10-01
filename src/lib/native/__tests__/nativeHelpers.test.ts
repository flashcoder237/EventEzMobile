import { extractEventezPath } from '../shareIntent';
import { handoffUrlForRoute } from '../handoff';
import { languageToAdopt } from '../systemLanguage';
import { buildCalendarEvent } from '../calendar';
import { __nativeStringsForTests } from '../i18n';

describe('extractEventezPath (X12)', () => {
  it('extrait le chemin d’un lien eventez.online au milieu d’un message', () => {
    expect(extractEventezPath('Venez avec moi ! https://eventez.online/events/fete-musique-douala ce soir')).toBe(
      'events/fete-musique-douala',
    );
  });

  it('retire la ponctuation collée en fin de phrase', () => {
    expect(extractEventezPath('Regarde https://www.eventez.online/events/gala).')).toBe('events/gala');
  });

  it('garde la locale et la requête (le routage App.tsx s’en charge)', () => {
    expect(extractEventezPath('https://eventez.online/en/events?city=douala')).toBe('en/events?city=douala');
  });

  it('accepte le schéma eventez://', () => {
    expect(extractEventezPath('eventez://registrations/42')).toBe('registrations/42');
  });

  it('refuse ce qui n’est pas EventEz', () => {
    expect(extractEventezPath('https://example.com/events/x')).toBeNull();
    expect(extractEventezPath('https://eventez.online.evil.com/events/x')).toBeNull();
    expect(extractEventezPath('')).toBeNull();
    expect(extractEventezPath(null)).toBeNull();
  });
});

describe('handoffUrlForRoute (X13)', () => {
  it('publie les pages publiques', () => {
    expect(handoffUrlForRoute({ name: 'EventDetails', params: { eventId: 'gala-2026' } })).toMatch(/\/events\/gala-2026$/);
    expect(handoffUrlForRoute({ name: 'OrganizerProfile', params: { organizerId: 'overbrand' } })).toMatch(/\/organizers\/overbrand$/);
  });

  it('ne publie JAMAIS un billet, un paiement ou une conversation', () => {
    expect(handoffUrlForRoute({ name: 'QRCode', params: { ticketId: '1' } })).toBeNull();
    expect(handoffUrlForRoute({ name: 'Payment', params: { registrationId: '1' } })).toBeNull();
    expect(handoffUrlForRoute({ name: 'Conversation', params: { conversationId: '1' } })).toBeNull();
    expect(handoffUrlForRoute(undefined)).toBeNull();
    expect(handoffUrlForRoute({ name: 'EventDetails', params: {} })).toBeNull();
  });
});

describe('languageToAdopt (X8)', () => {
  it('premier passage : mémorise sans basculer', () => {
    expect(languageToAdopt(null, 'en', 'fr')).toBeNull();
  });

  it('langue système changée depuis la dernière fois → on l’adopte', () => {
    expect(languageToAdopt('fr', 'en', 'fr')).toBe('en');
  });

  it('pas de changement système → le choix fait dans l’app reste prioritaire', () => {
    expect(languageToAdopt('fr', 'fr', 'en')).toBeNull();
  });

  it('déjà dans la bonne langue → rien', () => {
    expect(languageToAdopt('fr', 'en', 'en')).toBeNull();
  });
});

describe('buildCalendarEvent (X6)', () => {
  it('pré-remplit titre, lieu, lien et une fin par défaut de 3 h', () => {
    const e = buildCalendarEvent({
      id: 'uuid-1',
      slug: 'gala',
      title: 'Gala',
      start_date: '2026-10-12T18:00:00Z',
      end_date: null,
      location_name: 'Hilton',
      location_city: 'Yaoundé',
      timezone: 'Africa/Douala',
    });
    expect(e.title).toBe('Gala');
    expect(e.location).toBe('Hilton, Yaoundé');
    expect(e.url).toMatch(/\/events\/gala$/);
    expect(e.endDate.getTime() - e.startDate.getTime()).toBe(3 * 60 * 60 * 1000);
    expect(e.timeZone).toBe('Africa/Douala');
  });

  it('ignore une date de fin antérieure au début', () => {
    const e = buildCalendarEvent({ id: 1, start_date: '2026-10-12T18:00:00Z', end_date: '2026-10-12T10:00:00Z' });
    expect(e.endDate > e.startDate).toBe(true);
  });
});

describe('chaînes du lot natif', () => {
  const flatten = (o: Record<string, any>, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

  it('parité FR/EN', () => {
    expect(flatten(__nativeStringsForTests.fr).sort()).toEqual(flatten(__nativeStringsForTests.en).sort());
  });

  it('vouvoiement en français (aucun tutoiement)', () => {
    const values = JSON.stringify(__nativeStringsForTests.fr);
    expect(values).not.toMatch(/\b(tu|ton|ta|tes|toi)\b/i);
  });
});
