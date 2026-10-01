/**
 * X12 — « Partager vers EventEz » (Android). Le texte partagé (souvent « Venez
 * à … https://eventez.online/events/slug ») est réduit à son lien EventEz,
 * puis rouvert en `eventez://…` : il passe ainsi par la MÊME table de routage
 * que les liens e-mail et universels (linking d'App.tsx : locale retirée,
 * /dashboard/* réécrit, recherche filtrée…). Aucun routage dupliqué ici.
 */
import { Linking } from 'react-native';
import { addShareListener, consumeSharedText } from '../../../modules/eventez-native/src';

// L'hôte doit se terminer net (« eventez.online.evil.com » ne passe pas).
const EVENTEZ_URL = /https?:\/\/(?:www\.)?eventez\.online(?![\w.-])(\/[^\s"'<>]*)?/i;
const EVENTEZ_SCHEME = /eventez:\/\/([^\s"'<>]+)/i;

/**
 * Chemin EventEz (sans le / initial) contenu dans un texte partagé, ou null.
 * `https://eventez.online/` seul → '' (accueil).
 */
export function extractEventezPath(text: string | null | undefined): string | null {
  if (!text) return null;
  const scheme = text.match(EVENTEZ_SCHEME);
  if (scheme) return scheme[1].replace(/[).,;!?]+$/, '');
  const web = text.match(EVENTEZ_URL);
  if (!web) return null;
  // Ponctuation collée au lien dans une phrase (« …/events/fete). »).
  return (web[1] || '/').replace(/[).,;!?]+$/, '').replace(/^\//, '');
}

function open(text: string, onNotEventez?: () => void) {
  const path = extractEventezPath(text);
  if (path == null) {
    onNotEventez?.();
    return;
  }
  Linking.openURL(`eventez://${path}`).catch(() => {});
}

/** Traite le partage qui a lancé l'app, puis écoute les suivants. */
export function listenToShareIntents(onNotEventez?: () => void): () => void {
  const initial = consumeSharedText();
  if (initial) open(initial, onNotEventez);
  const sub = addShareListener((text) => open(text, onNotEventez));
  return () => sub.remove();
}
