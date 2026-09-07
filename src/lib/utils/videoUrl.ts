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
