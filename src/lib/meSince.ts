/**
 * « Depuis votre dernière visite » (R3 W3 + W6) — `GET /api/me/since/?ts=`.
 *
 * Contrat backend : `{ since, count, items: [{ id, slug, title, start_date,
 * location_city, banner_image, organizer_name, reason }] }`, `reason` valant
 * `followed_organizer` ou `new_edition`. Liste vide, 404 ou erreur = rien à
 * afficher (jamais de remplissage). Une requête par `ts` et par session.
 */
import { eventsAPI } from '../api';

export type SinceReason = 'followed_organizer' | 'new_edition' | 'other';

export interface SinceItem {
  id: string;
  slug?: string;
  title: string;
  start_date?: string;
  location_city?: string;
  banner_image?: string | null;
  organizer_name?: string;
  reason: SinceReason;
}

export function normalizeSince(data: unknown): SinceItem[] {
  const raw = Array.isArray(data) ? data : Array.isArray((data as any)?.items) ? (data as any).items : [];
  const out: SinceItem[] = [];
  const seen = new Set<string>();
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue;
    const id = it.id != null ? String(it.id) : '';
    const title = typeof it.title === 'string' ? it.title.trim() : '';
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title,
      slug: typeof it.slug === 'string' && it.slug ? it.slug : undefined,
      start_date: typeof it.start_date === 'string' ? it.start_date : undefined,
      location_city: typeof it.location_city === 'string' && it.location_city ? it.location_city : undefined,
      banner_image: typeof it.banner_image === 'string' ? it.banner_image : null,
      organizer_name: typeof it.organizer_name === 'string' && it.organizer_name ? it.organizer_name : undefined,
      reason: it.reason === 'followed_organizer' || it.reason === 'new_edition' ? it.reason : 'other',
    });
  }
  return out;
}

const memo = new Map<number, Promise<SinceItem[]>>();

export function fetchMeSince(ts: number): Promise<SinceItem[]> {
  const key = Math.floor(ts);
  let p = memo.get(key);
  if (!p) {
    p = Promise.resolve()
      .then(() => (eventsAPI as any).getMeSince(key))
      .then((res: any) => normalizeSince(res?.data))
      .catch(() => [] as SinceItem[]);
    memo.set(key, p as Promise<SinceItem[]>);
  }
  return p as Promise<SinceItem[]>;
}

/** Tests uniquement. */
export function __resetMeSince() {
  memo.clear();
}
