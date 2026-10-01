/**
 * G16 — glisser à deux doigts sur la liste des inscrits. Logique pure (testée).
 *
 * Chaque ligne survolée est COCHÉE (jamais décochée par le survol : un
 * passage en arrière ne défait pas la sélection). Un `tick` haptique au plus
 * toutes les 40 ms.
 */
export const DRAG_TICK_MIN_MS = 40;

export interface RowRect {
  id: string;
  /** Position verticale dans la fenêtre (measureInWindow). */
  y: number;
  height: number;
}

export function rowAt(rects: RowRect[], absoluteY: number): string | null {
  for (const r of rects) {
    if (absoluteY >= r.y && absoluteY < r.y + r.height) return r.id;
  }
  return null;
}

/** Ajoute `id` à la sélection ; renvoie le même Set si rien ne change. */
export function addToSelection(selected: Set<string>, id: string | null): Set<string> {
  if (!id || selected.has(id)) return selected;
  const next = new Set(selected);
  next.add(id);
  return next;
}

export function shouldTick(now: number, lastTick: number, min = DRAG_TICK_MIN_MS): boolean {
  return now - lastTick >= min;
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV de la sélection (export côté téléphone, sans aller-retour serveur). */
export function buildSelectionCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}
