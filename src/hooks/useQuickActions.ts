import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import i18n from '../i18n';
import { getTodayTicket, subscribeTodayTicket, TodayTicket } from '../lib/todayTicket';

export { setTodayTicket } from '../lib/todayTicket';
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

/** S2 — raccourci « Mon billet · {titre} », préfixe suivi de l'id d'inscription. */
const TODAY_TICKET_PREFIX = 'qa_ticket:';

function useTodayTicket(): TodayTicket | null {
  const [value, setValue] = useState<TodayTicket | null>(getTodayTicket());
  useEffect(() => subscribeTodayTicket(setValue), []);
  return value;
}

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
// Android : pictogrammes BLANCS → le plugin doit poser un fond coloré
// (`backgroundColor` dans app.json). Sans lui, le fond par défaut est blanc et
// les icônes étaient invisibles dans le menu de l'appui long.
// iOS : symboles système (SF Symbols), rendus dans la couleur du système.
const ICONS =
  Platform.OS === 'ios'
    ? ({
        discover: 'symbol:safari',
        tickets: 'symbol:ticket',
        scan: 'symbol:qrcode.viewfinder',
      } as const)
    : ({
        discover: 'shortcut_discover',
        tickets: 'shortcut_tickets',
        scan: 'shortcut_scan',
      } as const);

function routeForAction(id: string): void {
  if (!navigationRef.isReady()) return;
  // Navigation imbriquée (tab) → cast car `Main` n'est pas typé
  // NavigatorScreenParams dans RootStackParamList (même pattern que le reste
  // du code, cf. PaymentSuccessScreen).
  const nav = navigationRef as any;
  if (id.startsWith(TODAY_TICKET_PREFIX)) {
    const registrationId = id.slice(TODAY_TICKET_PREFIX.length);
    if (registrationId) nav.navigate('RegistrationDetails', { registrationId });
    return;
  }
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
  const today = useTodayTicket();

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
    if (isAuthenticated && today) {
      // Le jour J, le billet est le premier raccourci : QR à deux gestes.
      items.unshift({
        id: `${TODAY_TICKET_PREFIX}${today.registrationId}`,
        title: i18n.t('ticketClock.quickAction', { title: today.title, defaultValue: 'Mon billet · {{title}}' }),
        icon: ICONS.tickets,
      });
    }
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
  }, [isAuthenticated, user?.role, today]);

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
