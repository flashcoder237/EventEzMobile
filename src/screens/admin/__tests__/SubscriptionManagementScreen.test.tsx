/**
 * Tests Jest pour SubscriptionManagementScreen.
 *
 * L'ecran lisait des champs que l'API ne renvoie pas (`price_monthly`,
 * `max_events`, `commission_rate`) : toutes les cartes s'affichaient a 0 sans
 * aucune limite, et le titre montrait le slug technique (`premium`) au lieu du
 * `display_name` (`Premium`). Ces tests figent le contrat reel de
 * SubscriptionPlanSerializer (apps/payments/serializers.py).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

const themeColors = {
  primary: '#4F46E5', accent: '#FF6B6B', text: '#111827', card: '#FFFFFF',
  background: '#F4F3F0', gray100: '#F3F4F6', gray200: '#E5E7EB',
  gray300: '#D1D5DB', gray400: '#9CA3AF', gray500: '#6B7280', gray600: '#4B5563',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

// L'ecran est enveloppe dans un RoleGuard : on simule un admin.
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin', is_staff: true } }),
}));

jest.mock('../../../hooks/useCommissionConfig', () => ({
  useCommissionConfig: () => ({ currency: 'XAF' }),
}));

const mockGetPlans = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  subscriptionsAPI: { getPlans: (...a: any[]) => mockGetPlans(...a) },
}));

import SubscriptionManagementScreen from '../SubscriptionManagementScreen';

/** Payload conforme a SubscriptionPlanSerializer (fields = '__all__'). */
const apiPlan = {
  id: 'plan-uuid-1',
  name: 'premium',
  display_name: 'Premium',
  description: 'Le plan complet',
  // DRF serialise les DecimalField en CHAINE — le composant doit le gerer.
  monthly_price: '15000',
  yearly_price: '150000',
  currency: 'XAF',
  max_active_events: 30,
  max_participants_per_event: 0,
  visibility_boost: 5,
  ai_daily_limit: 10,
  ai_messages_per_session: 20,
  features: ['Support prioritaire'],
  is_active: true,
};

beforeEach(() => jest.clearAllMocks());

describe('SubscriptionManagementScreen', () => {
  it('renders display_name, not the raw slug', async () => {
    mockGetPlans.mockResolvedValueOnce({ data: { results: [apiPlan] } });
    const { findByText, queryByText } = render(<SubscriptionManagementScreen />);

    expect(await findByText('Premium')).toBeTruthy();
    expect(queryByText('premium')).toBeNull();
  });

  it('renders the monthly price from monthly_price (string decimal)', async () => {
    mockGetPlans.mockResolvedValueOnce({ data: { results: [apiPlan] } });
    const { findByText } = render(<SubscriptionManagementScreen />);

    // 15000 formate — surtout PAS 0, symptome de l'ancien `price_monthly`.
    const price = await findByText(/15[\s  ,.]?000/);
    expect(price).toBeTruthy();
  });

  it('renders limits from max_active_events / max_participants_per_event', async () => {
    mockGetPlans.mockResolvedValueOnce({ data: { results: [apiPlan] } });
    const { findByText } = render(<SubscriptionManagementScreen />);

    expect(await findByText(/30/)).toBeTruthy();       // max_active_events
    // max_participants_per_event = 0 => "illimite", pas "0 participants".
    expect(await findByText(/illimit/i)).toBeTruthy();
  });

  it('shows an error state with a retry when loading fails', async () => {
    // Avant, le catch etait muet : l'ecran restait vide, impossible de
    // distinguer une panne reseau d'une absence de plans.
    mockGetPlans.mockRejectedValueOnce(new Error('network'));
    const { findByText } = render(<SubscriptionManagementScreen />);

    expect(await findByText('Impossible de charger les plans')).toBeTruthy();
    expect(await findByText('Réessayer')).toBeTruthy();
  });

  it('shows the empty state when the API returns no plan', async () => {
    mockGetPlans.mockResolvedValueOnce({ data: { results: [] } });
    const { findByText } = render(<SubscriptionManagementScreen />);
    await waitFor(() => expect(mockGetPlans).toHaveBeenCalled());
    expect(await findByText(/aucun plan/i)).toBeTruthy();
  });
});
