/**
 * withNotificationServiceExtension — Expo config plugin
 *
 * ⚠️ DÉSACTIVÉ (non listé dans app.json > plugins) depuis le 2026-07-27.
 *
 * Raison : la NSE exige son propre provisioning profile (bundle ID
 * net.overbrand.eventez.NotificationService) qu'EAS ne génère pas
 * automatiquement pour une extension ajoutée par config plugin → build iOS
 * bloqué. Surtout, l'analyse a montré qu'elle est INOPÉRANTE en l'état : le
 * chemin FCM direct → NSE ne fonctionne pas sur iOS sans le SDK Firebase iOS
 * (@react-native-firebase + GoogleService-Info.plist), absent ici. Le
 * `getDevicePushTokenAsync()` iOS renvoie un token APNs que firebase-admin ne
 * sait pas router → fallback Expo Push. Les images riches iOS passent donc
 * désormais par Expo Push (`richContent.image` + `mutableContent`, ajouté côté
 * backend dans _send_expo_push), SANS aucune NSE.
 *
 * Pour réactiver un jour (rendu natif avancé) : (1) ajouter le SDK Firebase iOS
 * pour obtenir un vrai token FCM, (2) re-lister ce plugin, (3) fournir le
 * provisioning profile de l'extension via credentials.json. Le code de la NSE
 * (plugins/notification-service-extension/) est conservé intact.
 *
 * ─── Rôle d'origine (quand actif) ───
 * Ajoute une Notification Service Extension iOS au projet au `eas build`. La
 * NSE intercepte les push `mutable-content: 1` et télécharge l'image dans
 * `attachments` → rendu riche natif iOS.
 */

const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NSE_TARGET_NAME = 'EventEzNotificationService';
const NSE_SOURCE_FILE = 'NotificationService.swift';
const NSE_PLIST_FILE = 'NotificationService-Info.plist';

// Apple Team ID (Brice Kisito Banfack Temena — Individual). Requis pour signer
// la NSE : sur EAS Build (non-interactif), une target d'extension sans
// DEVELOPMENT_TEAM échoue avec « Signing ... requires a development team ».
// Peut être surchargé via la variable d'env EXPO_APPLE_TEAM_ID.
const APPLE_TEAM_ID = process.env.EXPO_APPLE_TEAM_ID || '9T6HK8G8B5';

function withNotificationServiceExtension(config) {
  // 1. Modifier l'app principale : déjà OK via expo-notifications plugin.
  //    On ne touche pas au Info.plist principal — l'extension a son propre plist.

  // 2. Ajouter la cible NSE au pbxproj Xcode.
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const sourceFolder = path.resolve(
      projectRoot,
      'plugins',
      'notification-service-extension'
    );
    const targetFolder = path.join(platformProjectRoot, NSE_TARGET_NAME);

    // Créer le dossier de la cible dans ios/
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Copier les fichiers Swift et plist
    const filesToCopy = [
      { src: NSE_SOURCE_FILE, dest: NSE_SOURCE_FILE },
      { src: NSE_PLIST_FILE, dest: 'Info.plist' },
    ];
    for (const file of filesToCopy) {
      const srcPath = path.join(sourceFolder, file.src);
      const destPath = path.join(targetFolder, file.dest);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Si la cible existe déjà (rebuild), on ne la recrée pas.
    if (xcodeProject.pbxTargetByName(NSE_TARGET_NAME)) {
      return config;
    }

    // Bundle ID = main + .NotificationService
    const mainBundleId =
      config.ios?.bundleIdentifier || 'net.overbrand.eventez';
    const nseBundleId = `${mainBundleId}.NotificationService`;

    // Ajouter la cible NSE
    const target = xcodeProject.addTarget(
      NSE_TARGET_NAME,
      'app_extension',
      NSE_TARGET_NAME,
      nseBundleId
    );

    // Ajouter les fichiers à la build phase Sources
    xcodeProject.addBuildPhase(
      [NSE_SOURCE_FILE],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid
    );

    // Ajouter Info.plist à la cible
    xcodeProject.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid
    );

    // Configurer build settings minimums (Swift, deployment target, etc.)
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (
        config.buildSettings &&
        config.buildSettings.PRODUCT_NAME === `"${NSE_TARGET_NAME}"`
      ) {
        config.buildSettings.SWIFT_VERSION = '5.0';
        config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '13.4';
        config.buildSettings.INFOPLIST_FILE = `${NSE_TARGET_NAME}/Info.plist`;
        config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = nseBundleId;
        config.buildSettings.CODE_SIGN_STYLE = 'Automatic';
        // DEVELOPMENT_TEAM explicite : sans elle, la signature de l'extension
        // échoue sur EAS Build (« requires a development team »).
        config.buildSettings.DEVELOPMENT_TEAM = APPLE_TEAM_ID;
        config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
      }
    }

    // Ajouter le groupe NSE_TARGET_NAME dans le Project Navigator
    const groupKey = xcodeProject.pbxCreateGroup(
      NSE_TARGET_NAME,
      NSE_TARGET_NAME
    );
    xcodeProject.addToPbxGroup(NSE_SOURCE_FILE, groupKey);
    xcodeProject.addToPbxGroup('Info.plist', groupKey);

    return config;
  });

  return config;
}

module.exports = withNotificationServiceExtension;
