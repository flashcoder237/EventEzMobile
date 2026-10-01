/**
 * Motifs haptiques composés (round 3, H1) : verrou global, « Vibrations »,
 * « Réduire les animations » et arrière-plan.
 */
import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';
import { haptics } from '../haptics';
import { __resetSensoryPrefs, setSensoryPref } from '../../lib/sensoryPrefs';
import * as RM from '../../hooks/useReducedMotion';

const impact = Haptics.impactAsync as jest.Mock;
const selection = Haptics.selectionAsync as jest.Mock;

describe('haptics.pattern', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    impact.mockClear();
    selection.mockClear();
    __resetSensoryPrefs();
    haptics.__resetThrottle();
    (Platform as any).OS = 'ios';
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    jest.spyOn(RM, 'isReducedMotionCached').mockReturnValue(false);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('heartbeat joue ses deux pas, dans l’ordre', () => {
    expect(haptics.pattern('heartbeat')).toBe(true);
    expect(impact).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(200);
    expect(impact).toHaveBeenCalledTimes(2);
  });

  it('verrou : une seconde séquence pendant la première est refusée', () => {
    haptics.pattern('rise');
    expect(haptics.pattern('heartbeat')).toBe(false);
    expect(haptics.pattern('tick')).toBe(false);
    jest.advanceTimersByTime(300);
    expect(haptics.pattern('tick')).toBe(true);
  });

  it('tick = un seul cran (selection sur iOS)', () => {
    haptics.pattern('tick');
    expect(selection).toHaveBeenCalledTimes(1);
    expect(impact).not.toHaveBeenCalled();
  });

  it('« Vibrations » coupé → rien', () => {
    setSensoryPref('vibrations', false);
    expect(haptics.pattern('heartbeat')).toBe(false);
    jest.advanceTimersByTime(500);
    expect(impact).not.toHaveBeenCalled();
  });

  it('« Réduire les animations » → seul le premier pas', () => {
    (RM.isReducedMotionCached as jest.Mock).mockReturnValue(true);
    haptics.pattern('rise');
    jest.advanceTimersByTime(500);
    expect(impact).toHaveBeenCalledTimes(1);
  });

  it('app en arrière-plan → refusé', () => {
    Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });
    expect(haptics.pattern('notch')).toBe(false);
    expect(impact).not.toHaveBeenCalled();
  });
});
