import { InteractionManager } from 'react-native';
import { runAfterInteractionsOrTimeout } from '../afterInteractions';

describe('runAfterInteractionsOrTimeout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('s’exécute au délai max si les interactions ne se terminent jamais', () => {
    jest.useFakeTimers();
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockReturnValue({ cancel: jest.fn() } as any);
    const fn = jest.fn();
    runAfterInteractionsOrTimeout(fn, 1000);
    jest.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ne s’exécute qu’une fois même si les deux chemins aboutissent', () => {
    jest.useFakeTimers();
    let cb: () => void = () => {};
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(((f: any) => {
      cb = f;
      return { cancel: jest.fn() };
    }) as any);
    const fn = jest.fn();
    runAfterInteractionsOrTimeout(fn, 1000);
    cb();
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('supporte un rappel synchrone (pas de ReferenceError)', () => {
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(((f: any) => {
      f();
      return { cancel: jest.fn() };
    }) as any);
    const fn = jest.fn();
    expect(() => runAfterInteractionsOrTimeout(fn, 1000)).not.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel empêche toute exécution', () => {
    jest.useFakeTimers();
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockReturnValue({ cancel: jest.fn() } as any);
    const fn = jest.fn();
    runAfterInteractionsOrTimeout(fn, 1000).cancel();
    jest.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });
});
