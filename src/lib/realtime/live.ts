/**
 * Q&R et sondages en direct (micro-delight R2, V6) — fusion des messages
 * `live.update` dans l'état local. Fonctions pures : testables, sans React.
 *
 * Charge utile question : {id, content, is_anonymous, author_name,
 * upvote_count, is_pinned, is_answered, answer, created_at} — jamais l'e-mail.
 * Charge utile sondage : {id, status, options:[{id, vote_count}]}.
 */

export interface LiveQuestionPayload {
  id: string;
  content?: string;
  is_anonymous?: boolean;
  author_name?: string | null;
  upvote_count?: number;
  is_pinned?: boolean;
  is_answered?: boolean;
  answer?: string;
  created_at?: string | null;
}

export interface LivePollPayload {
  id: string;
  status?: string;
  options?: { id: string; vote_count: number }[];
}

type QuestionLike = { id: string; [key: string]: any };
type PollLike = { id: string; status?: string; options?: { id: string; vote_count?: number; [k: string]: any }[] };

/** Crée ou met à jour une question. `created` ignore un doublon déjà présent. */
export function applyQuestionUpdate<Q extends QuestionLike>(
  list: Q[],
  data: LiveQuestionPayload | null | undefined,
  mapNew: (d: LiveQuestionPayload) => Q,
): Q[] {
  if (!data || !data.id) return list;
  const id = String(data.id);
  const idx = list.findIndex((q) => String(q.id) === id);
  if (idx === -1) return [mapNew(data), ...list];
  const next = list.slice();
  const cur = next[idx];
  next[idx] = {
    ...cur,
    ...(data.content !== undefined ? { content: data.content } : null),
    ...(data.upvote_count !== undefined ? { upvote_count: data.upvote_count } : null),
    ...(data.is_pinned !== undefined ? { is_pinned: data.is_pinned } : null),
    ...(data.is_answered !== undefined ? { is_answered: data.is_answered } : null),
    ...(data.answer !== undefined ? { answer: data.answer } : null),
  };
  return next;
}

/** Met à jour le statut et les compteurs d'un sondage connu. */
export function applyPollUpdate<P extends PollLike>(list: P[], data: LivePollPayload | null | undefined): P[] {
  if (!data || !data.id) return list;
  const id = String(data.id);
  let changed = false;
  const next = list.map((p) => {
    if (String(p.id) !== id) return p;
    changed = true;
    const counts = new Map((data.options || []).map((o) => [String(o.id), o.vote_count]));
    return {
      ...p,
      ...(data.status ? { status: data.status } : null),
      options: (p.options || []).map((o) =>
        counts.has(String(o.id)) ? { ...o, vote_count: counts.get(String(o.id)) } : o,
      ),
    };
  });
  return changed ? next : list;
}

/** Ordre de lecture : épinglées, puis les plus votées, puis les plus récentes. */
export function sortQuestions<Q extends QuestionLike>(list: Q[]): Q[] {
  return [...list].sort(
    (a, b) =>
      Number(!!b.is_pinned) - Number(!!a.is_pinned) ||
      (b.upvote_count || 0) - (a.upvote_count || 0) ||
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

export const REACTION_EMOJIS = ['👏', '🔥', '❤️', '🎉'] as const;
export const MAX_BUBBLES = 6;

/**
 * Répartit au plus 6 bulles entre les émojis d'une fenêtre agrégée
 * (`{"👏":14,"🔥":3}`), au prorata, chaque émoji présent en ayant au moins une.
 */
export function bubblesFor(counts: Record<string, number> | null | undefined, max = MAX_BUBBLES): string[] {
  const entries = Object.entries(counts || {}).filter(
    ([e, n]) => (REACTION_EMOJIS as readonly string[]).includes(e) && Number(n) > 0,
  );
  if (entries.length === 0) return [];
  const sorted = entries.sort((a, b) => Number(b[1]) - Number(a[1]));
  const total = sorted.reduce((s, [, n]) => s + Number(n), 0);
  // Chaque émoji présent a au moins une bulle ; le reste suit les proportions.
  const slots = sorted.slice(0, max).map(([emoji, n]) => ({ emoji, n: Number(n), k: 1 }));
  let left = max - slots.length;
  for (const s of slots) {
    if (left <= 0) break;
    const extra = Math.min(left, Math.max(0, Math.round((s.n / total) * max) - 1));
    s.k += extra;
    left -= extra;
  }
  const out: string[] = [];
  slots.forEach((s) => {
    for (let i = 0; i < s.k; i += 1) out.push(s.emoji);
  });
  return out;
}
