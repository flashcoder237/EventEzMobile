import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirstSeenStamp } from '../Stamp';
import { markFirstSeen, __resetFirstSeen } from '../useFirstSeen';
import { ScanFrameFeedback, PopOnIncrease } from '../ScanFrameFeedback';

// « Réduire les animations » : le tampon est posé d'emblée mais l'haptique
// d'impact part quand même (une seule fois dans la vie du billet).
jest.mock('../../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
  default: () => true,
}));

const KEY = 'test_stamp_seen';

describe('lot 2 — récompenses (E4 tampon, G1 scanner)', () => {
  beforeEach(async () => {
    __resetFirstSeen();
    await AsyncStorage.clear();
  });

  it('markFirstSeen : vrai la première fois, faux ensuite, et persiste', async () => {
    expect(await markFirstSeen(KEY, 't:1')).toBe(true);
    expect(await markFirstSeen(KEY, 't:1')).toBe(false);
    expect(await markFirstSeen(KEY, 't:2')).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) || '[]')).toEqual(['t:1', 't:2']);
  });

  it('le tampon ne « frappe » (haptique) qu\'une fois par billet, puis reste statique', async () => {
    const onImpact = jest.fn();
    const first = render(
      <FirstSeenStamp storageKey={KEY} id="t:9" label="Validé" color="#16A34A" onImpact={onImpact} testID="stamp" />,
    );
    expect(await first.findByTestId('stamp', { includeHiddenElements: true })).toBeTruthy();
    await waitFor(() => expect(onImpact).toHaveBeenCalledTimes(1));
    first.unmount();

    const second = render(
      <FirstSeenStamp storageKey={KEY} id="t:9" label="Validé" color="#16A34A" onImpact={onImpact} testID="stamp" />,
    );
    expect(await second.findByTestId('stamp', { includeHiddenElements: true })).toBeTruthy();
    expect(onImpact).toHaveBeenCalledTimes(1);
  });

  it('rien n\'est rendu sans identifiant (billet non scanné)', async () => {
    const { queryByTestId } = render(
      <FirstSeenStamp storageKey={KEY} id={null} label="Validé" color="#16A34A" testID="stamp" />,
    );
    await waitFor(() => expect(queryByTestId('stamp', { includeHiddenElements: true })).toBeNull());
  });

  it('le viseur et les compteurs se rendent pour chaque état sans planter', () => {
    const colors = { success: '#16A34A', warning: '#D97706', error: '#DC2626' };
    const { rerender } = render(<ScanFrameFeedback kind="idle" trigger={0} colors={colors} />);
    rerender(<ScanFrameFeedback kind="success" trigger={1} colors={colors} />);
    rerender(<ScanFrameFeedback kind="warning" trigger={2} colors={colors} />);
    rerender(<ScanFrameFeedback kind="error" trigger={3} colors={colors} />);
    const pop = render(<PopOnIncrease value={1}>{null}</PopOnIncrease>);
    pop.rerender(<PopOnIncrease value={2}>{null}</PopOnIncrease>);
  });
});
