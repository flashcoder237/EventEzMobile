/**
 * Tests Jest pour EventCreateScreen.
 *
 * Le screen est un wizard 4 étapes piloté par useEventForm (~830 lignes,
 * fortement couplé à categoriesAPI / tagsAPI / eventsAPI / wallet). Plutôt
 * que de tester la logique du hook, on mocke le hook entier et on couvre
 * la coquille du screen :
 *   - render initial (étape 1, header, CTAs)
 *   - "Suivant" → goToNextStep
 *   - "Retour" → goToPrevStep + saveNow
 *   - submit (étape 4) → handleSubmit + showAlert succès
 *   - error path : si handleSubmit retourne null on n'affiche pas l'alerte
 *   - mode édition (eventId) → CTA "Mettre à jour" + label header différent
 *
 * Note : les sous-composants Step1/Step2/Step3/Step4 sont remplacés par des
 * stubs pour isoler le screen container.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute: { params: any } = { params: {} };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => mockRoute,
}));

const mockShowAlert = jest.fn();
const mockShowConfirm = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
    showConfirm: mockShowConfirm,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

const themeColors = {
  primary: '#4F46E5',
  primaryLight: '#A5B4FC',
  primaryDark: '#4338CA',
  accent: '#FF6B6B',
  error: '#EF4444',
  success: '#10B981',
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

// useEventForm mock — partagé entre tests, mutable entre describe blocks.
const baseForm = () => ({
  currentStep: 1,
  loading: false,
  title: '',
  description: '',
  shortDescription: '',
  eventType: 'billetterie',
  categoryId: null,
  selectedTagIds: [],
  customTags: [],
  bannerImage: null,
  galleryImages: [],
  startDate: new Date('2026-06-01T10:00:00Z'),
  endDate: new Date('2026-06-01T12:00:00Z'),
  registrationDeadline: null,
  hasRegistrationDeadline: false,
  locationType: 'in_person',
  locationName: '',
  locationCity: '',
  locationAddress: '',
  locationCountry: 'Cameroun',
  onlineUrl: '',
  onlinePlatform: '',
  onlineInstructions: '',
  onlineMeetingId: '',
  onlinePasscode: '',
  locationLatitude: '',
  locationLongitude: '',
  showMapPicker: false,
  isFree: false,
  maxParticipants: '',
  autoApproveRegistrations: true,
  feeBearer: 'participant',
  ticketTypes: [],
  formFields: [],
  showFormFieldsForBilletterie: false,
  visibility: 'public',
  accessCode: '',
  sessions: [],
  categories: [],
  availableTags: [],
  aiEnabled: false,
  aiLoading: false,
  aiResult: null,
  aiError: null,
  aiUsage: null,
  aiTitleLoading: false,
  aiDescLoading: false,
  aiPricingLoading: false,
  stepErrors: {},
});

const mockGoToNextStep = jest.fn();
const mockGoToPrevStep = jest.fn();
const mockGoToStep = jest.fn();
const mockHandleSubmit = jest.fn();
const mockResetForm = jest.fn();
const mockHydrateForm = jest.fn();
let currentForm: any = baseForm();

const noop = () => {};

jest.mock('../../../hooks/useEventForm', () => ({
  __esModule: true,
  STEPS: [
    { id: 1, title: 'Infos', shortTitle: "L'Essentiel", nextLabel: 'Quand & Où' },
    { id: 2, title: 'Date & Lieu', shortTitle: 'Quand & Où', nextLabel: 'Tarification' },
    { id: 3, title: 'Tarifs', shortTitle: 'Tarifs & Billets', nextLabel: 'Agenda' },
    { id: 4, title: 'Sessions', shortTitle: 'Agenda & Sessions', nextLabel: null },
  ],
  useEventForm: () => ({
    form: currentForm,
    goToNextStep: mockGoToNextStep,
    goToPrevStep: mockGoToPrevStep,
    goToStep: mockGoToStep,
    setTitle: noop,
    setDescription: noop,
    setShortDescription: noop,
    setEventType: noop,
    setCategoryId: noop,
    setSelectedTagIds: noop,
    handleCustomTagAdd: noop,
    handleCustomTagRemove: noop,
    pickImage: noop,
    setBannerImage: noop,
    pickGalleryImages: noop,
    removeGalleryImage: noop,
    setVisibility: noop,
    setAccessCode: noop,
    setStartDate: noop,
    setEndDate: noop,
    setRegistrationDeadline: noop,
    setHasRegistrationDeadline: noop,
    setLocationType: noop,
    setLocationName: noop,
    setLocationCity: noop,
    setLocationAddress: noop,
    setOnlineUrl: noop,
    setOnlinePlatform: noop,
    setOnlineInstructions: noop,
    setOnlineMeetingId: noop,
    setOnlinePasscode: noop,
    handleMapLocationSelect: noop,
    setShowMapPicker: noop,
    setIsFree: noop,
    setMaxParticipants: noop,
    setAutoApproveRegistrations: noop,
    setFeeBearer: noop,
    addTicketType: noop,
    updateTicketType: noop,
    removeTicketType: noop,
    addFormField: noop,
    updateFormField: noop,
    removeFormField: noop,
    setShowFormFieldsForBilletterie: noop,
    setFormFields: noop,
    addSession: noop,
    updateSession: noop,
    removeSession: noop,
    handleAIGenerate: noop,
    handleAIApply: noop,
    handleOptimizeTitle: noop,
    handleGenerateDescription: noop,
    handleSuggestPricing: noop,
    handleSubmit: mockHandleSubmit,
    resetForm: mockResetForm,
    hydrateForm: mockHydrateForm,
    formatDate: (d: Date) => d.toISOString(),
  }),
}));

// useEventDraft + useNamedDrafts — pas de brouillon.
jest.mock('../../../hooks/useEventDraft', () => ({
  __esModule: true,
  useEventDraft: () => ({
    hasDraft: false,
    draftTitle: '',
    draftLoading: false,
    draftJustSaved: false,
    loadDraft: jest.fn(),
    scheduleSave: jest.fn(),
    saveNow: jest.fn(),
    clearDraft: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useNamedDrafts', () => ({
  __esModule: true,
  useNamedDrafts: () => ({
    saveAsNamed: jest.fn(),
    loadById: jest.fn(),
  }),
}));

// MapPickerModal et AIUsageBadge → stubs
jest.mock('../../../components/common/MapPickerModal', () => {
  const RN = require('react-native');
  return { __esModule: true, default: () => RN.View };
});
jest.mock('../../../components/events/AIUsageBadge', () => {
  const RN = require('react-native');
  return { __esModule: true, default: () => RN.View };
});

// Sous-composants Step1/2/3/4 : on rend juste un Text "Step X" pour vérifier
// quelle étape est active.
jest.mock('../../../components/organizer', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    EventStep1Info: () =>
      React.createElement(RN.Text, { testID: 'step1' }, 'Step 1 content'),
    EventStep2DateTime: () =>
      React.createElement(RN.Text, { testID: 'step2' }, 'Step 2 content'),
    EventStep3Pricing: () =>
      React.createElement(RN.Text, { testID: 'step3' }, 'Step 3 content'),
    EventStep4Sessions: () =>
      React.createElement(RN.Text, { testID: 'step4' }, 'Step 4 content'),
  };
});

// formToPreviewEvent — nécessaire pour la preview button
jest.mock('../../../lib/utils/eventPreview', () => ({
  formToPreviewEvent: () => ({}),
}));

import EventCreateScreen from '../EventCreateScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockRoute.params = {};
  currentForm = baseForm();
});

describe('EventCreateScreen — create mode', () => {
  it('renders step 1 by default with the wizard header', () => {
    const { getByText, getByTestId } = render(<EventCreateScreen />);
    expect(getByTestId('step1')).toBeTruthy();
    expect(getByText("L'Essentiel")).toBeTruthy();
    // Étape 01 / 04 dans l'eyebrow
    expect(getByText(/Étape 01 \/ 04/)).toBeTruthy();
  });

  it('calls goToNextStep when "Suivant" CTA is pressed', () => {
    const { getByLabelText } = render(<EventCreateScreen />);
    fireEvent.press(getByLabelText('Étape suivante'));
    expect(mockGoToNextStep).toHaveBeenCalledTimes(1);
  });

  it('calls goToPrevStep when "Retour" is pressed on step > 1', () => {
    currentForm = { ...baseForm(), currentStep: 2 };
    const { getByLabelText, getByTestId } = render(<EventCreateScreen />);
    expect(getByTestId('step2')).toBeTruthy();

    fireEvent.press(getByLabelText('Étape précédente'));
    expect(mockGoToPrevStep).toHaveBeenCalledTimes(1);
  });

  it('shows the submit CTA on step 4 with "Publier l\'événement" label', () => {
    currentForm = { ...baseForm(), currentStep: 4 };
    const { getByLabelText, getByText, getByTestId } = render(<EventCreateScreen />);
    expect(getByTestId('step4')).toBeTruthy();
    expect(getByLabelText("Créer l'événement")).toBeTruthy();
    expect(getByText("Publier l'événement")).toBeTruthy();
  });

  it('calls handleSubmit and shows the success alert when submit succeeds', async () => {
    currentForm = { ...baseForm(), currentStep: 4 };
    mockHandleSubmit.mockResolvedValueOnce('event-99');

    const { getByLabelText } = render(<EventCreateScreen />);

    fireEvent.press(getByLabelText("Créer l'événement"));

    await waitFor(() => {
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalled();
    });
    // Vérifie que c'est bien l'alerte "Succès" (1er argument du dernier appel)
    const lastCall = mockShowAlert.mock.calls[mockShowAlert.mock.calls.length - 1];
    expect(lastCall[0]).toBe('Succès');
  });

  it('does NOT show the success alert when handleSubmit returns null', async () => {
    currentForm = { ...baseForm(), currentStep: 4 };
    mockHandleSubmit.mockResolvedValueOnce(null);

    const { getByLabelText } = render(<EventCreateScreen />);

    fireEvent.press(getByLabelText("Créer l'événement"));

    await waitFor(() => {
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('navigates back when the back arrow is pressed', () => {
    const { getByLabelText } = render(<EventCreateScreen />);
    fireEvent.press(getByLabelText('Retour'));
    // navigation.goBack est appelé via handleBack après saveNow
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('EventCreateScreen — edit mode', () => {
  beforeEach(() => {
    mockRoute.params = { eventId: 'event-42' };
  });

  it('shows the "Modifier" eyebrow + "Mettre à jour" CTA on step 4', () => {
    currentForm = { ...baseForm(), currentStep: 4 };
    const { getByText, getByLabelText } = render(<EventCreateScreen />);

    expect(getByText(/Modifier · Étape 04 \/ 04/)).toBeTruthy();
    expect(getByLabelText("Mettre à jour l'événement")).toBeTruthy();
    expect(getByText('Mettre à jour')).toBeTruthy();
  });
});
