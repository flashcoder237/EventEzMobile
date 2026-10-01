/**
 * withAndroidShareIntent — X12 : EventEz apparaît dans la feuille « Partager »
 * d'Android pour du TEXTE (un lien d'événement copié depuis WhatsApp, un
 * navigateur…). Le texte est lu par modules/eventez-native (consumeSharedText
 * au démarrage, événement onShareIntent quand l'app tourne déjà) puis routé
 * par src/lib/native/shareIntent.ts.
 *
 * Uniquement text/plain : aucune image ni fichier — rien à stocker, rien à
 * demander comme permission.
 */
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withAndroidShareIntent(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    const filters = (activity['intent-filter'] = activity['intent-filter'] || []);
    const already = filters.some((f) =>
      (f.action || []).some((a) => a.$['android:name'] === 'android.intent.action.SEND'),
    );
    if (!already) {
      filters.push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      });
    }
    return cfg;
  });
};
