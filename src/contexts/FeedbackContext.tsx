/**
 * useFeedback — point d'entrée UNIQUE pour tout retour utilisateur.
 *
 * Le problème qu'il résout : l'app ne disposait que de deux registres, la
 * modale bloquante ou rien. Résultat, ~520 modales pour tout — de « message
 * copié » à « paiement refusé » — toutes avec le même squelette. D'où le retour
 * testeur : « ces pop-ups font trop template », et surtout « c'est la même
 * chose partout ».
 *
 * ── L'échelle de retour, du plus léger au plus lourd ────────────────────────
 *
 *  0. RIEN — le résultat est déjà visible à l'écran.
 *     Suivre/ne plus suivre, favori, toggle d'un réglage : le contrôle change
 *     d'état, `Haptics.selectionAsync()` suffit. Règle : si l'écran montre déjà
 *     le résultat, ne l'annonce pas.
 *
 *  1. INLINE — erreur de validation d'un champ.
 *     Message rouge sous le champ concerné. Jamais une modale pour dire qu'un
 *     champ est vide : la modale ne peut pas désigner le champ fautif, c'est
 *     pourquoi ces messages finissaient par embarquer « ticket n°2 » dans leur
 *     texte.
 *
 *  2. `toastSuccess` / `toastInfo` — l'action a réussi, rien à décider.
 *     Non bloquant, ~2,6 s, ancré en bas (près du pouce qui vient d'agir).
 *
 *  3. `toastWarning` — quelque chose mérite l'attention, sans bloquer.
 *
 *  4. `toastError` — échec transitoire d'une action non critique.
 *     Un basculement de suivi qui échoue ne doit pas noircir l'écran.
 *
 *  5. BANNIÈRE — un ÉTAT persistant, pas un événement.
 *     E-mail non vérifié, wallet non configuré. Cf. `VerificationBanner`.
 *     Règle : un état → bannière ; un événement → toast.
 *
 *  6. `showConfirm` / `showError` / `showAlert` — modale bloquante.
 *     Uniquement si : un CHOIX est requis, l'action est DESTRUCTIVE et
 *     irréversible, il y a de l'ARGENT ou du JURIDIQUE en jeu, ou l'erreur
 *     BLOQUE le flux.
 *
 * ── La règle d'arbitrage, en une phrase ─────────────────────────────────────
 *
 *   L'utilisateur doit-il décider quelque chose, ou perd-il de l'argent / des
 *   données s'il rate le message ?
 *     → Non : toast.   → Oui : modale.
 *   Est-ce un état plutôt qu'un événement ? → bannière.
 *   Le résultat est-il déjà à l'écran ?     → rien.
 *
 * Toast et modale sont exposés par le MÊME hook volontairement : tant que la
 * modale reste le chemin le plus court, elle continuera d'être choisie par
 * défaut.
 */

import { useCallback, useMemo } from 'react';

import { useAlert } from './AlertContext';
import { useInAppToast } from './InAppToastContext';

interface ToastOptions {
  /** Ligne secondaire optionnelle. Souvent inutile : un toast doit se lire d'un trait. */
  body?: string;
  /** Clé de dédoublonnage — évite N toasts identiques en rafale. */
  dedupKey?: string;
  /** Action au tap (ex. « Voir »). */
  onPress?: () => void;
}

export function useFeedback() {
  const alert = useAlert();
  const { showToast } = useInAppToast();

  const toastSuccess = useCallback(
    (title: string, opts?: ToastOptions) =>
      showToast({ title, icon: 'success', anchor: 'bottom', ...opts }),
    [showToast],
  );

  const toastError = useCallback(
    (title: string, opts?: ToastOptions) =>
      showToast({ title, icon: 'error', anchor: 'bottom', ...opts }),
    [showToast],
  );

  const toastWarning = useCallback(
    (title: string, opts?: ToastOptions) =>
      showToast({ title, icon: 'warning', anchor: 'bottom', ...opts }),
    [showToast],
  );

  const toastInfo = useCallback(
    (title: string, opts?: ToastOptions) =>
      showToast({ title, icon: 'info', anchor: 'bottom', ...opts }),
    [showToast],
  );

  return useMemo(
    () => ({
      // Rungs 2–4 : discret, non bloquant.
      toastSuccess,
      toastError,
      toastWarning,
      toastInfo,
      // Rung 6 : réservé aux interruptions légitimes (cf. doc d'en-tête).
      showAlert: alert.showAlert,
      showError: alert.showError,
      showWarning: alert.showWarning,
      showSuccess: alert.showSuccess,
      showConfirm: alert.showConfirm,
    }),
    [toastSuccess, toastError, toastWarning, toastInfo, alert],
  );
}

export default useFeedback;
