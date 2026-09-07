import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useLiveRegistrations } from '../../contexts/LiveRegistrationsContext';

/**
 * Pousse le contenu (le RootNavigator) vers le BAS de la hauteur de la bannière
 * « En direct » quand elle est visible → aucun header d'écran n'est recouvert.
 * La bannière reporte sa hauteur via setBannerHeight ; on l'applique ici en
 * paddingTop. 0 quand pas de direct / bannière désactivée.
 */
export default function LiveBannerSpacer({ children }: { children: ReactNode }) {
  const { bannerHeight } = useLiveRegistrations();
  return <View style={{ flex: 1, paddingTop: bannerHeight }}>{children}</View>;
}
