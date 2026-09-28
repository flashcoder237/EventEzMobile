/**
 * CurrentRouteContext — expose le nom de la route active.
 *
 * Pourquoi pas `useNavigationState` ?
 * → Ce hook throw "Couldn't find a navigation context" si le composant se
 *   monte AVANT que le NavigationContainer ait fini son init (cas typique
 *   des banners globaux rendus en sibling de RootNavigator).
 *
 * Pourquoi un mini-store externe plutôt qu'un useState dans App.tsx ?
 * → PERF : la route change à CHAQUE navigation. Un useState dans AppContent
 *   re-rendait tout l'arbre de providers (Auth, Notification, Alert, Status,
 *   Visio…) à chaque écran poussé. Ici, seul le composant qui lit la route
 *   (IncidentBanner via `useCurrentRoute`) se re-rend — via
 *   useSyncExternalStore, sans dépendance à l'état interne de react-navigation.
 *
 * Usage :
 *   - App.tsx appelle `setCurrentRoute(name)` depuis
 *     NavigationContainer.onReady / onStateChange.
 *   - Les consommateurs (IncidentBanner, etc.) appellent `useCurrentRoute()`.
 *   - `CurrentRouteProvider` est conservé (pass-through) pour compatibilité.
 */

import React, { ReactNode, useSyncExternalStore } from 'react';

let currentRoute: string | undefined;
const listeners = new Set<() => void>();

/** Met à jour la route active (no-op si inchangée). */
export function setCurrentRoute(routeName: string | undefined): void {
  if (routeName === currentRoute) return;
  currentRoute = routeName;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | undefined {
  return currentRoute;
}

interface CurrentRouteProviderProps {
  children: ReactNode;
}

/** Pass-through conservé pour compatibilité — l'état vit dans le store module. */
export function CurrentRouteProvider({ children }: CurrentRouteProviderProps) {
  return <>{children}</>;
}

/**
 * Lit la route active. Retourne undefined avant que NavigationContainer ait
 * appelé son onReady. Toujours safe.
 */
export function useCurrentRoute(): string | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
