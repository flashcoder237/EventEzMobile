/**
 * Urgence d'une echeance de vente ou d'inscription.
 *
 * POURQUOI
 * --------
 * Les dates limites etaient soit invisibles, soit annoncees a la
 * granularite du JOUR : a deux heures de la fermeture, l'affichage disait
 * encore « dans 1 jour », du meme gris neutre qu'a trente jours. Un
 * acheteur qui remettait au lendemain trouvait porte close.
 *
 * On descend donc en heures puis en minutes quand l'echeance approche, et
 * on expose un niveau d'urgence pour que l'interface change de ton — sans
 * imposer de rendu : chaque plateforme le traduit a sa facon.
 */

export type DeadlineUrgency = 'none' | 'soon' | 'urgent' | 'last_call' | 'passed';

export interface DeadlineInfo {
  urgency: DeadlineUrgency;
  /** Millisecondes restantes (negatif si depasse). */
  remainingMs: number;
  /** Unite la plus parlante a afficher. */
  unit: 'days' | 'hours' | 'minutes';
  /** Valeur a afficher dans cette unite. */
  value: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Au-dela, l'echeance n'est pas une information utile a mettre en avant. */
const SOON_THRESHOLD_MS = 7 * DAY;
const URGENT_THRESHOLD_MS = 24 * HOUR;
const LAST_CALL_THRESHOLD_MS = 2 * HOUR;

/**
 * @param deadline  date limite (fin de vente, deadline d'inscription)
 * @param nowTs     instant de reference, injectable pour les tests
 */
export function getDeadlineInfo(
  deadline: string | Date | null | undefined,
  nowTs: number = Date.now(),
): DeadlineInfo | null {
  if (!deadline) return null;

  const ts = deadline instanceof Date ? deadline.getTime() : Date.parse(deadline);
  if (Number.isNaN(ts)) return null;

  const remainingMs = ts - nowTs;

  if (remainingMs <= 0) {
    return { urgency: 'passed', remainingMs, unit: 'minutes', value: 0 };
  }

  // L'unite suit ce qui reste : annoncer « 1 jour » a 90 minutes de la
  // fermeture est trompeur, c'est exactement ce qui faisait rater
  // l'echeance.
  let unit: DeadlineInfo['unit'] = 'days';
  let value = Math.ceil(remainingMs / DAY);
  if (remainingMs < HOUR) {
    unit = 'minutes';
    value = Math.max(1, Math.ceil(remainingMs / MINUTE));
  } else if (remainingMs < DAY) {
    unit = 'hours';
    value = Math.max(1, Math.floor(remainingMs / HOUR));
  }

  let urgency: DeadlineUrgency = 'none';
  if (remainingMs <= LAST_CALL_THRESHOLD_MS) urgency = 'last_call';
  else if (remainingMs <= URGENT_THRESHOLD_MS) urgency = 'urgent';
  else if (remainingMs <= SOON_THRESHOLD_MS) urgency = 'soon';

  return { urgency, remainingMs, unit, value };
}

/**
 * Faut-il attirer l'attention sur cette echeance ?
 *
 * `none` = elle est trop lointaine pour meriter une pastille : l'afficher
 * en permanence la banaliserait, et elle ne serait plus vue le jour ou
 * elle compte.
 */
export function shouldHighlightDeadline(info: DeadlineInfo | null): boolean {
  return !!info && info.urgency !== 'none' && info.urgency !== 'passed';
}
