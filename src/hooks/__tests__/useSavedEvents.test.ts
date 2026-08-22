/**
 * Tests de useSavedEvents — sauvegarde d'un event depuis une carte de liste.
 *
 * Regression : l'icone marque-page des cartes etait un bouton MORT (aucun ecran
 * ne passait onLikePress/isLiked a EventCard). Sauvegarder n'etait possible que
 * depuis la fiche event, et « Tes Sauvegardes » restait vide. Remonte en test :
 *   « A partir de l'icone on n'arrive pas a sauvegarder. »
 *
 * On couvre : hydratation depuis /events/following/, toggle optimiste,
 * rollback en cas d'echec, invalidation du cache de la collection, et le
 * no-op quand l'utilisateur n'est pas connecte.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGetFollowingEvents = jest.fn();
const mockFollowEvent = jest.fn();
const mockUnfollowEvent = jest.fn();
jest.mock('../../api', () => ({
  eventsAPI: {
    getFollowingEvents: (...a: any[]) => mockGetFollowingEvents(...a),
    followEvent: (...a: any[]) => mockFollowEvent(...a),
    unfollowEvent: (...a: any[]) => mockUnfollowEvent(...a),
  },
}));

const mockInvalidate = jest.fn();
jest.mock('../../services/CacheService', () => ({
  __esModule: true,
  default: { invalidate: (...a: any[]) => mockInvalidate(...a) },
}));

let mockAuthState = { user: { id: 'u1' }, isAuthenticated: true };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

import { useSavedEvents, followingCacheKey } from '../useSavedEvents';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState = { user: { id: 'u1' }, isAuthenticated: true };
  mockGetFollowingEvents.mockResolvedValue({ data: { results: [] } });
  mockFollowEvent.mockResolvedValue({});
  mockUnfollowEvent.mockResolvedValue({});
});

const renderReady = async () => {
  const h = renderHook(() => useSavedEvents());
  await waitFor(() => expect(h.result.current.loaded).toBe(true));
  return h;
};

describe('useSavedEvents', () => {
  it('hydrate les events deja suivis (forme event_details)', async () => {
    mockGetFollowingEvents.mockResolvedValue({
      data: { results: [{ id: 1, event_details: { id: 'evt-a' } }] },
    });
    const { result } = await renderReady();
    expect(result.current.isSaved('evt-a')).toBe(true);
    expect(result.current.isSaved('evt-b')).toBe(false);
  });

  it('hydrate aussi quand seul le PK brut `event` est present', async () => {
    mockGetFollowingEvents.mockResolvedValue({
      data: [{ id: 2, event: 'evt-c' }],
    });
    const { result } = await renderReady();
    expect(result.current.isSaved('evt-c')).toBe(true);
  });

  it('sauvegarde un event et invalide le cache de la collection', async () => {
    const { result } = await renderReady();
    expect(result.current.isSaved('evt-a')).toBe(false);

    await act(async () => {
      await result.current.toggleSaved('evt-a');
    });

    expect(mockFollowEvent).toHaveBeenCalledWith('evt-a');
    expect(result.current.isSaved('evt-a')).toBe(true);
    // Sans invalidation, « Tes Sauvegardes » afficherait encore une collection
    // vide pendant tout le TTL.
    expect(mockInvalidate).toHaveBeenCalledWith(followingCacheKey('u1'));
  });

  it('retire un event deja sauvegarde', async () => {
    mockGetFollowingEvents.mockResolvedValue({
      data: { results: [{ event_details: { id: 'evt-a' } }] },
    });
    const { result } = await renderReady();

    await act(async () => {
      await result.current.toggleSaved('evt-a');
    });

    expect(mockUnfollowEvent).toHaveBeenCalledWith('evt-a');
    expect(result.current.isSaved('evt-a')).toBe(false);
  });

  it('rollback si l\'appel API echoue', async () => {
    mockFollowEvent.mockRejectedValue(new Error('network'));
    const { result } = await renderReady();

    let outcome: boolean | null = true;
    await act(async () => {
      outcome = await result.current.toggleSaved('evt-a');
    });

    expect(outcome).toBeNull();
    expect(result.current.isSaved('evt-a')).toBe(false);
  });

  it('ne tente rien quand l\'utilisateur n\'est pas connecte', async () => {
    mockAuthState = { user: null as any, isAuthenticated: false };
    const { result } = await renderReady();

    let outcome: boolean | null = true;
    await act(async () => {
      outcome = await result.current.toggleSaved('evt-a');
    });

    expect(outcome).toBeNull();
    expect(mockFollowEvent).not.toHaveBeenCalled();
    expect(mockGetFollowingEvents).not.toHaveBeenCalled();
  });

  it('reste utilisable si le chargement initial echoue', async () => {
    mockGetFollowingEvents.mockRejectedValue(new Error('offline'));
    const { result } = await renderReady();
    expect(result.current.isSaved('evt-a')).toBe(false);

    await act(async () => {
      await result.current.toggleSaved('evt-a');
    });
    expect(result.current.isSaved('evt-a')).toBe(true);
  });
});
