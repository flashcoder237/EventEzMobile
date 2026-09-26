/**
 * Réécriture des chemins web `/dashboard/*` vers les routes mobiles.
 *
 * Les emails transactionnels du backend pointent vers l'espace web
 * (`FRONTEND_URL/dashboard/...`, cf. apps/notifications, email_automation.py).
 * Sur mobile, ces sections vivent sous d'autres noms d'écran : sans cette
 * réécriture, un lien email ouvre le navigateur au lieu de l'app, même quand
 * l'universal link est bien capté par l'OS.
 *
 * ⚠️ Règle : tout chemin déclaré ici DOIT avoir un écran correspondant dans
 * `linking.config.screens` (App.tsx) ET un intent-filter / une entrée AASA qui
 * le capte. Capter une URL sans savoir la résoudre ouvre l'app sur du vide —
 * c'est pire que de laisser le navigateur s'en charger.
 */

/**
 * ⚠️ ORDRE SIGNIFICATIF : les motifs à segment (…/{id}) doivent précéder les
 * motifs d'index, sinon l'index les capterait d'abord.
 */
export const DASHBOARD_REWRITES: Array<[RegExp, string]> = [
  // `/dashboard/registrations?event={id}` = liste des participants d'un event
  // (vue ORGANISATEUR, lien des emails de nouvelle inscription). Elle tombait
  // sur `/tickets`, la liste des billets ACHETÉS : mauvaise destination, sans
  // aucune erreur pour le signaler.
  [/^\/dashboard\/registrations\/?\?.*\bevent=([^&#]+).*$/, '/event-registrations/$1'],
  // Détail d'une inscription — lien de l'email de confirmation, le plus cliqué
  // du produit. Ouvrait le navigateur faute d'ancrage sur le segment.
  [/^\/dashboard\/registrations\/([^/?#]+)\/?$/, '/registrations/$1'],
  [/^\/dashboard\/tickets\/?$/, '/tickets'],
  // Les inscriptions sont regroupées avec les billets côté mobile (MyTickets).
  [/^\/dashboard\/registrations\/?$/, '/tickets'],
  // Édition d'un événement — lien de l'email « modifications demandées ».
  [/^\/dashboard\/events\/([^/?#]+)\/edit\/?$/, '/events/$1/edit'],
  [/^\/dashboard\/events\/?$/, '/my-events'],
  [/^\/dashboard\/payments\/?$/, '/my-payments'],
];

export function rewriteDashboardPath(path: string): string {
  // On ne réécrit que le pathname ; on préserve la query string (ex: ?event=…).
  const [pathname, query] = path.split('?');
  for (const [pattern, replacement] of DASHBOARD_REWRITES) {
    // Les motifs qui extraient un id depuis la QUERY (ex: `?event=`) doivent
    // voir la chaîne complète ; les autres ne matchent que le pathname.
    const readsQuery = replacement.startsWith('/event-registrations');
    const subject = readsQuery ? path : pathname;
    if (!pattern.test(subject)) continue;
    // `$1` reporte le segment capturé (id d'inscription, d'event).
    const cleanPath = subject.replace(pattern, replacement).split('?')[0];
    // Quand l'id vient de la query, il est déjà dans le chemin : le réinjecter
    // produirait `/event-registrations/42?event=42`.
    if (readsQuery) return cleanPath;
    return query ? `${cleanPath}?${query}` : cleanPath;
  }
  return path;
}
