/**
 * useCheckinVoice — annonce vocale du résultat de check-in.
 *
 * Expose la préférence (opt-in, persistée) et une fonction d'annonce qui met
 * en phrase un résultat de scan. La composition de la phrase vit ici, et non
 * dans l'écran, pour être testable sans monter la caméra.
 *
 * Voir `services/speechService` pour les choix de conception (hors ligne,
 * désactivé par défaut, annonce qui double l'affichage sans le remplacer).
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import speechService from '../services/speechService';

export interface CheckinAnnouncement {
  /** Le billet est-il valide ? */
  success: boolean;
  /** Nom du porteur, si le backend l'a renvoyé. */
  holderName?: string | null;
  /** Type de billet (VIP, Standard…), si disponible. */
  ticketLabel?: string | null;
  /** Billet déjà scanné auparavant. */
  alreadyCheckedIn?: boolean;
  /** Validé mais à surveiller (billet d'un autre événement). */
  warning?: boolean;
}

/**
 * Compose la phrase annoncée. Exportée pour être testée directement.
 *
 * Ordre choisi : le VERDICT d'abord, l'identité ensuite. Le staff a besoin de
 * savoir « je laisse entrer ou pas » avant de savoir qui c'est ; une phrase
 * qui commence par un nom oblige à écouter jusqu'au bout.
 */
export function composeAnnouncement(
  result: CheckinAnnouncement,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const parts: string[] = [];

  if (!result.success) {
    parts.push(t('organizer.qrScanner.voice.refused'));
  } else if (result.alreadyCheckedIn) {
    parts.push(t('organizer.qrScanner.voice.alreadyCheckedIn'));
  } else if (result.warning) {
    parts.push(t('organizer.qrScanner.voice.validWarning'));
  } else {
    parts.push(t('organizer.qrScanner.voice.valid'));
  }

  // L'identité n'est annoncée que sur un billet accepté : inutile d'exposer un
  // nom à voix haute quand l'entrée est refusée (le billet peut n'être pas
  // celui de la personne présente).
  if (result.success) {
    if (result.holderName) parts.push(result.holderName);
    if (result.ticketLabel) parts.push(result.ticketLabel);
  }

  return parts.join('. ');
}

export function useCheckinVoice() {
  const { t, i18n } = useTranslation();
  const [enabled, setEnabled] = useState(speechService.isEnabled());

  useEffect(() => {
    let cancelled = false;
    speechService.initialize().then(() => {
      if (!cancelled) setEnabled(speechService.isEnabled());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // La langue des annonces suit celle de l'interface.
  useEffect(() => {
    speechService.setLocale(i18n.language);
  }, [i18n.language]);

  // Une annonce ne doit pas survivre à l'écran qui l'a déclenchée.
  useEffect(() => () => speechService.stop(), []);

  const toggle = useCallback(async () => {
    const next = !speechService.isEnabled();
    await speechService.setEnabled(next);
    setEnabled(next);
    // Confirmation audible à l'activation : sans elle, l'utilisateur ne sait
    // pas si le moteur TTS du téléphone fonctionne avant le premier scan.
    if (next) speechService.speak(t('organizer.qrScanner.voice.enabled'));
  }, [t]);

  const announce = useCallback(
    (result: CheckinAnnouncement) => {
      speechService.speak(composeAnnouncement(result, t));
    },
    [t],
  );

  return { enabled, toggle, announce };
}

export default useCheckinVoice;
