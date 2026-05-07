/**
 * CurrentRouteContext — expose le nom de la route active.
 *
 * Pourquoi pas `useNavigationState` ?
 * → Ce hook throw "Couldn't find a navigation context" si le composant se
 *   monte AVANT que le NavigationContainer ait fini son init (cas typique
 *   des banners globaux rendus en sibling de RootNavigator).
 * → Avec ce context, on lit la route via un useState normal — aucune
 *   dépendance à l'état interne de react-navigation.
 *
 * Usage :
 *   - Le parent (App.tsx) gère un useState pour la route courante,
 *     l'alimente via NavigationContainer.onStateChange, et passe la valeur
 *     directement au provider.
 *   - Les consommateurs (IncidentBanner, etc.) appellent `useCurrentRoute()`.
 */

import React, { createContext, useContext, ReactNode } from 'react';

const CurrentRouteContext = createContext<string | undefined>(undefined);

interface CurrentRouteProviderProps {
  routeName: string | undefined;
  children: ReactNode;
}

export function CurrentRouteProvider({ routeName, children }: CurrentRouteProviderProps) {
  return (
    <CurrentRouteContext.Provider value={routeName}>{children}</CurrentRouteContext.Provider>
  );
}

/**
 * Lit la route active. Retourne undefined avant que NavigationContainer ait
 * appelé son onReady ou si le provider n'est pas monté. Toujours safe.
 */
export function useCurrentRoute(): string | undefined {
  return useContext(CurrentRouteContext);
}
