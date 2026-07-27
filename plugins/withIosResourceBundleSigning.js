/**
 * Expo Config Plugin — Désactive la signature des resource bundles iOS.
 *
 * Problème : depuis Xcode 14, les resource bundles sont signés par défaut, ce qui
 * exige un "development team" sur CHAQUE target de type resource bundle. Certains
 * pods (ex : GoogleMaps, react-native-maps, des libs Firebase/gRPC) embarquent des
 * resource bundles sans team → le build EAS échoue avec :
 *
 *   ❌ Starting from Xcode 14, resource bundles are signed by default, which
 *      requires setting the development team for each resource bundle target.
 *
 * Le message suggère de downgrader Xcode ou de passer à SDK 46+ — trompeur ici
 * (on est déjà en SDK 52). Le vrai fix communautaire est d'injecter dans le
 * post_install du Podfile un bloc qui, pour tout target dont le
 * PRODUCT_TYPE est "com.apple.product-type.bundle" (= resource bundle), force
 * CODE_SIGNING_ALLOWED = NO. Les resource bundles n'ont pas besoin d'être signés
 * indépendamment : ils sont embarqués dans l'app déjà signée.
 *
 * Projet en Expo managed (pas de ios/ commité, généré au build via prebuild) →
 * on patche le Podfile via withDangerousMod plutôt qu'à la main. Idempotent.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# eventez:disable-resource-bundle-signing';
const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == 'com.apple.product-type.bundle'
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end
`;

module.exports = function withIosResourceBundleSigning(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      // Idempotent : ne réinjecte pas sur rebuild.
      if (contents.includes(MARKER)) {
        return cfg;
      }

      // On insère juste après l'ouverture du bloc `post_install do |installer|`.
      const postInstallRe = /post_install do \|installer\|\n/;
      if (postInstallRe.test(contents)) {
        contents = contents.replace(postInstallRe, (match) => `${match}${SNIPPET}\n`);
      } else {
        // Aucun post_install → on en crée un à la fin (avant le dernier `end` du target).
        contents += `\npost_install do |installer|\n${SNIPPET}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
};
