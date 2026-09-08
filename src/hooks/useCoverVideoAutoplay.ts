import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Décide si la cover video d'un événement doit s'AUTO-LIRE (muette) sur mobile.
 *
 * Bonnes pratiques mobiles :
 *  - Data réduite / cellulaire coûteux : on n'autoplay PAS sur données mobiles
 *    quand l'OS signale un mode « économie de données » (Android
 *    `details.isConnectionExpensive`) — on affiche poster + play. La data coûte
 *    cher (marché africain notamment).
 *  - « Réduire les animations » (accessibilité) : un utilisateur qui a activé
 *    ce réglage ne veut pas d'autoplay → poster statique.
 *
 * Le WIFI autoplay librement. En cellulaire NON coûteux, on autorise aussi
 * (téléaser court) ; on ne bloque qu'en data explicitement économe.
 *
 * Retourne `allowAutoplay` : à combiner avec la visibilité (pause au scroll) et
 * l'état « lecteur plein écran ouvert » côté composant.
 */
export function useCoverVideoAutoplay(): { allowAutoplay: boolean; ready: boolean } {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Accessibilité : réduire les animations.
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (mounted) setReduceMotion(!!v); })
      .catch(() => {});
    const a11ySub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => {
      if (mounted) setReduceMotion(!!v);
    });

    // Réseau : autoplay coupé en data mobile explicitement économe.
    const unsub = NetInfo.addEventListener(state => {
      if (!mounted) return;
      const expensive = (state as any)?.details?.isConnectionExpensive === true;
      const isCellular = state.type === 'cellular';
      setDataSaver(isCellular && expensive);
      setReady(true);
    });
    // Premier fetch (l'event listener peut tarder au montage).
    NetInfo.fetch()
      .then(state => {
        if (!mounted) return;
        const expensive = (state as any)?.details?.isConnectionExpensive === true;
        const isCellular = state.type === 'cellular';
        setDataSaver(isCellular && expensive);
        setReady(true);
      })
      .catch(() => { if (mounted) setReady(true); });

    return () => {
      mounted = false;
      a11ySub?.remove?.();
      unsub?.();
    };
  }, []);

  return { allowAutoplay: !reduceMotion && !dataSaver, ready };
}
