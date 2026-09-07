import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registrationsAPI } from '../api/registrations';
import { virtualRoomsAPI } from '../api/content';
import { withJwt } from '../lib/utils/visioUrl';
import { useAuth } from './AuthContext';
import { useVisioCall } from './VisioCallContext';

const BANNER_PREF_KEY = 'live_banner_enabled';

/**
 * Source UNIQUE des « mes événements EN COURS maintenant » (GET /registrations/live/).
 *
 * Un seul poll partagé (60s + foreground) — sinon la bannière globale, les cartes
 * MyTickets et tout autre consommateur feraient chacun leur fetch (3× le trafic +
 * états divergents). Le provider fournit la DONNÉE BRUTE ; les décisions
 * d'affichage (ex. masquer la bannière si un appel est déjà en cours) restent
 * chez les consommateurs.
 */

export interface LiveReg {
  registration_id: string;
  event_id: string;
  event_slug?: string;
  event_title: string;
  is_online: boolean;
}

interface LiveRegistrationsContextValue {
  live: LiveReg[];
  /** true si un event donné (par id) est actuellement live. */
  isEventLive: (eventId: string) => boolean;
  refresh: () => void;
  /** Rejoindre un event live : visio si online (startCall), sinon navigation
   *  détail (le caller fournit `onNavigateDetail`). Gère le lock anti-double.
   *  Retourne un statut pour que le caller affiche un message adapté :
   *  'host_not_present' = la salle n'est pas encore ouverte par l'organisateur. */
  joinLive: (
    reg: LiveReg,
    onNavigateDetail: (eventIdOrSlug: string) => void,
  ) => Promise<'joined' | 'navigated' | 'host_not_present' | 'error'>;
  /** true pendant un join en cours (feedback bouton). */
  joiningId: string | null;
  /** Réglage utilisateur : afficher ou non la bannière « En direct » globale. */
  bannerEnabled: boolean;
  setBannerEnabled: (v: boolean) => void;
  /** Hauteur mesurée de la bannière (0 si masquée) — sert à POUSSER le contenu
   *  des écrans vers le bas au lieu de le recouvrir. Reportée par la bannière. */
  bannerHeight: number;
  setBannerHeight: (h: number) => void;
}

const LiveRegistrationsContext = createContext<LiveRegistrationsContextValue | undefined>(undefined);

const POLL_MS = 60_000;

export function LiveRegistrationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { startCall } = useVisioCall();
  const [live, setLive] = useState<LiveReg[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [bannerEnabled, setBannerEnabledState] = useState(true);
  const [bannerHeight, setBannerHeight] = useState(0);

  // Réglage persistant (défaut ON). Chargé au montage.
  useEffect(() => {
    AsyncStorage.getItem(BANNER_PREF_KEY)
      .then(v => { if (v === '0') setBannerEnabledState(false); })
      .catch(() => {});
  }, []);

  const setBannerEnabled = useCallback((v: boolean) => {
    setBannerEnabledState(v);
    AsyncStorage.setItem(BANNER_PREF_KEY, v ? '1' : '0').catch(() => {});
    if (!v) setBannerHeight(0); // masquée → ne pousse plus le contenu.
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setLive([]); return; }
    try {
      const res = await registrationsAPI.getMyLiveRegistrations();
      setLive(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silencieux — c'est un bonus, jamais bloquant.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refresh]);

  const isEventLive = useCallback(
    (eventId: string) => live.some(r => String(r.event_id) === String(eventId)),
    [live],
  );

  const joinLive = useCallback(async (
    reg: LiveReg,
    onNavigateDetail: (eventIdOrSlug: string) => void,
  ): Promise<'joined' | 'navigated' | 'host_not_present' | 'error'> => {
    const target = reg.event_slug || reg.event_id;
    // Présentiel : pas de visio → détail event.
    if (!reg.is_online) {
      onNavigateDetail(target);
      return 'navigated';
    }
    if (joiningId) return 'error';
    setJoiningId(reg.event_id);
    try {
      const res = await virtualRoomsAPI.eventJoin(reg.event_id);
      const data = res.data;
      if (!data?.url) {
        onNavigateDetail(target);
        return 'navigated';
      }
      const finalUrl = data.provider === 'jaas' && data.token ? withJwt(data.url, data.token) : data.url;
      startCall({
        url: finalUrl,
        roomId: data.room_id,
        title: reg.event_title,
        recordingNotice: data.recording_notice ?? null,
      });
      return 'joined';
    } catch (e: any) {
      // Salle pas encore ouverte par l'organisateur (garde-fou #16297) : on NE
      // navigue PAS vers le détail — on remonte le statut pour que le caller
      // affiche « le direct n'a pas encore démarré ». Sinon fallback détail.
      if (e?.response?.data?.code === 'host_not_present') {
        return 'host_not_present';
      }
      onNavigateDetail(target);
      return 'error';
    } finally {
      setJoiningId(null);
    }
  }, [joiningId, startCall]);

  return (
    <LiveRegistrationsContext.Provider value={{
      live, isEventLive, refresh, joinLive, joiningId,
      bannerEnabled, setBannerEnabled, bannerHeight, setBannerHeight,
    }}>
      {children}
    </LiveRegistrationsContext.Provider>
  );
}

// Défaut inerte : quand un composant est rendu HORS provider (ex. tests isolés,
// écran monté avant l'arbre de providers), on retourne un état vide non-throwant
// plutôt que de casser. La fonctionnalité live est un bonus, jamais critique.
const NOOP_VALUE: LiveRegistrationsContextValue = {
  live: [],
  isEventLive: () => false,
  refresh: () => {},
  joinLive: async () => 'error',
  joiningId: null,
  bannerEnabled: true,
  setBannerEnabled: () => {},
  bannerHeight: 0,
  setBannerHeight: () => {},
};

export function useLiveRegistrations(): LiveRegistrationsContextValue {
  return useContext(LiveRegistrationsContext) ?? NOOP_VALUE;
}
