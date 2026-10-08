/**
 * Suggestion de catégorie à partir de ce que l'organisateur a déjà saisi.
 *
 * DEMANDE (2026-10-07) : « comment, en fonction de ce que l'utilisateur aura
 * saisi en haut sur le formulaire de création d'événements, une catégorie peut
 * être choisie pour aider l'utilisateur ».
 *
 * PARTI PRIS : on SUGGÈRE, on ne choisit pas à la place de l'organisateur.
 * Une sélection automatique silencieuse serait pire que rien : elle passerait
 * inaperçue, et un classement erroné nuit au référencement de l'événement sans
 * que personne ne s'en aperçoive. L'organisateur garde la main.
 *
 * Le vocabulaire est délibérément MODESTE : seulement des mots sans ambiguïté.
 * Mieux vaut ne rien proposer que proposer à tort — une mauvaise suggestion
 * acceptée par habitude est un classement faux de plus.
 */

/** Slugs des catégories semées (cf. `seed_reference.py`). */
const RULES: Array<{ slug: string; pattern: RegExp }> = [
  { slug: 'musique-concerts', pattern: /\b(concert|musique|music|festival|showcase|dj|live session|chorale)\b/i },
  { slug: 'conferences', pattern: /\b(conf[ée]rence|conference|sommet|summit|colloque|symposium|plénière|pleniere)\b/i },
  { slug: 'formations-ateliers', pattern: /\b(formation|atelier|workshop|masterclass|bootcamp|s[ée]minaire|training|cours)\b/i },
  { slug: 'sports-bien-etre', pattern: /\b(tournoi|match|sport|marathon|course|yoga|fitness|championnat|gala de lutte)\b/i },
  { slug: 'art-culture', pattern: /\b(exposition|vernissage|th[éeè][aâ]tre|spectacle|danse|galerie|po[ée]sie|slam)\b/i },
  { slug: 'gastronomie', pattern: /\b(d[ée]gustation|gastronomie|culinaire|restaurant|brunch|food|cuisine|vin)\b/i },
  { slug: 'technologie', pattern: /\b(tech|num[ée]rique|digital|hackathon|startup|webinaire|webinar|intelligence artificielle|\bia\b)\b/i },
  { slug: 'business-networking', pattern: /\b(networking|business|salon professionnel|afterwork|b2b|entrepreneur|lancement de produit)\b/i },
  { slug: 'famille-enfants', pattern: /\b(enfants|famille|kids|parentalit[ée]|cr[èe]che|jeunesse et famille)\b/i },
  { slug: 'soirees-nightlife', pattern: /\b(soir[ée]e|nightlife|club|party|before|after[- ]?party|boîte de nuit)\b/i },
  { slug: 'mariages-celebrations', pattern: /\b(mariage|wedding|anniversaire|bapt[êe]me|dot|fian[çc]ailles|baby shower)\b/i },
  { slug: 'religieux-spirituel', pattern: /\b(culte|pri[èe]re|[ée]glise|mosqu[ée]e|retraite spirituelle|gospel|[ée]vang[ée]lisation)\b/i },
  { slug: 'caritatif-solidarite', pattern: /\b(caritatif|solidarit[ée]|collecte|charit[ée]|b[ée]n[ée]vol|don du sang|humanitaire)\b/i },
  { slug: 'mode-lifestyle', pattern: /\b(mode|d[ée]fil[ée]|fashion|beaut[ée]|lifestyle|coiffure|make[- ]?up)\b/i },
  { slug: 'cinema-audiovisuel', pattern: /\b(cin[ée]ma|projection|film|court[- ]m[ée]trage|documentaire|avant[- ]premi[èe]re)\b/i },
  { slug: 'jeux-esport', pattern: /\b(esport|e[- ]sport|gaming|jeux vid[ée]o|tournoi de jeux|lan party)\b/i },
  { slug: 'education-jeunesse', pattern: /\b(rentr[ée]e|[ée]tudiant|universit[ée]|lyc[ée]e|orientation scolaire|bourse d'[ée]tude)\b/i },
  { slug: 'voyage-plein-air', pattern: /\b(randonn[ée]e|excursion|voyage|camping|plein air|safari|escapade)\b/i },
];

export interface CategoryLike {
  id: number;
  slug?: string;
  name: string;
}

/**
 * Renvoie la catégorie suggérée, ou `null` si rien ne ressort clairement.
 *
 * @param text  Ce que l'organisateur a saisi (titre, et éventuellement début
 *              de description).
 * @param categories Catégories réellement disponibles côté serveur.
 */
export function suggestCategory<T extends CategoryLike>(
  text: string,
  categories: T[],
): T | null {
  const haystack = (text || '').trim();
  // En dessous de trois caractères, on est au milieu d'un mot : suggérer
  // maintenant ferait clignoter la proposition à chaque frappe.
  if (haystack.length < 3 || !categories?.length) return null;

  for (const rule of RULES) {
    if (!rule.pattern.test(haystack)) continue;
    const match = categories.find((c) => c.slug === rule.slug);
    // Une règle peut viser une catégorie absente de ce serveur : on continue
    // de chercher plutôt que d'abandonner.
    if (match) return match;
  }
  return null;
}
