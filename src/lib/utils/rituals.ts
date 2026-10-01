/**
 * Petites attentions (micro-delight R3, W4 + W5).
 *
 * Fonctions PURES (aucun accès au stockage ni à l'horloge) : la date du jour
 * est toujours passée en paramètre, ce qui les rend testables.
 *
 * - Anniversaire : à partir de `date_of_birth`, jamais l'âge. Né un 29 février :
 *   fêté le 28 février les années non bissextiles.
 * - Anniversaire de compte : à partir de `date_joined`, à partir d'un an.
 * - Fête nationale du pays de l'utilisateur, et Nouvel An.
 *
 * Une seule attention par jour, par ordre de priorité (la plus personnelle
 * d'abord). L'affichage « une fois par jour » est géré par l'appelant.
 */

export type Ritual =
  | { kind: 'birthday' }
  | { kind: 'accountAnniversary'; years: number }
  | { kind: 'nationalDay'; country: string }
  | { kind: 'newYear' };

/** Fêtes nationales par code pays ISO-2 : [mois (1-12), jour]. Extensible. */
export const NATIONAL_DAYS: Record<string, [number, number]> = {
  CM: [5, 20],
  CI: [8, 7],
  SN: [4, 4],
  FR: [7, 14],
  GA: [8, 17],
  CG: [8, 15],
  CD: [6, 30],
  BJ: [8, 1],
  TG: [4, 27],
  BF: [12, 11],
  ML: [9, 22],
  NE: [12, 18],
  GN: [10, 2],
  TD: [8, 11],
  BE: [7, 21],
  CH: [8, 1],
  CA: [7, 1],
  US: [7, 4],
  NG: [10, 1],
  GH: [3, 6],
  KE: [12, 12],
  MA: [7, 30],
  RW: [7, 4],
};

/** Noms de pays usuels (FR/EN/endonymes) → ISO-2, pour un champ saisi librement. */
const COUNTRY_ALIASES: Record<string, string> = {
  cameroun: 'CM', cameroon: 'CM', "cote d'ivoire": 'CI', 'ivory coast': 'CI', senegal: 'SN',
  france: 'FR', gabon: 'GA', congo: 'CG', 'republique du congo': 'CG', rdc: 'CD',
  'rd congo': 'CD', 'republique democratique du congo': 'CD', 'democratic republic of the congo': 'CD',
  benin: 'BJ', togo: 'TG', 'burkina faso': 'BF', mali: 'ML', niger: 'NE', guinee: 'GN', guinea: 'GN',
  tchad: 'TD', chad: 'TD', belgique: 'BE', belgium: 'BE', suisse: 'CH', switzerland: 'CH',
  canada: 'CA', 'etats-unis': 'US', 'united states': 'US', usa: 'US', nigeria: 'NG', ghana: 'GH',
  kenya: 'KE', maroc: 'MA', morocco: 'MA', rwanda: 'RW',
};

/** Code ISO-2 à partir d'un code ou d'un nom de pays libre ; sinon null. */
export function countryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const key = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’]/g, "'")
    .toLowerCase();
  return COUNTRY_ALIASES[key] ?? null;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Lit « AAAA-MM-JJ » (ou ISO complet) sans passer par le fuseau. */
function parseYmd(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
}

/** Le jour anniversaire tombe-t-il aujourd'hui (29 février → 28 février hors bissextile) ? */
function sameDayOfYear(m: number, d: number, today: Date): boolean {
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  if (m === 2 && d === 29 && !isLeapYear(ty)) return tm === 2 && td === 28;
  return tm === m && td === d;
}

export function isBirthday(dateOfBirth: string | null | undefined, today: Date): boolean {
  const dob = parseYmd(dateOfBirth);
  return !!dob && sameDayOfYear(dob.m, dob.d, today);
}

/** Nombre d'années de compte si c'est aujourd'hui l'anniversaire (≥ 1), sinon null. */
export function accountAnniversaryYears(dateJoined: string | null | undefined, today: Date): number | null {
  const joined = parseYmd(dateJoined);
  if (!joined) return null;
  const years = today.getFullYear() - joined.y;
  return years >= 1 && sameDayOfYear(joined.m, joined.d, today) ? years : null;
}

export function isNationalDay(country: string | null | undefined, today: Date): string | null {
  const code = countryCode(country);
  const day = code ? NATIONAL_DAYS[code] : undefined;
  return day && today.getMonth() + 1 === day[0] && today.getDate() === day[1] ? code : null;
}

export function isNewYear(today: Date): boolean {
  return today.getMonth() === 0 && today.getDate() === 1;
}

/** L'attention du jour, la plus personnelle d'abord ; null s'il n'y en a pas. */
export function ritualForToday(
  user: { date_of_birth?: string | null; date_joined?: string | null; country?: string | null } | null | undefined,
  today: Date,
): Ritual | null {
  if (user && isBirthday(user.date_of_birth, today)) return { kind: 'birthday' };
  const years = user ? accountAnniversaryYears(user.date_joined, today) : null;
  if (years) return { kind: 'accountAnniversary', years };
  const country = user ? isNationalDay(user.country, today) : null;
  if (country) return { kind: 'nationalDay', country };
  if (isNewYear(today)) return { kind: 'newYear' };
  return null;
}

/** Clé de jour local « AAAA-MM-JJ » (pour « une fois par jour » et les graines). */
export function dayKey(today: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
}

/** Graine stable pour la journée : même variante toute la journée, une autre demain. */
export function dailyVariant(count: number, today: Date, salt = ''): number {
  if (count <= 1) return 0;
  const s = dayKey(today) + salt;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % count;
}
