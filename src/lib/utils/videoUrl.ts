/**
 * Validation et conversion d'URL video (YouTube/Vimeo) cote mobile.
 * Mirror du backend `apps/events/video_utils.py` et du frontend
 * `eventez-frontend/src/lib/utils/videoUrl.ts` — garder synchronise.
 */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  // Domaine que NOUS produisons : une URL deja propre (recopiee depuis un
  // autre evenement) doit rester reconnue.
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const VIMEO_HOSTS = new Set([
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]);

export function getEmbedUrl(url: string): string {
  if (!url) return '';

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return '';
  }

  const host = parsed.host.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    if (host === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\//, '');
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`;
      }
    }
    if (parsed.pathname === '/watch') {
      const videoId = parsed.searchParams.get('v') || '';
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`;
      }
    }
    if (parsed.pathname.startsWith('/embed/')) {
      // TROU EVITE : on renvoyait l'URL telle quelle. Un organisateur qui
      // colle le lien du bouton « Partager > Integrer » de YouTube
      // contournait donc le domaine sans cookies, et ses visiteurs
      // recevaient les traceurs. On reecrit le domaine en preservant les
      // parametres choisis.
      const videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}${parsed.search}`;
      }
      return url;
    }
    if (parsed.pathname.startsWith('/shorts/')) {
      const videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1`;
      }
    }
  }

  if (VIMEO_HOSTS.has(host)) {
    const match = parsed.pathname.match(/^\/(\d+)/);
    if (match) {
      const videoId = match[1];
      return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&controls=0&background=1`;
    }
    if (parsed.pathname.startsWith('/video/')) {
      return url;
    }
  }

  return '';
}

/**
 * URL embed de la vidéo de couverture d'un événement. Le serveur la fournit
 * (`cover_video_embed`), mais l'endpoint DÉTAIL l'a longtemps omise : on la
 * déduit alors de `cover_video_url` (sinon la fiche n'affichait aucune vidéo
 * alors que la carte de l'accueil la jouait).
 */
export function resolveCoverEmbed(
  event: { cover_video_embed?: string | null; cover_video_url?: string | null } | null | undefined,
): string {
  if (!event) return '';
  return event.cover_video_embed || getEmbedUrl(event.cover_video_url || '');
}

export function isExternalVideoUrl(url: string): boolean {
  return Boolean(getEmbedUrl(url));
}

export function getVideoProvider(url: string): 'youtube' | 'vimeo' | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.host.toLowerCase();
  if (YOUTUBE_HOSTS.has(host) && getEmbedUrl(url)) return 'youtube';
  if (VIMEO_HOSTS.has(host) && getEmbedUrl(url)) return 'vimeo';
  return null;
}

/**
 * Source WebView pour un lecteur YouTube/Vimeo intégré.
 *
 * YouTube refuse désormais les lecteurs chargés SANS Referer (« Erreur 153 —
 * erreur de configuration du lecteur vidéo ») : c'est le cas d'une WebView qui
 * ouvre directement l'URL d'embed. On charge donc une page hôte minimale dont
 * l'origine est notre site (`baseUrl`) et qui contient l'iframe : le lecteur
 * reçoit un Referer valide. Le paramètre `origin` est aussi ajouté pour
 * YouTube, comme le recommande son API.
 */
export function buildEmbedSource(embedUrl: string, siteUrl: string): { html: string; baseUrl: string } {
  const origin = siteUrl.replace(/\/+$/, '');
  let src = embedUrl;
  try {
    const u = new URL(embedUrl);
    if (/youtube(-nocookie)?\.com$/i.test(u.host)) {
      u.searchParams.set('origin', origin);
      u.searchParams.set('playsinline', '1');
    }
    src = u.toString();
  } catch {
    // URL invalide : on la garde telle quelle, la page hôte reste inoffensive.
  }
  const safeSrc = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const html =
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">' +
    '<meta name="referrer" content="strict-origin-when-cross-origin">' +
    '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}' +
    'iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}</style></head>' +
    `<body><iframe src="${safeSrc}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" ` +
    'allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>';
  return { html, baseUrl: `${origin}/` };
}
