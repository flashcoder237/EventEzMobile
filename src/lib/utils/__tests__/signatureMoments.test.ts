/**
 * Moments signatures (round 2, lot S) : logique pure derrière la carte « Ce
 * soir », le hub « sur place », le toast « Vous êtes entré » et la teinte.
 */
import { pickTonight } from '../../../hooks/useTonightTicket';
import { splitSessions, isRegistrationCheckedIn } from '../../../components/tickets/OnSiteHub';
import { toCheckinMoment } from '../../../components/moments/CheckinWelcomeMoment';
import { tintBase, tintFor, tintAlpha, eventTint, DEFAULT_TINT } from '../themeTint';
import { getEventAmbience } from '../eventKind';

jest.mock('../../../api', () => ({ registrationsAPI: {}, sessionsAPI: {} }));
jest.mock('../../../services/CacheService', () => ({ __esModule: true, default: { get: jest.fn(), set: jest.fn() } }));

const reg = (status: string, start: string, end?: string, extra: any = {}) => ({
  id: `r-${start}`,
  status,
  event_detail: { title: 'Concert', start_date: start, end_date: end },
  ...extra,
});

describe('pickTonight', () => {
  const now = new Date('2026-10-18T15:00:00Z'); // 16:00 à Douala

  it('choisit le billet du jour le plus proche', () => {
    const t = pickTonight(
      [reg('confirmed', '2026-10-18T19:00:00Z'), reg('confirmed', '2026-10-18T18:00:00Z')],
      now,
    );
    expect(t?.registrationId).toBe('r-2026-10-18T18:00:00Z');
    expect(t?.phase).toBe('JOUR_J');
  });

  it('ignore les annulés, les billets non réglés et les autres jours', () => {
    expect(pickTonight([reg('cancelled', '2026-10-18T19:00:00Z')], now)).toBeNull();
    expect(pickTonight([reg('confirmed', '2026-10-20T19:00:00Z')], now)).toBeNull();
  });

  it("reconnaît un événement en cours", () => {
    const t = pickTonight([reg('checked_in', '2026-10-18T14:00:00Z', '2026-10-18T18:00:00Z')], now);
    expect(t?.phase).toBe('EN_COURS');
  });
});

describe('OnSiteHub helpers', () => {
  it('sépare la session en cours et la suivante', () => {
    const now = new Date('2026-10-18T15:00:00Z').getTime();
    const { current, next } = splitSessions(
      [
        { id: 'a', title: 'A', start_time: '2026-10-18T14:30:00Z', end_time: '2026-10-18T15:30:00Z' },
        { id: 'c', title: 'C', start_time: '2026-10-18T17:00:00Z', end_time: '2026-10-18T18:00:00Z' },
        { id: 'b', title: 'B', start_time: '2026-10-18T16:00:00Z', end_time: '2026-10-18T16:45:00Z' },
      ],
      now,
    );
    expect(current?.id).toBe('a');
    expect(next?.id).toBe('b');
  });

  it("détecte un check-in par l'inscription ou par un billet", () => {
    expect(isRegistrationCheckedIn({ status: 'checked_in' })).toBe(true);
    expect(isRegistrationCheckedIn({ status: 'confirmed', tickets: [{ is_checked_in: true }] })).toBe(true);
    expect(isRegistrationCheckedIn({ status: 'confirmed', tickets: [{ is_checked_in: false }] })).toBe(false);
  });
});

describe('toCheckinMoment', () => {
  it('ne réagit qu’à checkin_welcome', () => {
    expect(toCheckinMoment({ notification_type: 'new_message' })).toBeNull();
  });

  it('extrait heure, rang, teinte et billet', () => {
    const m = toCheckinMoment({
      id: 7,
      notification_type: 'checkin_welcome',
      extra_data: {
        event_title: 'Jazz',
        arrival_time: '20:14',
        arrival_rank: 213,
        registration_id: 'r1',
        theme_tint: { base: '#0F766E' },
      },
    });
    expect(m).toMatchObject({ title: 'Jazz', time: '20:14', rank: 213, tint: '#0F766E', registrationId: 'r1' });
  });
});

describe('themeTint', () => {
  it('retombe sur l’indigo si la teinte est absente ou invalide', () => {
    expect(tintBase(null)).toBe(DEFAULT_TINT);
    expect(tintBase({ base: 'red' })).toBe(DEFAULT_TINT);
  });

  it('prend onDark en thème sombre', () => {
    expect(tintFor({ base: '#112233', onDark: '#AABBCC' }, true)).toBe('#AABBCC');
    expect(tintFor({ base: '#112233', onDark: '#AABBCC' }, false)).toBe('#112233');
  });

  it('ajoute un alpha hexadécimal', () => {
    expect(tintAlpha('#112233', 0.5)).toBe('#11223380');
  });

  it('lit la teinte sur un événement ou une inscription', () => {
    expect(eventTint({ event_detail: { theme_tint: { base: '#123456' } } })?.base).toBe('#123456');
  });
});

describe('getEventAmbience', () => {
  it('reconnaît les trois registres et retombe sur neutre', () => {
    expect(getEventAmbience({ category: { slug: 'mariages-celebrations' } })).toBe('celebration');
    expect(getEventAmbience({ category: { slug: 'musique-concerts' } })).toBe('night');
    expect(getEventAmbience({ category: { slug: 'conferences' } })).toBe('knowledge');
    expect(getEventAmbience({ category: { slug: 'sport' } })).toBe('neutral');
  });
});
