/**
 * withNotificationServiceExtension — Expo config plugin
 *
 * Ajoute une Notification Service Extension iOS au projet au moment du
 * `eas build`. La NSE intercepte les push avec `mutable-content: 1` et
 * télécharge l'image dans `attachments` → BigPictureStyle natif iOS.
 *
 * Sans ce plugin, les notifs riches iOS s'affichent en banner texte simple
 * même avec image_url dans le payload.
 *
 * Pré-requis backend : payload APNs avec `aps.mutable-content = 1` +
 * `data.image_url` (déjà fait par fcm_service.py).
 */

const { withXcodeProject, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NSE_TARGET_NAME = 'EventEzNotificationService';
const NSE_SOURCE_FILE = 'NotificationService.swift';
const NSE_PLIST_FILE = 'NotificationService-Info.plist';

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
      config.ios?.bundleIdentifier || 'com.eventez.mobile';
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
