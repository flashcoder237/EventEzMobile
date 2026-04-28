import { useEffect, useState, useCallback } from 'react';
import soundService, { SoundKey } from '../services/soundService';

/**
 * Hook React pour jouer un effet sonore et lire/modifier la preference utilisateur.
 *
 * Usage :
 *   const { play, enabled, setEnabled } = useSoundEffect();
 *   play('payment-success');
 */
export function useSoundEffect() {
  const [enabled, setEnabledState] = useState(soundService.isEnabled());

  useEffect(() => {
    // S'assure que le service est pret + synchronise l'etat local avec la pref persistee
    let cancelled = false;
    soundService.initialize().then(() => {
      if (!cancelled) setEnabledState(soundService.isEnabled());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const play = useCallback((key: SoundKey) => {
    void soundService.play(key);
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    await soundService.setEnabled(value);
    setEnabledState(value);
  }, []);

  return { play, enabled, setEnabled };
}
