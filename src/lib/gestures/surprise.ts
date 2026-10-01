/**
 * G3 — « surprends-moi ». Tirage pur (testé).
 *
 * On tire UN événement à venir, pas encore réservé, parmi « Pour vous » et
 * « près de vous ». « Encore » évite de retomber sur le précédent tant qu'il
 * reste d'autres candidats.
 */
export interface SurpriseCandidate {
  id: string | number;
  slug?: string;
  start_date?: string;
  end_date?: string;
}

/** Ids / slugs des événements déjà réservés (inscriptions non annulées). */
export function registeredEventKeys(registrations: unknown[]): Set<string> {
  const keys = new Set<string>();
  for (const r of registrations || []) {
    const reg = r as any;
    if (!reg || reg.status === 'cancelled' || reg.status === 'refunded') continue;
    const ev = reg.event_details || reg.event;
    if (ev && typeof ev === 'object') {
      if (ev.id != null) keys.add(String(ev.id));
      if (ev.slug) keys.add(String(ev.slug));
    } else if (ev != null) {
      keys.add(String(ev));
    }
    if (reg.event_id != null) keys.add(String(reg.event_id));
  }
  return keys;
}

export function surpriseCandidates<T extends SurpriseCandidate>(
  pools: T[][],
  registered: Set<string>,
  now: number = Date.now(),
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const pool of pools) {
    for (const ev of pool || []) {
      if (!ev || ev.id == null) continue;
      const id = String(ev.id);
      if (seen.has(id)) continue;
      seen.add(id);
      if (registered.has(id) || (ev.slug && registered.has(ev.slug))) continue;
      const start = ev.start_date ? new Date(ev.start_date).getTime() : NaN;
      if (!Number.isFinite(start) || start <= now) continue;
      out.push(ev);
    }
  }
  return out;
}

export function pickSurprise<T extends SurpriseCandidate>(
  candidates: T[],
  previousId: string | null,
  random: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  const pool =
    previousId && candidates.length > 1 ? candidates.filter((c) => String(c.id) !== previousId) : candidates;
  const i = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[i];
}
