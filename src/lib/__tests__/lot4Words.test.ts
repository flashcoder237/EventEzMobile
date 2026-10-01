/**
 * R3 lot 4 (mots et rituels) — logique pure : récit Mobile Money, ligne
 * d'attente, « Vouliez-vous dire », goûts, nouveautés, prochain billet,
 * impression de la carte « J'y vais ».
 */
import { LOADING_LINE_DELAY_MS, loadingLineKey, mobileMoneyStage } from '../utils/loadingNarrative';
import { didYouMean, editDistance, normalizeTerm } from '../utils/didYouMean';
import {
  buildInteractionPayload,
  orderCategoriesByTaste,
  topPreferenceNames,
  topTasteCategories,
} from '../recommendations';
import { normalizeSince } from '../meSince';
import { calendarDaysUntil, pickNextTicketEvent } from '../nextTicket';
import { printProgress } from '../goingCardDraft';
import { isLongAbsence, WELCOME_BACK_AFTER_MS } from '../lastOpen';
import { weatherKind } from '../weather';

const UUID = '3f2b8c1e-5a4d-4e8f-9b2a-1c3d5e7f9a0b';

describe('W1 — chargement qui raconte', () => {
  it('rien sous 1,2 s, puis la ligne du contexte', () => {
    expect(loadingLineKey('tickets', 0)).toBeNull();
    expect(loadingLineKey('tickets', LOADING_LINE_DELAY_MS - 1)).toBeNull();
    expect(loadingLineKey('tickets', LOADING_LINE_DELAY_MS)).toBe('delight.loading.tickets');
    expect(loadingLineKey('messages', NaN)).toBeNull();
  });

  it('Mobile Money : récit indexé sur le temps réel écoulé', () => {
    expect(mobileMoneyStage(0)).toBe('sent');
    expect(mobileMoneyStage(19)).toBe('sent');
    expect(mobileMoneyStage(20)).toBe('pin');
    expect(mobileMoneyStage(59)).toBe('pin');
    expect(mobileMoneyStage(60)).toBe('operator');
    expect(mobileMoneyStage(119)).toBe('operator');
    expect(mobileMoneyStage(120)).toBe('once');
    expect(mobileMoneyStage(900)).toBe('once');
  });
});

describe('W2 — « Vouliez-vous dire … ? »', () => {
  const candidates = [
    { label: 'Concerts', value: 1 },
    { label: 'Conférences', value: 2 },
    { label: 'Soirée jazz', value: 3 },
    { label: 'Sport', value: 4 },
  ];

  it('normalise accents et casse', () => {
    expect(normalizeTerm('  Conférences ')).toBe('conferences');
    expect(editDistance('jaz', 'jazz')).toBe(1);
  });

  it('propose le terme connu le plus proche', () => {
    expect(didYouMean('concrets', candidates)?.value).toBe(1);
    expect(didYouMean('conference', candidates)?.value).toBe(2);
    expect(didYouMean('jaz', candidates)?.value).toBe(3);
    expect(didYouMean('concer', candidates)?.value).toBe(1);
  });

  it('ne propose rien de trop éloigné ni pour une requête trop courte', () => {
    expect(didYouMean('xylophone', candidates)).toBeNull();
    expect(didYouMean('co', candidates)).toBeNull();
    expect(didYouMean('jazz', [])).toBeNull();
  });
});

describe('W7 — signaux de recommandation', () => {
  it('envoie event_id (UUID) et category_id, jamais le slug', () => {
    expect(buildInteractionPayload('follow', { eventId: UUID })).toEqual({ interaction_type: 'follow', event_id: UUID });
    expect(buildInteractionPayload('follow', { eventId: 'douala-jazz-night' })).toBeNull();
    expect(buildInteractionPayload('search', { categoryId: 7 })).toEqual({ interaction_type: 'search', category_id: 7 });
    expect(buildInteractionPayload('search', { categoryId: '7' })).toEqual({ interaction_type: 'search', category_id: 7 });
    expect(buildInteractionPayload('register', {})).toBeNull();
  });

  it('les goûts ne sont affichés que si le signal est réel', () => {
    expect(topPreferenceNames(null)).toEqual([]);
    expect(topPreferenceNames({ total_interactions: 0, top_categories: [{ category_name: 'Jazz', score: 3 }] })).toEqual([]);
    const prefs = {
      total_interactions: 12,
      top_categories: [
        { category_id: 2, category_name: 'Jazz', score: 2.5 },
        { category_id: 5, category_name: 'Unknown', score: 9 },
        { category_id: 3, category_name: 'Théâtre', score: 4 },
        { category_id: 4, category_name: 'Sport', score: 0 },
      ],
    };
    expect(topPreferenceNames(prefs)).toEqual(['Théâtre', 'Jazz']);
    expect(topTasteCategories(prefs, 1).map((c) => c.category_id)).toEqual([3]);
  });

  it('les 2 premières chips suivent les goûts, le reste garde son ordre', () => {
    const cats = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    expect(orderCategoriesByTaste(cats, [4, 2, 5]).map((c) => c.id)).toEqual([4, 2, 1, 3, 5]);
    expect(orderCategoriesByTaste(cats, [99]).map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
    expect(orderCategoriesByTaste(cats, []).map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('W3/W6 — /me/since', () => {
  it('lit le contrat { since, count, items } et ignore le reste', () => {
    const items = normalizeSince({
      since: '2026-09-01T00:00:00Z',
      count: 3,
      items: [
        { id: 'a', title: 'Nuit du jazz', reason: 'followed_organizer', organizer_name: 'Jazz & Co', slug: 'nuit-du-jazz' },
        { id: 'b', title: '  ', reason: 'new_edition' },
        { id: 'a', title: 'Doublon', reason: 'new_edition' },
        { id: 'c', title: 'Salon 2027', reason: 'new_edition', location_city: 'Douala' },
      ],
    });
    expect(items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(items[0]).toMatchObject({ reason: 'followed_organizer', organizer_name: 'Jazz & Co', slug: 'nuit-du-jazz' });
    expect(items[1]).toMatchObject({ reason: 'new_edition', location_city: 'Douala' });
    expect(normalizeSince(null)).toEqual([]);
    expect(normalizeSince({ detail: 'ts invalide' })).toEqual([]);
  });

  it('« Bon retour » seulement après plus de 21 jours', () => {
    const now = Date.UTC(2026, 9, 1);
    expect(isLongAbsence(null, now)).toBe(false);
    expect(isLongAbsence(now - WELCOME_BACK_AFTER_MS + 1000, now)).toBe(false);
    expect(isLongAbsence(now - WELCOME_BACK_AFTER_MS, now)).toBe(true);
  });
});

describe('W3 — prochain billet (météo du lieu de l’événement)', () => {
  const now = new Date(2026, 9, 1, 9, 0, 0);
  const reg = (over: any = {}, ev: any = {}) => ({
    id: 'r1',
    status: 'confirmed',
    total_amount: 0,
    event_detail: {
      id: 'e1',
      title: 'Douala Jazz Night',
      start_date: new Date(2026, 9, 2, 20, 0).toISOString(),
      location_city: 'Douala',
      location_latitude: 4.05,
      location_longitude: 9.7,
      ...ev,
    },
    ...over,
  });

  it('retient un billet confirmé de J0 à J+2 avec coordonnées', () => {
    const next = pickNextTicketEvent([reg()], now);
    expect(next).toMatchObject({ id: 'e1', daysAway: 1, lat: 4.05, lng: 9.7, city: 'Douala' });
  });

  it('ignore trop loin, sans coordonnées, annulé, passé', () => {
    expect(pickNextTicketEvent([reg({}, { start_date: new Date(2026, 9, 5, 20).toISOString() })], now)).toBeNull();
    expect(pickNextTicketEvent([reg({}, { location_latitude: null, location_longitude: null })], now)).toBeNull();
    expect(pickNextTicketEvent([reg({ status: 'cancelled' })], now)).toBeNull();
    expect(
      pickNextTicketEvent([reg({}, { start_date: new Date(2026, 8, 30).toISOString(), end_date: new Date(2026, 8, 30).toISOString() })], now),
    ).toBeNull();
  });

  it('jours calendaires locaux', () => {
    expect(calendarDaysUntil(new Date(2026, 9, 1, 23, 59), now)).toBe(0);
    expect(calendarDaysUntil(new Date(2026, 9, 3, 0, 1), now)).toBe(2);
  });

  it('tendance météo lisible', () => {
    expect(weatherKind(95, 10)).toBe('storm');
    expect(weatherKind(61, null)).toBe('rain');
    expect(weatherKind(3, 70)).toBe('rain');
    expect(weatherKind(0, 0)).toBe('clear');
    expect(weatherKind(3, 10)).toBe('cloudy');
  });
});

describe('W8 — la carte s’imprime au rythme du temps réel', () => {
  it('rien avant 30 s, pleine à 120 s', () => {
    expect(printProgress(0)).toBe(0);
    expect(printProgress(30)).toBe(0);
    expect(printProgress(75)).toBeCloseTo(0.5);
    expect(printProgress(120)).toBe(1);
    expect(printProgress(600)).toBe(1);
  });
});
