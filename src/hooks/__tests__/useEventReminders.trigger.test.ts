/**
 * Les rappels d'événement doivent être PROGRAMMÉS, jamais affichés tout de
 * suite. expo-notifications 0.32 exige `type: 'date'` dans le déclencheur :
 * sans lui, `{ date, channelId }` était lu comme « canal seul » = immédiat.
 */
jest.mock('expo-device', () => ({ isDevice: true }));

const mockSchedule = jest.fn((_req: any) => Promise.resolve('notif-id'));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  deleteNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: (req: any) => mockSchedule(req),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEventReminders } from '../useEventReminders';

describe('useEventReminders — déclencheurs', () => {
  it('programme la veille et 1 h avant avec un déclencheur DATE (jamais immédiat)', async () => {
    const { result } = renderHook(() => useEventReminders());
    await waitFor(() => expect((result.current as any).permissionGranted ?? true).toBeTruthy());

    const start = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    await act(async () => {
      await result.current.scheduleReminder(
        { id: 'ev1', title: 'Douala Jazz Night', start_date: start, location_city: 'Douala' },
        'reg1',
      );
    });

    expect(mockSchedule).toHaveBeenCalledTimes(2);
    for (const [req] of mockSchedule.mock.calls) {
      expect(req.trigger.type).toBe('date');
      expect(req.trigger.date).toBeInstanceOf(Date);
      expect(req.trigger.date.getTime()).toBeGreaterThan(Date.now());
      expect(req.trigger.channelId).toBe('event_reminders');
    }
  });
});
