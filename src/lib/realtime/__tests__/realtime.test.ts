import { TopicManager } from '../topicManager';
import { mergePulse, parseLastSale, pulseAvailability, isPulseHot, type EventPulse } from '../pulse';
import { applyPollUpdate, applyQuestionUpdate, bubblesFor, sortQuestions } from '../live';

function makeSender() {
  const sent: Record<string, unknown>[] = [];
  const send = (m: Record<string, unknown>) => {
    sent.push(m);
    return true;
  };
  return { sent, send };
}

describe('TopicManager (plafond de 3 topics, comptage de références)', () => {
  it('abonne à l’ouverture et ne dépasse jamais 3 topics actifs', () => {
    const tm = new TopicManager(3);
    ['event:a', 'event:b', 'live:c', 'organizer:d'].forEach((t) => tm.acquire(t));
    const { sent, send } = makeSender();
    tm.attach(send);
    expect(tm.activeTopics()).toEqual(['event:a', 'event:b', 'live:c']);
    expect(sent.filter((m) => m.type === 'subscribe')).toHaveLength(3);
    expect(tm.getStatus('organizer:d')).toBe('pending');
  });

  it('compte les références : un seul subscribe, un seul unsubscribe', () => {
    const tm = new TopicManager();
    const { sent, send } = makeSender();
    tm.attach(send);
    const r1 = tm.acquire('event:x');
    const r2 = tm.acquire('event:x');
    expect(sent).toEqual([{ type: 'subscribe', topic: 'event:x' }]);
    r1();
    expect(sent).toHaveLength(1);
    r2();
    r2(); // idempotent
    expect(sent).toEqual([
      { type: 'subscribe', topic: 'event:x' },
      { type: 'unsubscribe', topic: 'event:x' },
    ]);
  });

  it('une libération laisse passer le topic en attente', () => {
    const tm = new TopicManager(2);
    const { sent, send } = makeSender();
    tm.attach(send);
    const ra = tm.acquire('a');
    tm.acquire('b');
    tm.acquire('c');
    expect(tm.activeTopics()).toEqual(['a', 'b']);
    ra();
    expect(tm.activeTopics()).toEqual(['b', 'c']);
    expect(sent.at(-1)).toEqual({ type: 'subscribe', topic: 'c' });
  });

  it('un refus n’est jamais redemandé, même après reconnexion', () => {
    const tm = new TopicManager();
    const { sent, send } = makeSender();
    tm.attach(send);
    tm.acquire('live:secret');
    expect(tm.handle({ type: 'subscribe_error', topic: 'live:secret', reason: 'forbidden' })).toBe(true);
    expect(tm.getStatus('live:secret')).toBe('forbidden');
    tm.detach();
    tm.attach(send);
    expect(sent.filter((m) => m.topic === 'live:secret' && m.type === 'subscribe')).toHaveLength(1);
  });

  it('accuse la réception et se réabonne après une reconnexion', () => {
    const tm = new TopicManager();
    const a = makeSender();
    tm.attach(a.send);
    tm.acquire('event:1');
    tm.handle({ type: 'subscribed', topic: 'event:1' });
    expect(tm.getStatus('event:1')).toBe('subscribed');
    tm.detach();
    expect(tm.getStatus('event:1')).toBe('pending');
    const b = makeSender();
    tm.attach(b.send);
    expect(b.sent).toEqual([{ type: 'subscribe', topic: 'event:1' }]);
  });

  it('un refus « limit » ne relance pas le même topic en boucle', () => {
    const tm = new TopicManager();
    const { sent, send } = makeSender();
    tm.attach(send);
    tm.acquire('event:x');
    tm.handle({ type: 'subscribe_error', topic: 'event:x', reason: 'limit' });
    // Pas de nouvelle demande immédiate (sinon subscribe → limit → subscribe…).
    expect(sent.filter((m) => m.type === 'subscribe')).toHaveLength(1);
    expect(tm.getStatus('event:x')).toBe('pending');
    // Une nouvelle socket repart de zéro : le topic est redemandé une fois.
    tm.attach(send);
    expect(sent.filter((m) => m.type === 'subscribe')).toHaveLength(2);
  });

  it('ignore les messages qui ne le concernent pas', () => {
    expect(new TopicManager().handle({ type: 'event.pulse' })).toBe(false);
  });
});

const base: EventPulse = {
  event_id: 'e1',
  state: 'open',
  is_live: false,
  watching: { count: 5, at_least: true },
  last_sale: 'minutes:4',
  on_site: null,
  tickets: [{ id: 't1', available: 12, sold_out: false }],
  attendance_remaining: null,
  generated_at: '2026-09-29T10:00:00Z',
};

describe('pouls : fusion et honnêteté', () => {
  it('remplace par un instantané plus récent', () => {
    const next = { ...base, watching: null, generated_at: '2026-09-29T10:00:30Z' };
    expect(mergePulse(base, next)!.watching).toBeNull();
  });

  it('écarte un instantané plus ancien (réponse REST en retard)', () => {
    const old = { ...base, tickets: [{ id: 't1', available: 40, sold_out: false }], generated_at: '2026-09-29T09:59:00Z' };
    expect(mergePulse(base, old)).toBe(base);
  });

  it('n’invente rien : les champs absents restent null', () => {
    const merged = mergePulse(null, { event_id: 'e2', state: 'open' } as any)!;
    expect(merged.watching).toBeNull();
    expect(merged.last_sale).toBeNull();
    expect(merged.on_site).toBeNull();
    expect(merged.tickets).toEqual([]);
    expect(merged.attendance_remaining).toBeNull();
  });

  it('null ou payload vide ne change rien', () => {
    expect(mergePulse(base, null)).toBe(base);
    expect(mergePulse(null, undefined)).toBeNull();
  });

  it('décode la dernière vente sans rien extrapoler', () => {
    expect(parseLastSale('just_now')).toEqual({ kind: 'just_now' });
    expect(parseLastSale('minutes:4')).toEqual({ kind: 'minutes', minutes: 4 });
    expect(parseLastSale('today')).toEqual({ kind: 'today' });
    expect(parseLastSale('minutes:0')).toBeNull();
    expect(parseLastSale('yesterday')).toBeNull();
    expect(parseLastSale(null)).toBeNull();
  });

  it('disponibilité en direct par type de billet', () => {
    expect(pulseAvailability(base, 't1')).toBe(12);
    expect(pulseAvailability(base, 'autre')).toBeUndefined();
    expect(pulseAvailability(null, 't1')).toBeUndefined();
  });

  it('« chaud » : moins de 7 jours et pas terminé', () => {
    const now = Date.parse('2026-09-29T10:00:00Z');
    expect(isPulseHot({ start_date: '2026-10-02T18:00:00Z', end_date: '2026-10-02T23:00:00Z' }, now)).toBe(true);
    expect(isPulseHot({ start_date: '2026-11-20T18:00:00Z', end_date: '2026-11-20T23:00:00Z' }, now)).toBe(false);
    expect(isPulseHot({ start_date: '2026-09-20T18:00:00Z', end_date: '2026-09-20T23:00:00Z' }, now)).toBe(false);
  });
});

describe('direct : Q&R, sondages, réactions', () => {
  const mk = (d: any) => ({ ...d, upvote_count: d.upvote_count ?? 0 });

  it('ajoute une question nouvelle une seule fois', () => {
    const once = applyQuestionUpdate([], { id: 'q1', content: 'Q ?' }, mk);
    const twice = applyQuestionUpdate(once, { id: 'q1', content: 'Q ?' }, mk);
    expect(twice).toHaveLength(1);
  });

  it('met à jour votes et épinglage, puis réordonne', () => {
    let list = [
      { id: 'a', upvote_count: 5, is_pinned: false, created_at: '2026-09-29T10:00:00Z' },
      { id: 'b', upvote_count: 1, is_pinned: false, created_at: '2026-09-29T10:01:00Z' },
    ];
    list = applyQuestionUpdate(list, { id: 'b', is_pinned: true }, mk);
    expect(sortQuestions(list).map((q) => q.id)).toEqual(['b', 'a']);
  });

  it('met à jour les compteurs d’un sondage connu seulement', () => {
    const polls = [{ id: 'p', status: 'active', options: [{ id: 'o1', vote_count: 1 }, { id: 'o2', vote_count: 0 }] }];
    const next = applyPollUpdate(polls, { id: 'p', status: 'closed', options: [{ id: 'o2', vote_count: 3 }] });
    expect(next[0].status).toBe('closed');
    expect(next[0].options!.map((o) => o.vote_count)).toEqual([1, 3]);
    expect(applyPollUpdate(polls, { id: 'inconnu' })).toBe(polls);
  });

  it('au plus 6 bulles par fenêtre, émojis autorisés seulement', () => {
    expect(bubblesFor({ '👏': 140, '🔥': 20, '🎉': 1 })).toHaveLength(6);
    expect(bubblesFor({ '👏': 140, '🔥': 20, '🎉': 1 })).toContain('🎉');
    expect(bubblesFor({ '💩': 50 })).toEqual([]);
    expect(bubblesFor(null)).toEqual([]);
  });
});
