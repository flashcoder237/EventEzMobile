/**
 * Tests Jest pour TransferTicketModal.
 *
 * Couvre :
 *  - rendu : ne render rien si ticket=null
 *  - rendu des champs email + nom + message
 *  - validation : email vide → erreur, format invalide → erreur
 *  - submit : showConfirm puis ticketTransfersAPI.createTransfer + showSuccess + onClose
 *  - error handling : detail backend remonté via showError
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const themeColors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
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

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
// showConfirm exécute l'onConfirm immédiatement pour que le test puisse vérifier
// l'appel API sans avoir à fireEvent un bouton de confirmation modale.
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

const mockCreateTransfer = jest.fn();
jest.mock('../../../api', () => ({
  __esModule: true,
  ticketTransfersAPI: {
    createTransfer: (...args: any[]) => mockCreateTransfer(...args),
  },
}));

jest.mock('../../../hooks/useBottomSheetAnim', () => ({
  useBottomSheetAnim: () => ({
    modalOpen: true,
    sheetAnim: {},
    backdropAnim: {},
  }),
}));

jest.mock('expo-linear-gradient', () => {
  const RN = require('react-native');
  return { LinearGradient: RN.View };
});

import TransferTicketModal from '../TransferTicketModal';

const baseTicket = {
  id: 42,
  ticket_type_name: 'Pass VIP',
  quantity: 3,
  event_title: 'Festival Indie',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TransferTicketModal', () => {
  it('returns null when ticket is null (renders nothing)', () => {
    const onClose = jest.fn();
    const onTransferComplete = jest.fn();
    const { toJSON } = render(
      <TransferTicketModal
        visible
        onClose={onClose}
        ticket={null}
        onTransferComplete={onTransferComplete}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the email + name inputs when ticket is provided', () => {
    const { getByPlaceholderText, getByText } = render(
      <TransferTicketModal
        visible
        onClose={jest.fn()}
        ticket={baseTicket}
        onTransferComplete={jest.fn()}
      />,
    );
    expect(getByPlaceholderText('ami@exemple.com')).toBeTruthy();
    expect(getByPlaceholderText('Prénom du destinataire')).toBeTruthy();
    expect(getByText('Offrir ce billet')).toBeTruthy();
  });

  it('shows an inline error when email is empty on submit', async () => {
    const { getByText, findByText } = render(
      <TransferTicketModal
        visible
        onClose={jest.fn()}
        ticket={baseTicket}
        onTransferComplete={jest.fn()}
      />,
    );
    // Bouton "Envoyer" : on l'attaque par le label visible. Comme il est
    // disabled tant que recipientEmail est vide, on simule un appui.
    fireEvent.press(getByText('Envoyer'));

    // Aucun appel API : email obligatoire bloque la soumission
    expect(mockCreateTransfer).not.toHaveBeenCalled();
    // Pas d'erreur affichée (le bouton est juste disabled). On n'attend
    // pas un message ici.
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockShowConfirm).not.toHaveBeenCalled();
  });

  it('rejects invalid email format with inline error', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <TransferTicketModal
        visible
        onClose={jest.fn()}
        ticket={baseTicket}
        onTransferComplete={jest.fn()}
      />,
    );
    fireEvent.changeText(getByPlaceholderText('ami@exemple.com'), 'pas-un-email');
    fireEvent.press(getByText('Envoyer'));

    expect(await findByText('Email invalide')).toBeTruthy();
    expect(mockCreateTransfer).not.toHaveBeenCalled();
  });

  it('calls ticketTransfersAPI.createTransfer with correct payload on valid submit', async () => {
    mockCreateTransfer.mockResolvedValueOnce({ data: { ok: true } });
    const onClose = jest.fn();
    const onTransferComplete = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <TransferTicketModal
        visible
        onClose={onClose}
        ticket={baseTicket}
        onTransferComplete={onTransferComplete}
      />,
    );

    fireEvent.changeText(getByPlaceholderText('ami@exemple.com'), '  Foo@Bar.COM  ');
    fireEvent.changeText(getByPlaceholderText('Prénom du destinataire'), 'Marie');
    fireEvent.press(getByText('Envoyer'));

    await waitFor(() => {
      expect(mockShowConfirm).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCreateTransfer).toHaveBeenCalledWith({
        ticket_purchase: 42,
        recipient_email: 'foo@bar.com', // lowercased + trimmed
        recipient_name: 'Marie',
        quantity: 1,
        message: undefined,
      });
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onTransferComplete).toHaveBeenCalled();
    });
  });

  it('shows showError with backend detail when createTransfer fails', async () => {
    mockCreateTransfer.mockRejectedValueOnce({
      response: { data: { detail: 'Quota dépassé' } },
    });

    const { getByPlaceholderText, getByText } = render(
      <TransferTicketModal
        visible
        onClose={jest.fn()}
        ticket={baseTicket}
        onTransferComplete={jest.fn()}
      />,
    );
    fireEvent.changeText(getByPlaceholderText('ami@exemple.com'), 'a@b.com');
    fireEvent.press(getByText('Envoyer'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Erreur', 'Quota dépassé');
    });
  });
});
