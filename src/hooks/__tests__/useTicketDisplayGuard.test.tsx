/**
 * Luminosité des écrans billet : rendue au système (adaptative) en sortie,
 * même quand deux écrans billet s'enchaînent.
 */
import { Platform } from 'react-native';

const mockSet = jest.fn(() => Promise.resolve());
const mockGet = jest.fn(() => Promise.resolve(0.4));
const mockRestore = jest.fn(() => Promise.resolve());
jest.mock('expo-brightness', () => ({
  setBrightnessAsync: (...a: any[]) => (mockSet as any)(...a),
  getBrightnessAsync: () => mockGet(),
  restoreSystemBrightnessAsync: () => mockRestore(),
}));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
}));

let mockFocusCallbacks: Array<() => void | (() => void)> = [];
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    mockFocusCallbacks.push(cb);
  },
}));

import { renderHook } from '@testing-library/react-native';
import {
  useTicketDisplayGuard,
  __resetTicketBrightness,
  suspendTicketBrightness,
  resumeTicketBrightness,
  isTicketBrightnessSuspended,
} from '../useTicketDisplayGuard';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const flush = () => new Promise((r) => setImmediate(r));

function focusScreen() {
  mockFocusCallbacks = [];
  renderHook(() => useTicketDisplayGuard());
  const cleanup = mockFocusCallbacks[0]();
  return cleanup as () => void;
}

describe('useTicketDisplayGuard — luminosité', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    mockSet.mockClear();
    mockGet.mockClear();
    mockRestore.mockClear();
    __resetTicketBrightness();
  });
  afterEach(() => jest.useRealTimers());

  it('Android : rend la luminosité ADAPTATIVE au système en sortie', async () => {
    Platform.OS = 'android';
    const blur = focusScreen();
    await flush();
    expect(mockSet).toHaveBeenCalledWith(1);
    blur();
    jest.advanceTimersByTime(300);
    expect(mockRestore).toHaveBeenCalledTimes(1);
    // jamais de valeur fixe réappliquée (elle couperait l'adaptatif)
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("deux écrans billet enchaînés : une seule restauration, à la fin", async () => {
    Platform.OS = 'android';
    const blurA = focusScreen();
    await flush();
    blurA();
    const blurB = focusScreen(); // l'écran QR prend le relais
    await flush();
    jest.advanceTimersByTime(300);
    expect(mockRestore).not.toHaveBeenCalled();
    blurB();
    jest.advanceTimersByTime(300);
    expect(mockRestore).toHaveBeenCalledTimes(1);
  });

  it("iOS : restaure la luminosité d'origine, pas le max", async () => {
    Platform.OS = 'ios';
    const blurA = focusScreen();
    await flush();
    blurA();
    const blurB = focusScreen();
    await flush();
    blurB();
    jest.advanceTimersByTime(300);
    expect(mockGet).toHaveBeenCalledTimes(1); // origine lue une seule fois
    expect(mockSet).toHaveBeenLastCalledWith(0.4);
  });

  it('face contre table (G4) : rend au système puis reprend le max, sans toucher au compteur', async () => {
    Platform.OS = 'android';
    const blur = focusScreen();
    await flush();
    (deactivateKeepAwake as jest.Mock).mockClear();
    (activateKeepAwakeAsync as jest.Mock).mockClear();
    expect(suspendTicketBrightness()).toBe(true);
    expect(isTicketBrightnessSuspended()).toBe(true);
    expect(mockRestore).toHaveBeenCalledTimes(1);
    expect(deactivateKeepAwake).toHaveBeenCalled();
    expect(suspendTicketBrightness()).toBe(false); // idempotent
    expect(resumeTicketBrightness()).toBe(true);
    expect(mockSet).toHaveBeenLastCalledWith(1);
    expect(activateKeepAwakeAsync).toHaveBeenCalled();
    blur();
    jest.advanceTimersByTime(300);
    expect(mockRestore).toHaveBeenCalledTimes(2);
  });

  it('suspend sans écran billet affiché → no-op ; sortie pendant la suspension → état propre', async () => {
    Platform.OS = 'android';
    expect(suspendTicketBrightness()).toBe(false);
    const blur = focusScreen();
    await flush();
    suspendTicketBrightness();
    blur();
    jest.advanceTimersByTime(300);
    expect(isTicketBrightnessSuspended()).toBe(false);
    expect(resumeTicketBrightness()).toBe(false);
  });
});
