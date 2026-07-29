/**
 * Round-trip brouillon : sauvegarde → restauration → hydratation.
 *
 * Reproduit le bug signalé « les billets et sessions ne réapparaissent pas au
 * restore ». On sauvegarde un form avec tickets + sessions + form fields, puis
 * on relit via loadDraft et on vérifie que TOUT revient (y compris les Date
 * reconstruites). Isole si la perte vient de la (dé)sérialisation.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));

import { useEventDraft } from '../useEventDraft';

function fullForm(): any {
  const start = new Date('2026-08-15T18:00:00Z');
  return {
    // champs transitoires exclus (présents pour être sûr qu'ils sont ignorés)
    loading: false, categories: [{ id: 1 }], availableTags: [{ id: 2 }],
    showMapPicker: false, aiEnabled: true, aiLoading: false, aiResult: null,
    aiError: null, aiUsage: null, aiTitleLoading: false, aiDescLoading: false,
    aiPricingLoading: false,
    // champs persistables
    currentStep: 3,
    title: 'Mon concert', description: 'desc', shortDescription: 'court',
    eventType: 'billetterie', language: 'fr', categoryId: 1,
    selectedTagIds: [], customTags: [], bannerImage: null,
    coverVideo: null, coverVideoUrl: '', galleryImages: [],
    startDate: start, endDate: new Date(start.getTime() + 7200000),
    registrationDeadline: null, hasRegistrationDeadline: false,
    locationType: 'in_person', locationName: '', locationCity: 'Yaoundé',
    locationAddress: '', locationCountry: 'Cameroun',
    onlineUrl: '', onlinePlatform: '', onlineInstructions: '',
    onlineMeetingId: '', onlinePasscode: '',
    locationLatitude: '', locationLongitude: '',
    isFree: false, maxParticipants: '', autoApproveRegistrations: true,
    feeBearer: 'participant',
    ticketTypes: [
      {
        name: 'VIP', description: '', price: '10000', quantity_total: '50',
        sales_start: new Date(start.getTime() - 7 * 86400000),
        sales_end: start, is_visible: true, max_per_order: '10', min_per_order: '1',
      },
    ],
    formFields: [
      { label: 'Taille', field_type: 'select', required: true, placeholder: '', help_text: '', options: 'S,M,L', order: 0 },
    ],
    showFormFieldsForBilletterie: true,
    visibility: 'public', accessCode: '',
    sessions: [
      {
        title: 'Keynote', description: '', session_type: 'talk',
        start_time: start, end_time: new Date(start.getTime() + 3600000),
        location: 'Hall A', room: '', max_capacity: '', is_virtual: false,
        virtual_link: '', requires_registration: true, is_featured: false,
        slides_url: '', recording_url: '', resources: [], tags: [],
        level: 'all', language: 'fr',
        track_index: null, speaker_indices: [], moderator_index: null,
      },
    ],
    tracks: [], speakers: [],
  };
}

beforeEach(async () => { await AsyncStorage.clear(); });

async function mountReady() {
  const hook = renderHook(() => useEventDraft());
  await waitFor(() => expect(hook.result.current.draftLoading).toBe(false));
  return hook;
}

it('un billet survit au round-trip save → loadDraft', async () => {
  const { result } = await mountReady();
  await act(async () => { await result.current.saveNow(fullForm()); });

  let draft: any;
  await act(async () => { draft = await result.current.loadDraft(); });

  expect(draft.ticketTypes).toHaveLength(1);
  expect(draft.ticketTypes[0].name).toBe('VIP');
  expect(draft.ticketTypes[0].price).toBe('10000');
  // Les Date sont reconstruites en objets Date.
  expect(draft.ticketTypes[0].sales_start instanceof Date).toBe(true);
  expect(draft.ticketTypes[0].sales_end instanceof Date).toBe(true);
});

it('une session survit au round-trip', async () => {
  const { result } = await mountReady();
  await act(async () => { await result.current.saveNow(fullForm()); });
  let draft: any;
  await act(async () => { draft = await result.current.loadDraft(); });

  expect(draft.sessions).toHaveLength(1);
  expect(draft.sessions[0].title).toBe('Keynote');
  expect(draft.sessions[0].start_time instanceof Date).toBe(true);
});

it('les form fields survivent au round-trip', async () => {
  const { result } = await mountReady();
  await act(async () => { await result.current.saveNow(fullForm()); });
  let draft: any;
  await act(async () => { draft = await result.current.loadDraft(); });

  expect(draft.formFields).toHaveLength(1);
  expect(draft.formFields[0].label).toBe('Taille');
  expect(draft.formFields[0].options).toBe('S,M,L');
});

it('eventType + isFree + showFormFieldsForBilletterie survivent (gating d\'affichage)', async () => {
  const { result } = await mountReady();
  await act(async () => { await result.current.saveNow(fullForm()); });
  let draft: any;
  await act(async () => { draft = await result.current.loadDraft(); });

  // Ces champs conditionnent l'affichage de la section billets/sessions.
  expect(draft.eventType).toBe('billetterie');
  expect(draft.isFree).toBe(false);
  expect(draft.showFormFieldsForBilletterie).toBe(true);
});
