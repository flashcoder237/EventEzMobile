import { registrationEvent } from '../registrationEvent';

describe('registrationEvent', () => {
  it('lit event_detail (forme réelle de l’API des inscriptions)', () => {
    const ev = registrationEvent({
      event: 'uuid-1',
      event_detail: { id: 'uuid-1', slug: 'nuit', title: 'Nuit du Makossa', start_date: '2026-12-17T10:02:00Z', end_date: '2026-12-18T02:00:00Z' },
    });
    expect(ev).toEqual({ id: 'uuid-1', slug: 'nuit', title: 'Nuit du Makossa', start_date: '2026-12-17T10:02:00Z', end_date: '2026-12-18T02:00:00Z' });
  });

  it('accepte event_details et event objet (anciennes formes)', () => {
    expect(registrationEvent({ event_details: { id: 'a', title: 'A', start_date: 'd' } }).title).toBe('A');
    expect(registrationEvent({ event: { id: 'b', title: 'B', start_date: 'd' } }).title).toBe('B');
  });

  it('event = UUID seul → id sans titre (le repli d’affichage reste à l’appelant)', () => {
    expect(registrationEvent({ event: 'uuid-9' })).toEqual({ id: 'uuid-9', slug: undefined, title: undefined, start_date: undefined, end_date: undefined });
  });
});
