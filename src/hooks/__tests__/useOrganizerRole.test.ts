/**
 * Qui voit l'onglet « Organiser » ?
 *
 * Le point central : `user.role` vaut `'user'` pour un bénévole, un
 * contrôleur d'accès ou un caissier. Toute la navigation reposait dessus, si
 * bien que la personne chargée de scanner à l'entrée n'avait aucun chemin
 * évident vers le scanner. Ce hook rattache `EventStaff` à la décision.
 */
const mockGetMyTeamEvents = jest.fn();
let mockAuth: { user: { role?: string } | null; isAuthenticated: boolean } = {
  user: null,
  isAuthenticated: false,
};

jest.mock('../../api', () => ({
  eventTeamAPI: {
    getMyTeamEvents: (...args: unknown[]) => mockGetMyTeamEvents(...args),
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useOrganizerRole } from '../useOrganizerRole';

describe('useOrganizerRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMyTeamEvents.mockResolvedValue({ data: [] });
    mockAuth = { user: null, isAuthenticated: false };
  });

  describe('propriétaire', () => {
    it("reconnaît l'organisateur sans interroger le réseau", async () => {
      mockAuth = { user: { role: 'organizer' }, isAuthenticated: true };
      const { result } = renderHook(() => useOrganizerRole());

      await waitFor(() => expect(result.current.isResolving).toBe(false));
      expect(result.current.isOrganizer).toBe(true);
      expect(result.current.hasOrganizerWork).toBe(true);
      // La réponse est déjà connue : pas d'appel inutile au démarrage.
      expect(mockGetMyTeamEvents).not.toHaveBeenCalled();
    });
  });

  describe('membre d\'équipe — le cas que la navigation ignorait', () => {
    it("accorde l'accès organisateur à un 'user' qui staffe un événement", async () => {
      mockAuth = { user: { role: 'user' }, isAuthenticated: true };
      mockGetMyTeamEvents.mockResolvedValue({
        data: [{ event: { id: 'e1' }, role: 'checkin_agent' }],
      });

      const { result } = renderHook(() => useOrganizerRole());

      await waitFor(() => expect(result.current.isStaff).toBe(true));
      expect(result.current.isOrganizer).toBe(false);
      expect(result.current.hasOrganizerWork).toBe(true);
      expect(result.current.staffEventCount).toBe(1);
    });

    it('accepte une réponse paginée', async () => {
      mockAuth = { user: { role: 'user' }, isAuthenticated: true };
      mockGetMyTeamEvents.mockResolvedValue({
        data: { results: [{ event: { id: 'e1' } }, { event: { id: 'e2' } }] },
      });

      const { result } = renderHook(() => useOrganizerRole());

      await waitFor(() => expect(result.current.staffEventCount).toBe(2));
      expect(result.current.hasOrganizerWork).toBe(true);
    });

    it("ne donne rien à un 'user' sans aucun événement staffé", async () => {
      mockAuth = { user: { role: 'user' }, isAuthenticated: true };
      mockGetMyTeamEvents.mockResolvedValue({ data: [] });

      const { result } = renderHook(() => useOrganizerRole());

      await waitFor(() => expect(result.current.isResolving).toBe(false));
      expect(result.current.hasOrganizerWork).toBe(false);
    });
  });

  describe('dégradation', () => {
    it("retombe sur « pas staff » si le réseau échoue", async () => {
      // Un onglet manquant est récupérable (Profil garde tous les accès) ;
      // un onglet affiché à tort mènerait vers des écrans en 403.
      mockAuth = { user: { role: 'user' }, isAuthenticated: true };
      mockGetMyTeamEvents.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useOrganizerRole());

      await waitFor(() => expect(result.current.isResolving).toBe(false));
      expect(result.current.hasOrganizerWork).toBe(false);
    });

    it("n'interroge pas le réseau pour un visiteur anonyme", async () => {
      mockAuth = { user: null, isAuthenticated: false };
      const { result } = renderHook(() => useOrganizerRole());

      await waitFor(() => expect(result.current.isResolving).toBe(false));
      expect(mockGetMyTeamEvents).not.toHaveBeenCalled();
      expect(result.current.hasOrganizerWork).toBe(false);
    });
  });
});
