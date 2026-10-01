/**
 * G5 — « chut » en visio : scripts injectés dans la page Jitsi.
 *
 * On COUPE explicitement (jamais de bascule) : un raccourci clavier « m » / « v »
 * inverserait l'état et pourrait RÉACTIVER un micro déjà coupé. On passe par
 * l'API de la page Jitsi (`APP.conference.muteAudio/muteVideo(true)`), avec
 * l'API iframe (`executeCommand`) en repli quand l'état est lisible.
 *
 * La réactivation n'est JAMAIS automatique : seul le bouton « Réactiver » du
 * toast envoie `buildHushScript(false)`.
 */
export const HUSH_MESSAGE_TYPE = 'eventez-hush';

export function buildHushScript(mute: boolean): string {
  const flag = mute ? 'true' : 'false';
  return `(function(){
  var ok = false;
  try {
    var c = window.APP && window.APP.conference;
    if (c && typeof c.muteAudio === 'function') { c.muteAudio(${flag}); ok = true; }
    if (c && typeof c.muteVideo === 'function') { c.muteVideo(${flag}); ok = true; }
    if (!ok && window.api && typeof window.api.executeCommand === 'function'
        && typeof window.api.isAudioMuted === 'function') {
      window.api.isAudioMuted().then(function (m) { if (m !== ${flag}) window.api.executeCommand('toggleAudio'); });
      window.api.isVideoMuted().then(function (m) { if (m !== ${flag}) window.api.executeCommand('toggleVideo'); });
      ok = true;
    }
  } catch (e) { ok = false; }
  try {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: '${HUSH_MESSAGE_TYPE}', mute: ${flag}, ok: ok })
    );
  } catch (e) {}
})(); true;`;
}

export function parseHushMessage(raw: string): { mute: boolean; ok: boolean } | null {
  try {
    const data = JSON.parse(raw);
    if (!data || data.type !== HUSH_MESSAGE_TYPE) return null;
    return { mute: !!data.mute, ok: !!data.ok };
  } catch {
    return null;
  }
}
