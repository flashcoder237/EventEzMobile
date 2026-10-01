/**
 * Ton de l'app : EventEz vouvoie (charte « Ton », docs/MOBILE_STYLE_GUIDE.md).
 *
 * Le français a été converti du tutoiement au vouvoiement (round 3). Ce test
 * échoue dès qu'une chaîne FR réintroduit un pronom, un possessif ou un
 * impératif courant à la 2e personne du singulier.
 *
 * Exceptions : uniquement des chaînes où le mot n'est PAS un tutoiement
 * (nom commun, adjectif, 3e personne…). Chaque exception est justifiée.
 */
import fr from '../locales/fr.json';

type Dict = { [key: string]: string | Dict };

function flatten(obj: Dict, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? [[key, v] as [string, string]] : flatten(v, key);
  });
}

// Pronoms et possessifs : « tu, te, t', toi, ton, ta, tes ».
const PRONOUNS = /(?<![\p{L}'’-])(tu|te|toi|ton|ta|tes)(?![\p{L}-])|(?<![\p{L}])t['’](?=[\p{Ll}h])|-toi\b/iu;

// Impératifs 2e sg. courants en tête de phrase (« Vérifie », « Réessaie »…).
const IMPERATIVES =
  /(?:^|[.!?:;—•>(]\s*|\n)(Vérifie|Réessaie|Réessaye|Essaie|Essaye|Confirme|Choisis|Sélectionne|Saisis|Ajoute|Crée|Rejoins|Découvre|Retrouve|Sois|Garde|Présente|Indique|Utilise|Contacte|Autorise|Consulte|Touche|Tape|Scanne|Clique|Appuie|Reviens|Connecte|Inscris|Remplis|Réduis|Reprends|Suis|Trouve|Écris|Décris|Donne|Pose|Mets|Va|Fais)\b(?![\p{L}])/u;

/** clé → raison : le mot repéré n'est pas un tutoiement. */
const EXCEPTIONS: Record<string, string> = {};

describe('fr.json — vouvoiement', () => {
  const entries = flatten(fr as unknown as Dict).filter(([key]) => !(key in EXCEPTIONS));

  it('ne contient aucun pronom ni possessif de tutoiement', () => {
    const offenders = entries.filter(([, v]) => PRONOUNS.test(v)).map(([k, v]) => `${k}: ${v}`);
    expect(offenders).toEqual([]);
  });

  it('ne contient aucun impératif courant à la 2e personne du singulier', () => {
    const offenders = entries.filter(([, v]) => IMPERATIVES.test(v)).map(([k, v]) => `${k}: ${v}`);
    expect(offenders).toEqual([]);
  });

  it('les exceptions pointent vers des clés existantes', () => {
    const keys = new Set(flatten(fr as unknown as Dict).map(([k]) => k));
    Object.keys(EXCEPTIONS).forEach((k) => expect(keys.has(k)).toBe(true));
  });
});
