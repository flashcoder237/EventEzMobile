// ============================================
// Persistance de l'état de navigation
// ============================================
//
// React Navigation ne persiste pas l'état entre les lancements à froid par
// défaut. Conséquence : si l'OS tue l'app pendant que l'utilisateur est sur
// un écran profond (ex: Payment), au relancement il atterrit sur Home et perd
// son contexte.
//
// On sauvegarde l'état dans AsyncStorage à chaque navigation, et on le
// restaure au boot. Trois garde-fous pour éviter une UX étrange :
//
// 1. **TTL** — on n'autorise pas la restauration au-delà de RESTORE_TTL_MS.
//    Reprendre PaymentScreen 24h plus tard n'a aucun sens (le prix peut avoir
//    changé, l'event peut avoir commencé). 30 minutes est un compromis : on
//    couvre le cas "OS a killé l'app pendant un appel téléphonique" sans
//    restaurer un état dépassé.
//
// 2. **Blacklist** — certains écrans ne doivent JAMAIS être restaurés :
//    - Auth flow (Login, Register…) : moralement modal, restaurer ferait
//      peur à l'utilisateur ("pourquoi je vois Login ?")
//    - Caméra (Scan, QRScanner) : permission single-shot, l'écran sans
//      contexte n'a pas de sens
//    - Terminaux (PaymentSuccess, PaymentFailed) : si l'app a été tuée à
//      ce stade, le paiement est déjà résolu — restaurer rouvrirait un
//      écran "succès" hors de propos
//    - Maintenance : géré par MaintenanceGate, pas par le stack
//
//    Si le top du stack est blacklisté → on jette TOUT l'état (on ne tente
//    pas un filter partiel qui pourrait laisser une stack incohérente).
//
// 3. **Deep links priorité** — si l'app est ouverte via un deep link, React
//    Navigation utilise `linking.getInitialURL` qui prend le pas sur
//    `initialState`. Pas de conflit à gérer côté nous.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationState, PartialState } from '@react-navigation/native';

const PERSISTENCE_KEY = '@eventez_nav_state_v1';
const PERSISTENCE_TIMESTAMP_KEY = '@eventez_nav_state_ts_v1';

/** Au-delà de ce délai, on ne restaure pas — l'état est considéré stale. */
const RESTORE_TTL_MS = 30 * 60 * 1000; // 30 min

/**
 * Routes qui ne doivent JAMAIS être restaurées au top du stack.
 * Si l'utilisateur était sur l'une d'elles au kill, on repart de zéro.
 */
const NEVER_RESTORE_TOP: ReadonlySet<string> = new Set([
  // Auth flow — ces écrans sont modaux et ont leur propre cycle
  'Login',
  'Register',
  'RegisterOrganizer',
  'ForgotPassword',
  'ResetPassword',
  'VerifyEmail',
  'VerifyEmailToken',
  // Caméra / scan — permission + hardware single-shot
  'Scan',
  'QRScanner',
  // Terminaux paiement — si l'app a été tuée ici, c'est déjà joué
  'PaymentSuccess',
  'PaymentFailed',
  // Maintenance — géré par MaintenanceGate
  'Maintenance',
]);

type AnyState = NavigationState | PartialState<NavigationState>;

/**
 * Renvoie le nom de la route au TOP du stack (la plus visible).
 * Pour un nested navigator, descend récursivement jusqu'à la route feuille.
 */
function getTopRouteName(state: AnyState | undefined): string | null {
  if (!state || !state.routes || state.routes.length === 0) return null;
  const idx = typeof state.index === 'number' ? state.index : state.routes.length - 1;
  const top = state.routes[idx];
  if (!top) return null;
  if (top.state) {
    const nested = getTopRouteName(top.state as AnyState);
    if (nested) return nested;
  }
  return top.name;
}

/**
 * Charge l'état persisté si :
 *  - il existe
 *  - il n'est pas plus vieux que RESTORE_TTL_MS
 *  - le top du stack n'est pas blacklisté
 *
 * Sinon renvoie undefined → React Navigation utilisera son état par défaut
 * (Main / MainTabNavigator).
 */
export async function loadNavigationState(): Promise<NavigationState | undefined> {
  try {
    const [rawState, rawTs] = await Promise.all([
      AsyncStorage.getItem(PERSISTENCE_KEY),
      AsyncStorage.getItem(PERSISTENCE_TIMESTAMP_KEY),
    ]);
    if (!rawState) return undefined;

    const ts = rawTs ? Number(rawTs) : 0;
    if (!Number.isFinite(ts) || Date.now() - ts > RESTORE_TTL_MS) {
      // Trop vieux — on nettoie et on repart à neuf
      await clearNavigationState();
      return undefined;
    }

    const state = JSON.parse(rawState) as NavigationState;
    const top = getTopRouteName(state);
    if (top && NEVER_RESTORE_TOP.has(top)) {
      // Écran blacklisté — on jette tout
      await clearNavigationState();
      return undefined;
    }

    return state;
  } catch (error) {
    if (__DEV__) console.warn('[navigationPersistence] load failed:', error);
    return undefined;
  }
}

/**
 * Sauvegarde l'état courant. Appelé depuis `onStateChange` du
 * NavigationContainer. Best-effort — un échec d'écriture n'est pas bloquant.
 */
export async function saveNavigationState(state: NavigationState | undefined): Promise<void> {
  try {
    if (!state) return;
    await Promise.all([
      AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state)),
      AsyncStorage.setItem(PERSISTENCE_TIMESTAMP_KEY, String(Date.now())),
    ]);
  } catch (error) {
    if (__DEV__) console.warn('[navigationPersistence] save failed:', error);
  }
}

/**
 * Supprime l'état persisté. Appelé sur logout (pour ne pas restaurer un
 * écran organizer si le prochain user est un autre compte) et quand on
 * détecte un état stale.
 */
export async function clearNavigationState(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(PERSISTENCE_KEY),
      AsyncStorage.removeItem(PERSISTENCE_TIMESTAMP_KEY),
    ]);
  } catch (error) {
    if (__DEV__) console.warn('[navigationPersistence] clear failed:', error);
  }
}
