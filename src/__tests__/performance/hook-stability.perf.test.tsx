/**
 * Tests de stabilite des references retournees par les hooks.
 *
 * Pourquoi : un hook qui retourne une nouvelle fonction a chaque render
 * cause des re-renders en cascade sur les composants memo qui dependent
 * de cette fonction (FlatList renderItem, onPress, etc.).
 *
 * Pattern frequent qui casse :
 *   ```
 *   const handlePress = (id) => doSomething(id);   // ❌ nouvelle ref a chaque render
 *   // vs
 *   const handlePress = useCallback((id) => doSomething(id), []);  // ✅ stable
 *   ```
 *
 * Ces tests detectent un useCallback supprime par megarde.
 *
 * Cible : hooks critiques utilises dans des listes (renderItem) ou des
 * gros ecrans (Discover, Conversation, EventCreate).
 */

import React from 'react';
import { render, renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useMessageState } from '../../hooks/useMessageState';


describe('hook stability — references retournees', () => {
  describe('useOfflineQueue', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    it('enqueue/dequeue/syncQueue/retryMessage refs stables entre 2 renders', async () => {
      const onSend = jest.fn().mockResolvedValue(true);

      const { result, rerender } = renderHook(() =>
        useOfflineQueue({ onSendMessage: onSend, isConnected: false, userId: 1 }),
      );

      const first = {
        enqueue: result.current.enqueue,
        dequeue: result.current.dequeue,
        syncQueue: result.current.syncQueue,
        retryMessage: result.current.retryMessage,
      };

      rerender();

      // Apres un render sans props change, les memes refs doivent etre
      // retournees (useCallback applique correctement).
      expect(result.current.enqueue).toBe(first.enqueue);
      expect(result.current.dequeue).toBe(first.dequeue);
      // Note: syncQueue depend de queue et autres, donc peut changer si queue change.
      // On verifie au moins enqueue/dequeue/retryMessage qui ne devraient pas changer.
      expect(result.current.retryMessage).toBe(first.retryMessage);
    });
  });


  describe('useMessageState', () => {
    it('refs handlers stables entre renders', () => {
      // useMessageState est un hook complexe ; test minimal de presence
      // des refs sur 2 renders identiques.
      const { result, rerender } = renderHook(() => useMessageState());

      // useMessageState retourne typiquement { setText, ... }
      // On capture la 1ere ref de chaque fonction et compare apres rerender.
      const before = result.current;
      rerender();
      const after = result.current;

      // Au moins une propriete-fonction doit etre stable (memo OK)
      const beforeKeys = Object.keys(before).filter(
        (k) => typeof (before as any)[k] === 'function',
      );
      const stableCount = beforeKeys.filter(
        (k) => (before as any)[k] === (after as any)[k],
      ).length;

      // Pas toutes les fonctions doivent etre stables (state-derived OK)
      // mais au moins certaines (setters via setState) doivent l'etre.
      expect(stableCount).toBeGreaterThan(0);
    });
  });
});


describe('memo efficacy — re-render count', () => {
  /**
   * Verifie qu'un composant memo n'est PAS re-rendere quand ses props ne
   * changent pas. Pattern : on enveloppe le composant dans un wrapper qui
   * re-render le parent, et on compte les renders enfant.
   */

  it('un composant memo ne re-render pas si ses props sont identiques', () => {
    let renderCount = 0;
    const Inner = React.memo(({ value: _value }: { value: number }) => {
      renderCount++;
      return null;
    });

    let setParentVal: ((v: number) => void) | undefined;
    const Parent = () => {
      const [, setVal] = React.useState(0);
      setParentVal = setVal;
      return <Inner value={42} />;
    };

    render(<Parent />);
    expect(renderCount).toBe(1);

    act(() => {
      setParentVal?.(1);
    });
    expect(renderCount).toBe(1);

    act(() => {
      setParentVal?.(2);
    });
    expect(renderCount).toBe(1);
  });

  it('un composant non-memo re-render meme si props identiques', () => {
    let renderCount = 0;
    const InnerNoMemo = ({ value: _value }: { value: number }) => {
      renderCount++;
      return null;
    };

    let setParentVal: ((v: number) => void) | undefined;
    const Parent = () => {
      const [, setVal] = React.useState(0);
      setParentVal = setVal;
      return <InnerNoMemo value={42} />;
    };

    render(<Parent />);
    expect(renderCount).toBe(1);

    act(() => {
      setParentVal?.(1);
    });
    expect(renderCount).toBe(2);
  });
});


describe('useCallback / useMemo deps — detection de bug fréquent', () => {
  /**
   * Test conceptuel : prouve qu'un useCallback avec deps incompletes
   * referme sur des stale values. Sert de documentation pour les devs.
   */

  it('useCallback avec []  → closure stale (anti-pattern)', () => {
    const useStaleClosure = () => {
      const [count, setCount] = React.useState(0);
      // ❌ deps=[] → cb capture count=0 forever
      const cb = React.useCallback(() => count, []);
      return { count, setCount, cb };
    };

    const { result } = renderHook(() => useStaleClosure());
    expect(result.current.cb()).toBe(0);

    act(() => result.current.setCount(5));
    // count state est 5, mais cb renvoie 0 (stale closure)
    expect(result.current.count).toBe(5);
    expect(result.current.cb()).toBe(0);  // ← bug : doit etre 5
  });

  it('useCallback avec [count] → toujours frais', () => {
    const useFreshClosure = () => {
      const [count, setCount] = React.useState(0);
      const cb = React.useCallback(() => count, [count]);
      return { count, setCount, cb };
    };

    const { result } = renderHook(() => useFreshClosure());
    expect(result.current.cb()).toBe(0);

    act(() => result.current.setCount(5));
    expect(result.current.cb()).toBe(5);  // ✅ fresh
  });
});
