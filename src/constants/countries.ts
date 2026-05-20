/**
 * Données pays pour la saisie de numéros de téléphone internationaux.
 *
 * Chaque entrée : code ISO 3166-1 alpha-2, nom FR, nom EN, indicatif (sans
 * « + »). Le nom affiché suit la langue de l'app (cf countryName()). Le
 * drapeau emoji est dérivé du code via flagEmoji() ; sur les Android sans
 * emoji drapeau, l'OS affiche les deux lettres — dégradation acceptable.
 */

export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** Nom français */
  name: string;
  /** Nom anglais */
  nameEn: string;
  /** Indicatif téléphonique sans le « + » */
  dial: string;
}

/** Drapeau emoji depuis un code ISO 2 lettres (regional indicator symbols). */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Table de translittération des diacritiques. On évite String.prototype
// .normalize('NFD') qui n'est pas fiable sous Hermes (moteur RN).
const DIACRITICS: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', ö: 'o', õ: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n', ý: 'y', ÿ: 'y',
};

/** Minuscule + suppression des accents — pour une recherche tolérante. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àáâäãåèéêëìíîïòóôöõùúûüçñýÿ]/g, (ch) => DIACRITICS[ch] || ch);
}

/** Nom du pays dans la langue de l'app ('en…' → anglais, sinon français). */
export function countryName(c: Country, lang: string | undefined): string {
  return lang && lang.toLowerCase().startsWith('en') ? c.nameEn : c.name;
}

export const COUNTRIES: Country[] = [
  // ─── Afrique ───────────────────────────────────────────────────────────
  { code: 'DZ', name: 'Algérie', nameEn: 'Algeria', dial: '213' },
  { code: 'AO', name: 'Angola', nameEn: 'Angola', dial: '244' },
  { code: 'BJ', name: 'Bénin', nameEn: 'Benin', dial: '229' },
  { code: 'BW', name: 'Botswana', nameEn: 'Botswana', dial: '267' },
  { code: 'BF', name: 'Burkina Faso', nameEn: 'Burkina Faso', dial: '226' },
  { code: 'BI', name: 'Burundi', nameEn: 'Burundi', dial: '257' },
  { code: 'CM', name: 'Cameroun', nameEn: 'Cameroon', dial: '237' },
  { code: 'CV', name: 'Cap-Vert', nameEn: 'Cape Verde', dial: '238' },
  { code: 'CF', name: 'Centrafrique', nameEn: 'Central African Republic', dial: '236' },
  { code: 'TD', name: 'Tchad', nameEn: 'Chad', dial: '235' },
  { code: 'KM', name: 'Comores', nameEn: 'Comoros', dial: '269' },
  { code: 'CG', name: 'Congo-Brazzaville', nameEn: 'Congo-Brazzaville', dial: '242' },
  { code: 'CD', name: 'Congo (RDC)', nameEn: 'Congo (DRC)', dial: '243' },
  { code: 'CI', name: "Côte d'Ivoire", nameEn: "Côte d'Ivoire", dial: '225' },
  { code: 'DJ', name: 'Djibouti', nameEn: 'Djibouti', dial: '253' },
  { code: 'EG', name: 'Égypte', nameEn: 'Egypt', dial: '20' },
  { code: 'GQ', name: 'Guinée équatoriale', nameEn: 'Equatorial Guinea', dial: '240' },
  { code: 'ER', name: 'Érythrée', nameEn: 'Eritrea', dial: '291' },
  { code: 'SZ', name: 'Eswatini', nameEn: 'Eswatini', dial: '268' },
  { code: 'ET', name: 'Éthiopie', nameEn: 'Ethiopia', dial: '251' },
  { code: 'GA', name: 'Gabon', nameEn: 'Gabon', dial: '241' },
  { code: 'GM', name: 'Gambie', nameEn: 'Gambia', dial: '220' },
  { code: 'GH', name: 'Ghana', nameEn: 'Ghana', dial: '233' },
  { code: 'GN', name: 'Guinée', nameEn: 'Guinea', dial: '224' },
  { code: 'GW', name: 'Guinée-Bissau', nameEn: 'Guinea-Bissau', dial: '245' },
  { code: 'KE', name: 'Kenya', nameEn: 'Kenya', dial: '254' },
  { code: 'LS', name: 'Lesotho', nameEn: 'Lesotho', dial: '266' },
  { code: 'LR', name: 'Liberia', nameEn: 'Liberia', dial: '231' },
  { code: 'LY', name: 'Libye', nameEn: 'Libya', dial: '218' },
  { code: 'MG', name: 'Madagascar', nameEn: 'Madagascar', dial: '261' },
  { code: 'MW', name: 'Malawi', nameEn: 'Malawi', dial: '265' },
  { code: 'ML', name: 'Mali', nameEn: 'Mali', dial: '223' },
  { code: 'MR', name: 'Mauritanie', nameEn: 'Mauritania', dial: '222' },
  { code: 'MU', name: 'Maurice', nameEn: 'Mauritius', dial: '230' },
  { code: 'MA', name: 'Maroc', nameEn: 'Morocco', dial: '212' },
  { code: 'MZ', name: 'Mozambique', nameEn: 'Mozambique', dial: '258' },
  { code: 'NA', name: 'Namibie', nameEn: 'Namibia', dial: '264' },
  { code: 'NE', name: 'Niger', nameEn: 'Niger', dial: '227' },
  { code: 'NG', name: 'Nigeria', nameEn: 'Nigeria', dial: '234' },
  { code: 'RW', name: 'Rwanda', nameEn: 'Rwanda', dial: '250' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', nameEn: 'São Tomé and Príncipe', dial: '239' },
  { code: 'SN', name: 'Sénégal', nameEn: 'Senegal', dial: '221' },
  { code: 'SC', name: 'Seychelles', nameEn: 'Seychelles', dial: '248' },
  { code: 'SL', name: 'Sierra Leone', nameEn: 'Sierra Leone', dial: '232' },
  { code: 'SO', name: 'Somalie', nameEn: 'Somalia', dial: '252' },
  { code: 'ZA', name: 'Afrique du Sud', nameEn: 'South Africa', dial: '27' },
  { code: 'SS', name: 'Soudan du Sud', nameEn: 'South Sudan', dial: '211' },
  { code: 'SD', name: 'Soudan', nameEn: 'Sudan', dial: '249' },
  { code: 'TZ', name: 'Tanzanie', nameEn: 'Tanzania', dial: '255' },
  { code: 'TG', name: 'Togo', nameEn: 'Togo', dial: '228' },
  { code: 'TN', name: 'Tunisie', nameEn: 'Tunisia', dial: '216' },
  { code: 'UG', name: 'Ouganda', nameEn: 'Uganda', dial: '256' },
  { code: 'ZM', name: 'Zambie', nameEn: 'Zambia', dial: '260' },
  { code: 'ZW', name: 'Zimbabwe', nameEn: 'Zimbabwe', dial: '263' },

  // ─── Europe ────────────────────────────────────────────────────────────
  { code: 'AL', name: 'Albanie', nameEn: 'Albania', dial: '355' },
  { code: 'DE', name: 'Allemagne', nameEn: 'Germany', dial: '49' },
  { code: 'AT', name: 'Autriche', nameEn: 'Austria', dial: '43' },
  { code: 'BE', name: 'Belgique', nameEn: 'Belgium', dial: '32' },
  { code: 'BA', name: 'Bosnie-Herzégovine', nameEn: 'Bosnia and Herzegovina', dial: '387' },
  { code: 'BG', name: 'Bulgarie', nameEn: 'Bulgaria', dial: '359' },
  { code: 'HR', name: 'Croatie', nameEn: 'Croatia', dial: '385' },
  { code: 'CY', name: 'Chypre', nameEn: 'Cyprus', dial: '357' },
  { code: 'CZ', name: 'Tchéquie', nameEn: 'Czechia', dial: '420' },
  { code: 'DK', name: 'Danemark', nameEn: 'Denmark', dial: '45' },
  { code: 'EE', name: 'Estonie', nameEn: 'Estonia', dial: '372' },
  { code: 'ES', name: 'Espagne', nameEn: 'Spain', dial: '34' },
  { code: 'FI', name: 'Finlande', nameEn: 'Finland', dial: '358' },
  { code: 'FR', name: 'France', nameEn: 'France', dial: '33' },
  { code: 'GR', name: 'Grèce', nameEn: 'Greece', dial: '30' },
  { code: 'HU', name: 'Hongrie', nameEn: 'Hungary', dial: '36' },
  { code: 'IE', name: 'Irlande', nameEn: 'Ireland', dial: '353' },
  { code: 'IS', name: 'Islande', nameEn: 'Iceland', dial: '354' },
  { code: 'IT', name: 'Italie', nameEn: 'Italy', dial: '39' },
  { code: 'LV', name: 'Lettonie', nameEn: 'Latvia', dial: '371' },
  { code: 'LT', name: 'Lituanie', nameEn: 'Lithuania', dial: '370' },
  { code: 'LU', name: 'Luxembourg', nameEn: 'Luxembourg', dial: '352' },
  { code: 'MT', name: 'Malte', nameEn: 'Malta', dial: '356' },
  { code: 'MD', name: 'Moldavie', nameEn: 'Moldova', dial: '373' },
  { code: 'MC', name: 'Monaco', nameEn: 'Monaco', dial: '377' },
  { code: 'ME', name: 'Monténégro', nameEn: 'Montenegro', dial: '382' },
  { code: 'NO', name: 'Norvège', nameEn: 'Norway', dial: '47' },
  { code: 'NL', name: 'Pays-Bas', nameEn: 'Netherlands', dial: '31' },
  { code: 'MK', name: 'Macédoine du Nord', nameEn: 'North Macedonia', dial: '389' },
  { code: 'PL', name: 'Pologne', nameEn: 'Poland', dial: '48' },
  { code: 'PT', name: 'Portugal', nameEn: 'Portugal', dial: '351' },
  { code: 'RO', name: 'Roumanie', nameEn: 'Romania', dial: '40' },
  { code: 'GB', name: 'Royaume-Uni', nameEn: 'United Kingdom', dial: '44' },
  { code: 'RU', name: 'Russie', nameEn: 'Russia', dial: '7' },
  { code: 'RS', name: 'Serbie', nameEn: 'Serbia', dial: '381' },
  { code: 'SK', name: 'Slovaquie', nameEn: 'Slovakia', dial: '421' },
  { code: 'SI', name: 'Slovénie', nameEn: 'Slovenia', dial: '386' },
  { code: 'SE', name: 'Suède', nameEn: 'Sweden', dial: '46' },
  { code: 'CH', name: 'Suisse', nameEn: 'Switzerland', dial: '41' },
  { code: 'UA', name: 'Ukraine', nameEn: 'Ukraine', dial: '380' },

  // ─── Amériques ─────────────────────────────────────────────────────────
  { code: 'AR', name: 'Argentine', nameEn: 'Argentina', dial: '54' },
  { code: 'BO', name: 'Bolivie', nameEn: 'Bolivia', dial: '591' },
  { code: 'BR', name: 'Brésil', nameEn: 'Brazil', dial: '55' },
  { code: 'CA', name: 'Canada', nameEn: 'Canada', dial: '1' },
  { code: 'CL', name: 'Chili', nameEn: 'Chile', dial: '56' },
  { code: 'CO', name: 'Colombie', nameEn: 'Colombia', dial: '57' },
  { code: 'CR', name: 'Costa Rica', nameEn: 'Costa Rica', dial: '506' },
  { code: 'CU', name: 'Cuba', nameEn: 'Cuba', dial: '53' },
  { code: 'DO', name: 'République dominicaine', nameEn: 'Dominican Republic', dial: '1' },
  { code: 'EC', name: 'Équateur', nameEn: 'Ecuador', dial: '593' },
  { code: 'GT', name: 'Guatemala', nameEn: 'Guatemala', dial: '502' },
  { code: 'HT', name: 'Haïti', nameEn: 'Haiti', dial: '509' },
  { code: 'HN', name: 'Honduras', nameEn: 'Honduras', dial: '504' },
  { code: 'JM', name: 'Jamaïque', nameEn: 'Jamaica', dial: '1' },
  { code: 'MX', name: 'Mexique', nameEn: 'Mexico', dial: '52' },
  { code: 'PA', name: 'Panama', nameEn: 'Panama', dial: '507' },
  { code: 'PY', name: 'Paraguay', nameEn: 'Paraguay', dial: '595' },
  { code: 'PE', name: 'Pérou', nameEn: 'Peru', dial: '51' },
  { code: 'SV', name: 'Salvador', nameEn: 'El Salvador', dial: '503' },
  { code: 'US', name: 'États-Unis', nameEn: 'United States', dial: '1' },
  { code: 'UY', name: 'Uruguay', nameEn: 'Uruguay', dial: '598' },
  { code: 'VE', name: 'Venezuela', nameEn: 'Venezuela', dial: '58' },

  // ─── Asie / Moyen-Orient ───────────────────────────────────────────────
  { code: 'AF', name: 'Afghanistan', nameEn: 'Afghanistan', dial: '93' },
  { code: 'SA', name: 'Arabie saoudite', nameEn: 'Saudi Arabia', dial: '966' },
  { code: 'BH', name: 'Bahreïn', nameEn: 'Bahrain', dial: '973' },
  { code: 'BD', name: 'Bangladesh', nameEn: 'Bangladesh', dial: '880' },
  { code: 'CN', name: 'Chine', nameEn: 'China', dial: '86' },
  { code: 'KR', name: 'Corée du Sud', nameEn: 'South Korea', dial: '82' },
  { code: 'AE', name: 'Émirats arabes unis', nameEn: 'United Arab Emirates', dial: '971' },
  { code: 'HK', name: 'Hong Kong', nameEn: 'Hong Kong', dial: '852' },
  { code: 'IN', name: 'Inde', nameEn: 'India', dial: '91' },
  { code: 'ID', name: 'Indonésie', nameEn: 'Indonesia', dial: '62' },
  { code: 'IQ', name: 'Irak', nameEn: 'Iraq', dial: '964' },
  { code: 'IR', name: 'Iran', nameEn: 'Iran', dial: '98' },
  { code: 'IL', name: 'Israël', nameEn: 'Israel', dial: '972' },
  { code: 'JP', name: 'Japon', nameEn: 'Japan', dial: '81' },
  { code: 'JO', name: 'Jordanie', nameEn: 'Jordan', dial: '962' },
  { code: 'KZ', name: 'Kazakhstan', nameEn: 'Kazakhstan', dial: '7' },
  { code: 'KW', name: 'Koweït', nameEn: 'Kuwait', dial: '965' },
  { code: 'LB', name: 'Liban', nameEn: 'Lebanon', dial: '961' },
  { code: 'MY', name: 'Malaisie', nameEn: 'Malaysia', dial: '60' },
  { code: 'NP', name: 'Népal', nameEn: 'Nepal', dial: '977' },
  { code: 'OM', name: 'Oman', nameEn: 'Oman', dial: '968' },
  { code: 'PK', name: 'Pakistan', nameEn: 'Pakistan', dial: '92' },
  { code: 'PH', name: 'Philippines', nameEn: 'Philippines', dial: '63' },
  { code: 'QA', name: 'Qatar', nameEn: 'Qatar', dial: '974' },
  { code: 'SG', name: 'Singapour', nameEn: 'Singapore', dial: '65' },
  { code: 'LK', name: 'Sri Lanka', nameEn: 'Sri Lanka', dial: '94' },
  { code: 'SY', name: 'Syrie', nameEn: 'Syria', dial: '963' },
  { code: 'TW', name: 'Taïwan', nameEn: 'Taiwan', dial: '886' },
  { code: 'TH', name: 'Thaïlande', nameEn: 'Thailand', dial: '66' },
  { code: 'TR', name: 'Turquie', nameEn: 'Turkey', dial: '90' },
  { code: 'VN', name: 'Vietnam', nameEn: 'Vietnam', dial: '84' },
  { code: 'YE', name: 'Yémen', nameEn: 'Yemen', dial: '967' },

  // ─── Océanie ───────────────────────────────────────────────────────────
  { code: 'AU', name: 'Australie', nameEn: 'Australia', dial: '61' },
  { code: 'FJ', name: 'Fidji', nameEn: 'Fiji', dial: '679' },
  { code: 'NZ', name: 'Nouvelle-Zélande', nameEn: 'New Zealand', dial: '64' },
  { code: 'PG', name: 'Papouasie-Nouvelle-Guinée', nameEn: 'Papua New Guinea', dial: '675' },
];

/** Retrouve un pays par son code ISO (insensible à la casse). */
export function findCountryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper);
}

/**
 * Parse un numéro E.164 (+indicatif…) en { country, national }.
 * Best-effort : on retient l'indicatif le plus long qui matche. Retourne null
 * si la chaîne n'est pas un E.164 reconnu.
 */
export function parseE164(
  e164: string | null | undefined,
): { country: Country; national: string } | null {
  if (!e164 || !e164.startsWith('+')) return null;
  const digits = e164.slice(1).replace(/\D/g, '');
  if (!digits) return null;
  const matches = COUNTRIES.filter((c) => digits.startsWith(c.dial)).sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  if (matches.length === 0) return null;
  const country = matches[0];
  return { country, national: digits.slice(country.dial.length) };
}
