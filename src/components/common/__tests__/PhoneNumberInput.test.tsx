/**
 * Regression — indicatif pays par defaut du champ telephone.
 *
 * Le pays etait deduit de `getLocales()[0].regionCode`. Sur le marche principal
 * (Cameroun) les telephones sont majoritairement configures en « francais
 * (France) » : regionCode renvoyait `FR` et le champ s'ouvrait sur 🇫🇷 +33 pour
 * des utilisateurs camerounais (remonte en phase de test).
 *
 * La locale decrit la LANGUE de l'interface, pas le PAYS du numero : les regions
 * ambigues sont ignorees au profit du defaut produit (CM / +237).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({
  getLocales: () => mockGetLocales(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#111827', border: '#E5E7EB', card: '#FFFFFF', gray50: '#F9FAFB',
      gray100: '#F3F4F6', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151',
      gray900: '#111827', primary: '#4F46E5', error: '#EF4444', background: '#FFFFFF',
      surface: '#FFFFFF', white: '#FFFFFF',
    },
    isDark: false,
  }),
}));

import PhoneNumberInput from '../PhoneNumberInput';

const renderInput = () =>
  render(<PhoneNumberInput value="" onChangeValue={() => {}} />);

describe('PhoneNumberInput — indicatif par defaut', () => {
  afterEach(() => mockGetLocales.mockReset());

  it("retombe sur +237 quand la locale device pointe vers la France", () => {
    mockGetLocales.mockReturnValue([{ regionCode: 'FR', languageCode: 'fr' }]);
    const { queryByText } = renderInput();
    expect(queryByText('+237')).toBeTruthy();
    expect(queryByText('+33')).toBeNull();
  });

  it("retombe sur +237 quand la locale device pointe vers les US", () => {
    mockGetLocales.mockReturnValue([{ regionCode: 'US', languageCode: 'en' }]);
    const { queryByText } = renderInput();
    expect(queryByText('+237')).toBeTruthy();
  });

  it("respecte une region non ambigue (Senegal -> +221)", () => {
    mockGetLocales.mockReturnValue([{ regionCode: 'SN', languageCode: 'fr' }]);
    const { queryByText } = renderInput();
    expect(queryByText('+221')).toBeTruthy();
  });

  it("retombe sur +237 si expo-localization est indisponible", () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('unavailable');
    });
    const { queryByText } = renderInput();
    expect(queryByText('+237')).toBeTruthy();
  });
});
