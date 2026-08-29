/**
 * Expo Config Plugin — Propage les intent-filters de DEEP LINK sur les
 * activity-alias d'icônes alternatives.
 *
 * Problème (diagnostiqué via `adb shell dumpsys package`) :
 * `expo-dynamic-app-icon` crée un `<activity-alias>` par icône alternative
 * (MainActivitynuit / MainActivityocean / MainActivityor) avec UNIQUEMENT un
 * intent-filter MAIN + LAUNCHER. Quand l'utilisateur choisit une icône
 * alternative, le module DÉSACTIVE `MainActivity` (qui porte les intent-filters
 * https de deep linking) et ACTIVE l'alias correspondant. Or l'alias n'a PAS
 * ces filtres → plus aucune activité ne reçoit les universal links
 * `https://eventez.online/...` → ils ouvrent le navigateur au lieu de l'app.
 * Résultat observé : « depuis que l'utilisateur a changé d'icône, les deeplinks
 * ne marchent plus », sur Android.
 *
 * Fix : pour CHAQUE activity-alias, on recopie le(s) intent-filter(s) VIEW/https
 * de `MainActivity` (avec autoVerify). Ainsi l'alias actif reçoit les liens,
 * quelle que soit l'icône choisie. La vérification App Links (assetlinks.json)
 * couvre déjà toutes les activités du package — pas de config serveur en plus.
 *
 * DOIT tourner APRÈS expo-dynamic-app-icon (qui génère les alias) → enregistré
 * après lui dans app.config.js.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAlternateIconDeepLinks(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;

    const mainActivity = (app.activity || []).find(
      (a) => a?.$?.['android:name'] === '.MainActivity',
    );
    const aliases = app['activity-alias'] || [];
    if (!mainActivity || aliases.length === 0) return cfg;

    // Récupère les intent-filters VIEW (deep link) de MainActivity — ce sont
    // ceux avec au moins une <data android:scheme="https">. On EXCLUT les
    // filtres MAIN/LAUNCHER (l'alias a déjà le sien).
    const deepLinkFilters = (mainActivity['intent-filter'] || []).filter(
      (f) => {
        const data = f.data || [];
        return data.some((d) => d?.$?.['android:scheme'] === 'https');
      },
    );
    if (deepLinkFilters.length === 0) return cfg;

    for (const alias of aliases) {
      alias['intent-filter'] = alias['intent-filter'] || [];
      // Évite les doublons si le plugin re-tourne (idempotence prebuild).
      const alreadyHasHttps = alias['intent-filter'].some((f) =>
        (f.data || []).some((d) => d?.$?.['android:scheme'] === 'https'),
      );
      if (alreadyHasHttps) continue;
      // Copie profonde des filtres deep link vers l'alias.
      for (const f of deepLinkFilters) {
        alias['intent-filter'].push(JSON.parse(JSON.stringify(f)));
      }
    }

    return cfg;
  });
};
