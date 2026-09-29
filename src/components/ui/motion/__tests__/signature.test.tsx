import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { SwingOnIncrease } from '../SwingOnIncrease';
import { haptics } from '../../../../utils/haptics';
import { AnimatedBookmark } from '../../Animations';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('lot 1 — signature (D1 cloche, E1 favori)', () => {
  // Horloge contrôlée : une hausse n'est « en direct » qu'après la fenêtre de
  // chargement (INCREASE_SETTLE_MS) qui suit le montage.
  let now = 1_000_000;
  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    haptics.__resetThrottle();
    (Haptics.impactAsync as jest.Mock).mockClear();
  });
  afterEach(() => {
    (Date.now as jest.Mock).mockRestore?.();
  });

  it('la hausse du chargement initial (juste après le montage) ne sonne pas', () => {
    const { rerender } = render(
      <SwingOnIncrease value={0}>
        <Text>bell</Text>
      </SwingOnIncrease>,
    );
    now += 800; // compteur serveur arrivé 0,8 s après le montage
    rerender(
      <SwingOnIncrease value={4}>
        <Text>bell</Text>
      </SwingOnIncrease>,
    );
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('la cloche ne vibre pas au montage, vibre une fois à la hausse, rien à la baisse', () => {
    const { rerender } = render(
      <SwingOnIncrease value={2}>
        <Text>bell</Text>
      </SwingOnIncrease>,
    );
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    now += 5000;
    rerender(
      <SwingOnIncrease value={3}>
        <Text>bell</Text>
      </SwingOnIncrease>,
    );
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    rerender(
      <SwingOnIncrease value={1}>
        <Text>bell</Text>
      </SwingOnIncrease>,
    );
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('deux cloches sur le même écran ne vibrent qu’une fois (plafond 10 s)', () => {
    const tree = (v: number) => (
      <>
        <SwingOnIncrease value={v}>
          <Text>a</Text>
        </SwingOnIncrease>
        <SwingOnIncrease value={v}>
          <Text>b</Text>
        </SwingOnIncrease>
      </>
    );
    const { rerender } = render(tree(1));
    now += 5000;
    rerender(tree(2));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('favori : rien quand l’état arrive du serveur (animate=false), vibration au geste', () => {
    const { rerender } = render(
      <AnimatedBookmark isActive={false} animate={false}>
        <Text>b</Text>
      </AnimatedBookmark>,
    );
    rerender(
      <AnimatedBookmark isActive animate={false}>
        <Text>b</Text>
      </AnimatedBookmark>,
    );
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    rerender(
      <AnimatedBookmark isActive={false} animate>
        <Text>b</Text>
      </AnimatedBookmark>,
    );
    rerender(
      <AnimatedBookmark isActive animate>
        <Text>b</Text>
      </AnimatedBookmark>,
    );
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});
