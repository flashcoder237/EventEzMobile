import type { TicketType } from '../types';

/**
 * Combien de billets d'un type l'acheteur peut-il REELLEMENT prendre ?
 *
 * Le backend applique trois contraintes independantes, et refuse l'achat
 * si l'une d'elles saute (`registrations/serializers.py`) :
 *   1. `max_per_order` — plafond par commande fixe par l'organisateur
 *   2. le stock restant du tarif
 *   3. la jauge globale de l'evenement (`max_participants`)
 *
 * L'UI mobile en ignorait deux sur trois : elle plafonnait a un `10` CODE
 * EN DUR. Double faute selon le reglage de l'organisateur —
 *   - `max_per_order = 4` : l'acheteur montait a 10 et etait refuse au
 *     paiement, apres avoir saisi ses coordonnees Mobile Money ;
 *   - `max_per_order = 50` : il etait bloque a 10 sans raison, et on lui
 *     proposait de « contacter l'organisateur » pour une limite inexistante.
 * Le stock n'etait pas consulte non plus : 3 places restantes, panier de 10.
 *
 * On prend donc la contrainte la PLUS SERREE, celle qui decidera vraiment.
 */

/** Repli quand l'organisateur n'a fixe aucun plafond (defaut du modele). */
export const DEFAULT_MAX_PER_ORDER = 10;

export interface QuantityLimit {
  /** Maximum selectionnable pour ce tarif, tout confondu. */
  max: number;
  /** Minimum impose par commande (1 si non precise). */
  min: number;
  /** Ce qui borne reellement — sert a expliquer le blocage a l'acheteur. */
  reason: 'per_order' | 'stock' | 'event_capacity';
}

export function getQuantityLimit(
  ticketType: Pick<
    TicketType,
    'max_per_order' | 'min_per_order' | 'quantity_total' | 'quantity_sold'
  > & { quantity_available?: number | null },
  opts: { attendanceRemaining?: number | null } = {},
): QuantityLimit {
  const perOrder = normalizePositive(ticketType.max_per_order)
    ?? DEFAULT_MAX_PER_ORDER;

  // Stock du tarif : `quantity_available` est calcule par le serveur
  // (il tient compte des reservations en cours). On ne retombe sur le
  // calcul local que s'il est absent.
  let stock = normalizeNonNegative(ticketType.quantity_available);
  if (stock === null && typeof ticketType.quantity_total === 'number') {
    stock = Math.max(
      0, ticketType.quantity_total - (ticketType.quantity_sold ?? 0),
    );
  }

  // Jauge globale de l'evenement : `null` = illimitee (cas majoritaire).
  const capacity = normalizeNonNegative(opts.attendanceRemaining);

  let max = perOrder;
  let reason: QuantityLimit['reason'] = 'per_order';
  if (stock !== null && stock < max) {
    max = stock;
    reason = 'stock';
  }
  if (capacity !== null && capacity < max) {
    max = capacity;
    reason = 'event_capacity';
  }

  const min = normalizePositive(ticketType.min_per_order) ?? 1;

  return { max: Math.max(0, max), min, reason };
}

/** Nombre > 0, sinon null (0 et null signifient « non defini » cote modele). */
function normalizePositive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** Nombre >= 0, sinon null. Ici 0 est une valeur SIGNIFICATIVE (complet). */
function normalizeNonNegative(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}
