/**
 * Physique des feuilles et gestes (T5, T7) — fonctions pures, utilisables en
 * worklet comme en JS, testables sans rendu.
 */

/** Taux de décélération d'iOS (UIScrollView.DecelerationRate.normal). */
export const DECELERATION = 0.998;

/**
 * Destination projetée d'un lâcher : où le contenu s'arrêterait s'il glissait
 * librement. `velocity` en px/s → déplacement en px.
 *   proj = y + v · d / (1 − d) / 1000
 */
export function projectRelease(position: number, velocity: number, deceleration?: number): number {
  'worklet';
  // PAS de `deceleration = DECELERATION` en valeur par défaut : le plugin
  // worklets ne capture pas les identifiants des paramètres par défaut, et sur
  // le thread UI `DECELERATION` n'existe pas → « ReferenceError: Property
  // 'DECELERATION' doesn't exist » → l'app se fermait au lâcher d'une feuille
  // (sélecteur de langue et toutes les SpringSheet). Littéral = valeur ci-dessus.
  const d = deceleration ?? 0.998;
  return position + (velocity * d) / (1 - d) / 1000;
}

/**
 * Élasticité au-delà d'une borne : la résistance croît avec la distance et
 * tend vers `limit` sans jamais l'atteindre.
 *   f(x) = c · (1 − 1 / (x · 0,55 / c + 1))
 */
export function rubberband(overshoot: number, limit: number): number {
  'worklet';
  if (overshoot <= 0 || limit <= 0) return 0;
  return limit * (1 - 1 / ((overshoot * 0.55) / limit + 1));
}

/** Point le plus proche de `value` parmi `points` (non vide). */
export function nearestPoint(value: number, points: readonly number[]): number {
  'worklet';
  let best = points[0];
  let bestDist = Math.abs(value - best);
  for (let i = 1; i < points.length; i++) {
    const d = Math.abs(value - points[i]);
    if (d < bestDist) {
      best = points[i];
      bestDist = d;
    }
  }
  return best;
}
