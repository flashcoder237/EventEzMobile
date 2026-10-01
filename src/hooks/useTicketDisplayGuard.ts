import React, { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';
import { usePhonePosture, PostureHandlers } from '../components/ui/motion/usePhonePosture';
import { useAppActive } from '../components/ui/motion/useMotionGate';
import haptics from '../utils/haptics';

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
// Vrai tant que la luminosité est rendue TEMPORAIREMENT au système (téléphone
// posé face contre table, G4) alors qu'un écran billet est toujours affiché.
let suspended = false;
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
    if (holders > 0 && !suspended) await Brightness.setBrightnessAsync(1);
  } catch {
    /* brightness indisponible → on ignore */
  }
}

function giveBackToSystem() {
  if (Platform.OS === 'android') {
    // Rend la main au système : la luminosité adaptative reprend.
    Brightness.restoreSystemBrightnessAsync?.().catch(() => {});
  } else if (originalBrightness != null) {
    Brightness.setBrightnessAsync(originalBrightness).catch(() => {});
  }
}

/**
 * Suspend la luminosité max SANS quitter l'écran billet (téléphone retourné) :
 * la luminosité revient au système, l'écran peut de nouveau s'éteindre.
 * Le compteur partagé n'est pas touché. Renvoie true si quelque chose a changé.
 */
export function suspendTicketBrightness(): boolean {
  if (holders === 0 || suspended) return false;
  suspended = true;
  if (forced) giveBackToSystem();
  try {
    deactivateKeepAwake(TAG);
  } catch {
    /* no-op */
  }
  return true;
}

/** Reprend la luminosité max (et l'écran éveillé) après `suspendTicketBrightness`. */
export function resumeTicketBrightness(): boolean {
  if (!suspended) return false;
  suspended = false;
  if (holders === 0) return false;
  forced = true;
  Brightness.setBrightnessAsync(1).catch(() => {});
  activateKeepAwakeAsync(TAG).catch(() => {});
  return true;
}

/**
 * G11 — mode briquet : luminosité max via le MÊME compteur que les billets
 * (jamais deux écrans qui se marchent dessus). Renvoie la fonction qui rend.
 */
export function holdMaxBrightness(): () => void {
  acquireBrightness();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseBrightness();
  };
}

export function isTicketBrightnessSuspended(): boolean {
  return suspended;
}

function releaseBrightness() {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;
  if (pendingRelease) clearTimeout(pendingRelease);
  pendingRelease = setTimeout(() => {
    pendingRelease = null;
    if (holders > 0) return;
    giveBackToSystem();
    originalBrightness = null;
    forced = false;
    suspended = false;
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
export function useTicketDisplayGuard(
  options: {
    /** G4 actif (défaut). */
    faceDown?: boolean;
    /** Autres gestes de l'écran, servis par le MÊME pont capteurs. */
    posture?: PostureHandlers;
  } = {},
): TicketDisplayGuard {
  useFocusEffect(
    useCallback(() => {
      acquireBrightness();
      if (!suspended) activateKeepAwakeAsync(TAG).catch(() => {});
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

  // G4 — téléphone posé face contre table : on rend la luminosité au système
  // et on laisse l'écran s'éteindre ; retourné, le billet revient au max.
  const suspend = useCallback(() => {
    suspendTicketBrightness();
  }, []);
  const resume = useCallback(() => {
    if (resumeTicketBrightness()) haptics.selection();
  }, []);
  // Écran éteint pendant la suspension (téléphone retourné) : l'app passe en
  // arrière-plan, le pont capteurs est démonté et ne verra jamais « faceUp ».
  // Revenir dans l'app = le téléphone a été repris → luminosité max.
  const appActive = useAppActive();
  useEffect(() => {
    if (appActive && isTicketBrightnessSuspended()) resume();
  }, [appActive, resume]);
  const { sensorElement } = usePhonePosture(
    options.faceDown === false
      ? { ...options.posture }
      : { ...options.posture, faceDown: suspend, faceUp: resume },
  );
  return { sensorElement, suspend, resume };
}

export interface TicketDisplayGuard {
  /** Pont capteurs (G4) à rendre dans l'écran ; null quand inactif. */
  sensorElement: React.ReactElement | null;
  suspend: () => void;
  resume: () => void;
}

/** Tests uniquement. */
export function __resetTicketBrightness() {
  holders = 0;
  originalBrightness = null;
  forced = false;
  suspended = false;
  if (pendingRelease) clearTimeout(pendingRelease);
  pendingRelease = null;
}
