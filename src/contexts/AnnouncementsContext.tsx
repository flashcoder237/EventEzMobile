// ============================================
// AnnouncementsContext — fetch + dédoublonnage des annonces broadcast
// ============================================
//
// Contrat :
// - Fetch /api/announcements/active/ au boot (et sur retour foreground).
// - Le backend filtre déjà par audience / version / plateforme via les
//   headers X-App-* envoyés par l'intercepteur axios — pas de logique de
//   ciblage côté client.
// - Mémorise localement les IDs d'annonces déjà fermées (AsyncStorage), pour
//   ne pas re-saouler le user à chaque cold start. Une annonce non-dismissible
//   reste visible tant qu'elle est dans sa fenêtre de validité.
// - Expose `next` : la première annonce non-vue à afficher, et `dismiss(id)`
//   pour la marquer comme consommée.
//
// Pas de logique d'affichage ici — c'est le job d'<AnnouncementsModal> qui
// observe `next` et le rend dans un modal.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { announcementsAPI } from '../api';
import type { Announcement } from '../types';

const DISMISSED_KEY = '@eventez_announcements_dismissed_v1';
// Cap pour éviter que la liste ne grandisse indéfiniment dans AsyncStorage.
// Une annonce supprimée côté backend disparait des résultats /active/ donc
// son ID dans la liste devient inutile. On garde les 200 dernières.
const DISMISSED_MAX = 200;

interface AnnouncementsContextValue {
  /** Toutes les annonces actives renvoyées par le backend. */
  active: Announcement[];
  /** Première annonce non-vue (ou non-dismissible) à afficher. `null` si rien à montrer. */
  next: Announcement | null;
  loading: boolean;
  refresh: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const AnnouncementsContext = createContext<AnnouncementsContextValue | undefined>(undefined);

async function loadDismissed(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function saveDismissed(ids: Set<string>): Promise<void> {
  try {
    // Cap : on garde les `DISMISSED_MAX` derniers IDs (ordre d'insertion préservé par Set).
    const arr = Array.from(ids).slice(-DISMISSED_MAX);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch {
    // best-effort
  }
}

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  // Fix memory leak : ref `active` (au sens "encore monte") consultee par
  // refresh() avant chaque setState. Permet a la Promise.all de s'achever
  // sans declencher de setState sur un Provider demonte.
  const activeRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [dismissedSet, res] = await Promise.all([
        loadDismissed(),
        announcementsAPI.getActive(),
      ]);
      // Fix memory leak : abandonner les setState si on a unmount pendant
      // l'attente de la Promise.all.
      if (!activeRef.current) return;
      const data = (res.data?.results ?? res.data ?? []) as Announcement[];
      setDismissed(dismissedSet);
      setActive(Array.isArray(data) ? data : []);
    } catch (error) {
      // 404 (backend pas encore déployé), 503, etc. — on dégrade silencieusement.
      // Une annonce ratée n'est pas une raison de bloquer l'UX.
      if (__DEV__) console.warn('[Announcements] fetch failed:', error);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fix memory leak : reset du flag activeRef au mount + cleanup au unmount.
    // Couvre les cas ou le Provider est demonte pendant un fetch en vol.
    activeRef.current = true;
    refresh();
    return () => {
      activeRef.current = false;
    };
  }, [refresh]);

  // Refresh au retour foreground (l'utilisateur peut avoir laissé l'app
  // ouverte plusieurs heures avant de revenir — récupérer les annonces les
  // plus récentes a du sens).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refresh();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refresh]);

  const dismiss = useCallback(async (id: string) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(id);
      // Persistance asynchrone — pas besoin d'attendre.
      void saveDismissed(nextSet);
      return nextSet;
    });
  }, []);

  /**
   * `next` = première annonce affichable selon ces règles :
   *  - non-dismissible → toujours visible (même si l'ID est dans `dismissed`,
   *    cas rare où on a basculé un is_dismissible=true → false côté admin)
   *  - dismissible → visible seulement si jamais fermée localement
   *
   * On prend la plus récente en premier (l'API renvoie déjà ordonné DESC).
   */
  const next = useMemo<Announcement | null>(() => {
    for (const a of active) {
      if (!a.is_dismissible) return a;
      if (!dismissed.has(a.id)) return a;
    }
    return null;
  }, [active, dismissed]);

  const value = useMemo<AnnouncementsContextValue>(
    () => ({ active, next, loading, refresh, dismiss }),
    [active, next, loading, refresh, dismiss],
  );

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements(): AnnouncementsContextValue {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) throw new Error('useAnnouncements must be used within AnnouncementsProvider');
  return ctx;
}
