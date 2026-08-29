/**
 * Le FAB ne doit JAMAIS chevaucher le dock du MainTabNavigator.
 *
 * Régression visée : avec `safeAreaHandled`, l'offset annulait `insets.bottom`
 * alors que le dock — en `position: absolute` sur la fenêtre — l'applique
 * toujours. Dès que l'inset dépassait 12 (gestes Android, encoches iOS), le
 * bouton « nouveau message » passait SOUS la barre d'onglets.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { primary: '#4F46E5', card: '#FFF', gray700: '#374151' }, isDark: false }),
}));

import { PrimaryFab } from '../FloatingActionButton';

// Doit rester aligné sur MainTabNavigator : DOCK_HEIGHT + max(inset,12) + 8.
const dockTotal = (inset: number) => 64 + Math.max(inset, 12) + 8;

function fabBottom(inset: number, safeAreaHandled: boolean): number {
  mockInsets = { top: 0, bottom: inset, left: 0, right: 0 };
  const { getByLabelText } = render(
    <PrimaryFab icon="create-outline" onPress={() => {}} accessibilityLabel="fab" safeAreaHandled={safeAreaHandled} />,
  );
  const style = getByLabelText('fab').props.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  return flat.bottom;
}

describe('PrimaryFab — position au-dessus du dock', () => {
  it.each([0, 12, 16, 24, 48])('reste au-dessus du dock (inset %i)', (inset) => {
    expect(fabBottom(inset, true)).toBeGreaterThan(dockTotal(inset));
  });

  it('ignore safeAreaHandled quand un dock est présent', () => {
    // La hauteur du dock ne dépend pas du conteneur de l'écran : le drapeau
    // ne doit pas la faire disparaître du calcul.
    expect(fabBottom(24, true)).toBe(fabBottom(24, false));
  });

  it('monte avec l\'inset, comme le dock', () => {
    expect(fabBottom(48, true)).toBeGreaterThan(fabBottom(0, true));
  });
});
