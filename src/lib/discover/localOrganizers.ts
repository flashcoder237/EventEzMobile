/**
 * Sélection des organisateurs à montrer sur l'accueil.
 *
 * La logique vit ici plutôt que dans l'écran pour être testable sans
 * monter tout `DiscoverScreen` : ce qui compte n'est pas le rendu, c'est
 * la RÈGLE de sélection — quelle ville on interroge, et ce qu'on fait
 * quand elle ne donne rien.
 */

export const LOCAL_ORGANIZERS_LIMIT = 8;

export interface LocalOrganizersResult {
  organizers: any[];
  /** Ville réellement utilisée, ou null si on a servi la sélection
   *  nationale. Le titre s'appuie dessus pour ne pas mentir. */
  city: string | null;
}

type Loader = (params: Record<string, any>) => Promise<any[]>;

/**
 * @param loader  effectue l'appel réseau et renvoie les lignes
 * @param city    ville déclarée dans le profil de l'utilisateur connecté
 */
export async function selectLocalOrganizers(
  loader: Loader,
  city?: string | null,
): Promise<LocalOrganizersResult> {
  const trimmed = (city || '').trim();

  // `has_events` écarte les profils sans aucun événement publié : sur une
  // vitrine, un profil vide est la pire première impression possible.
  const baseParams = {
    has_events: 'true',
    limit: LOCAL_ORGANIZERS_LIMIT,
    ordering: '-events',
  };

  try {
    let rows = await loader(
      trimmed ? { ...baseParams, city: trimmed } : baseParams,
    );

    if (trimmed && rows.length === 0) {
      // Repli national : un rail vide serait pire que des organisateurs
      // un peu plus loin.
      rows = await loader(baseParams);
      return { organizers: rows.slice(0, LOCAL_ORGANIZERS_LIMIT), city: null };
    }

    return {
      organizers: rows.slice(0, LOCAL_ORGANIZERS_LIMIT),
      city: trimmed || null,
    };
  } catch {
    // Échec silencieux : la section disparaît, l'accueil reste utilisable.
    return { organizers: [], city: null };
  }
}
