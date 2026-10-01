/**
 * Personnalisation transparente (R3 W7).
 *
 * - Signaux `follow` / `register` / `share` / `search` (+ `view`) : fire-and-
 *   forget, jamais bloquants, jamais d'erreur visible. Contrat backend :
 *   `event_id` (UUID strict, jamais le slug) et/ou `category_id`.
 * - Goûts déduits (`GET /recommendations/preferences/`) lus UNE fois par
 *   démarrage à froid : l'ordre des chips ne bouge pas sous le doigt.
 * - « Parce que vous aimez X et Y » : seulement si le signal est réel.
 * - « Oublier mes préférences » : DELETE, avec un résultat honnête.
 */
import { recommendationsAPI } from '../api';

export type RecoInteraction = 'view' | 'follow' | 'register' | 'share' | 'search';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildInteractionPayload(
  interaction_type: RecoInteraction,
  target: { eventId?: string | number | null; categoryId?: number | string | null } = {},
): { interaction_type: RecoInteraction; event_id?: string; category_id?: number } | null {
  const data: { interaction_type: RecoInteraction; event_id?: string; category_id?: number } = { interaction_type };
  const eventId = target.eventId != null ? String(target.eventId) : '';
  if (UUID_RE.test(eventId)) data.event_id = eventId;
  const categoryId = typeof target.categoryId === 'string' ? Number(target.categoryId) : target.categoryId;
  if (typeof categoryId === 'number' && Number.isInteger(categoryId) && categoryId > 0) data.category_id = categoryId;
  // Sans cible exploitable, le backend n'a rien à pondérer : on n'envoie rien.
  if (!data.event_id && data.category_id === undefined) return null;
  return data;
}

export function trackInteraction(
  interaction_type: RecoInteraction,
  target: { eventId?: string | number | null; categoryId?: number | string | null } = {},
): void {
  const data = buildInteractionPayload(interaction_type, target);
  if (!data) return;
  try {
    Promise.resolve(recommendationsAPI.recordInteraction(data)).catch(() => {});
  } catch {
    /* jamais bloquant */
  }
}

// ── Goûts ────────────────────────────────────────────────────────────────────

export interface TasteCategory {
  category_id?: number;
  category_name?: string | null;
  score?: number;
}

export interface TastePreferences {
  total_interactions?: number;
  category_preferences?: TasteCategory[];
  top_categories?: TasteCategory[];
}

/** Les catégories préférées, seulement si le signal est réel (score > 0). */
export function topTasteCategories(prefs: TastePreferences | null | undefined, max = 2): TasteCategory[] {
  if (!prefs || !prefs.total_interactions) return [];
  const list = Array.isArray(prefs.top_categories) && prefs.top_categories.length
    ? prefs.top_categories
    : Array.isArray(prefs.category_preferences) ? prefs.category_preferences : [];
  return list
    .filter((c) => typeof c.score === 'number' && c.score > 0 && !!c.category_name?.trim() && c.category_name !== 'Unknown')
    .sort((a, b) => (b.score as number) - (a.score as number))
    .slice(0, max);
}

export function topPreferenceNames(prefs: TastePreferences | null | undefined, max = 2): string[] {
  return topTasteCategories(prefs, max).map((c) => (c.category_name as string).trim());
}

/**
 * Les 2 premières chips suivent les goûts ; le reste garde son ordre d'origine.
 * Les catégories inconnues de la liste sont ignorées.
 */
export function orderCategoriesByTaste<T extends { id: number | string }>(
  categories: T[],
  tasteIds: Array<number | string | undefined>,
  max = 2,
): T[] {
  const wanted = tasteIds.filter((id) => id !== undefined && id !== null).map(String);
  const front: T[] = [];
  for (const id of wanted) {
    if (front.length >= max) break;
    const found = categories.find((c) => String(c.id) === id);
    if (found && !front.includes(found)) front.push(found);
  }
  if (!front.length) return categories;
  return [...front, ...categories.filter((c) => !front.includes(c))];
}

// Une lecture par démarrage à froid (module) : l'ordre reste stable pendant
// la session, même si de nouveaux signaux arrivent entre-temps.
let tasteOnce: Promise<TastePreferences | null> | null = null;

export function loadTastePreferences(): Promise<TastePreferences | null> {
  if (!tasteOnce) {
    tasteOnce = Promise.resolve()
      .then(() => recommendationsAPI.getPreferences())
      .then((res: any) => (res?.data && typeof res.data === 'object' ? (res.data as TastePreferences) : null))
      .catch(() => null);
  }
  return tasteOnce;
}

export type ForgetResult = 'done' | 'unavailable' | 'error';

/** Efface les goûts côté serveur. Rien n'est prétendu effacé en cas d'échec. */
export async function forgetTastePreferences(): Promise<ForgetResult> {
  try {
    await recommendationsAPI.forgetPreferences();
    tasteOnce = Promise.resolve(null);
    return 'done';
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404 || status === 405) return 'unavailable';
    return 'error';
  }
}

/** Tests uniquement. */
export function __resetTaste() {
  tasteOnce = null;
}
