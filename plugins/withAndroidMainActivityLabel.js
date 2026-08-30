/**
 * Expo Config Plugin — pose android:label sur la MainActivity.
 *
 * Problème : Expo ne met android:label QUE sur <application>. La MainActivity
 * (activité launcher) n'en a pas. Certains écrans système Android — notamment
 * « Ouverture des liens » (Paramètres → Applis → Ouvrir par défaut) et, sur
 * certaines surcouches (Motorola…), le launcher — affichent le nom de
 * l'ACTIVITÉ. Sans label d'activité, ils retombent sur le PACKAGE NAME
 * (« net.overbrand.eventez ») au lieu du nom de l'app (« EventEz »).
 *
 * Les apps qui s'affichent correctement (Meet, Messenger…) déclarent un
 * android:label sur leur activité launcher. Ce plugin fait pareil : il pointe
 * la MainActivity sur @string/app_name — la MÊME ressource que celle utilisée
 * par <application android:label> (générée par Expo depuis expo.name) — donc le
 * libellé reste synchronisé avec `name` sans valeur codée en dur.
 *
 * Managed workflow (pas de dossier android/ commité) → on édite le manifest via
 * withAndroidManifest, appliqué au prebuild/build. Idempotent.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const APP_NAME_REF = '@string/app_name';

module.exports = function withAndroidMainActivityLabel(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app || !Array.isArray(app.activity)) return cfg;

    // MainActivity = l'activité qui porte l'intent-filter MAIN/LAUNCHER.
    const isLauncher = (act) =>
      (act['intent-filter'] || []).some((f) =>
        (f.action || []).some(
          (a) => a.$?.['android:name'] === 'android.intent.action.MAIN',
        ) &&
        (f.category || []).some(
          (c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER',
        ),
      );

    const main =
      app.activity.find(isLauncher) ||
      app.activity.find((a) => a.$?.['android:name'] === '.MainActivity');

    if (main) {
      main.$ = main.$ || {};
      main.$['android:label'] = APP_NAME_REF;
    }
    return cfg;
  });
};
