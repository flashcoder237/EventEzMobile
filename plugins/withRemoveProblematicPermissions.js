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
 *                             Remplacee par READ_MEDIA_IMAGES si necessaire
 *                             (ajoutee automatiquement par les modules concernes).
 *
 * Sans ce plugin, ces permissions remontent quand meme dans le manifest
 * fusionne et Play Console les flag dans le formulaire Data Safety.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
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
