/**
 * G0 — portes du socle gestes : réglage, gestionnaires, secousse filtrée.
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePhonePosture, postureTouch, shouldDeliverPosture } from '../usePhonePosture';
import { __resetSensoryPrefs, setSensoryPref } from '../../../../lib/sensoryPrefs';

describe('usePhonePosture', () => {
  beforeEach(() => {
    __resetSensoryPrefs();
    postureTouch.__reset();
  });

  it('pont capteurs monté avec un gestionnaire, démonté sans', () => {
    const on = renderHook(() => usePhonePosture({ faceDown: () => {} }));
    expect(on.result.current.active).toBe(true);
    expect(on.result.current.sensorElement).not.toBeNull();
    const off = renderHook(() => usePhonePosture({}));
    expect(off.result.current.sensorElement).toBeNull();
    const disabled = renderHook(() => usePhonePosture({ faceDown: () => {} }, { enabled: false }));
    expect(disabled.result.current.sensorElement).toBeNull();
  });

  it('réglage « Gestes de mouvement » coupé → aucun capteur', async () => {
    await act(async () => {
      await setSensoryPref('motionGestures', false);
    });
    const { result } = renderHook(() => usePhonePosture({ raise: () => {} }));
    expect(result.current.sensorElement).toBeNull();
  });

  it('secousse : coupée en dev, ignorée doigt posé ou juste levé', () => {
    expect(shouldDeliverPosture('faceDown', { dev: true })).toBe(true);
    expect(shouldDeliverPosture('shake', { dev: true })).toBe(false);
    expect(shouldDeliverPosture('shake', { dev: false, now: 10_000 })).toBe(true);
    postureTouch.start({ nativeEvent: { touches: [{}] } });
    expect(shouldDeliverPosture('shake', { dev: false })).toBe(false);
    postureTouch.end({ nativeEvent: { touches: [] } });
    const t = Date.now();
    expect(shouldDeliverPosture('shake', { dev: false, now: t + 100 })).toBe(false);
    expect(shouldDeliverPosture('shake', { dev: false, now: t + 400 })).toBe(true);
  });
});
