import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';

const TAG = 'ticket-qr';

/**
 * Luminosité partagée entre TOUS les écrans billet (détail d'inscription →
 * écran QR s'enchaînent) : on mémorise la luminosité d'origine une seule fois
 * quand le premier écran billet prend le focus, et on la rend quand le
 * dernier le perd.
 *
 * Avant : chaque écran lisait puis « restaurait » sa propre valeur.
 *  - Android : réappliquer un NOMBRE fige la luminosité de la fenêtre et coupe
 *    la luminosité adaptative pour toute l'app. Il faut rendre la main au
 *    système (`restoreSystemBrightnessAsync`).
 *  - En passant d'un écran billet à l'autre, le second lisait « 1 » (le max
 *    posé par le premier) comme valeur d'origine → luminosité bloquée au max.
 *  - Quitter l'écran avant la fin de la lecture asynchrone → rien n'était
 *    restauré.
 */
let holders = 0;
let originalBrightness: number | null = null;
let pendingRelease: ReturnType<typeof setTimeout> | null = null;
// Vrai tant que la luminosité est forcée au max (et pas encore rendue).
let forced = false;
// Laisse le temps à l'écran suivant de prendre le focus (blur → focus) sans
// faire clignoter la luminosité.
const RELEASE_DELAY_MS = 250;

async function acquireBrightness() {
  if (pendingRelease) {
    clearTimeout(pendingRelease);
    pendingRelease = null;
  }
  holders += 1;
  // Déjà au max (autre écran billet, ou relais blur → focus) : surtout ne pas
  // relire la luminosité, qui vaudrait 1 et deviendrait la « valeur d'origine ».
  if (forced) return;
  forced = true;
  try {
    if (Platform.OS === 'ios') {
      // iOS : la luminosité est celle du système ; on la rendra à l'identique.
      originalBrightness = await Brightness.getBrightnessAsync();
    }
    if (holders > 0) await Brightness.setBrightnessAsync(1);
  } catch {
    /* brightness indisponible → on ignore */
  }
}

function releaseBrightness() {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;
  if (pendingRelease) clearTimeout(pendingRelease);
  pendingRelease = setTimeout(() => {
    pendingRelease = null;
    if (holders > 0) return;
    if (Platform.OS === 'android') {
      // Rend la main au système : la luminosité adaptative reprend.
      Brightness.restoreSystemBrightnessAsync?.().catch(() => {});
    } else if (originalBrightness != null) {
      Brightness.setBrightnessAsync(originalBrightness).catch(() => {});
    }
    originalBrightness = null;
    forced = false;
  }, RELEASE_DELAY_MS);
}

/**
 * À appeler sur tout écran qui affiche un QR de billet scannable :
 *  - **luminosité poussée au max** → le portique lit le code instantanément ;
 *  - **écran maintenu éveillé** → pas d'extinction pendant qu'on présente le billet ;
 *  - **capture d'écran bloquée** (anti-fraude).
 *
 * Tout est rendu à la sortie de l'écran (blur/unmount), y compris la luminosité
 * ADAPTATIVE du système sur Android. No-op silencieux si un module est
 * indisponible (Expo Go, vieux device).
 */
export function useTicketDisplayGuard(): void {
  useFocusEffect(
    useCallback(() => {
      acquireBrightness();
      activateKeepAwakeAsync(TAG).catch(() => {});
      preventScreenCaptureAsync(TAG).catch(() => {});

      return () => {
        releaseBrightness();
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

/** Tests uniquement. */
export function __resetTicketBrightness() {
  holders = 0;
  originalBrightness = null;
  forced = false;
  if (pendingRelease) clearTimeout(pendingRelease);
  pendingRelease = null;
}
