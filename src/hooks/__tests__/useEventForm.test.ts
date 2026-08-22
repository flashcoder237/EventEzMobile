/**
 * Tests du hook useEventForm.
 *
 * Le hook compose plusieurs APIs (events, categories, tags, ticket types,
 * sessions, AI, wallet) et plusieurs sous-hooks (useOrganizerWallet,
 * useEventFormValidation, useEventFormSubmit). On mock l'intégralité du
 * module ../../api pour un test isolé du flow.
 *
 * Couverture : init, updateField, navigation steps + validation, ticket /
 * formField / session helpers, submit (payload FormData et chaînage submit
 * for validation), mode édition (load + hydrate), reset.
 */

// useEventForm lit user.language (pré-remplissage de la langue) via useAuth.
// Le hook est rendu ici en isolation, hors AuthProvider → on stub useAuth.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  AuthProvider: ({ children }: { children: any }) => children,
}));

// Mock l'intégralité du module api (utilisé partout par useEventForm + sous-hooks)
jest.mock('../../api', () => ({
  eventsAPI: {
    getEvent: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    uploadImages: jest.fn(),
    submitForValidation: jest.fn(),
    createFormField: jest.fn(),
    updateFormFields: jest.fn(() => Promise.resolve({ data: [] })),
  },
  categoriesAPI: {
    getCategories: jest.fn(() => Promise.resolve({ data: { results: [] } })),
  },
  tagsAPI: {
    getTags: jest.fn(() => Promise.resolve({ data: { results: [] } })),
  },
  ticketTypesAPI: {
    createTicketType: jest.fn(() => Promise.resolve({ data: { id: 'tt1' } })),
    updateTicketType: jest.fn(() => Promise.resolve({ data: {} })),
    deleteTicketType: jest.fn(() => Promise.resolve({ data: {} })),
  },
  sessionsAPI: {
    createSession: jest.fn(() => Promise.resolve({ data: { id: 'ss1' } })),
    updateSession: jest.fn(() => Promise.resolve({ data: {} })),
    deleteSession: jest.fn(() => Promise.resolve({ data: {} })),
  },
  aiAssistAPI: {
    generate: jest.fn(),
    description: jest.fn(),
    optimizeTitle: jest.fn(),
    pricing: jest.fn(),
    usage: jest.fn(),
  },
  siteSettingsAPI: {
    get: jest.fn(() => Promise.resolve({ data: { ai_assist_enabled: false } })),
  },
  walletAPI: {
    getMyWallet: jest.fn(() =>
      Promise.resolve({
        data: {
          currency: 'XAF',
          country: 'CM',
          available_balance: 0,
          pending_balance: 0,
        },
      }),
    ),
  },
}));

// Mocks des effets de bord natifs : ImagePicker / ImageManipulator / FileSystem.
// Ils ne sont pas testés ici mais doivent ne pas crasher au require.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: true, assets: [] }),
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  eventsAPI,
  ticketTypesAPI,
  sessionsAPI,
  categoriesAPI,
  tagsAPI,
} from '../../api';
import { useEventForm } from '../useEventForm';

const mockedEventsAPI = eventsAPI as jest.Mocked<typeof eventsAPI>;
const mockedTicketTypesAPI = ticketTypesAPI as jest.Mocked<typeof ticketTypesAPI>;
const mockedSessionsAPI = sessionsAPI as jest.Mocked<typeof sessionsAPI>;
const mockedCategoriesAPI = categoriesAPI as jest.Mocked<typeof categoriesAPI>;

function makeAlerts() {
  return {
    showAlert: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
  };
}

describe('useEventForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // categories / tags / settings retournent des listes vides par défaut
    mockedCategoriesAPI.getCategories.mockResolvedValue({
      data: { results: [{ id: 1, name: 'Tech' }] },
    } as any);
    (tagsAPI.getTags as jest.Mock).mockResolvedValue({
      data: { results: [{ id: 1, name: 'AI' }] },
    } as any);
  });

  describe('initial state', () => {
    it('starts on step 1 with empty defaults', async () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      expect(result.current.form.currentStep).toBe(1);
      expect(result.current.form.title).toBe('');
      expect(result.current.form.description).toBe('');
      expect(result.current.form.eventType).toBe('billetterie');
      expect(result.current.form.locationType).toBe('in_person');
      expect(result.current.form.ticketTypes).toEqual([]);
      expect(result.current.form.formFields).toEqual([]);
      expect(result.current.form.sessions).toEqual([]);
      expect(result.current.isEditMode).toBe(false);
    });

    it('exposes setters that update individual fields', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setTitle('My Event'));
      expect(result.current.form.title).toBe('My Event');

      act(() => result.current.setDescription('Desc'));
      expect(result.current.form.description).toBe('Desc');

      act(() => result.current.setEventType('inscription'));
      expect(result.current.form.eventType).toBe('inscription');

      act(() => result.current.setCategoryId(7));
      expect(result.current.form.categoryId).toBe(7);
    });

    it('loads categories and tags on mount', async () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));
      await waitFor(() => {
        expect(result.current.form.categories).toHaveLength(1);
        expect(result.current.form.availableTags).toHaveLength(1);
      });
    });
  });

  describe('navigation + validation', () => {
    it('goToNextStep blocks step 1 when title/description/category missing', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(1);
      // Toutes les erreurs de l'etape sont exposees D'UN COUP, chacune destinee
      // a etre rendue sous son propre champ.
      expect(result.current.form.stepErrors).toMatchObject({
        title: expect.stringContaining('titre'),
      });
      expect(Object.keys(result.current.form.stepErrors).length).toBeGreaterThan(1);
      // Plus AUCUNE modale : une modale ne peut pas designer le champ fautif.
      expect(alerts.showError).not.toHaveBeenCalled();
    });

    it("efface l'erreur d'un champ des qu'il est corrige", () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.goToNextStep());
      expect(result.current.form.stepErrors.title).toBeTruthy();

      // Sans ca, un champ repare restait souligne en rouge jusqu'a la
      // prochaine tentative de passage a l'etape suivante.
      act(() => result.current.setTitle('Un titre valide'));
      expect(result.current.form.stepErrors.title).toBeUndefined();
      // Les autres erreurs, elles, subsistent.
      expect(result.current.form.stepErrors.description).toBeTruthy();
    });

    it('goToNextStep advances when step 1 is valid', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setTitle('Event title'));
      act(() => result.current.setDescription('Long enough description.'));
      act(() => result.current.setCategoryId(1));

      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(2);
      expect(result.current.form.stepErrors).toEqual({});
    });

    it('goToNextStep blocks step 2 when end <= start', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      // valid step 1
      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());

      // invalid step 2 (end == start)
      const sameDate = new Date('2026-06-01T10:00:00Z');
      act(() => result.current.setStartDate(sameDate));
      act(() => result.current.setEndDate(sameDate));
      act(() => result.current.setLocationCity('Yaoundé'));

      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(2);
      expect(result.current.form.stepErrors.endDate).toBeDefined();
    });

    it('goToNextStep step 2 requires city for in_person', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());

      // valid dates, missing city
      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));
      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(2);
      expect(result.current.form.stepErrors.locationCity).toBeDefined();
    });

    it('goToNextStep step 2 requires online URL for online type', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());

      act(() => result.current.setLocationType('online'));
      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));

      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(2);
      expect(result.current.form.stepErrors.onlineUrl).toBeDefined();
    });

    it('goToNextStep step 3 (billetterie not free) requires at least 1 ticketType', async () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      // step 1
      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());

      // step 2
      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));
      act(() => result.current.setLocationCity('Yaoundé'));
      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(3);

      // step 3 : billetterie + non gratuit + 0 tickets => fail
      expect(result.current.form.eventType).toBe('billetterie');
      expect(result.current.form.isFree).toBe(false);
      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(3);
      expect(result.current.form.stepErrors.ticketTypes).toBeDefined();
    });

    it('goToNextStep step 3 (inscription) requires at least 1 form field', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setEventType('inscription'));
      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());

      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));
      act(() => result.current.setLocationCity('Yaoundé'));
      act(() => result.current.goToNextStep());

      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(3);
      expect(result.current.form.stepErrors.formFields).toBeDefined();
    });

    it('goToPrevStep decrements but never goes below 1', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.goToPrevStep());
      expect(result.current.form.currentStep).toBe(1);

      // advance to 2
      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(2);

      act(() => result.current.goToPrevStep());
      expect(result.current.form.currentStep).toBe(1);
    });

    it('goToStep allows backwards navigation without revalidation', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setTitle('T'));
      act(() => result.current.setDescription('D'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.goToNextStep());
      expect(result.current.form.currentStep).toBe(2);

      act(() => result.current.goToStep(1));
      expect(result.current.form.currentStep).toBe(1);
    });
  });

  describe('ticket types', () => {
    it('addTicketType + updateTicketType + removeTicketType', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.addTicketType());
      expect(result.current.form.ticketTypes).toHaveLength(1);
      expect(result.current.form.ticketTypes[0]).toMatchObject({
        name: '',
        quantity_total: '100',
      });

      act(() => result.current.updateTicketType(0, 'name', 'Standard'));
      act(() => result.current.updateTicketType(0, 'price', '5000'));
      expect(result.current.form.ticketTypes[0].name).toBe('Standard');
      expect(result.current.form.ticketTypes[0].price).toBe('5000');

      act(() => result.current.addTicketType());
      expect(result.current.form.ticketTypes).toHaveLength(2);

      act(() => result.current.removeTicketType(0));
      expect(result.current.form.ticketTypes).toHaveLength(1);
      // The remaining one is the second one (the empty default)
      expect(result.current.form.ticketTypes[0].name).toBe('');
    });
  });

  describe('form fields', () => {
    it('addFormField + removeFormField', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.addFormField());
      act(() => result.current.addFormField());
      expect(result.current.form.formFields).toHaveLength(2);
      expect(result.current.form.formFields[0].field_type).toBe('text');

      act(() => result.current.updateFormField(0, 'label', 'Email'));
      act(() => result.current.updateFormField(0, 'field_type', 'email'));
      expect(result.current.form.formFields[0].label).toBe('Email');

      act(() => result.current.removeFormField(1));
      expect(result.current.form.formFields).toHaveLength(1);
    });
  });

  describe('sessions', () => {
    it('addSession + removeSession', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.addSession());
      expect(result.current.form.sessions).toHaveLength(1);
      expect(result.current.form.sessions[0]).toMatchObject({
        session_type: 'talk',
        level: 'all',
        language: 'fr',
        is_virtual: false,
      });

      act(() => result.current.updateSession(0, 'title', 'Keynote'));
      expect(result.current.form.sessions[0].title).toBe('Keynote');

      act(() => result.current.removeSession(0));
      expect(result.current.form.sessions).toHaveLength(0);
    });
  });

  describe('handleSubmit', () => {
    function setupValidForm(result: any) {
      act(() => result.current.setTitle('Valid Event'));
      act(() => result.current.setDescription('Description here'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.setLocationCity('Yaoundé'));
      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));
      act(() => result.current.setIsFree(true));
      act(() => result.current.setEventType('inscription'));
      act(() => result.current.addFormField());
      act(() => result.current.updateFormField(0, 'label', 'Name'));
      // step doit être 4 (sessions optionnelles) avant submit
      // mais handleSubmit valide currentStep ; on peut rester sur step 1
      // tant qu'il est valide
    }

    it('returns null + shows error if validation fails', async () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      let id: string | null | undefined;
      await act(async () => {
        id = await result.current.handleSubmit();
      });

      expect(id).toBeNull();
      expect(alerts.showError).toHaveBeenCalled();
      expect(mockedEventsAPI.createEvent).not.toHaveBeenCalled();
    });

    it('creates event + chains submitForValidation in create mode', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.createEvent.mockResolvedValueOnce({
        data: { id: 'evt-123' },
      } as any);
      mockedEventsAPI.submitForValidation.mockResolvedValueOnce({
        data: {},
      } as any);

      const { result } = renderHook(() => useEventForm(alerts));
      setupValidForm(result);

      let id: string | null | undefined;
      await act(async () => {
        id = await result.current.handleSubmit();
      });

      expect(id).toBe('evt-123');
      expect(mockedEventsAPI.createEvent).toHaveBeenCalledTimes(1);
      // FormData payload sent — assert it includes title/category/event_type
      const fd = mockedEventsAPI.createEvent.mock.calls[0][0] as FormData;
      // FormData in node has .get()
      expect((fd as any).get('title')).toBe('Valid Event');
      expect((fd as any).get('category')).toBe('1');
      expect((fd as any).get('event_type')).toBe('inscription');
      expect((fd as any).get('location_city')).toBe('Yaoundé');
      expect((fd as any).get('status')).toBe('draft');

      // form_field created
      expect(mockedEventsAPI.createFormField).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'evt-123', label: 'Name' }),
      );

      // submitForValidation chained AFTER children create
      expect(mockedEventsAPI.submitForValidation).toHaveBeenCalledWith('evt-123');
    });

    // ─── Couverture des sous-ressources selon event_type ────────────────────
    // Régression : le submit doit envoyer LES BONS appels API selon le type
    // d'event et les toggles. Un trou ici (billetterie + form fields non testé)
    // avait laissé passer un 400 backend en prod.

    // Construit un form BILLETTERIE valide (titre/desc/catégorie/ville + 1 ticket).
    function setupValidBilletterie(result: any) {
      act(() => result.current.setTitle('Concert'));
      act(() => result.current.setDescription('Description here'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.setLocationCity('Yaoundé'));
      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));
      act(() => result.current.setEventType('billetterie'));
      act(() => result.current.addTicketType());
      act(() => result.current.updateTicketType(0, 'name', 'Standard'));
      act(() => result.current.updateTicketType(0, 'price', '5000'));
    }

    it('billetterie: creates ticket types with full payload', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.createEvent.mockResolvedValueOnce({ data: { id: 'evt-b1' } } as any);
      mockedEventsAPI.submitForValidation.mockResolvedValueOnce({ data: {} } as any);

      const { result } = renderHook(() => useEventForm(alerts));
      setupValidBilletterie(result);

      await act(async () => { await result.current.handleSubmit(); });

      expect(mockedTicketTypesAPI.createTicketType).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'evt-b1',
          name: 'Standard',
          price: 5000,
          quantity_total: 100,
          max_per_order: 10,
          min_per_order: 1,
          is_visible: true,
        }),
      );
      // Pas de form fields sans le toggle.
      expect(mockedEventsAPI.createFormField).not.toHaveBeenCalled();
    });

    it('billetterie + showFormFieldsForBilletterie: creates form fields (regression 400)', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.createEvent.mockResolvedValueOnce({ data: { id: 'evt-b2' } } as any);
      mockedEventsAPI.submitForValidation.mockResolvedValueOnce({ data: {} } as any);
      mockedEventsAPI.createFormField.mockResolvedValue({ data: { id: 'ff1' } } as any);

      const { result } = renderHook(() => useEventForm(alerts));
      setupValidBilletterie(result);
      // Active la collecte d'infos complémentaires + 1 champ complet.
      act(() => result.current.setShowFormFieldsForBilletterie(true));
      act(() => result.current.addFormField());
      act(() => result.current.updateFormField(0, 'label', 'Taille du t-shirt'));
      act(() => result.current.updateFormField(0, 'field_type', 'select'));
      act(() => result.current.updateFormField(0, 'required', true));
      act(() => result.current.updateFormField(0, 'options', 'S,M,L,XL'));

      await act(async () => { await result.current.handleSubmit(); });

      // Le cœur du bug : le form field DOIT être envoyé pour une billetterie.
      expect(mockedEventsAPI.createFormField).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'evt-b2',
          label: 'Taille du t-shirt',
          field_type: 'select',
          required: true,
          options: 'S,M,L,XL',
          order: 0,
        }),
      );
      // Et les tickets restent créés en parallèle.
      expect(mockedTicketTypesAPI.createTicketType).toHaveBeenCalled();
    });

    it('billetterie + toggle ON but 0 fields: does NOT call createFormField', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.createEvent.mockResolvedValueOnce({ data: { id: 'evt-b3' } } as any);
      mockedEventsAPI.submitForValidation.mockResolvedValueOnce({ data: {} } as any);

      const { result } = renderHook(() => useEventForm(alerts));
      setupValidBilletterie(result);
      act(() => result.current.setShowFormFieldsForBilletterie(true));
      // aucun addFormField()

      await act(async () => { await result.current.handleSubmit(); });

      expect(mockedEventsAPI.createFormField).not.toHaveBeenCalled();
    });

    it('inscription: form field payload carries every field', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.createEvent.mockResolvedValueOnce({ data: { id: 'evt-i1' } } as any);
      mockedEventsAPI.submitForValidation.mockResolvedValueOnce({ data: {} } as any);
      mockedEventsAPI.createFormField.mockResolvedValue({ data: { id: 'ff1' } } as any);

      const { result } = renderHook(() => useEventForm(alerts));
      act(() => result.current.setTitle('Atelier'));
      act(() => result.current.setDescription('Desc'));
      act(() => result.current.setCategoryId(1));
      act(() => result.current.setLocationCity('Douala'));
      act(() => result.current.setEndDate(new Date(Date.now() + 7200000)));
      act(() => result.current.setIsFree(true));
      act(() => result.current.setEventType('inscription'));
      act(() => result.current.addFormField());
      act(() => result.current.updateFormField(0, 'label', 'Email'));
      act(() => result.current.updateFormField(0, 'field_type', 'email'));
      act(() => result.current.updateFormField(0, 'required', true));
      act(() => result.current.updateFormField(0, 'placeholder', 'vous@mail.com'));
      act(() => result.current.updateFormField(0, 'help_text', 'Pour vous contacter'));

      await act(async () => { await result.current.handleSubmit(); });

      expect(mockedEventsAPI.createFormField).toHaveBeenCalledWith({
        event: 'evt-i1',
        label: 'Email',
        field_type: 'email',
        required: true,
        placeholder: 'vous@mail.com',
        help_text: 'Pour vous contacter',
        options: '',
        order: 0,
      });
      // Une billetterie n'aurait pas de ticket ici.
      expect(mockedTicketTypesAPI.createTicketType).not.toHaveBeenCalled();
    });

    it('inscription: does NOT create ticket types', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.createEvent.mockResolvedValueOnce({ data: { id: 'evt-i2' } } as any);
      mockedEventsAPI.submitForValidation.mockResolvedValueOnce({ data: {} } as any);

      const { result } = renderHook(() => useEventForm(alerts));
      setupValidForm(result); // inscription + 1 form field

      await act(async () => { await result.current.handleSubmit(); });

      expect(mockedTicketTypesAPI.createTicketType).not.toHaveBeenCalled();
      expect(mockedEventsAPI.createFormField).toHaveBeenCalled();
    });

    it('edit mode: charge billets + form fields + sessions depuis getEvent (régression)', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.getEvent.mockResolvedValueOnce({
        data: {
          id: 'evt-full',
          title: 'Concert', description: 'd', short_description: '',
          event_type: 'billetterie',
          category: { id: 2, name: 'Musique' }, tags: [],
          start_date: new Date('2026-09-01T18:00:00Z').toISOString(),
          end_date: new Date('2026-09-01T22:00:00Z').toISOString(),
          location_type: 'in_person', location_city: 'Yaoundé', location_country: 'Cameroun',
          visibility: 'public', fee_bearer: 'participant', auto_approve_registrations: true,
          ticket_types: [
            { name: 'VIP', description: '', price: '10000', quantity_total: '50',
              sales_start: '2026-08-01T00:00:00Z', sales_end: '2026-09-01T18:00:00Z',
              is_visible: true, max_per_order: 5, min_per_order: 1 },
          ],
          form_fields: [
            { label: 'Taille', field_type: 'select', required: true, options: 'S,M,L', order: 0 },
          ],
          sessions: [
            { title: 'Première partie', session_type: 'talk',
              start_time: '2026-09-01T18:30:00Z', end_time: '2026-09-01T19:30:00Z',
              location: 'Scène', max_capacity: 200 },
          ],
        },
      } as any);

      const { result } = renderHook(() => useEventForm(alerts, 'evt-full'));

      await waitFor(() => expect(result.current.form.title).toBe('Concert'));

      // Billets chargés + convertis (price/quantity en string, dates en Date).
      expect(result.current.form.ticketTypes).toHaveLength(1);
      expect(result.current.form.ticketTypes[0].name).toBe('VIP');
      expect(result.current.form.ticketTypes[0].price).toBe('10000');
      expect(result.current.form.ticketTypes[0].max_per_order).toBe('5');
      expect(result.current.form.ticketTypes[0].sales_start instanceof Date).toBe(true);

      // Champs de formulaire chargés.
      expect(result.current.form.formFields).toHaveLength(1);
      expect(result.current.form.formFields[0].label).toBe('Taille');
      expect(result.current.form.showFormFieldsForBilletterie).toBe(true);

      // Sessions chargées.
      expect(result.current.form.sessions).toHaveLength(1);
      expect(result.current.form.sessions[0].title).toBe('Première partie');
      expect(result.current.form.sessions[0].max_capacity).toBe('200');
      expect(result.current.form.sessions[0].start_time instanceof Date).toBe(true);
    });

    it('edit mode: synchronise billets (PUT existant, POST nouveau, DELETE retiré) — anti-doublon', async () => {
      const alerts = makeAlerts();
      const mockedTickets = ticketTypesAPI as jest.Mocked<typeof ticketTypesAPI>;
      mockedEventsAPI.getEvent.mockResolvedValueOnce({
        data: {
          id: 'evt-sync', title: 'Fest', description: 'd', short_description: '',
          event_type: 'billetterie', category: { id: 1 }, tags: [],
          start_date: new Date('2026-09-01T18:00:00Z').toISOString(),
          end_date: new Date('2026-09-01T22:00:00Z').toISOString(),
          location_type: 'in_person', location_city: 'Yaoundé', location_country: 'Cameroun',
          visibility: 'public', fee_bearer: 'participant', auto_approve_registrations: true,
          ticket_types: [
            { id: 'TK_KEEP', name: 'VIP', price: '10000', quantity_total: '50', is_visible: true,
              sales_start: '2026-08-01T00:00:00Z', sales_end: '2026-09-01T18:00:00Z', max_per_order: 5, min_per_order: 1 },
            { id: 'TK_DEL', name: 'Early', price: '5000', quantity_total: '20', is_visible: true,
              sales_start: '2026-08-01T00:00:00Z', sales_end: '2026-09-01T18:00:00Z', max_per_order: 5, min_per_order: 1 },
          ],
          form_fields: [], sessions: [],
        },
      } as any);
      mockedEventsAPI.updateEvent.mockResolvedValueOnce({ data: { id: 'evt-sync' } } as any);

      const { result } = renderHook(() => useEventForm(alerts, 'evt-sync'));
      await waitFor(() => expect(result.current.form.ticketTypes).toHaveLength(2));

      // Modifie le 1er (TK_KEEP), supprime le 2e (TK_DEL), ajoute un nouveau.
      act(() => result.current.updateTicketType(0, 'price', '12000'));
      act(() => result.current.removeTicketType(1));
      act(() => result.current.addTicketType());
      act(() => result.current.updateTicketType(1, 'name', 'Nouveau'));

      await act(async () => { await result.current.handleSubmit(); });

      // TK_KEEP → PUT ; nouveau → POST ; TK_DEL → DELETE.
      expect(mockedTickets.updateTicketType).toHaveBeenCalledWith('TK_KEEP', expect.objectContaining({ price: 12000 }));
      expect(mockedTickets.createTicketType).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nouveau' }));
      expect(mockedTickets.deleteTicketType).toHaveBeenCalledWith('TK_DEL');
      // Anti-régression : on ne re-POST PAS le billet conservé.
      expect(mockedTickets.createTicketType).toHaveBeenCalledTimes(1);
    });

    it('updates event + does NOT call submitForValidation in edit mode', async () => {
      const alerts = makeAlerts();
      mockedEventsAPI.getEvent.mockResolvedValueOnce({
        data: {
          id: 'evt-edit',
          title: 'Existing',
          description: 'Existing desc',
          short_description: '',
          event_type: 'inscription',
          category: { id: 1, name: 'Tech' },
          tags: [],
          start_date: new Date('2026-06-01').toISOString(),
          end_date: new Date('2026-06-02').toISOString(),
          location_type: 'in_person',
          location_city: 'Douala',
          location_country: 'Cameroun',
          visibility: 'public',
          fee_bearer: 'participant',
          auto_approve_registrations: true,
        },
      } as any);
      mockedEventsAPI.updateEvent.mockResolvedValueOnce({
        data: { id: 'evt-edit' },
      } as any);

      const { result } = renderHook(() => useEventForm(alerts, 'evt-edit'));
      expect(result.current.isEditMode).toBe(true);

      // wait until pre-fill happened
      await waitFor(() => {
        expect(result.current.form.title).toBe('Existing');
      });
      expect(result.current.form.description).toBe('Existing desc');
      expect(result.current.form.locationCity).toBe('Douala');
      expect(result.current.form.eventType).toBe('inscription');
      expect(result.current.form.categoryId).toBe(1);

      // make form fully valid for inscription type before submit
      act(() => result.current.addFormField());
      act(() => result.current.updateFormField(0, 'label', 'Email'));
      act(() => result.current.setIsFree(true));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockedEventsAPI.updateEvent).toHaveBeenCalledWith(
        'evt-edit',
        expect.any(Object),
      );
      expect(mockedEventsAPI.submitForValidation).not.toHaveBeenCalled();
    });

    it('returns null and surfaces a generic error (never the raw DRF detail) on backend failure', async () => {
      const alerts = makeAlerts();
      // Le backend renvoie un `detail` brut : getApiErrorMessage NE doit JAMAIS
      // l'exposer à l'utilisateur. Sans status ni code métier, on retombe sur le
      // fallback générique.
      mockedEventsAPI.createEvent.mockRejectedValueOnce({
        response: { data: { detail: 'Backend says no' } },
      });

      const { result } = renderHook(() => useEventForm(alerts));
      setupValidForm(result);

      let id: string | null | undefined;
      await act(async () => {
        id = await result.current.handleSubmit();
      });

      expect(id).toBeNull();
      expect(alerts.showError).toHaveBeenCalledWith(
        'Erreur',
        'Une erreur est survenue. Veuillez réessayer.',
      );
      // Garde-fou anti-régression : le detail brut ne fuit pas dans le toast.
      expect(alerts.showError).not.toHaveBeenCalledWith('Erreur', 'Backend says no');
    });
  });

  describe('hydrateForm + resetForm', () => {
    it('hydrates partial state and overrides defaults', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() =>
        result.current.hydrateForm({
          title: 'Restored',
          description: 'From draft',
          categoryId: 5,
          locationCity: 'Bafoussam',
          isFree: true,
        }),
      );

      expect(result.current.form.title).toBe('Restored');
      expect(result.current.form.description).toBe('From draft');
      expect(result.current.form.categoryId).toBe(5);
      expect(result.current.form.locationCity).toBe('Bafoussam');
      expect(result.current.form.isFree).toBe(true);
    });

    it('resetForm wipes user inputs back to defaults', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.setTitle('To be reset'));
      act(() => result.current.addTicketType());
      act(() => result.current.addFormField());
      act(() => result.current.addSession());

      act(() => result.current.resetForm());

      expect(result.current.form.title).toBe('');
      expect(result.current.form.ticketTypes).toEqual([]);
      expect(result.current.form.formFields).toEqual([]);
      expect(result.current.form.sessions).toEqual([]);
      expect(result.current.form.currentStep).toBe(1);
    });
  });

  describe('custom tags', () => {
    it('adds + removes custom tags, dedup', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));

      act(() => result.current.handleCustomTagAdd('react'));
      act(() => result.current.handleCustomTagAdd('react')); // dedup
      act(() => result.current.handleCustomTagAdd('expo'));

      expect(result.current.form.customTags).toEqual(['react', 'expo']);

      act(() => result.current.handleCustomTagRemove('react'));
      expect(result.current.form.customTags).toEqual(['expo']);
    });
  });

  describe('formatDate', () => {
    it('returns a non-empty fr-FR formatted string', () => {
      const alerts = makeAlerts();
      const { result } = renderHook(() => useEventForm(alerts));
      const out = result.current.formatDate(new Date('2026-06-01T10:00:00Z'));
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    });
  });
});
