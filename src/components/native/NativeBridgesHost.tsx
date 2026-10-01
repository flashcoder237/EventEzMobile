/**
 * NativeBridgesHost — point de montage UNIQUE du lot natif (round 3).
 * Ne rend rien ; branché une fois dans RootNavigator (dans le
 * NavigationContainer, pour lire la route courante).
 *
 *  - X3/X11/X1 : widget, tuile Réglages rapides et Live Activity participant,
 *    alimentés par le cache « Mes billets » ; tout est effacé à la déconnexion ;
 *  - X14 : ferme la Live Activity organisateur après la fin de l'événement ;
 *  - X13 : Handoff des pages publiques (fiche événement, organisateur, intervenant) ;
 *  - X12 : liens EventEz reçus par « Partager » (Android) ;
 *  - X8  : langue choisie dans les réglages système ;
 *  - H3  : canaux de notification à son dédié.
 *
 * Sans module natif (Expo Go, tests), chaque branche est un no-op.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useInAppToast } from '../../contexts/InAppToastContext';
import { navigationRef } from '../../navigation/navigationRef';
import CacheService from '../../services/CacheService';
import { registrationsAPI, usersAPI } from '../../api';
import { primeSensoryPrefs } from '../../lib/sensoryPrefs';
import { clearHandoff, setHandoff } from '../../../modules/eventez-native/src';
import { registerNativeStrings, tn } from '../../lib/native/i18n';
import { clearTicketSurfaces, syncTicketSurfaces } from '../../lib/native/ticketSurfaces';
import { endExpiredOrganizerActivity } from '../../lib/native/organizerActivity';
import { handoffUrlForRoute } from '../../lib/native/handoff';
import { listenToShareIntents } from '../../lib/native/shareIntent';
import { syncSystemLanguage } from '../../lib/native/systemLanguage';
import { ensureSoundChannels } from '../../lib/native/notificationChannels';

const REFRESH_MS = 5 * 60 * 1000;
let fetchedThisSession = false;

async function loadMyTickets(userId: string | number): Promise<any[] | null> {
  const key = `my-tickets:${userId}`;
  const cached = await CacheService.get<any[]>(key);
  if (cached?.data && (!cached.isStale || fetchedThisSession)) return cached.data;
  if (fetchedThisSession) return cached?.data ?? null;
  fetchedThisSession = true;
  try {
    const res = await registrationsAPI.getMyRegistrations();
    const data = res.data?.results || res.data || [];
    CacheService.set(key, data, 2 * 60 * 1000);
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

export default function NativeBridgesHost() {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useInAppToast();
  const userId = isAuthenticated ? user?.id : null;
  const hadUser = useRef(false);

  // Démarrage : chaînes, préférences sensorielles, canaux sonores, partage.
  useEffect(() => {
    registerNativeStrings();
    void primeSensoryPrefs();
    void ensureSoundChannels();
    return listenToShareIntents(() =>
      showToast({ title: tn('share.notEventez'), icon: 'info', anchor: 'bottom' }),
    );
  }, [showToast]);

  // Billet → widget / tuile / Live Activity ; effacés à la déconnexion.
  useEffect(() => {
    if (isInitializing) return;
    if (!userId) {
      if (hadUser.current || !isAuthenticated) void clearTicketSurfaces();
      hadUser.current = false;
      fetchedThisSession = false;
      return;
    }
    hadUser.current = true;
    let alive = true;
    const refresh = async () => {
      const regs = await loadMyTickets(userId);
      if (alive && regs) await syncTicketSurfaces(regs);
      void endExpiredOrganizerActivity();
    };
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, REFRESH_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [userId, isAuthenticated, isInitializing]);

  // Langue choisie dans les réglages système (au démarrage et au retour).
  useEffect(() => {
    const onChanged = (lang: 'fr' | 'en') => {
      // Contenus localisés par le backend (catégories…) : purge comme Paramètres.
      void CacheService.clearAll();
      if (isAuthenticated) usersAPI.updateLanguage(lang).catch(() => {});
    };
    void syncSystemLanguage(onChanged);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncSystemLanguage(onChanged);
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // Handoff : publie l'URL web de la page publique affichée.
  useEffect(() => {
    let lastUrl: string | null = null;
    const update = () => {
      const url = navigationRef.isReady() ? handoffUrlForRoute(navigationRef.getCurrentRoute() as any) : null;
      if (url === lastUrl) return;
      lastUrl = url;
      if (url) setHandoff(url);
      else clearHandoff();
    };
    update();
    const unsubscribe = navigationRef.addListener('state', update);
    return () => {
      unsubscribe();
      clearHandoff();
    };
  }, []);

  return null;
}
