import {
  ATTENDEE_ACTIVITY_LEAD_MS,
  buildAttendeeActivity,
  buildWidgetPayload,
  formatWhen,
  pickNextTicket,
  shouldShowAttendeeActivity,
} from '../nextTicket';

const H = 60 * 60 * 1000;
const NOW = new Date('2026-10-10T12:00:00Z');

function reg(id: string, start: string, extra: Record<string, any> = {}, status = 'confirmed') {
  return {
    id,
    status,
    payment_status: 'completed',
    event_detail: {
      id: `ev-${id}`,
      title: `Événement ${id}`,
      start_date: start,
      end_date: extra.end_date ?? null,
      location_name: extra.location_name ?? 'Palais des Sports',
      location_city: extra.location_city ?? 'Yaoundé',
      timezone: 'Africa/Douala',
      // Les autres champs d'`extra` (images notamment) passent tels quels :
      // sans ça, un test qui en ajoute un le verrait silencieusement ignoré.
      ...extra,
    },
  };
}

const labels = { header: 'Prochain billet', empty: 'Aucun billet à venir', live: 'En cours', tile: 'Mon prochain billet' };

describe('pickNextTicket', () => {
  it('prend le billet valide le plus proche, ignore annulés et terminés', () => {
    const t = pickNextTicket(
      [
        reg('far', '2026-11-01T18:00:00Z'),
        reg('cancelled', '2026-10-11T18:00:00Z', {}, 'cancelled'),
        reg('past', '2026-10-09T18:00:00Z'),
        reg('near', '2026-10-12T18:00:00Z'),
      ],
      NOW,
    );
    expect(t?.registrationId).toBe('near');
    expect(t?.doorsAt).toBe(Date.parse('2026-10-12T18:00:00Z') - H);
  });

  it('garde un événement EN COURS (commencé, pas fini)', () => {
    const t = pickNextTicket([reg('live', '2026-10-10T11:00:00Z'), reg('later', '2026-10-12T18:00:00Z')], NOW);
    expect(t?.registrationId).toBe('live');
    // Sans end_date : durée par défaut de 3 h.
    expect(t?.endsAt).toBe(Date.parse('2026-10-10T14:00:00Z'));
  });

  it('ne répète pas la ville quand le lieu la contient déjà', () => {
    const t = pickNextTicket([reg('a', '2026-10-12T18:00:00Z', { location_name: 'Stade de Yaoundé', location_city: 'Yaoundé' })], NOW);
    expect(t?.venue).toBe('Stade de Yaoundé');
  });

  it('renvoie null sans billet exploitable', () => {
    expect(pickNextTicket([], NOW)).toBeNull();
    expect(pickNextTicket(null, NOW)).toBeNull();
    expect(pickNextTicket([{ id: 'x', status: 'confirmed', event_detail: { start_date: 'nope' } }], NOW)).toBeNull();
  });
});

describe('buildWidgetPayload', () => {
  it('écrit les libellés même sans billet (état vide traduit)', () => {
    const p = buildWidgetPayload(null, labels, 'fr-FR');
    expect(p.title).toBe('');
    expect(p.labels.empty).toBe('Aucun billet à venir');
    expect(p.deepLink).toBe('eventez://tickets');
  });

  it('pointe le billet vers son détail, dates en millisecondes', () => {
    const t = pickNextTicket([reg('r1', '2026-10-12T18:00:00Z')], NOW)!;
    const p = buildWidgetPayload(t, labels, 'fr-FR');
    expect(p.deepLink).toBe('eventez://registrations/r1');
    expect(p.startsAt).toBe(Date.parse('2026-10-12T18:00:00Z'));
    expect(p.whenLabel).toContain('19:00'); // Douala = UTC+1
  });

  it("transporte l'image de l'événement", () => {
    // Le widget doit montrer le même visuel que les cartes de la liste.
    const t = pickNextTicket(
      [reg('r1', '2026-10-12T18:00:00Z', { display_image_thumb: '/media/ev/thumb.webp' })],
      NOW,
    )!;
    expect(t.imageUrl).toContain('/media/ev/thumb.webp');
    expect(buildWidgetPayload(t, labels, 'fr-FR').imageUrl).toBe(t.imageUrl);
  });

  it("préfère la vignette à l'original (un widget n'a pas besoin du plein format)", () => {
    const t = pickNextTicket(
      [reg('r1', '2026-10-12T18:00:00Z', {
        display_image_thumb: '/media/ev/thumb.webp',
        display_image: '/media/ev/full.jpg',
      })],
      NOW,
    )!;
    expect(t.imageUrl).toContain('thumb.webp');
    expect(t.imageUrl).not.toContain('full.jpg');
  });

  it("retombe sur l'image de bannière quand la vignette n'est pas générée", () => {
    // Les variantes sont null tant que le backend ne les a pas produites.
    const t = pickNextTicket(
      [reg('r1', '2026-10-12T18:00:00Z', { banner_image: '/media/ev/banner.jpg' })],
      NOW,
    )!;
    expect(t.imageUrl).toContain('banner.jpg');
  });

  it("vaut null quand l'événement n'a aucune image", () => {
    // Le widget retombe alors sur son fond uni : pas de case vide.
    const t = pickNextTicket([reg('r1', '2026-10-12T18:00:00Z')], NOW)!;
    expect(t.imageUrl).toBeNull();
    expect(buildWidgetPayload(t, labels, 'fr-FR').imageUrl).toBeNull();
  });

  it("l'état vide porte imageUrl: null (sinon l'ancienne image resterait)", () => {
    expect(buildWidgetPayload(null, labels, 'fr-FR').imageUrl).toBeNull();
  });
});

describe('formatWhen', () => {
  it("formate dans le fuseau de l'événement", () => {
    expect(formatWhen({ startsAt: Date.parse('2026-10-12T18:00:00Z'), timezone: 'Africa/Douala' }, 'fr-FR')).toMatch(/19:00$/);
  });

  it('survit à un fuseau inconnu', () => {
    expect(() => formatWhen({ startsAt: Date.parse('2026-10-12T18:00:00Z'), timezone: 'Mars/Olympus' }, 'fr-FR')).not.toThrow();
  });
});

describe('Live Activity participant', () => {
  const t = pickNextTicket([reg('r1', '2026-10-10T20:00:00Z')], NOW)!;

  it("n'apparaît qu'à partir de 4 h avant les portes, disparaît à la fin", () => {
    expect(shouldShowAttendeeActivity(t, t.doorsAt - ATTENDEE_ACTIVITY_LEAD_MS - 1)).toBe(false);
    expect(shouldShowAttendeeActivity(t, t.doorsAt - ATTENDEE_ACTIVITY_LEAD_MS)).toBe(true);
    expect(shouldShowAttendeeActivity(t, t.endsAt)).toBe(false);
    expect(shouldShowAttendeeActivity(null, NOW.getTime())).toBe(false);
  });

  it('compte à rebours avant les portes, staleDate = portes (bascule sans l\'app)', () => {
    const a = buildAttendeeActivity(t, { countdown: 'Ouverture des portes dans' }, t.doorsAt - H);
    expect(a.state.phase).toBe('countdown');
    expect(a.staleDate).toBe(t.doorsAt);
    // ActivityKit attend des SECONDES.
    expect(a.state.doorsAt).toBe(t.doorsAt / 1000);
    expect(a.attributes.key).toBe('reg:r1');
  });

  it('« en cours » après les portes, staleDate = fin', () => {
    const a = buildAttendeeActivity(t, {}, t.doorsAt + 1);
    expect(a.state.phase).toBe('live');
    expect(a.staleDate).toBe(t.endsAt);
  });
});
