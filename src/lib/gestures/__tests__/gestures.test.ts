/**
 * Round 3 — lot 3 : logique pure des gestes (secousse, applaudissement,
 * surprise, sélection à deux doigts, échange de contact, chut, briquet).
 */
import { undoStack, UNDO_WINDOW_MS } from '../undoStack';
import { isReportExcludedRoute, isShakeReportEnabled, resolveShake, shakeRouter } from '../shakeRouter';
import {
  APPLAUSE_MAX,
  clampApplause,
  isApplauseEmoji,
  nextApplauseDelay,
  pushCapped,
  shouldTickHaptic,
} from '../applause';
import { pickSurprise, registeredEventKeys, surpriseCandidates } from '../surprise';
import { addToSelection, buildSelectionCsv, rowAt, shouldTick } from '../dragSelect';
import { bumpErrorFrom, coarse } from '../bump';
import { buildHushScript, parseHushMessage } from '../hush';
import { flameAngle, lighterMessage, readLighters } from '../lighter';
import { base64ToBytes } from '../base64';

describe('G1 — undoStack', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    undoStack.clear();
  });
  afterEach(() => jest.useRealTimers());

  it('garde une seule entrée, valable 10 s', () => {
    const now = 1_000_000;
    undoStack.push({ key: 'a', label: 'A', undo: jest.fn() }, now);
    undoStack.push({ key: 'b', label: 'B', undo: jest.fn() }, now);
    expect(undoStack.peek(now)?.key).toBe('b');
    expect(undoStack.peek(now + UNDO_WINDOW_MS + 1)).toBeNull();
  });

  it('expire tout seul et prévient les abonnés', () => {
    const l = jest.fn();
    const off = undoStack.subscribe(l);
    undoStack.push({ key: 'a', label: 'A', undo: jest.fn() });
    jest.advanceTimersByTime(UNDO_WINDOW_MS + 5);
    expect(undoStack.hasPending()).toBe(false);
    expect(l).toHaveBeenCalledTimes(2);
    off();
  });

  it('take consomme ; drop ne retire que la bonne clé', () => {
    undoStack.push({ key: 'a', label: 'A', undo: jest.fn() });
    undoStack.drop('autre');
    expect(undoStack.hasPending()).toBe(true);
    expect(undoStack.take()?.key).toBe('a');
    expect(undoStack.hasPending()).toBe(false);
  });
});

describe('aiguillage de la secousse', () => {
  afterEach(() => shakeRouter.__reset());

  it('annulation > écran > signalement', () => {
    const base = { undoPending: false, hasScreenHandler: false, reportEnabled: true, routeExcludedFromReport: false };
    expect(resolveShake({ ...base, undoPending: true, hasScreenHandler: true })).toBe('undo');
    expect(resolveShake({ ...base, hasScreenHandler: true })).toBe('screen');
    expect(resolveShake(base)).toBe('report');
    expect(resolveShake({ ...base, routeExcludedFromReport: true })).toBeNull();
    expect(resolveShake({ ...base, reportEnabled: false })).toBeNull();
  });

  it('jamais de capture sur billet, paiement ou conversation', () => {
    ['QRCode', 'RegistrationDetails', 'Payment', 'Conversation', 'Wallet'].forEach((r) =>
      expect(isReportExcludedRoute(r)).toBe(true),
    );
    expect(isReportExcludedRoute('Discover')).toBe(false);
  });

  it('le signalement n’existe que si EXPO_PUBLIC_SHAKE_TO_REPORT=1', () => {
    expect(isShakeReportEnabled('1')).toBe(true);
    expect(isShakeReportEnabled(undefined)).toBe(false);
    expect(isShakeReportEnabled('0')).toBe(false);
  });

  it('le dernier écran inscrit gagne, et se désinscrit', () => {
    const a = jest.fn();
    const b = jest.fn();
    const offA = shakeRouter.register(a);
    const offB = shakeRouter.register(b);
    shakeRouter.top()?.();
    expect(b).toHaveBeenCalled();
    offB();
    shakeRouter.top()?.();
    expect(a).toHaveBeenCalled();
    offA();
    expect(shakeRouter.hasScreenHandler()).toBe(false);
  });
});

describe('G12 — applaudir longuement', () => {
  it('borne le compteur à 1..30', () => {
    expect(clampApplause(0)).toBe(1);
    expect(clampApplause(12.4)).toBe(12);
    expect(clampApplause(99)).toBe(APPLAUSE_MAX);
    expect(clampApplause(NaN)).toBe(1);
  });

  it('rafale croissante, plancher 70 ms', () => {
    expect(nextApplauseDelay(1)).toBeGreaterThan(nextApplauseDelay(10));
    expect(nextApplauseDelay(30)).toBe(70);
  });

  it('haptique à chaque clap puis un sur deux', () => {
    expect(shouldTickHaptic(5)).toBe(true);
    expect(shouldTickHaptic(11)).toBe(false);
    expect(shouldTickHaptic(12)).toBe(true);
  });

  it('seuls 👏 et 🔥 se maintiennent ; 6 bulles au plus', () => {
    expect(isApplauseEmoji('👏')).toBe(true);
    expect(isApplauseEmoji('😂')).toBe(false);
    let list: number[] = [];
    for (let i = 0; i < 10; i++) list = pushCapped(list, i);
    expect(list).toEqual([4, 5, 6, 7, 8, 9]);
  });
});

describe('G3 — surprends-moi', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  const future = '2026-10-10T18:00:00Z';
  const past = '2026-09-01T18:00:00Z';

  it('à venir, dédoublonné, jamais déjà réservé', () => {
    const forYou = [
      { id: 'a', start_date: future },
      { id: 'b', start_date: past },
      { id: 'c', slug: 'concert', start_date: future },
    ];
    const nearby = [{ id: 'a', start_date: future }, { id: 'd', start_date: future }];
    const registered = registeredEventKeys([
      { event: 'd', status: 'confirmed' },
      { event_details: { id: 'zz', slug: 'concert' }, status: 'confirmed' },
      { event: 'a', status: 'cancelled' },
    ]);
    expect(surpriseCandidates([forYou, nearby], registered, now).map((e) => e.id)).toEqual(['a']);
  });

  it('« Encore » évite le précédent quand c’est possible', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    expect(pickSurprise(list, 'a', () => 0)?.id).toBe('b');
    expect(pickSurprise([{ id: 'a' }], 'a', () => 0.9)?.id).toBe('a');
    expect(pickSurprise([], null)).toBeNull();
  });
});

describe('G16 — sélection à deux doigts', () => {
  const rects = [
    { id: 'r1', y: 100, height: 60 },
    { id: 'r2', y: 160, height: 60 },
  ];

  it('trouve la ligne survolée', () => {
    expect(rowAt(rects, 120)).toBe('r1');
    expect(rowAt(rects, 160)).toBe('r2');
    expect(rowAt(rects, 400)).toBeNull();
  });

  it('coche sans jamais décocher', () => {
    const s0 = new Set(['r1']);
    expect(addToSelection(s0, 'r1')).toBe(s0);
    expect(Array.from(addToSelection(s0, 'r2'))).toEqual(['r1', 'r2']);
  });

  it('tick au plus toutes les 40 ms', () => {
    expect(shouldTick(1039, 1000)).toBe(false);
    expect(shouldTick(1040, 1000)).toBe(true);
  });

  it('CSV échappé', () => {
    expect(buildSelectionCsv(['Nom', 'Note'], [['Ada, L.', 'dit "oui"']])).toBe('Nom,Note\n"Ada, L.","dit ""oui"""');
  });
});

describe('G13 — échange par secousse', () => {
  it('traduit les codes serveur', () => {
    const e = (code?: string, status = 400) => ({ response: { status, data: code ? { code } : {} } });
    expect(bumpErrorFrom(e('shake_disabled', 403))).toBe('disabled');
    expect(bumpErrorFrom(e('not_checked_in', 403))).toBe('notCheckedIn');
    expect(bumpErrorFrom(e('clock_skew'))).toBe('clockSkew');
    expect(bumpErrorFrom(e(undefined, 429))).toBe('rateLimited');
    expect(bumpErrorFrom(e('no_pair', 409))).toBe('expired');
    expect(bumpErrorFrom(new Error('réseau'))).toBe('generic');
  });

  it('position grossière à 4 décimales', () => {
    expect(coarse(4.0511234)).toBe(4.0511);
  });
});

describe('G5 — chut en visio', () => {
  it('coupe explicitement, sans bascule', () => {
    const script = buildHushScript(true);
    expect(script).toContain('muteAudio(true)');
    expect(script).toContain('muteVideo(true)');
    expect(buildHushScript(false)).toContain('muteAudio(false)');
  });

  it('ne lit que ses propres messages', () => {
    expect(parseHushMessage('{"type":"eventez-hush","mute":true,"ok":true}')).toEqual({ mute: true, ok: true });
    expect(parseHushMessage('{"type":"autre"}')).toBeNull();
    expect(parseHushMessage('pas du json')).toBeNull();
  });
});

describe('G11 — briquet', () => {
  it('la flamme penche à l’opposé, bornée', () => {
    expect(flameAngle(0)).toBe(-0);
    expect(flameAngle(1)).toBe(-28);
    expect(flameAngle(-5)).toBe(28);
  });

  it('message WS et compteur tolérant', () => {
    expect(lighterMessage('e1', true)).toEqual({ type: 'lighter', topic: 'live:e1', on: true });
    expect(readLighters({ lighters: 12 })).toBe(12);
    expect(readLighters(null)).toBe(0);
    expect(readLighters({ lighters: 'x' })).toBe(0);
  });
});

describe('G2 — capture en pièce jointe', () => {
  it('décode le base64', () => {
    expect(Array.from(base64ToBytes('SGVsbG8='))).toEqual([72, 101, 108, 108, 111]);
    expect(Array.from(base64ToBytes('data:image/jpeg;base64,QUJD'))).toEqual([65, 66, 67]);
  });
});
