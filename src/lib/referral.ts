/**
 * Capture du code de parrainage reçu par deep link.
 *
 * PROBLÈME RÉSOLU : la capture du `?ref=` n'existait QUE côté web
 * (`ReferralCapture`). Un destinataire ayant déjà l'app installée ouvrait donc
 * le lien DANS l'app — et le code était perdu. Le parrain n'était jamais
 * crédité, précisément dans le cas le plus favorable (un utilisateur déjà
 * acquis, qui partage à quelqu'un d'équipé).
 *
 * Le code est mémorisé localement, puis envoyé au backend au moment de
 * l'inscription. On ne peut pas s'appuyer sur la session Django côté mobile :
 * l'app parle à l'API en JWT, sans cookie de session.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REFERRAL_KEY = '@eventez_pending_referral';

/** Un code est une chaîne courte alphanumérique. */
const CODE_RE = /^[A-Z0-9]{4,16}$/;

/**
 * Extrait `?ref=CODE` d'un chemin de deep link et le mémorise.
 *
 * Appelé depuis `getStateFromPath` : c'est le point de passage OBLIGÉ de tous
 * les liens entrants (cold start comme app déjà ouverte), ce qui évite de
 * dupliquer la logique par écran.
 */
export function captureReferralFromPath(path: string): string | null {
  try {
    const q = path.indexOf('?');
    if (q === -1) return null;

    const params = new URLSearchParams(path.slice(q + 1));
    const raw = params.get('ref');
    if (!raw) return null;

    const code = raw.trim().toUpperCase();
    if (!CODE_RE.test(code)) return null;

    // `void` : la capture ne doit jamais retarder le routage. Si l'écriture
    // échoue, on perd une attribution — pas la navigation de l'utilisateur.
    void AsyncStorage.setItem(PENDING_REFERRAL_KEY, code).catch(() => {});
    return code;
  } catch {
    return null;
  }
}

/** Code en attente, ou `null`. À lire au moment de l'inscription. */
export async function getPendingReferral(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
  } catch {
    return null;
  }
}

/**
 * Purge le code après une inscription réussie.
 *
 * Sans ça, un même code resterait attaché à toutes les inscriptions futures
 * effectuées depuis cet appareil.
 */
export async function clearPendingReferral(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {
    /* non bloquant */
  }
}
