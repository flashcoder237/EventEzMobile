/**
 * X2 — notification « jour J » épinglée : planning, déclencheurs INEXACTS,
 * retrait au scan, réglage.
 */
const mockDisplay = jest.fn((_n: any) => Promise.resolve('id'));
const mockTrigger = jest.fn((_n: any, _t: any) => Promise.resolve('id'));
const mockCancel = jest.fn((_id: string) => Promise.resolve());
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    displayNotification: (n: any) => mockDisplay(n),
    createTriggerNotification: (n: any, t: any) => mockTrigger(n, t),
    cancelNotification: (id: string) => mockCancel(id),
    createChannel: jest.fn(() => Promise.resolve('event_day')),
    getNotificationSettings: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
  },
  TriggerType: { TIMESTAMP: 0 },
  AndroidImportance: { LOW: 2 },
  AndroidVisibility: { PUBLIC: 1 },
}));

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BEFORE_MS, currentSessionTitle, ongoingEvent, planOngoing } from '../ongoingEventNotification';

const H = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-01T10:00:00Z');
const ev = (startInH: number, durH = 3) => ({
  id: 'e1',
  title: 'Douala Jazz Night',
  start_date: new Date(NOW + startInH * H).toISOString(),
  end_date: new Date(NOW + (startInH + durH) * H).toISOString(),
  location_name: 'Canal Olympia',
  location_latitude: '4.05',
  location_longitude: '9.76',
});

describe('planOngoing', () => {
  it('loin : « avant » planifiée à H-3 et retirée au début ; « pendant » au début, retirée à la fin', () => {
    const plan = planOngoing('r1', ev(10), NOW);
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ phase: 'before', at: NOW + 10 * H - BEFORE_MS, timeoutAfter: BEFORE_MS });
    expect(plan[1]).toMatchObject({ phase: 'during', at: NOW + 10 * H, timeoutAfter: 3 * H });
  });
  it('dans la fenêtre H-3 : affichée tout de suite', () => {
    const plan = planOngoing('r1', ev(1), NOW);
    expect(plan[0]).toMatchObject({ phase: 'before', at: null, timeoutAfter: H });
  });
  it('pendant : seule « pendant », affichée tout de suite', () => {
    const plan = planOngoing('r1', ev(-1), NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ phase: 'during', at: null, timeoutAfter: 2 * H });
  });
  it('terminé : rien', () => {
    expect(planOngoing('r1', ev(-5), NOW)).toEqual([]);
  });
});

describe('currentSessionTitle', () => {
  it('session en cours la plus récente', () => {
    const iso = (h: number) => new Date(NOW + h * H).toISOString();
    expect(
      currentSessionTitle(
        [
          { title: 'Ouverture', start_time: iso(-2), end_time: iso(1) },
          { title: 'Keynote', start_time: iso(-0.5), end_time: iso(0.5) },
          { title: 'Plus tard', start_time: iso(2), end_time: iso(3) },
        ],
        NOW,
      ),
    ).toBe('Keynote');
    expect(currentSessionTitle([], NOW)).toBeNull();
  });
});

describe('ongoingEvent (Android)', () => {
  const realOS = Platform.OS;
  beforeEach(async () => {
    (Platform as any).OS = 'android';
    mockDisplay.mockClear();
    mockTrigger.mockClear();
    mockCancel.mockClear();
    await AsyncStorage.clear();
  });
  afterAll(() => {
    (Platform as any).OS = realOS;
  });

  it('déclencheurs TIMESTAMP sans alarmManager (inexact), notification épinglée', async () => {
    await ongoingEvent.sync([{ registrationId: 'r1', event: ev(10) }], NOW);
    expect(mockTrigger).toHaveBeenCalledTimes(2);
    for (const [n, trig] of mockTrigger.mock.calls) {
      expect(trig.alarmManager).toBeUndefined();
      expect(n.android.ongoing).toBe(true);
      expect(n.android.asForegroundService).toBeUndefined();
      expect(n.android.actions.map((a: any) => a.pressAction.id)).toEqual(['show_ticket', 'directions']);
    }
  });

  it('scan → retirée et jamais recréée', async () => {
    await ongoingEvent.sync([{ registrationId: 'r1', event: ev(1) }], NOW);
    expect(mockDisplay).toHaveBeenCalled();
    await ongoingEvent.onCheckedIn('r1');
    expect(mockCancel).toHaveBeenCalledWith('ongoing:r1:before');
    mockDisplay.mockClear();
    mockTrigger.mockClear();
    await ongoingEvent.sync([{ registrationId: 'r1', event: ev(1) }], NOW);
    expect(mockDisplay).not.toHaveBeenCalled();
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('réglage coupé ou notifications coupées → rien, et l’existant est retiré', async () => {
    await ongoingEvent.sync([{ registrationId: 'r1', event: ev(10) }], NOW);
    await ongoingEvent.setEnabled(false);
    expect(mockCancel).toHaveBeenCalledWith('ongoing:r1:during');
    mockTrigger.mockClear();
    await ongoingEvent.sync([{ registrationId: 'r1', event: ev(10) }], NOW);
    expect(mockTrigger).not.toHaveBeenCalled();

    await ongoingEvent.setEnabled(true);
    await AsyncStorage.setItem('eventez_notification_settings', JSON.stringify({ enabled: false }));
    await ongoingEvent.sync([{ registrationId: 'r1', event: ev(10) }], NOW);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('événement en ligne exclu', async () => {
    await ongoingEvent.sync([{ registrationId: 'r1', event: { ...ev(1), location_type: 'online' } }], NOW);
    expect(mockDisplay).not.toHaveBeenCalled();
  });
});
