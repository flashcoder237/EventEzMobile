/**
 * L'onglet Organiser vit ou meurt sur ce choix : s'il désigne le mauvais
 * événement, l'organisateur scanne à la mauvaise porte. Les cas limites
 * (dates invalides, événements simultanés, événements passés) comptent donc
 * autant que le cas nominal.
 */
import { pickActiveEvent, isScannable } from '../activeEvent';
import { Event } from '../../../types';

const NOW = new Date('2026-09-20T14:00:00Z').getTime();
const h = (n: number) => n * 3600_000;

function makeEvent(over: Partial<Event> & { id: string }): Event {
  return {
    title: `Event ${over.id}`,
    status: 'validated',
    location_type: 'in_person',
    start_date: new Date(NOW - h(1)).toISOString(),
    end_date: new Date(NOW + h(1)).toISOString(),
    ...over,
  } as Event;
}

describe('pickActiveEvent', () => {
  it('retourne null sans aucun événement', () => {
    expect(pickActiveEvent([], NOW)).toBeNull();
  });

  describe('événement en cours', () => {
    it("désigne celui dont la fenêtre contient l'instant présent", () => {
      const result = pickActiveEvent([makeEvent({ id: 'live' })], NOW);
      expect(result?.event.id).toBe('live');
      expect(result?.isLive).toBe(true);
    });

    it('le live prime sur un événement qui commence dans une heure', () => {
      const result = pickActiveEvent(
        [
          makeEvent({
            id: 'soon',
            start_date: new Date(NOW + h(1)).toISOString(),
            end_date: new Date(NOW + h(3)).toISOString(),
          }),
          makeEvent({ id: 'live' }),
        ],
        NOW,
      );
      // Pendant un événement, c'est celui-là qui a une porte ouverte.
      expect(result?.event.id).toBe('live');
      expect(result?.isLive).toBe(true);
    });

    it('entre deux live simultanés, retient celui commencé en premier', () => {
      const result = pickActiveEvent(
        [
          makeEvent({ id: 'second', start_date: new Date(NOW - h(1)).toISOString() }),
          makeEvent({ id: 'first', start_date: new Date(NOW - h(4)).toISOString() }),
        ],
        NOW,
      );
      expect(result?.event.id).toBe('first');
    });

    it('inclut les bornes exactes (début et fin)', () => {
      const atStart = pickActiveEvent(
        [makeEvent({ id: 'boundary', start_date: new Date(NOW).toISOString() })],
        NOW,
      );
      expect(atStart?.isLive).toBe(true);

      const atEnd = pickActiveEvent(
        [
          makeEvent({
            id: 'boundary',
            start_date: new Date(NOW - h(2)).toISOString(),
            end_date: new Date(NOW).toISOString(),
          }),
        ],
        NOW,
      );
      expect(atEnd?.isLive).toBe(true);
    });
  });

  describe('à défaut, le prochain', () => {
    it('retient le plus proche dans le futur', () => {
      const result = pickActiveEvent(
        [
          makeEvent({
            id: 'later',
            start_date: new Date(NOW + h(48)).toISOString(),
            end_date: new Date(NOW + h(50)).toISOString(),
          }),
          makeEvent({
            id: 'sooner',
            start_date: new Date(NOW + h(2)).toISOString(),
            end_date: new Date(NOW + h(4)).toISOString(),
          }),
        ],
        NOW,
      );
      expect(result?.event.id).toBe('sooner');
      expect(result?.isLive).toBe(false);
    });

    it('ignore les événements terminés — ils n\'ont plus d\'action de terrain', () => {
      const result = pickActiveEvent(
        [
          makeEvent({
            id: 'past',
            start_date: new Date(NOW - h(48)).toISOString(),
            end_date: new Date(NOW - h(46)).toISOString(),
          }),
        ],
        NOW,
      );
      expect(result).toBeNull();
    });
  });

  describe('statuts non exploitables', () => {
    it.each(['draft', 'submitted', 'rejected', 'cancelled'])(
      "ignore un événement en statut %s",
      (status) => {
        const result = pickActiveEvent([makeEvent({ id: 'x', status: status as any })], NOW);
        expect(result).toBeNull();
      },
    );

    it('accepte validated et completed', () => {
      expect(pickActiveEvent([makeEvent({ id: 'v', status: 'validated' })], NOW)).not.toBeNull();
      expect(pickActiveEvent([makeEvent({ id: 'c', status: 'completed' })], NOW)).not.toBeNull();
    });
  });

  describe('robustesse des dates', () => {
    it('écarte une date invalide au lieu de la classer au hasard', () => {
      // `new Date('pas une date').getTime()` vaut NaN, et NaN fait échouer
      // toutes les comparaisons en silence.
      const result = pickActiveEvent(
        [makeEvent({ id: 'broken', start_date: 'pas-une-date', end_date: 'non-plus' })],
        NOW,
      );
      expect(result).toBeNull();
    });

    it('garde les événements sains malgré une entrée corrompue', () => {
      const result = pickActiveEvent(
        [
          makeEvent({ id: 'broken', start_date: 'invalide', end_date: 'invalide' }),
          makeEvent({ id: 'live' }),
        ],
        NOW,
      );
      expect(result?.event.id).toBe('live');
    });
  });
});

describe('isScannable', () => {
  it("refuse le scan sur un événement 100% en ligne", () => {
    // Il n'y a pas de porte : proposer « Scanner » mène à une impasse.
    expect(isScannable(makeEvent({ id: 'online', location_type: 'online' }))).toBe(false);
  });

  it('autorise le présentiel et l\'hybride', () => {
    expect(isScannable(makeEvent({ id: 'a', location_type: 'in_person' }))).toBe(true);
    expect(isScannable(makeEvent({ id: 'b', location_type: 'hybrid' as any }))).toBe(true);
  });

  it('refuse sur une valeur absente', () => {
    expect(isScannable(null)).toBe(false);
    expect(isScannable(undefined)).toBe(false);
  });
});
