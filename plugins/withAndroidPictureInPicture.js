/**
 * Expo Config Plugin — Active le Picture-in-Picture (PiP) Android pour la visio.
 *
 * Quand l'utilisateur quitte l'écran de visioconférence (bouton home / navigation
 * hors de l'app pendant un appel), on veut que la vidéo se réduise en fenêtre
 * flottante plutôt que de se couper. Android le permet au niveau ACTIVITY via
 * `enterPictureInPictureMode()`, mais il faut d'abord déclarer dans le manifeste :
 *   - android:supportsPictureInPicture="true"
 *   - android:configChanges incluant screenSize/smallestScreenSize/orientation
 *     (sinon l'activité est recréée en entrant/sortant du PiP → l'appel casse).
 *
 * Le projet est en Expo managed (pas de android/ commité), donc on édite le
 * manifeste au prebuild via ce plugin. Le déclenchement runtime se fait côté JS
 * (hook usePictureInPicture sur l'écran WebView de visio).
 *
 * iOS : le PiP WebView natif n'est pas fiable (WKWebView ne l'expose pas pour du
 * contenu WebRTC arbitraire) → non géré ici, comportement inchangé sur iOS.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PIP_CONFIG_CHANGES = [
  'screenSize',
  'smallestScreenSize',
  'screenLayout',
  'orientation',
];

module.exports = function withAndroidPictureInPicture(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app || !app.activity) return cfg;

    // Cible la MainActivity (celle avec l'intent LAUNCHER).
    const mainActivity = app.activity.find((a) => {
      const filters = a['intent-filter'] || [];
      return filters.some((f) =>
        (f.action || []).some((act) => act.$['android:name'] === 'android.intent.action.MAIN'),
      );
    });
    if (!mainActivity) return cfg;

    mainActivity.$['android:supportsPictureInPicture'] = 'true';

    // Fusionne les configChanges existants avec ceux requis par le PiP (sans doublon).
    const existing = (mainActivity.$['android:configChanges'] || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...existing, ...PIP_CONFIG_CHANGES]));
    mainActivity.$['android:configChanges'] = merged.join('|');

    return cfg;
  });
};
