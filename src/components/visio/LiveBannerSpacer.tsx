import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveRegistrations } from '../../contexts/LiveRegistrationsContext';

/**
 * Pousse le contenu (le RootNavigator) vers le BAS de la hauteur de la bannière
 * « En direct » quand elle est visible → aucun header d'écran n'est recouvert.
 *
 * ⚠️ Double safe-area évitée : la bannière est en `position:absolute; top:0` et
 * sa hauteur mesurée (bannerHeight) INCLUT déjà `insets.top` (elle peint la zone
 * du notch). Or les écrans en dessous ré-appliquent LEUR propre `insets.top`
 * (SafeAreaView / header). Pousser de `bannerHeight` complet compterait donc la
 * safe-area DEUX fois → un espace vide visible entre la bannière et le contenu.
 * On ne pousse que le CORPS de la bannière (hauteur - insets.top) ; la safe-area
 * du notch reste couverte par le padding propre de l'écran.
 */
export default function LiveBannerSpacer({ children }: { children: ReactNode }) {
  const { bannerHeight } = useLiveRegistrations();
  const insets = useSafeAreaInsets();
  const pad = bannerHeight > 0 ? Math.max(0, bannerHeight - insets.top) : 0;
  return <View style={{ flex: 1, paddingTop: pad }}>{children}</View>;
}
