/**
 * Résolution tolérante des noms de pays côté mobile.
 *
 * Le reverse-geocoding (OSM/Nominatim, cf. MapPickerModal) renvoie le nom du
 * pays DANS SA LANGUE LOCALE — "Deutschland" et non "Allemagne", "España",
 * "Italia", "日本"... Le badge "pays supporté" comparait ce nom natif au code
 * ISO et au nom FR de l'endpoint /supported-countries/ → faux négatif
 * "Pays non disponible".
 *
 * Miroir léger de la logique backend (apps/payments/country_config.py) :
 * normalisation casse + accents, plus une table d'endonymes pour les pays
 * dont le nom natif diffère du nom FR/EN. On NE réimplémente PAS la liste des
 * pays supportés ici — l'endpoint reste la source de vérité ; on aide juste
 * le matching à reconnaître un nom natif comme équivalent à un code ISO.
 */

/** minuscule + suppression des diacritiques (équivalent NFKD backend). */
export function normalizeCountryKey(value: string): string {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining marks
    .toLowerCase();
}

/**
 * Endonymes (noms natifs) → code ISO 2 lettres, pour les pays supportés dont
 * le nom local diffère du nom FR/EN renvoyé par l'endpoint. Clés déjà
 * normalisées (minuscule, sans accents) pour un lookup direct.
 */
const ENDONYM_TO_CODE: Record<string, string> = {
  deutschland: 'DE',
  espana: 'ES',
  italia: 'IT',
  nederland: 'NL',
  belgie: 'BE', // België
  osterreich: 'AT', // Österreich
  eire: 'IE', // Éire
  suomi: 'FI',
  letzebuerg: 'LU', // Lëtzebuerg
  slovensko: 'SK',
  slovenija: 'SI',
  eesti: 'EE',
  lietuva: 'LT',
  latvija: 'LV',
  hrvatska: 'HR',
  schweiz: 'CH',
  svizzera: 'CH',
  sverige: 'SE',
  norge: 'NO',
  danmark: 'DK',
  polska: 'PL',
  cesko: 'CZ', // Česko
  czechia: 'CZ',
  magyarorszag: 'HU', // Magyarország
  romania: 'RO', // România (déjà couvert par nom EN mais sûr)
  brasil: 'BR',
  mexico: 'MX', // México
  '日本': 'JP',
  '香港': 'HK',
  'भारत': 'IN',
  ประเทศไทย: 'TH',
  aotearoa: 'NZ',
};

/**
 * Retourne le code ISO d'un endonyme connu, ou null. `value` peut être brut
 * (la normalisation est appliquée ici). Les scripts non-latins matchent via
 * la clé telle quelle (la normalisation ne les altère pas).
 */
export function resolveEndonymCode(value: string | undefined | null): string | null {
  if (!value) return null;
  const key = normalizeCountryKey(value);
  return ENDONYM_TO_CODE[key] ?? ENDONYM_TO_CODE[value.trim()] ?? null;
}
