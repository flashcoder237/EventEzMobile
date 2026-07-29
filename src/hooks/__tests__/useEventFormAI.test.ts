/**
 * Tests de useEventFormAI — handlers d'assistance IA de la création d'event.
 *
 * Couverture : fetchAIStatus (activé/désactivé/erreur), handleAIGenerate
 * (result objet/string→parse, text→parse, format inattendu, erreur API),
 * handleAIApply (mapping sélectif des champs + reset + toast), génération de
 * description (garde titre requis), et le gating de longueur d'optimizeTitle.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGenerate = jest.fn();
const mockDescription = jest.fn();
const mockOptimizeTitle = jest.fn();
const mockPricing = jest.fn();
const mockUsage = jest.fn();
const mockSiteGet = jest.fn();
jest.mock('../../api', () => ({
  aiAssistAPI: {
    generate: (...a: any[]) => mockGenerate(...a),
    description: (...a: any[]) => mockDescription(...a),
    optimizeTitle: (...a: any[]) => mockOptimizeTitle(...a),
    pricing: (...a: any[]) => mockPricing(...a),
    usage: (...a: any[]) => mockUsage(...a),
  },
  siteSettingsAPI: { get: (...a: any[]) => mockSiteGet(...a) },
}));

import { useEventFormAI } from '../useEventFormAI';

// Setters capturés pour asserter handleAIApply.
const setters = {
  setTitle: jest.fn(), setDescription: jest.fn(), setShortDescription: jest.fn(),
  setEventType: jest.fn(), setCategoryId: jest.fn(), setSelectedTagIds: jest.fn(),
  setLocationType: jest.fn(), setLocationName: jest.fn(), setLocationCity: jest.fn(),
  setTicketTypes: jest.fn(),
};
const showAlert = jest.fn();
const showSuccess = jest.fn();
const showError = jest.fn();

function makeHook(overrides: any = {}) {
  const opts = {
    alertActions: { showAlert, showSuccess, showError },
    categories: [{ id: 1, name: 'Tech' }],
    categoryId: 1,
    eventType: 'billetterie',
    title: 'Un titre valide',
    description: 'desc',
    locationCity: 'Yaoundé',
    maxParticipants: '100',
    startDate: new Date('2026-08-01T10:00:00Z'),
    platformCurrency: 'XAF',
    ...setters,
    ...overrides,
  };
  return renderHook(() => useEventFormAI(opts as any));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsage.mockResolvedValue({ data: { remaining: 5 } });
});

describe('fetchAIStatus', () => {
  it('active l\'IA + charge l\'usage quand le backend l\'autorise', async () => {
    mockSiteGet.mockResolvedValue({ data: { ai_assist_enabled: true } });
    const { result } = makeHook();
    await act(async () => { await result.current.fetchAIStatus(); });
    await waitFor(() => expect(result.current.aiEnabled).toBe(true));
    expect(mockUsage).toHaveBeenCalled();
    expect(result.current.aiUsage).toEqual({ remaining: 5 });
  });

  it('désactive l\'IA quand le backend la coupe', async () => {
    mockSiteGet.mockResolvedValue({ data: { ai_assist_enabled: false } });
    const { result } = makeHook();
    await act(async () => { await result.current.fetchAIStatus(); });
    expect(result.current.aiEnabled).toBe(false);
    expect(mockUsage).not.toHaveBeenCalled();
  });

  it('erreur backend → aiEnabled false (fail-safe)', async () => {
    mockSiteGet.mockRejectedValue(new Error('down'));
    const { result } = makeHook();
    await act(async () => { await result.current.fetchAIStatus(); });
    expect(result.current.aiEnabled).toBe(false);
  });
});

describe('handleAIGenerate', () => {
  it('result objet → stocké tel quel', async () => {
    mockGenerate.mockResolvedValue({ data: { result: { title: 'Généré' } } });
    const { result } = makeHook();
    await act(async () => { await result.current.handleAIGenerate('prompt'); });
    expect(result.current.aiResult).toEqual({ title: 'Généré' });
    expect(result.current.aiError).toBeNull();
  });

  it('result string JSON → parsé', async () => {
    mockGenerate.mockResolvedValue({ data: { result: '{"title":"Parsé"}' } });
    const { result } = makeHook();
    await act(async () => { await result.current.handleAIGenerate('p'); });
    expect(result.current.aiResult).toEqual({ title: 'Parsé' });
  });

  it('text JSON invalide → aiError', async () => {
    mockGenerate.mockResolvedValue({ data: { text: 'pas du json' } });
    const { result } = makeHook();
    await act(async () => { await result.current.handleAIGenerate('p'); });
    expect(result.current.aiError).toBe('Format de réponse inattendu');
  });

  it('erreur API → message d\'erreur remonté', async () => {
    mockGenerate.mockRejectedValue({ response: { data: { detail: 'Quota dépassé' } } });
    const { result } = makeHook();
    await act(async () => { await result.current.handleAIGenerate('p'); });
    expect(result.current.aiError).toBe('Quota dépassé');
    expect(result.current.aiLoading).toBe(false);
  });
});

describe('handleAIApply', () => {
  it('applique seulement les champs présents + reset + toast', () => {
    const { result } = makeHook();
    act(() => result.current.handleAIApply({
      title: 'T', description: 'D', event_type: 'inscription',
      category_id: '3', tag_ids: [1, 2], location_type: 'online',
      suggested_city: 'Douala',
    } as any));

    expect(setters.setTitle).toHaveBeenCalledWith('T');
    expect(setters.setDescription).toHaveBeenCalledWith('D');
    expect(setters.setEventType).toHaveBeenCalledWith('inscription');
    expect(setters.setCategoryId).toHaveBeenCalledWith(3);
    expect(setters.setSelectedTagIds).toHaveBeenCalledWith([1, 2]);
    expect(setters.setLocationType).toHaveBeenCalledWith('online');
    expect(setters.setLocationCity).toHaveBeenCalledWith('Douala');
    expect(showSuccess).toHaveBeenCalled();
  });

  it('ignore un event_type invalide', () => {
    const { result } = makeHook();
    act(() => result.current.handleAIApply({ event_type: 'bogus' } as any));
    expect(setters.setEventType).not.toHaveBeenCalled();
  });
});

describe('handleGenerateDescription', () => {
  it('sans titre → erreur, pas d\'appel API', async () => {
    const { result } = makeHook({ title: '  ' });
    await act(async () => { await result.current.handleGenerateDescription(); });
    expect(showError).toHaveBeenCalled();
    expect(mockDescription).not.toHaveBeenCalled();
  });

  it('avec titre → applique la description + succès', async () => {
    mockDescription.mockResolvedValue({ data: { text: 'Une belle description' } });
    const { result } = makeHook();
    await act(async () => { await result.current.handleGenerateDescription(); });
    expect(setters.setDescription).toHaveBeenCalledWith('Une belle description');
    expect(showSuccess).toHaveBeenCalled();
  });
});

describe('handleOptimizeTitle', () => {
  it('titre trop court (<5) → no-op', async () => {
    const { result } = makeHook({ title: 'abc' });
    await act(async () => { await result.current.handleOptimizeTitle(); });
    expect(mockOptimizeTitle).not.toHaveBeenCalled();
  });

  it('titre valide → alerte avec suggestions', async () => {
    mockOptimizeTitle.mockResolvedValue({
      data: { suggestions: [{ title: 'Meilleur titre', reason: 'plus clair' }] },
    });
    const { result } = makeHook();
    await act(async () => { await result.current.handleOptimizeTitle(); });
    expect(showAlert).toHaveBeenCalledWith('Suggestions de titre', expect.any(String), expect.any(Array));
  });
});

describe('handleSuggestPricing', () => {
  it('propose une alerte à partir des suggestions de prix', async () => {
    mockPricing.mockResolvedValue({
      data: { suggestions: [{ name: 'Standard', price: 5000, reasoning: 'moyenne marché' }] },
    });
    const { result } = makeHook();
    await act(async () => { await result.current.handleSuggestPricing(); });
    expect(showAlert).toHaveBeenCalledWith('Suggestions de prix IA', expect.any(String), expect.any(Array));
  });

  it('erreur API → showError', async () => {
    mockPricing.mockRejectedValue({ response: { data: { detail: 'IA indispo' } } });
    const { result } = makeHook();
    await act(async () => { await result.current.handleSuggestPricing(); });
    expect(showError).toHaveBeenCalledWith('Erreur', 'IA indispo');
  });
});
