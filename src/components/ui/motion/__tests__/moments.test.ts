import { moments } from '../useMotionGate';
import { haptics } from '../../../../utils/haptics';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('moments (orchestrateur micro-delight)', () => {
  beforeEach(() => {
    moments.__reset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-29T10:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('un seul effet ponctuel à la fois', () => {
    expect(moments.claim('search-aura', 1400)).toBe(true);
    expect(moments.claim('tab-glint', 900)).toBe(false);
    // Le même effet peut se relancer.
    expect(moments.claim('search-aura', 1400)).toBe(true);
    jest.setSystemTime(new Date('2026-09-29T10:00:02Z'));
    expect(moments.claim('tab-glint', 900)).toBe(true);
  });

  it('once : vrai une seule fois par session', () => {
    expect(moments.once('featured-glint:42')).toBe(true);
    expect(moments.once('featured-glint:42')).toBe(false);
    expect(moments.once('featured-glint:43')).toBe(true);
  });

  it('throttle : plafonne la fréquence', () => {
    expect(moments.throttle('bell', 10_000)).toBe(true);
    expect(moments.throttle('bell', 10_000)).toBe(false);
    jest.setSystemTime(new Date('2026-09-29T10:00:11Z'));
    expect(moments.throttle('bell', 10_000)).toBe(true);
  });
});

describe('haptics.throttled', () => {
  beforeEach(() => {
    haptics.__resetThrottle();
    (Haptics.impactAsync as jest.Mock).mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-29T10:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('une vibration au plus par fenêtre', () => {
    haptics.throttled('light', 3000);
    haptics.throttled('light', 3000);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-09-29T10:00:04Z'));
    haptics.throttled('light', 3000);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });

  it('celebrate : succès puis un écho léger', () => {
    haptics.celebrate();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    jest.advanceTimersByTime(150);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });
});
