import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';

const TAG = 'ticket-qr';

/**
 * À appeler sur tout écran qui affiche un QR de billet scannable :
 *  - **luminosité poussée au max** → le portique lit le code instantanément,
 *    plus besoin de monter la luminosité à la main sous le soleil ;
 *  - **écran maintenu éveillé** → pas d'extinction pendant qu'on présente le billet ;
 *  - **capture d'écran bloquée** (anti-fraude) → pas de screenshot/partage d'un
 *    billet valide.
 *
 * Tout est restauré à la sortie de l'écran (blur/unmount). Focus-aware via
 * useFocusEffect : si l'écran reste monté mais perd le focus, on restaure aussi.
 * No-op silencieux si un module est indisponible (Expo Go, vieux device).
 */
export function useTicketDisplayGuard(): void {
  useFocusEffect(
    useCallback(() => {
      let previousBrightness: number | null = null;
      let cancelled = false;

      (async () => {
        try {
          previousBrightness = await Brightness.getBrightnessAsync();
          if (!cancelled) await Brightness.setBrightnessAsync(1);
        } catch {
          /* brightness indisponible → on ignore */
        }
      })();

      activateKeepAwakeAsync(TAG).catch(() => {});
      preventScreenCaptureAsync(TAG).catch(() => {});

      return () => {
        cancelled = true;
        if (previousBrightness != null) {
          Brightness.setBrightnessAsync(previousBrightness).catch(() => {});
        }
        try {
          deactivateKeepAwake(TAG);
        } catch {
          /* no-op */
        }
        allowScreenCaptureAsync(TAG).catch(() => {});
      };
    }, []),
  );
}
