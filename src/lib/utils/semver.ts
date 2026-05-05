// ============================================
// Comparaison semver minimale
// ============================================
//
// Pourquoi pas une lib npm ? Pour une seule comparaison `mobile_min_supported`
// vs `app_version`, ça ne vaut pas le poids ajouté ni la surface d'attaque.
// On supporte le format `MAJOR.MINOR.PATCH` avec un suffixe pre-release
// optionnel ignoré (ex: `1.2.3-rc1` → (1, 2, 3)).

export type SemverTuple = readonly [number, number, number];

/**
 * Parse `'1.2.3'` → `[1, 2, 3]`. Renvoie `null` si invalide.
 *
 * Tolérant :
 *  - ignore tout ce qui suit `-` (`'1.2.3-rc1'` → `[1, 2, 3]`)
 *  - étend les versions courtes (`'1.0'` → `[1, 0, 0]`, `'1'` → `[1, 0, 0]`)
 */
export function parseSemver(input: string | null | undefined): SemverTuple | null {
  if (!input) return null;
  const base = String(input).split('-', 1)[0]!.trim();
  if (!base) return null;
  const parts = base.split('.');
  if (parts.length < 1 || parts.length > 3) return null;
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (!Number.isFinite(n) || n < 0 || String(n) !== p) return null;
    nums.push(n);
  }
  while (nums.length < 3) nums.push(0);
  return [nums[0]!, nums[1]!, nums[2]!] as const;
}

/**
 * Renvoie -1 si a<b, 0 si égal, 1 si a>b.
 *
 * Si l'une des deux est invalide, on renvoie 0 (no-op) plutôt que de
 * jeter — ce qui rend la fonction safe à appeler avec des inputs douteux
 * (le force-update gate ne déclenchera jamais sur une comparaison invalide).
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i]! < pb[i]!) return -1;
    if (pa[i]! > pb[i]!) return 1;
  }
  return 0;
}

/** Sucre syntaxique : true si `actual < required`. */
export function isVersionBelow(actual: string, required: string): boolean {
  return compareSemver(actual, required) === -1;
}
