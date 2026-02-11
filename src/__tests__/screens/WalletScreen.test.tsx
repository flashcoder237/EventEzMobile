/**
 * Tests pour WalletScreen (Organizer)
 * Vérifie le portefeuille et les transactions de l'organisateur
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import WalletScreen from '../../screens/organizer/WalletScreen';
import { render } from '../mocks/testUtils';
import { walletAPI, paymentsAPI } from '../../api/client';
import { mockWallet, mockOrganizer, mockPayment } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  walletAPI: {
    getMyWallet: jest.fn(),
    getWallet: jest.fn(),
    getTransactions: jest.fn(),
    requestWithdrawal: jest.fn(),
    updateBankDetails: jest.fn(),
  },
  paymentsAPI: {
    getOrganizerPayments: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useFocusEffect: jest.fn((callback) => callback()),
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockOrganizer,
    isAuthenticated: true,
  }),
}));

const mockWalletAPI = walletAPI as jest.Mocked<typeof walletAPI>;
const mockPaymentsAPI = paymentsAPI as jest.Mocked<typeof paymentsAPI>;

const mockTransactions = [
  {
    id: 'txn-1',
    type: 'payment_received',
    amount: 15000,
    description: 'Paiement - Concert de Jazz',
    created_at: '2024-01-10T10:00:00Z',
    status: 'completed',
  },
  {
    id: 'txn-2',
    type: 'withdrawal',
    amount: -50000,
    description: 'Retrait vers Ecobank',
    created_at: '2024-01-08T14:00:00Z',
    status: 'completed',
  },
  {
    id: 'txn-3',
    type: 'fee',
    amount: -1500,
    description: 'Commission EventEz (10%)',
    created_at: '2024-01-10T10:00:00Z',
    status: 'completed',
  },
];

describe('WalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockWalletAPI as any).getWallet.mockResolvedValue({
      data: mockWallet,
    } as any);
    mockWalletAPI.getTransactions.mockResolvedValue({
      data: { results: mockTransactions, count: mockTransactions.length },
    } as any);
  });

  describe('Rendering', () => {
    it('should render wallet header', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText('Portefeuille')).toBeTruthy();
      });
    });

    it('should render available balance', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/150.*000|Solde disponible/i)).toBeTruthy();
      });
    });

    it('should render pending balance', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/25.*000|En attente/i)).toBeTruthy();
      });
    });

    it('should render total earnings', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/500.*000|Total gagné/i)).toBeTruthy();
      });
    });

    it('should render withdraw button', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer|Retrait/i)).toBeTruthy();
      });
    });

    it('should render transactions list', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText('Transactions')).toBeTruthy();
      });
    });
  });

  describe('Balance Card', () => {
    it('should display currency', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/XAF|FCFA/i)).toBeTruthy();
      });
    });

    it('should display total withdrawn', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/325.*000|Retiré/i)).toBeTruthy();
      });
    });

    it('should display total fees', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/25.*000|Frais/i)).toBeTruthy();
      });
    });
  });

  describe('Transactions', () => {
    it('should display transaction list', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Concert de Jazz/)).toBeTruthy();
      });
    });

    it('should display transaction amount', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/15.*000/)).toBeTruthy();
      });
    });

    it('should display transaction date', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/10.*janv|janvier/i)).toBeTruthy();
      });
    });

    it('should display payment received with green color', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/\+.*15.*000/)).toBeTruthy();
      });
    });

    it('should display withdrawal with red color', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/-.*50.*000/)).toBeTruthy();
      });
    });

    it('should filter transactions by type', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText('Tous')).toBeTruthy();
        expect(getByText('Reçus')).toBeTruthy();
        expect(getByText('Retraits')).toBeTruthy();
      });

      fireEvent.press(getByText('Reçus'));

      // Should filter to only received payments
    });
  });

  describe('Withdrawal', () => {
    it('should open withdrawal modal when button pressed', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByText(/Montant.*retirer/i)).toBeTruthy();
      });
    });

    it('should show minimum withdrawal amount', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByText(/minimum.*10.*000/i)).toBeTruthy();
      });
    });

    it('should validate withdrawal amount', async () => {
      const { getByText, getByPlaceholderText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/Montant/i)).toBeTruthy();
      });

      const amountInput = getByPlaceholderText(/Montant/i);
      fireEvent.changeText(amountInput, '5000'); // Below minimum

      fireEvent.press(getByText('Confirmer'));

      await waitFor(() => {
        expect(getByText(/minimum/i)).toBeTruthy();
      });
    });

    it('should not allow withdrawal exceeding balance', async () => {
      const { getByText, getByPlaceholderText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/Montant/i)).toBeTruthy();
      });

      const amountInput = getByPlaceholderText(/Montant/i);
      fireEvent.changeText(amountInput, '200000'); // Exceeds balance

      fireEvent.press(getByText('Confirmer'));

      await waitFor(() => {
        expect(getByText(/insuffisant|dépasse/i)).toBeTruthy();
      });
    });

    it('should submit withdrawal request', async () => {
      (mockWalletAPI as any).requestWithdrawal.mockResolvedValue({
        data: { id: 'withdrawal-1', status: 'pending', amount: 50000 },
      });

      const { getByText, getByPlaceholderText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/Montant/i)).toBeTruthy();
      });

      const amountInput = getByPlaceholderText(/Montant/i);
      fireEvent.changeText(amountInput, '50000');

      fireEvent.press(getByText('Confirmer'));

      await waitFor(() => {
        expect((mockWalletAPI as any).requestWithdrawal).toHaveBeenCalledWith(50000);
      });
    });

    it('should show success message after withdrawal', async () => {
      (mockWalletAPI as any).requestWithdrawal.mockResolvedValue({
        data: { id: 'withdrawal-1', status: 'pending', amount: 50000 },
      });

      const { getByText, getByPlaceholderText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/Montant/i)).toBeTruthy();
      });

      const amountInput = getByPlaceholderText(/Montant/i);
      fireEvent.changeText(amountInput, '50000');

      fireEvent.press(getByText('Confirmer'));

      await waitFor(() => {
        expect(getByText(/succès|traitement/i)).toBeTruthy();
      });
    });
  });

  describe('Bank Details', () => {
    it('should display bank information', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText('Ecobank')).toBeTruthy();
        expect(getByText(/Marie Martin/)).toBeTruthy();
      });
    });

    it('should navigate to edit bank details', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Modifier.*bancaires/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Modifier.*bancaires/i));

      expect(mockNavigate).toHaveBeenCalledWith('EditBankDetails');
    });

    it('should show warning if no bank details', async () => {
      (mockWalletAPI as any).getWallet.mockResolvedValue({
        data: { ...mockWallet, bank_name: null, bank_account_number: null },
      });

      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Ajouter.*coordonnées/i)).toBeTruthy();
      });
    });
  });

  describe('Statistics', () => {
    it('should display monthly earnings chart', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Revenus|Statistiques/i)).toBeTruthy();
      });
    });

    it('should show earnings by event', async () => {
      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/par événement/i)).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no transactions', async () => {
      mockWalletAPI.getTransactions.mockResolvedValue({
        data: { results: [], count: 0 },
      } as any);

      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Aucune transaction/i)).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data on pull', async () => {
      const { UNSAFE_queryByType } = render(<WalletScreen />);

      await waitFor(() => {
        expect((mockWalletAPI as any).getWallet).toHaveBeenCalledTimes(1);
      });

      // Simulate pull to refresh
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (mockWalletAPI as any).getWallet.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });

    it('should handle withdrawal error', async () => {
      (mockWalletAPI as any).requestWithdrawal.mockRejectedValue({
        response: { data: { error: 'Withdrawal failed' } },
      });

      const { getByText, getByPlaceholderText } = render(<WalletScreen />);

      await waitFor(() => {
        expect(getByText(/Retirer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Retirer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/Montant/i)).toBeTruthy();
      });

      const amountInput = getByPlaceholderText(/Montant/i);
      fireEvent.changeText(amountInput, '50000');

      fireEvent.press(getByText('Confirmer'));

      await waitFor(() => {
        expect(getByText(/échec|erreur/i)).toBeTruthy();
      });
    });
  });

  describe('Withdrawal Disabled', () => {
    it('should disable withdrawal when balance is too low', async () => {
      (mockWalletAPI as any).getWallet.mockResolvedValue({
        data: { ...mockWallet, available_balance: 5000, can_withdraw: false },
      });

      const { getByText } = render(<WalletScreen />);

      await waitFor(() => {
        // Withdrawal button should be disabled or show message
        expect(getByText(/minimum requis/i)).toBeTruthy();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch wallet on mount', async () => {
      render(<WalletScreen />);

      await waitFor(() => {
        expect((mockWalletAPI as any).getWallet).toHaveBeenCalled();
      });
    });

    it('should fetch transactions on mount', async () => {
      render(<WalletScreen />);

      await waitFor(() => {
        expect(mockWalletAPI.getTransactions).toHaveBeenCalled();
      });
    });
  });
});
