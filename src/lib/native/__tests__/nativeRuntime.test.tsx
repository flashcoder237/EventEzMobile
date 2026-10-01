/**
 * Comportement à l'exécution du lot natif : réglages respectés, replis quand
 * le module natif manque, compteur de demandeurs du capteur de proximité.
 */
const mockNative = {
  supportsRichHaptics: jest.fn(() => true),
  playRichHaptic: jest.fn((_name: string) => Promise.resolve(true)),
  setProximityMonitoring: jest.fn((_on: boolean) => Promise.resolve(true)),
};
jest.mock('../../../../modules/eventez-native/src', () => ({
  supportsRichHaptics: () => mockNative.supportsRichHaptics(),
  playRichHaptic: (name: string) => mockNative.playRichHaptic(name),
  setProximityMonitoring: (on: boolean) => mockNative.setProximityMonitoring(on),
}));

const mockHaptics = { celebrate: jest.fn(), light: jest.fn(), selection: jest.fn() };
// Getters : la fabrique du mock s'exécute avant l'initialisation de `mockHaptics`.
jest.mock('../../../utils/haptics', () => ({
  get haptics() {
    return mockHaptics;
  },
  get default() {
    return mockHaptics;
  },
}));

import { renderHook } from '@testing-library/react-native';
import { richHaptic } from '../richHaptics';
import { useProximityMonitoring, __resetProximityHolders } from '../../../hooks/useProximityMonitoring';
import { __resetSensoryPrefs, setSensoryPref } from '../../sensoryPrefs';

beforeEach(() => {
  jest.clearAllMocks();
  __resetSensoryPrefs();
  __resetProximityHolders();
  mockNative.supportsRichHaptics.mockReturnValue(true);
  mockNative.playRichHaptic.mockResolvedValue(true);
});

describe('richHaptic (H6)', () => {
  it('joue le motif Core Haptics quand il est disponible', async () => {
    richHaptic('celebrate');
    await Promise.resolve();
    expect(mockNative.playRichHaptic).toHaveBeenCalledWith('celebrate');
    expect(mockHaptics.celebrate).not.toHaveBeenCalled();
  });

  it('retombe sur la vibration JS sans moteur haptique', () => {
    mockNative.supportsRichHaptics.mockReturnValue(false);
    richHaptic('celebrate');
    expect(mockNative.playRichHaptic).not.toHaveBeenCalled();
    expect(mockHaptics.celebrate).toHaveBeenCalled();
  });

  it('retombe sur la vibration JS si le motif natif échoue', async () => {
    mockNative.playRichHaptic.mockResolvedValue(false);
    richHaptic('celebrate');
    await new Promise((r) => setImmediate(r));
    expect(mockHaptics.celebrate).toHaveBeenCalled();
  });

  it('ne vibre pas du tout quand « Vibrations » est coupé', async () => {
    await setSensoryPref('vibrations', false);
    richHaptic('celebrate');
    expect(mockNative.playRichHaptic).not.toHaveBeenCalled();
    expect(mockHaptics.celebrate).not.toHaveBeenCalled();
  });
});

describe('useProximityMonitoring (G10)', () => {
  it('active pendant la lecture, coupe au dernier demandeur', () => {
    const a = renderHook(({ on }) => useProximityMonitoring(on), { initialProps: { on: true } });
    const b = renderHook(({ on }) => useProximityMonitoring(on), { initialProps: { on: true } });
    expect(mockNative.setProximityMonitoring).toHaveBeenCalledTimes(1);
    expect(mockNative.setProximityMonitoring).toHaveBeenLastCalledWith(true);

    a.rerender({ on: false });
    expect(mockNative.setProximityMonitoring).toHaveBeenCalledTimes(1);

    b.unmount();
    expect(mockNative.setProximityMonitoring).toHaveBeenLastCalledWith(false);
  });

  it('reste coupé quand « Gestes physiques » est désactivé', async () => {
    await setSensoryPref('motionGestures', false);
    renderHook(() => useProximityMonitoring(true));
    expect(mockNative.setProximityMonitoring).not.toHaveBeenCalled();
  });
});
