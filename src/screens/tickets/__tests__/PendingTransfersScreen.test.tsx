/**
 * Tests Jest pour PendingTransfersScreen.
 *
 * Couvre :
 *  - rendu : tabs Reçus + Envoyés visibles, switch tab
 *  - liste reçus → boutons "Accepter" / "Refuser"
 *  - acceptTransfer : showConfirm → ticketTransfersAPI.acceptTransfer + showSuccess
 *  - declineTransfer : ticketTransfersAPI.declineTransfer + showSuccess
 *  - cancelTransfer (sent tab) : ticketTransfersAPI.cancelTransfer + showSuccess
 *  - error handling : showError quand l'API throw
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useRoute: () => ({ params: {} }),
    // Approximation : useFocusEffect appelle le callback au mount (comme un
    // useEffect simple). Suffisant pour les tests qui veulent déclencher
    // fetchTransfers une fois.
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
// showConfirm exécute l'onConfirm immédiatement (cf. AlertContext signature :
// (title, message, onConfirm, onCancel?) => void).
const mockShowConfirm = jest.fn(
  (_title: string, _message: string, onConfirm: () => void) => {
    onConfirm();
  },
);
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
    showConfirm: mockShowConfirm,
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryBg: '#EEF2FF',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  border: '#E5E7EB',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

const mockGetPending = jest.fn();
const mockGetSent = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();
const mockCancel = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  ticketTransfersAPI: {
    getPendingTransfers: (...args: any[]) => mockGetPending(...args),
    getSentTransfers: (...args: any[]) => mockGetSent(...args),
    acceptTransfer: (...args: any[]) => mockAccept(...args),
    declineTransfer: (...args: any[]) => mockDecline(...args),
    cancelTransfer: (...args: any[]) => mockCancel(...args),
  },
}));

// QRCodeDisplay : neutralise (utilise des deps natives)
jest.mock('../../../components/common/QRCodeDisplay', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement(RN.View, { testID: 'qr-display' }),
  };
});

// Editorial wrappers pour ne pas dépendre du DOM exact
jest.mock('../../../components/ui/editorial', () => {
  const RN = require('react-native');
  const React = require('react');
  const PassThrough = ({ children }: any) =>
    React.createElement(RN.View, null, children);
  return {
    EditorialCanvas: PassThrough,
    EditorialHeader: PassThrough,
    WatermarkNumeral: PassThrough,
    editorial: {},
  };
});

// LoadingSpinner stub
jest.mock('../../../components/ui/LoadingOverlay', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    LoadingSpinner: () => React.createElement(RN.View, { testID: 'loading' }),
  };
});

import PendingTransfersScreen from '../PendingTransfersScreen';

const futureExpiry = () =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const receivedTransfer = {
  id: 'trf-1',
  sender_name: 'Alice Dupont',
  sender_email: 'alice@example.com',
  recipient_email: 'me@example.com',
  recipient_name: 'Moi',
  ticket_info: {
    ticket_type_name: 'Pass VIP',
    transfer_quantity: 2,
  },
  event_info: {
    id: 'evt-1',
    title: 'Festival Indie',
    start_date: '2026-08-12T18:00:00Z',
    location_city: 'Yaoundé',
  },
  status: 'pending',
  message: 'Profite bien !',
  created_at: '2026-04-01T10:00:00Z',
  expires_at: futureExpiry(),
  can_accept: true,
  is_expired: false,
};

const sentTransfer = {
  ...receivedTransfer,
  id: 'trf-2',
  sender_name: 'Moi',
  sender_email: 'me@example.com',
  recipient_email: 'bob@example.com',
  recipient_name: 'Bob',
  status: 'pending',
  is_expired: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPending.mockResolvedValue({ data: [receivedTransfer] });
  mockGetSent.mockResolvedValue({ data: { results: [sentTransfer] } });
});

describe('PendingTransfersScreen', () => {
  it('renders both tabs (Reçus / Envoyés) on mount', async () => {
    const { findByText } = render(<PendingTransfersScreen />);
    expect(await findByText('Reçus')).toBeTruthy();
    expect(await findByText('Envoyés')).toBeTruthy();
  });

  it('renders received transfer with sender name + accept/decline buttons', async () => {
    const { findByText } = render(<PendingTransfersScreen />);
    expect(await findByText('Alice Dupont')).toBeTruthy();
    expect(await findByText('Festival Indie')).toBeTruthy();
    expect(await findByText('Accepter')).toBeTruthy();
    expect(await findByText('Refuser')).toBeTruthy();
  });

  it('switches to "Envoyés" tab when pressed and shows sent transfers', async () => {
    const { findByText, getByText } = render(<PendingTransfersScreen />);
    await findByText('Alice Dupont');

    fireEvent.press(getByText('Envoyés'));

    // Sur la sent tab, on voit le destinataire + le bouton Annuler
    expect(await findByText('Bob')).toBeTruthy();
    expect(await findByText('Annuler')).toBeTruthy();
  });

  it('accepts a received transfer → calls ticketTransfersAPI.acceptTransfer + showSuccess', async () => {
    mockAccept.mockResolvedValueOnce({ data: { ok: true } });

    const { findByText } = render(<PendingTransfersScreen />);
    const acceptBtn = await findByText('Accepter');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(mockShowConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith('trf-1');
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Transfert accepté',
        expect.any(String),
      );
    });
  });

  it('declines a received transfer → calls declineTransfer', async () => {
    mockDecline.mockResolvedValueOnce({ data: { ok: true } });

    const { findByText } = render(<PendingTransfersScreen />);
    const declineBtn = await findByText('Refuser');
    fireEvent.press(declineBtn);

    await waitFor(() => {
      expect(mockDecline).toHaveBeenCalledWith('trf-1');
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Transfert refusé',
        expect.any(String),
      );
    });
  });

  it('cancels a sent transfer → calls cancelTransfer', async () => {
    mockCancel.mockResolvedValueOnce({ data: { ok: true } });

    const { findByText, getByText } = render(<PendingTransfersScreen />);
    await findByText('Alice Dupont');
    // bascule sur l'onglet Envoyés
    fireEvent.press(getByText('Envoyés'));
    const cancelBtn = await findByText('Annuler');
    fireEvent.press(cancelBtn);

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith('trf-2');
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Transfert annulé',
        expect.any(String),
      );
    });
  });

  it('shows showError when acceptTransfer fails', async () => {
    mockAccept.mockRejectedValueOnce({
      response: { data: { detail: 'Lien expiré' } },
    });

    const { findByText } = render(<PendingTransfersScreen />);
    const acceptBtn = await findByText('Accepter');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Lien expiré');
    });
  });
});
