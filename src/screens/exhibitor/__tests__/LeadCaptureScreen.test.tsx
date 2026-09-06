/**
 * Tests Jest pour LeadCaptureScreen.
 *
 * Ce qui compte ici n'est pas le rendu, c'est le COMPORTEMENT FACE AU
 * CONSENTEMENT : quand le visiteur n'a pas accepté d'être contacté, le
 * backend refuse, et l'écran doit l'expliquer plutôt qu'échouer en
 * silence — sinon l'exposant croit avoir capturé un contact qui n'existe
 * pas, ou pire, la capture se ferait sans accord.
 *
 * Couvre :
 *  - scan réussi -> fiche affichée + compteur rechargé
 *  - refus 403 consent_required -> message explicatif, pas de fiche
 *  - badge inconnu (404) -> message distinct du refus de consentement
 *  - qualification -> qualifyLead (et NON un rescan du badge)
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: { eventId: 'evt-1', eventTitle: 'Salon Pro' } }),
}));

// Caméra : on expose le callback de scan pour pouvoir simuler un badge.
let barcodeHandler: ((payload: { data: string }) => void) | undefined;
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    CameraView: (props: any) => {
      barcodeHandler = props.onBarcodeScanned;
      return React.createElement(View, { testID: 'camera' });
    },
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4F46E5', accent: '#FF6B6B', text: '#111827', card: '#FFFFFF',
      background: '#F4F3F0', border: '#E5E7EB', success: '#16A34A',
      warning: '#D97706', error: '#DC2626',
      gray200: '#E5E7EB', gray300: '#D1D5DB', gray500: '#6B7280',
      gray800: '#1F2937', gray900: '#111827',
    },
    isDark: false,
  }),
}));

const mockScanLead = jest.fn();
const mockQualifyLead = jest.fn();
const mockGetMyLeads = jest.fn();
jest.mock('../../../api/exhibitors', () => ({
  exhibitorsAPI: {
    scanLead: (...args: any[]) => mockScanLead(...args),
    qualifyLead: (...args: any[]) => mockQualifyLead(...args),
    getMyLeads: (...args: any[]) => mockGetMyLeads(...args),
  },
}));

jest.mock('../../../utils/haptics', () => ({
  haptics: {
    success: jest.fn(), warning: jest.fn(), error: jest.fn(), light: jest.fn(),
  },
}));

import LeadCaptureScreen from '../LeadCaptureScreen';

const LEAD = {
  id: 'lead-1',
  full_name: 'Amina Nkolo',
  email: 'amina@test.local',
  phone: '+237600',
  company: 'Acme Robotics',
};

beforeEach(() => {
  jest.clearAllMocks();
  barcodeHandler = undefined;
  mockGetMyLeads.mockResolvedValue({ data: { count: 3, results: [] } });
});

describe('LeadCaptureScreen', () => {
  it('affiche la fiche du contact apres un scan accepte', async () => {
    mockScanLead.mockResolvedValue({ status: 201, data: LEAD });
    const { getByText } = render(<LeadCaptureScreen />);

    await waitFor(() => expect(barcodeHandler).toBeDefined());
    barcodeHandler!({ data: 'REF-ABC123' });

    await waitFor(() => expect(getByText('Amina Nkolo')).toBeTruthy());
    expect(getByText('Acme Robotics')).toBeTruthy();
    expect(mockScanLead).toHaveBeenCalledWith({
      event: 'evt-1', code: 'REF-ABC123',
    });
  });

  it('explique le refus quand le visiteur n a pas consenti', async () => {
    // LE cas qui compte : un refus explicite plutôt qu'un échec muet.
    mockScanLead.mockRejectedValue({
      response: { status: 403, data: { code: 'consent_required' } },
    });
    const { getByText, queryByText } = render(<LeadCaptureScreen />);

    await waitFor(() => expect(barcodeHandler).toBeDefined());
    barcodeHandler!({ data: 'REF-NOPE' });

    await waitFor(() =>
      expect(getByText(/n'a pas accepté|has not agreed/i)).toBeTruthy(),
    );
    // Aucune fiche de contact ne doit apparaître.
    expect(queryByText('Amina Nkolo')).toBeNull();
  });

  it('distingue un badge inconnu d un refus de consentement', async () => {
    mockScanLead.mockRejectedValue({ response: { status: 404, data: {} } });
    const { getByText } = render(<LeadCaptureScreen />);

    await waitFor(() => expect(barcodeHandler).toBeDefined());
    barcodeHandler!({ data: 'REF-INCONNU' });

    await waitFor(() =>
      expect(getByText(/non reconnu|not recognised/i)).toBeTruthy(),
    );
  });

  it('qualifie via qualifyLead, sans redemander le badge', async () => {
    // Le visiteur est déjà reparti : rescanner serait impossible.
    mockScanLead.mockResolvedValue({ status: 201, data: LEAD });
    mockQualifyLead.mockResolvedValue({ data: { ...LEAD, rating: 'hot' } });
    const { getByText } = render(<LeadCaptureScreen />);

    await waitFor(() => expect(barcodeHandler).toBeDefined());
    barcodeHandler!({ data: 'REF-ABC123' });
    await waitFor(() => expect(getByText('Amina Nkolo')).toBeTruthy());

    fireEvent.press(getByText(/^Chaud$|^Hot$/i));

    await waitFor(() =>
      expect(mockQualifyLead).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'evt-1', lead: 'lead-1', rating: 'hot',
        }),
      ),
    );
    // Un rescan aurait rejoué la capture : une seule requête de scan.
    expect(mockScanLead).toHaveBeenCalledTimes(1);
  });

  it('ne rescanne pas le meme code en rafale', async () => {
    // La caméra relit le même QR plusieurs fois par seconde.
    mockScanLead.mockResolvedValue({ status: 201, data: LEAD });
    render(<LeadCaptureScreen />);

    await waitFor(() => expect(barcodeHandler).toBeDefined());
    barcodeHandler!({ data: 'REF-ABC123' });
    barcodeHandler!({ data: 'REF-ABC123' });
    barcodeHandler!({ data: 'REF-ABC123' });

    await waitFor(() => expect(mockScanLead).toHaveBeenCalledTimes(1));
  });
});
