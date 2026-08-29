import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { enterPip, isPipSupported } from '../../modules/eventez-pip/src';

/**
 * Passe l'écran courant en Picture-in-Picture (Android) quand l'app part en
 * arrière-plan alors que `active` est vrai. Pensé pour l'écran de visio : si
 * l'utilisateur appuie sur home / change d'app pendant l'appel, la vidéo se
 * réduit en fenêtre flottante au lieu de se figer.
 *
 * No-op sur iOS et sur les appareils sans PiP.
 *
 * @param active — n'armer le PiP que quand une visio est réellement en cours.
 */
export function usePictureInPicture(active: boolean) {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!isPipSupported()) return;

    const onChange = (state: AppStateStatus) => {
      // `inactive`/`background` = l'utilisateur quitte l'écran → PiP si visio active.
      if ((state === 'inactive' || state === 'background') && activeRef.current) {
        enterPip();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
