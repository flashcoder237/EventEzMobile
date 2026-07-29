/**
 * Reproduction du flux "Reprendre le brouillon" (auto-save) de bout en bout.
 *
 * 1. Un form réel est construit via useEventForm (addTicketType/addSession…).
 * 2. Sauvé via le vrai saveNow de useEventDraft.
 * 3. Un NOUVEAU useEventForm est monté, loadDraft() relit, hydrateForm() injecte.
 * 4. On vérifie que billets ET sessions sont présents dans le state final —
 *    c'est exactement ce que l'utilisateur voit (ou pas) au restore.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  AuthProvider: ({ children }: any) => children,
}));
jest.mock('../../api', () => ({
  eventsAPI: { getEvent: jest.fn(), createEvent: jest.fn(), updateEvent: jest.fn(), uploadImages: jest.fn(), submitForValidation: jest.fn(), createFormField: jest.fn() },
  categoriesAPI: { getCategories: jest.fn(() => Promise.resolve({ data: { results: [] } })) },
  tagsAPI: { getTags: jest.fn(() => Promise.resolve({ data: { results: [] } })) },
  ticketTypesAPI: { createTicketType: jest.fn() },
  sessionsAPI: { createSession: jest.fn() },
  aiAssistAPI: { generate: jest.fn(), description: jest.fn(), optimizeTitle: jest.fn(), pricing: jest.fn(), usage: jest.fn() },
  siteSettingsAPI: { get: jest.fn(() => Promise.resolve({ data: { ai_assist_enabled: false } })) },
  walletAPI: { getMyWallet: jest.fn(() => Promise.resolve({ data: { currency: 'XAF', country: 'CM', available_balance: 0, pending_balance: 0 } })) },
  tracksAPI: { createTrack: jest.fn() },
  speakersAPI: { createSpeaker: jest.fn(), uploadPhoto: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn(), MediaTypeOptions: { Images: 'Images' } }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///d/', makeDirectoryAsync: jest.fn(), copyAsync: jest.fn(),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEventForm } from '../useEventForm';
import { useEventDraft } from '../useEventDraft';

const alerts = { showAlert: jest.fn(), showSuccess: jest.fn(), showError: jest.fn() } as any;

beforeEach(async () => { await AsyncStorage.clear(); });

it('billets + sessions réapparaissent après Reprendre (flux complet)', async () => {
  // — Phase 1 : l'utilisateur remplit le form (billetterie + 1 billet + 1 session)
  const src = renderHook(() => useEventForm(alerts));
  act(() => src.result.current.setTitle('Concert Test'));
  act(() => src.result.current.setDescription('Une description'));
  act(() => src.result.current.setCategoryId(1));
  act(() => src.result.current.setLocationCity('Yaoundé'));
  act(() => src.result.current.addTicketType());
  act(() => src.result.current.updateTicketType(0, 'name', 'VIP'));
  act(() => src.result.current.updateTicketType(0, 'price', '10000'));
  act(() => src.result.current.addSession());
  act(() => src.result.current.updateSession(0, 'title', 'Keynote'));

  expect(src.result.current.form.ticketTypes).toHaveLength(1);
  expect(src.result.current.form.sessions).toHaveLength(1);

  // — Phase 2 : sauvegarde auto (saveNow, comme au handleBack / debounce)
  const draftHook = renderHook(() => useEventDraft());
  await waitFor(() => expect(draftHook.result.current.draftLoading).toBe(false));
  await act(async () => { await draftHook.result.current.saveNow(src.result.current.form); });

  // — Phase 3 : nouvelle session (l'app est ré-ouverte) → loadDraft + hydrateForm
  const dst = renderHook(() => useEventForm(alerts));
  const draftHook2 = renderHook(() => useEventDraft());
  await waitFor(() => expect(draftHook2.result.current.draftLoading).toBe(false));

  let data: any;
  await act(async () => { data = await draftHook2.result.current.loadDraft(); });
  act(() => dst.result.current.hydrateForm(data));

  // — Vérif : c'est ce que l'écran affiche après Reprendre
  expect(dst.result.current.form.eventType).toBe('billetterie');
  expect(dst.result.current.form.ticketTypes).toHaveLength(1);
  expect(dst.result.current.form.ticketTypes[0].name).toBe('VIP');
  expect(dst.result.current.form.ticketTypes[0].price).toBe('10000');
  expect(dst.result.current.form.sessions).toHaveLength(1);
  expect(dst.result.current.form.sessions[0].title).toBe('Keynote');
});
