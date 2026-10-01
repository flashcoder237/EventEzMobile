/**
 * withEventezAppIntents — X4 : « Montrer mon billet » (Siri, Spotlight,
 * Raccourcis, bouton Action) sur iOS 16+.
 *
 * OPT-IN : appliqué si EVENTEZ_IOS_APP_INTENTS=1 (cf. app.config.js). Aucun
 * provisioning supplémentaire (pas de capability), mais la compilation Swift
 * dans la cible principale ne peut être vérifiée que par un build EAS.
 *
 * Le fichier va dans la cible de l'APP : Xcode n'extrait les métadonnées App
 * Intents (phrases Siri) que des cibles qui les compilent directement — un
 * pod/framework statique ne suffit pas.
 */
const { withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILE = 'EventezAppIntents.swift';

module.exports = function withEventezAppIntents(config) {
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'plugins', 'eventez-app-intents', FILE);
      const dest = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName, FILE);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      return cfg;
    },
  ]);

  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    const filepath = `${projectName}/${FILE}`;
    if (!project.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project,
      });
    }
    return cfg;
  });
};
