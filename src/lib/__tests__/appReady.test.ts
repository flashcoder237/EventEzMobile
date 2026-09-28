import { markAppReady, onAppReady, isAppReady, __resetAppReadyForTests } from '../appReady';
import { setCurrentRoute, useCurrentRoute } from '../../contexts/CurrentRouteContext';
import { renderHook, act } from '@testing-library/react-native';

beforeEach(() => __resetAppReadyForTests());

describe('appReady', () => {
  it('notifie les abonnés une seule fois', () => {
    const cb = jest.fn();
    onAppReady(cb);
    expect(isAppReady()).toBe(false);
    markAppReady();
    markAppReady();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(isAppReady()).toBe(true);
  });

  it('signal collant : un abonné tardif est notifié immédiatement', () => {
    markAppReady();
    const cb = jest.fn();
    onAppReady(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('désabonnement avant ready → pas d\'appel', () => {
    const cb = jest.fn();
    const unsub = onAppReady(cb);
    unsub();
    markAppReady();
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('CurrentRoute store', () => {
  it('useCurrentRoute suit setCurrentRoute sans provider', () => {
    const { result } = renderHook(() => useCurrentRoute());
    act(() => setCurrentRoute('Discover'));
    expect(result.current).toBe('Discover');
    act(() => setCurrentRoute('EventDetails'));
    expect(result.current).toBe('EventDetails');
  });
});
