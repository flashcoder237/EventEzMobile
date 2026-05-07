/**
 * Expo Config Plugin — Notifee Maven repo registration
 *
 * @notifee/react-native publie son AAR Android dans son propre dossier
 * `android/libs` (PAS sur Maven Central). Sans déclarer ce repo, Gradle
 * cherche `app.notifee:core:+` dans Google/MavenCentral/JitPack et plante :
 *
 *   Could not find any matches for app.notifee:core:+ as no versions of
 *   app.notifee:core are available.
 *
 * Ce plugin patche `android/build.gradle` (allprojects.repositories) pour
 * ajouter le maven local. Permet à `npx expo run:android` (qui regenère le
 * dossier android/) de retomber correctement après chaque prebuild.
 *
 * Référence : https://notifee.app/react-native/docs/installation
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const NOTIFEE_REPO_LINE =
  'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';

// Marqueur unique — on ne ré-injecte pas si déjà présent (rebuild idempotent).
const MARKER = '@notifee/react-native/android/libs';

function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      // build.gradle.kts non supporté ici — l'app utilise Groovy
      throw new Error(
        '[withNotifeeMavenRepo] Seul build.gradle Groovy est supporté.',
      );
    }

    const original = config.modResults.contents;
    if (original.includes(MARKER)) {
      // Déjà patché — no-op (idempotence sur prebuild successifs).
      return config;
    }

    // Insère après "mavenCentral()" dans le PREMIER bloc allprojects.repositories.
    // Pattern volontairement large : tolère l'indentation et les espaces variables.
    const patched = original.replace(
      /(allprojects\s*\{[^}]*?repositories\s*\{[^}]*?mavenCentral\(\))/s,
      `$1\n    ${NOTIFEE_REPO_LINE}`,
    );

    if (patched === original) {
      throw new Error(
        '[withNotifeeMavenRepo] Impossible de localiser le bloc allprojects.repositories. ' +
        'Vérifie que android/build.gradle a bien la structure générée par Expo.',
      );
    }

    config.modResults.contents = patched;
    return config;
  });
}

module.exports = withNotifeeMavenRepo;
