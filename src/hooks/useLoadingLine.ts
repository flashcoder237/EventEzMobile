import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOADING_LINE_DELAY_MS, loadingLineKey, type LoadingContext } from '../lib/utils/loadingNarrative';

/** `true` une fois que `active` dure depuis plus de `delayMs`. */
export function useSlowLoading(active: boolean, delayMs = LOADING_LINE_DELAY_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const id = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);
  return slow;
}

/**
 * Ligne d'attente contextuelle (R3 W1). `elapsedMs` fourni → l'appelant
 * mesure lui-même le temps ; sinon le hook compte depuis que `active` est vrai.
 * Renvoie la phrase traduite, ou null (trop tôt / inactif).
 */
export function useLoadingLine(
  context: LoadingContext,
  elapsedMsOrActive: number | boolean = true,
): string | null {
  const { t } = useTranslation();
  const measured = typeof elapsedMsOrActive === 'number';
  const slow = useSlowLoading(measured ? false : elapsedMsOrActive);
  const elapsed = measured ? (elapsedMsOrActive as number) : slow ? LOADING_LINE_DELAY_MS : 0;
  const key = loadingLineKey(context, elapsed);
  return key ? t(key) : null;
}
