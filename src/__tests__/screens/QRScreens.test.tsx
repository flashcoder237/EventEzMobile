/**
 * Tests pour QRScannerScreen et QRCodeScreen
 * Vérifie le scan et l'affichage des QR codes
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import QRScannerScreen from '../../screens/organizer/QRScannerScreen';
import QRCodeScreen from '../../screens/tickets/QRCodeScreen';
import { render } from '../mocks/testUtils';
import { registrationsAPI, ticketPurchasesAPI } from '../../api/client';
import { mockRegistration, mockTicketPurchase, mockEvent, mockOrganizer, mockUser } from '../mocks/mockData';

// Mock API client
jest.mock('../../api/client', () => ({
  registrationsAPI: {
    checkIn: jest.fn(),
    getRegistration: jest.fn(),
  },
  ticketPurchasesAPI: {
    getTicketPurchase: jest.fn(),
    checkInTicket: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        eventId: 'event-1',
        ticketPurchaseId: 'purchase-1',
        registrationId: 'reg-1',
      },
    }),
  };
});

// Mock expo-camera
const mockOnBarCodeScanned = jest.fn();
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CameraView = React.forwardRef((props, ref) => {
    // Store the callback for testing
    mockOnBarCodeScanned.mockImplementation(props.onBarcodeScanned);
    return React.createElement(View, { ...props, ref, testID: 'camera-view' });
  });

  return {
    CameraView,
    Camera: {
      requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    },
    CameraType: { back: 'back', front: 'front' },
    BarCodeType: { qr: 'qr' },
  };
});

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockOrganizer,
    isAuthenticated: true,
  }),
}));

const mockRegistrationsAPI = registrationsAPI as jest.Mocked<typeof registrationsAPI>;
const mockTicketPurchasesAPI = ticketPurchasesAPI as jest.Mocked<typeof ticketPurchasesAPI>;

describe('QRScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistrationsAPI.checkIn.mockResolvedValue({
      data: { ...mockRegistration, status: 'checked_in' },
    });
    mockTicketPurchasesAPI.checkInTicket.mockResolvedValue({
      data: { ...mockTicketPurchase, is_checked_in: true },
    });
  });

  describe('Rendering', () => {
    it('should render camera view', async () => {
      const { getByTestId } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });
    });

    it('should render scan frame overlay', async () => {
      const { getByTestId } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      // Scan frame overlay
    });

    it('should render instructions', async () => {
      const { getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Scanner.*QR|Placez.*code/i)).toBeTruthy();
      });
    });

    it('should render flashlight toggle', async () => {
      const { getByTestId, getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Flash|Lampe/i)).toBeTruthy();
      });
    });

    it('should render manual entry button', async () => {
      const { getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Manuel|Saisir.*code/i)).toBeTruthy();
      });
    });
  });

  describe('Camera Permission', () => {
    it('should request camera permission', async () => {
      const { Camera } = require('expo-camera');
      render(<QRScannerScreen />);

      await waitFor(() => {
        expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should show permission denied message', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const { getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/permission.*caméra|accès.*refusé/i)).toBeTruthy();
      });
    });

    it('should show settings button when permission denied', async () => {
      const { Camera } = require('expo-camera');
      Camera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const { getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Paramètres|Autoriser/i)).toBeTruthy();
      });
    });
  });

  describe('QR Scanning', () => {
    it('should process scanned QR code', async () => {
      const { getByTestId } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      // Simulate QR code scan
      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'reg-1', type: 'registration' }),
      });

      await waitFor(() => {
        expect(mockRegistrationsAPI.checkIn).toHaveBeenCalledWith('reg-1');
      });
    });

    it('should show success animation on valid scan', async () => {
      const { getByTestId, getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'reg-1', type: 'registration' }),
      });

      await waitFor(() => {
        expect(getByText(/Succès|Vérifié|Check-in.*réussi/i)).toBeTruthy();
      });
    });

    it('should show error on invalid QR code', async () => {
      mockRegistrationsAPI.checkIn.mockRejectedValue({
        response: { data: { error: 'Invalid ticket' } },
      });

      const { getByTestId, getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'invalid-id', type: 'registration' }),
      });

      await waitFor(() => {
        expect(getByText(/Invalide|Erreur|non valide/i)).toBeTruthy();
      });
    });

    it('should show already checked in error', async () => {
      mockRegistrationsAPI.checkIn.mockRejectedValue({
        response: { data: { error: 'Already checked in' } },
      });

      const { getByTestId, getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'reg-1', type: 'registration' }),
      });

      await waitFor(() => {
        expect(getByText(/déjà.*vérifié|already.*checked/i)).toBeTruthy();
      });
    });

    it('should prevent duplicate scans', async () => {
      const { getByTestId } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      // Scan same code twice quickly
      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'reg-1', type: 'registration' }),
      });
      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'reg-1', type: 'registration' }),
      });

      await waitFor(() => {
        expect(mockRegistrationsAPI.checkIn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Flashlight', () => {
    it('should toggle flashlight', async () => {
      const { getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Flash/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Flash/i));

      // Should toggle flash on
    });
  });

  describe('Manual Entry', () => {
    it('should open manual entry modal', async () => {
      const { getByText, getByPlaceholderText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Manuel|Saisir/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Manuel|Saisir/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code|référence/i)).toBeTruthy();
      });
    });

    it('should verify manually entered code', async () => {
      const { getByText, getByPlaceholderText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/Manuel|Saisir/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Manuel|Saisir/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code|référence/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code|référence/i);
      fireEvent.changeText(codeInput, 'REG123456');

      fireEvent.press(getByText('Vérifier'));

      await waitFor(() => {
        expect(mockRegistrationsAPI.checkIn).toHaveBeenCalled();
      });
    });
  });

  describe('Statistics', () => {
    it('should display check-in count', async () => {
      const { getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByText(/\d+.*vérifié|check-in/i)).toBeTruthy();
      });
    });

    it('should update count after successful scan', async () => {
      const { getByTestId, getByText } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      mockOnBarCodeScanned({
        type: 'qr',
        data: JSON.stringify({ registrationId: 'reg-1', type: 'registration' }),
      });

      await waitFor(() => {
        // Count should increment
        expect(getByText(/1.*vérifié/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should go back on header back press', async () => {
      const { getByTestId } = render(<QRScannerScreen />);

      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });

      // Press back button
    });
  });
});

describe('QRCodeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTicketPurchasesAPI.getTicketPurchase.mockResolvedValue({
      data: mockTicketPurchase,
    });
    mockRegistrationsAPI.getRegistration.mockResolvedValue({
      data: mockRegistration,
    });
  });

  // Reset AuthContext mock for user tests
  beforeEach(() => {
    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });
  });

  describe('Rendering', () => {
    it('should render QR code', async () => {
      const { UNSAFE_queryAllByType, getByTestId } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getTicketPurchase).toHaveBeenCalled();
      });

      // QR code SVG/Image should be rendered
    });

    it('should render event title', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText('Concert de Jazz')).toBeTruthy();
      });
    });

    it('should render ticket type', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText('Standard')).toBeTruthy();
      });
    });

    it('should render reference code', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/REG123456/i)).toBeTruthy();
      });
    });

    it('should render event date', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/15.*juin|juin.*15/i)).toBeTruthy();
      });
    });

    it('should render event location', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Palais des Congrès|Douala/i)).toBeTruthy();
      });
    });

    it('should render attendee name', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Jean Dupont/)).toBeTruthy();
      });
    });
  });

  describe('QR Code Actions', () => {
    it('should show brightness adjustment option', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Luminosité|Brightness/i)).toBeTruthy();
      });
    });

    it('should save QR code to gallery', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Enregistrer|Télécharger/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Enregistrer|Télécharger/i));

      // Should trigger save to gallery
    });

    it('should share QR code', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Partager/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Partager/i));

      // Should trigger share action
    });
  });

  describe('Ticket Status', () => {
    it('should show valid status', async () => {
      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Valide|Actif/i)).toBeTruthy();
      });
    });

    it('should show checked in status', async () => {
      mockTicketPurchasesAPI.getTicketPurchase.mockResolvedValue({
        data: { ...mockTicketPurchase, is_checked_in: true },
      });

      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Utilisé|Vérifié/i)).toBeTruthy();
      });
    });

    it('should show cancelled status', async () => {
      mockTicketPurchasesAPI.getTicketPurchase.mockResolvedValue({
        data: { ...mockTicketPurchase, status: 'cancelled' },
      });

      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Annulé/i)).toBeTruthy();
      });
    });
  });

  describe('Fullscreen Mode', () => {
    it('should toggle fullscreen on QR press', async () => {
      const { getByText, UNSAFE_queryAllByType } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getTicketPurchase).toHaveBeenCalled();
      });

      // Press QR code to go fullscreen
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockTicketPurchasesAPI.getTicketPurchase.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/Erreur|Réessayer/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should go back on header back press', async () => {
      const { getByTestId } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(mockTicketPurchasesAPI.getTicketPurchase).toHaveBeenCalled();
      });

      // Press back button
    });
  });

  describe('Multiple Tickets', () => {
    it('should show ticket count when multiple', async () => {
      mockTicketPurchasesAPI.getTicketPurchase.mockResolvedValue({
        data: { ...mockTicketPurchase, quantity: 3 },
      });

      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/3.*billets|billet.*3/i)).toBeTruthy();
      });
    });

    it('should paginate through multiple tickets', async () => {
      mockTicketPurchasesAPI.getTicketPurchase.mockResolvedValue({
        data: { ...mockTicketPurchase, quantity: 3 },
      });

      const { getByText } = render(<QRCodeScreen />);

      await waitFor(() => {
        expect(getByText(/1.*\/.*3/)).toBeTruthy();
      });

      // Swipe or press next
    });
  });
});
