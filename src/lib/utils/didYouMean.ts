/**
 * « Vouliez-vous dire … ? » (R3 W2) — rapprochement simple, pur et testé.
 *
 * Compare la requête aux catégories et tags CONNUS (jamais de mot inventé) :
 * accents et casse ignorés, distance d'édition bornée à la longueur du mot,
 * ou préfixe net (« concer » → « Concerts »). Une seule proposition, la plus
 * proche ; null si rien n'est assez proche.
 */

export interface Candidate<T = unknown> {
  label: string;
  value: T;
}

export function normalizeTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Tolérance : 1 faute jusqu'à 5 lettres, 2 jusqu'à 9, puis 3. */
function tolerance(len: number): number {
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

export function didYouMean<T>(query: string, candidates: Candidate<T>[]): Candidate<T> | null {
  const q = normalizeTerm(query);
  if (q.length < 3) return null;
  let best: { c: Candidate<T>; score: number } | null = null;
  for (const c of candidates) {
    const label = normalizeTerm(c.label || '');
    if (!label) continue;
    let score: number;
    if (label === q) score = 0;
    else if (label.startsWith(q) && q.length >= 4) score = 0.5;
    else {
      // Comparaison au mot entier et à chacun de ses mots (« jazz » ↔ « Soirée jazz »).
      const words = [label, ...label.split(' ').filter((w) => w.length >= 3)];
      score = Math.min(...words.map((w) => editDistance(q, w)));
      if (score > tolerance(q.length)) continue;
    }
    if (!best || score < best.score) best = { c, score };
  }
  return best ? best.c : null;
}
