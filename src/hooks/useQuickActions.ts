import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { navigationRef } from '../navigation/navigationRef';
import { useAuth } from '../contexts/AuthContext';

/**
 * Raccourcis long-press sur l'icône de l'app (iOS Home Screen Quick Actions /
 * Android App Shortcuts).
 *
 * - Role-aware : "Scanner un billet" n'apparaît que pour organisateur / staff.
 * - Route via `navigationRef` (fonctionne même app fermée : cf. `initial`).
 * - No-op silencieux si non supporté (vieux Android) — setItems rejette, on
 *   avale l'erreur.
 */

const IDS = {
  discover: 'qa_discover',
  tickets: 'qa_tickets',
  scan: 'qa_scan',
} as const;

/**
 * Icônes des raccourcis.
 *
 * Sans `icon`, Android affiche un CARRÉ VIDE à gauche de chaque libellé —
 * c'était le cas jusqu'ici.
 *
 * Android : le nom doit correspondre à une clé `androidIcons` du plugin
 * `expo-quick-actions` (cf. app.json), qui génère la ressource drawable au
 * build. Les PNG sources sont blancs sur fond transparent, dessinés dans le
 * cercle sûr de 66/108 dp — hors de cette zone, le masque adaptatif rogne.
 *
 * iOS : accepte en plus les symboles système (`symbol:magnifyingglass`). On
 * garde les mêmes assets pour que les deux plateformes soient cohérentes.
 */
const ICONS = {
  discover: 'shortcut_discover',
  tickets: 'shortcut_tickets',
  scan: 'shortcut_scan',
} as const;

function routeForAction(id: string): void {
  if (!navigationRef.isReady()) return;
  // Navigation imbriquée (tab) → cast car `Main` n'est pas typé
  // NavigatorScreenParams dans RootStackParamList (même pattern que le reste
  // du code, cf. PaymentSuccessScreen).
  const nav = navigationRef as any;
  switch (id) {
    case IDS.discover:
      nav.navigate('Main', { screen: 'Discover' });
      break;
    case IDS.tickets:
      nav.navigate('Main', { screen: 'MyTickets' });
      break;
    case IDS.scan:
      nav.navigate('Scan');
      break;
  }
}

export function useQuickActions(): void {
  const { isAuthenticated, user } = useAuth();

  // (Re)définit la liste des raccourcis selon l'état d'auth / le rôle.
  useEffect(() => {
    const items: QuickActions.Action[] = [
      {
        id: IDS.discover,
        title: 'Découvrir',
        subtitle: 'Événements près de vous',
        icon: ICONS.discover,
      },
    ];
    if (isAuthenticated) {
      items.push({ id: IDS.tickets, title: 'Mes billets', icon: ICONS.tickets });
      const role = user?.role;
      if (role === 'organizer' || role === 'admin' || role === 'moderator') {
        items.push({ id: IDS.scan, title: 'Scanner un billet', icon: ICONS.scan });
      }
    }
    QuickActions.setItems(items).catch(() => {
      /* non supporté (vieux Android) → on ignore */
    });
  }, [isAuthenticated, user?.role]);

  // Cold start : l'app a été lancée via un raccourci. On laisse la navigation
  // se monter avant de router.
  useEffect(() => {
    const initial = QuickActions.initial;
    if (!initial?.id) return;
    const timer = setTimeout(() => routeForAction(initial.id), 500);
    return () => clearTimeout(timer);
  }, []);

  // Warm : raccourci activé pendant que l'app tourne.
  useEffect(() => {
    const sub = QuickActions.addListener((action) => {
      if (action?.id) routeForAction(action.id);
    });
    return () => sub.remove();
  }, []);
}
