import {
  buildPayoutRail,
  computeSince,
  crossedHundred,
  deliveryStateOf,
  hoursUntilRelease,
  isDuplicateScan,
  isRecentValidation,
  maskedTail,
  newCheckins,
  pickLiveOpsMoment,
  releasedSince,
  scanCadence,
  shouldStoreSnapshot,
  toOrganizerMilestone,
} from '../organizerMoments';

const H = 3600 * 1000;

describe('computeSince (O5)', () => {
  const now = Date.UTC(2026, 8, 29, 20, 0);
  it('rien au premier passage', () => {
    expect(computeSince(null, 1284, now)).toEqual({ from: null, delta: null, since: null });
  });
  it('rien sous 2 h', () => {
    expect(computeSince({ value: 1272, at: now - H }, 1284, now).delta).toBeNull();
  });
  it('écart positif après 2 h : départ = ancienne valeur', () => {
    expect(computeSince({ value: 1272, at: now - 3 * H }, 1284, now)).toEqual({ from: 1272, delta: 12, since: now - 3 * H });
  });
  it('écart négatif ou nul : rien', () => {
    expect(computeSince({ value: 1300, at: now - 3 * H }, 1284, now).delta).toBeNull();
    expect(computeSince({ value: 1284, at: now - 3 * H }, 1284, now).delta).toBeNull();
  });
  it('le relevé n’est pas écrasé dans la fenêtre de 2 h', () => {
    expect(shouldStoreSnapshot({ value: 1, at: now - H }, now)).toBe(false);
    expect(shouldStoreSnapshot({ value: 1, at: now - 3 * H }, now)).toBe(true);
    expect(shouldStoreSnapshot(null, now)).toBe(true);
  });
});

describe('isRecentValidation (O4)', () => {
  const now = Date.UTC(2026, 8, 29);
  it('validé il y a 3 jours', () => {
    expect(isRecentValidation({ status: 'validated', validated_at: new Date(now - 3 * 24 * H).toISOString() }, now)).toBe(true);
  });
  it('trop ancien, sans date ou pas validé', () => {
    expect(isRecentValidation({ status: 'validated', validated_at: new Date(now - 20 * 24 * H).toISOString() }, now)).toBe(false);
    expect(isRecentValidation({ status: 'validated' }, now)).toBe(false);
    expect(isRecentValidation({ status: 'submitted', validated_at: new Date(now).toISOString() }, now)).toBe(false);
  });
});

describe('toOrganizerMilestone (O1/O2/O3)', () => {
  it('premier participant', () => {
    const m = toOrganizerMilestone({
      id: 7,
      notification_type: 'organizer_milestone',
      extra_data: { kind: 'first', event_id: 'e1', event_title: 'Jazz', participant_name: 'Awa K.', amount: 5000, currency: 'XAF' },
    });
    expect(m).toMatchObject({ kind: 'first', eventId: 'e1', participantName: 'Awa K.', amount: 5000, currency: 'XAF' });
  });
  it('ignore les autres types et un kind inconnu', () => {
    expect(toOrganizerMilestone({ notification_type: 'new_registration', extra_data: { kind: 'first', event_id: 'e' } })).toBeNull();
    expect(toOrganizerMilestone({ notification_type: 'organizer_milestone', extra_data: { kind: 'boom', event_id: 'e' } })).toBeNull();
    expect(toOrganizerMilestone({ notification_type: 'organizer_milestone', extra_data: { kind: 'count' } })).toBeNull();
  });
});

describe('buildPayoutRail (O6)', () => {
  const base = { status: 'pending' as const, requested_at: '2026-09-29T14:02:00Z' };
  it('sans double validation : 2 étapes', () => {
    const r = buildPayoutRail(base);
    expect(r.steps.map((s) => s.key)).toEqual(['requested', 'sent']);
    expect(r.steps.map((s) => s.state)).toEqual(['done', 'current']);
  });
  it('double validation : étape Approuvé avec son heure', () => {
    const r = buildPayoutRail({ ...base, first_approved_at: '2026-09-29T14:03:00Z', delivery_state: 'approved' });
    expect(r.steps.map((s) => s.key)).toEqual(['requested', 'approved', 'sent']);
    expect(r.steps[1]).toMatchObject({ state: 'done', at: '2026-09-29T14:03:00Z' });
  });
  it('verifying : JAMAIS « envoyé »', () => {
    const r = buildPayoutRail({ ...base, status: 'processing', delivery_state: 'verifying', processed_at: '2026-09-29T14:05:00Z' });
    expect(r.tone).toBe('verifying');
    const sent = r.steps.find((s) => s.key === 'sent')!;
    expect(sent.state).toBe('warn');
    expect(sent.at).toBeNull();
  });
  it('envoyé seulement sur completed', () => {
    const r = buildPayoutRail({ ...base, status: 'completed', processed_at: '2026-09-29T14:05:00Z' });
    expect(r.tone).toBe('sent');
    expect(r.steps.every((s) => s.state === 'done')).toBe(true);
  });
  it('échec et repli sur le statut', () => {
    expect(buildPayoutRail({ ...base, status: 'failed' }).tone).toBe('failed');
    expect(deliveryStateOf({ ...base, status: 'processing' })).toBe('sending');
    expect(deliveryStateOf({ ...base, status: 'completed', delivery_state: 'verifying' })).toBe('verifying');
  });
  it('masque le compte', () => {
    expect(maskedTail('+237 6 99 00 12 42')).toBe('•••42');
    expect(maskedTail('')).toBe('');
  });
});

describe('fonds libérés (O7)', () => {
  const now = Date.UTC(2026, 8, 29, 12);
  it('seulement ce qui a été libéré après la dernière visite', () => {
    const e = [
      { id: 'a', amount: 1000, is_released: true, released_at: new Date(now - H).toISOString() },
      { id: 'b', amount: 500, is_released: true, released_at: new Date(now - 10 * H).toISOString() },
      { id: 'c', amount: 200, is_released: false },
    ];
    expect(releasedSince(e, now - 5 * H)).toMatchObject({ total: 1000 });
    expect(releasedSince(e, null).total).toBe(0);
  });
  it('« disponible dans N h » seulement sous 48 h', () => {
    expect(hoursUntilRelease(new Date(now + 17.5 * H).toISOString(), now)).toBe(18);
    expect(hoursUntilRelease(new Date(now + 60 * H).toISOString(), now)).toBeNull();
    expect(hoursUntilRelease(new Date(now - H).toISOString(), now)).toBeNull();
  });
});

describe('moments du jour J (O8)', () => {
  it('rien au premier chargement', () => {
    expect(pickLiveOpsMoment(null, { first_check_in_at: 'x' })).toBeNull();
  });
  it('portes ouvertes au premier check-in', () => {
    expect(pickLiveOpsMoment({ first_check_in_at: null }, { first_check_in_at: '2026-09-29T18:42:00Z' })).toBe('doors');
  });
  it('salle presque pleine au franchissement de 90 %', () => {
    const a = { first_check_in_at: 'x', check_in_percentage: 85 };
    expect(pickLiveOpsMoment(a, { ...a, check_in_percentage: 91 })).toBe('nearly_full');
    expect(pickLiveOpsMoment({ ...a, check_in_percentage: 92 }, { ...a, check_in_percentage: 93 })).toBeNull();
  });
  it('pic : tranche courante ≥ 10 et nouveau maximum', () => {
    const a = { first_check_in_at: 'x', timeline: { buckets: [3, 8, 9] } };
    expect(pickLiveOpsMoment(a, { first_check_in_at: 'x', timeline: { buckets: [3, 8, 12] } })).toBe('peak');
    expect(pickLiveOpsMoment(a, { first_check_in_at: 'x', timeline: { buckets: [3, 8, 9] } })).toBeNull();
  });
  it('nouveaux check-ins par différence', () => {
    const r1 = { checked_in_at: '1', holder_name: 'A' };
    const r2 = { checked_in_at: '2', holder_name: 'B' };
    expect(newCheckins(null, [r1])).toEqual([]);
    expect(newCheckins([r1], [r2, r1])).toEqual([r2]);
  });
});

describe('scanner (O9)', () => {
  it('cadence par minute', () => {
    expect(scanCadence(30, 0, 10 * 60000)).toBe(3);
    expect(scanCadence(0, 0, 60000)).toBe(0);
  });
  it('palier de 100', () => {
    expect(crossedHundred(99, 100)).toBe(100);
    expect(crossedHundred(100, 101)).toBeNull();
    expect(crossedHundred(199, 201)).toBe(200);
  });
  it('anti double-scan du même code', () => {
    expect(isDuplicateScan({ code: 'X', at: 0 }, 'X', 1000)).toBe(true);
    expect(isDuplicateScan({ code: 'X', at: 0 }, 'X', 2000)).toBe(false);
    expect(isDuplicateScan({ code: 'X', at: 0 }, 'Y', 100)).toBe(false);
  });
});
