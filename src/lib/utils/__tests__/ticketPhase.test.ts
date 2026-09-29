import {
  getTicketPhase,
  civilDaysUntil,
  directionsUrl,
  SPOTLIGHT_PHASES,
  PAST_PHASES,
} from '../ticketPhase';
import { getEventAmbience } from '../eventKind';

// Douala = UTC+1 toute l'année (pas d'heure d'été).
const ev = (start: string, end?: string, timezone?: string) => ({
  start_date: start,
  end_date: end ?? null,
  timezone: timezone ?? null,
});

describe('getTicketPhase', () => {
  const start = '2026-10-18T19:00:00Z'; // 20:00 à Douala
  const end = '2026-10-18T23:00:00Z';

  it('à plus de 7 jours : A_VENIR', () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-01T10:00:00Z'))).toBe('A_VENIR');
  });

  it('dans la semaine : J7', () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-12T10:00:00Z'))).toBe('J7');
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-11T10:00:00Z'))).toBe('J7');
  });

  it("la veille (jour civil de l'événement) : VEILLE", () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-17T21:00:00Z'))).toBe('VEILLE');
  });

  it('le jour même avant les portes : JOUR_J', () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-18T08:00:00Z'))).toBe('JOUR_J');
  });

  it("dans l'heure qui précède : PORTES", () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-18T18:15:00Z'))).toBe('PORTES');
  });

  it('pendant : EN_COURS', () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-18T20:30:00Z'))).toBe('EN_COURS');
  });

  it('juste après (< 48 h) : APRES, puis SOUVENIR', () => {
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-19T09:00:00Z'))).toBe('APRES');
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-25T09:00:00Z'))).toBe('SOUVENIR');
  });

  it("compte les jours dans le fuseau de l'événement, pas du navigateur", () => {
    // 23:30 UTC le 16 = 00:30 le 17 à Douala → l'événement du 18 est « demain ».
    expect(getTicketPhase(ev(start, end), null, new Date('2026-10-16T23:30:00Z'))).toBe('VEILLE');
    // Même instant vu de Los Angeles (UTC-7) : on est encore le 16.
    expect(
      civilDaysUntil(new Date('2026-10-18T03:00:00Z'), new Date('2026-10-16T23:30:00Z'), 'America/Los_Angeles'),
    ).toBe(1);
  });

  it('événement sur plusieurs jours : EN_COURS tout du long', () => {
    const fest = ev('2026-11-20T10:00:00Z', '2026-11-23T22:00:00Z');
    expect(getTicketPhase(fest, null, new Date('2026-11-22T03:00:00Z'))).toBe('EN_COURS');
  });

  it('sans date de fin : 3 h par défaut', () => {
    expect(getTicketPhase(ev(start), null, new Date('2026-10-18T21:30:00Z'))).toBe('EN_COURS');
    expect(getTicketPhase(ev(start), null, new Date('2026-10-18T22:30:00Z'))).toBe('APRES');
  });

  it('inscription annulée ou date invalide : null', () => {
    expect(getTicketPhase(ev(start, end), { status: 'cancelled' }, new Date('2026-10-12T10:00:00Z'))).toBeNull();
    expect(getTicketPhase(ev('pas une date'), null)).toBeNull();
    expect(getTicketPhase(null, null)).toBeNull();
  });

  it('fuseau inconnu : repli sur Douala sans planter', () => {
    expect(getTicketPhase(ev(start, end, 'Mars/Olympus'), null, new Date('2026-10-17T21:00:00Z'))).toBe('VEILLE');
  });

  it('groupes de phases cohérents', () => {
    expect(SPOTLIGHT_PHASES.has('JOUR_J')).toBe(true);
    expect(PAST_PHASES.has('APRES')).toBe(true);
    expect(SPOTLIGHT_PHASES.has('A_VENIR')).toBe(false);
  });
});

describe('directionsUrl', () => {
  it('préfère les coordonnées, accepte les chaînes DRF', () => {
    expect(directionsUrl({ location_latitude: '4.05', location_longitude: '9.7' })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=4.05,9.7',
    );
  });
  it("retombe sur l'adresse", () => {
    expect(directionsUrl({ location_name: 'Palais des Sports', location_city: 'Douala' })).toContain(
      encodeURIComponent('Palais des Sports, Douala'),
    );
  });
  it('rien sans lieu', () => {
    expect(directionsUrl({})).toBeNull();
  });
});

describe('getEventAmbience', () => {
  it('reconnaît les trois registres par catégorie', () => {
    expect(getEventAmbience({ category: { slug: 'mariages-celebrations', name: 'Mariages' } })).toBe('celebration');
    expect(getEventAmbience({ category: { slug: 'musique-concerts', name: 'Concerts' } })).toBe('night');
    expect(getEventAmbience({ category: { slug: 'soirees-nightlife', name: 'Soirées' } })).toBe('night');
    expect(getEventAmbience({ category: { slug: 'conferences', name: 'Conférences' } })).toBe('knowledge');
    expect(getEventAmbience({ category: { slug: 'formations-ateliers', name: 'Formations' } })).toBe('knowledge');
  });
  it('se rabat sur les tags, puis sur neutre', () => {
    expect(getEventAmbience({ category: { slug: 'autre', name: 'Autre' }, tags: [{ name: 'Mariage' }] })).toBe(
      'celebration',
    );
    expect(getEventAmbience({ category: { slug: 'sport', name: 'Sport' } })).toBe('neutral');
    expect(getEventAmbience(null)).toBe('neutral');
  });
});
