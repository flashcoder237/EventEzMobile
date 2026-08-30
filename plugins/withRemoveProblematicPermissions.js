/**
 * Expo Config Plugin — retire les permissions Android problematiques pour
 * Play Store, ajoutees automatiquement par certaines libs natives.
 *
 *  - SYSTEM_ALERT_WINDOW  : permission "draw over other apps", strictement
 *                           controlee par Google. Cause de rejet quasi-systematique
 *                           si on n'est pas une app d'alarme/accessibilite.
 *                           Ajoutee par @notifee/react-native pour les alertes
 *                           in-app que nous n'utilisons pas.
 *
 *  - WRITE_EXTERNAL_STORAGE : depreciee depuis Android 11, inutile en
 *                             targetSdk >= 33. expo-image-picker et
 *                             expo-media-library utilisent les Photo Picker
 *                             APIs scopees a la place.
 *
 *  - READ_EXTERNAL_STORAGE  : meme histoire, ne fait plus rien en targetSdk 33+.
 *
 *  - READ_MEDIA_IMAGES / READ_MEDIA_VIDEO : permissions LARGES de lecture de la
 *      galerie (Android 13+). Google Play a REJETE l'app (version code 15) parce
 *      qu'elle les demandait alors qu'elle n'a qu'un usage ponctuel des medias
 *      -> la politique impose le photo picker systeme dans ce cas.
 *      expo-image-picker utilise deja le photo picker (aucune permission) et
 *      expo-media-library ne sert qu'a saveToLibraryAsync en writeOnly.
 *      ⚠️ NE PAS declarer expo-media-library comme plugin dans app.json : son
 *      config plugin RE-AJOUTE ces deux permissions (+ READ_MEDIA_AUDIO +
 *      requestLegacyExternalStorage) via granularPermissions par defaut. On les
 *      retire ici avec tools:node="remove" (le manifest merger gagne meme si un
 *      module les redeclare dans son propre AndroidManifest.xml).
 *
 * Sans ce plugin, ces permissions remontent quand meme dans le manifest
 * fusionne et Play Console les flag / rejette.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
  // Conformite Play (rejet version code 15) : usage ponctuel = photo picker,
  // pas de permission de lecture large. cf. blockedPermissions dans app.json.
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
];

function withRemoveProblematicPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // 1. Retirer les permissions du tableau principal si elles y sont.
    if (Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = manifest['uses-permission'].filter((p) => {
        const name = p.$ && p.$['android:name'];
        return !PERMISSIONS_TO_REMOVE.includes(name);
      });
    }

    // 2. Ajouter des marqueurs tools:node="remove" pour que le manifest
    //    merger Android retire ces permissions meme si une lib les rajoute
    //    plus tard via son propre AndroidManifest.xml.
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const perm of PERMISSIONS_TO_REMOVE) {
      manifest['uses-permission'].push({
        $: {
          'android:name': perm,
          'tools:node': 'remove',
        },
      });
    }

    return config;
  });
}

module.exports = withRemoveProblematicPermissions;
