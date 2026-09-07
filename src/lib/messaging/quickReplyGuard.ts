/**
 * Garde anti-envoi d'une réponse rapide non complétée.
 *
 * Les réponses rapides de l'organisateur posent une AMORCE
 * (« 📍 Adresse : »), pas un message fini. Rien ne le disait : on
 * appuyait sur la puce, ça remplissait le champ, on envoyait — et la
 * discussion de l'événement recevait une phrase inachevée, visible de
 * tous les participants.
 *
 * La règle vit ici plutôt que dans l'écran pour être testable sans monter
 * tout ConversationScreen : c'est la règle qui compte, pas le rendu.
 */

/**
 * `true` si le message contient au moins une ligne qui est EXACTEMENT un
 * gabarit resté sur son deux-points.
 *
 * On compare aux gabarits réels plutôt que de refuser tout message
 * finissant par « : » — sinon on bloquerait quelqu'un qui écrit
 * légitimement « Voici le lien : » suivi d'un envoi de fichier.
 */
export function hasUntouchedTemplate(
  message: string,
  templates: string[],
): boolean {
  const normalized = templates
    .map((tpl) => tpl.trim())
    // Seuls les gabarits en attente de complétion sont concernés. Un
    // gabarit déjà complet (« Merci pour ton message… ») s'envoie tel quel.
    .filter((tpl) => /:$/.test(tpl));

  if (!normalized.length) return false;

  return message
    .split('\n')
    .some((line) => {
      const trimmed = line.trim();
      return !!trimmed && normalized.includes(trimmed);
    });
}
