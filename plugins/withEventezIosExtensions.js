/**
 * withEventezIosExtensions — X1 / X3 / X14 : extension widget iOS
 * (widget « Prochain billet » + Live Activities participant et organisateur).
 *
 * ⚠️ OPT-IN : n'est appliqué que si EVENTEZ_IOS_EXTENSIONS=1 (cf. app.config.js).
 * Leçon de la NSE (plugins/withNotificationServiceExtension.js) : une extension
 * ajoutée par plugin bloquait le build EAS faute de provisioning profile. Ici on
 * la DÉCLARE à EAS via `extra.eas.build.experimental.ios.appExtensions` pour
 * qu'il crée l'identifiant, le profil et l'App Group. Activer d'abord sur le
 * profil `development`, vérifier sur un iPhone, puis `preview`, puis production.
 *
 * Ce que fait le plugin :
 *  1. App : entitlement App Group + Info.plist `NSSupportsLiveActivities` et
 *     `EventezAppGroup` (lu par modules/eventez-native pour écrire le billet).
 *  2. Copie plugins/eventez-widgets/*.swift + l'attribut partagé
 *     modules/eventez-native/ios/EventezActivityAttributes.swift (SOURCE UNIQUE)
 *     dans ios/EventezWidgets/, génère Info.plist + entitlements.
 *  3. Ajoute la cible `EventezWidgets` (app_extension, iOS 16.2+) au pbxproj ;
 *     la lib xcode ajoute l'étape « Embed App Extensions » dans l'app.
 */
const {
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const plist = require('@expo/plist').default;
const fs = require('fs');
const path = require('path');

const TARGET = 'EventezWidgets';
const SWIFT_FILES = [
  'EventezWidgetsBundle.swift',
  'NextTicketWidget.swift',
  'EventezLiveActivity.swift',
];
const SHARED_ATTRIBUTES = 'EventezActivityAttributes.swift';
// Même Team ID que la NSE : une cible d'extension sans DEVELOPMENT_TEAM échoue
// à la signature sur EAS (« requires a development team »).
const APPLE_TEAM_ID = process.env.EXPO_APPLE_TEAM_ID || '9T6HK8G8B5';

function ids(config) {
  const bundleId = config.ios?.bundleIdentifier || 'net.overbrand.eventez';
  return {
    bundleId,
    widgetBundleId: `${bundleId}.${TARGET}`,
    appGroup: `group.${bundleId}`,
  };
}

function withAppSide(config) {
  const { appGroup } = ids(config);
  config = withEntitlementsPlist(config, (cfg) => {
    const key = 'com.apple.security.application-groups';
    const groups = new Set(cfg.modResults[key] || []);
    groups.add(appGroup);
    cfg.modResults[key] = Array.from(groups);
    return cfg;
  });
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    cfg.modResults.EventezAppGroup = appGroup;
    return cfg;
  });
  return config;
}

function withEasDeclaration(config) {
  const { widgetBundleId, appGroup } = ids(config);
  config.extra = config.extra || {};
  config.extra.eas = config.extra.eas || {};
  config.extra.eas.build = config.extra.eas.build || {};
  config.extra.eas.build.experimental = config.extra.eas.build.experimental || {};
  const ios = (config.extra.eas.build.experimental.ios = config.extra.eas.build.experimental.ios || {});
  const list = (ios.appExtensions = ios.appExtensions || []);
  if (!list.some((e) => e.targetName === TARGET)) {
    list.push({
      targetName: TARGET,
      bundleIdentifier: widgetBundleId,
      entitlements: { 'com.apple.security.application-groups': [appGroup] },
    });
  }
  return config;
}

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const { appGroup } = ids(cfg);
      const projectRoot = cfg.modRequest.projectRoot;
      const targetDir = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      fs.mkdirSync(targetDir, { recursive: true });

      for (const file of SWIFT_FILES) {
        fs.copyFileSync(path.join(projectRoot, 'plugins', 'eventez-widgets', file), path.join(targetDir, file));
      }
      fs.copyFileSync(
        path.join(projectRoot, 'modules', 'eventez-native', 'ios', SHARED_ATTRIBUTES),
        path.join(targetDir, SHARED_ATTRIBUTES),
      );

      const version = cfg.version || '1.0.0';
      const build = String(cfg.ios?.buildNumber || '1');
      fs.writeFileSync(
        path.join(targetDir, 'Info.plist'),
        plist.build({
          CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
          CFBundleDisplayName: 'EventEz',
          CFBundleExecutable: '$(EXECUTABLE_NAME)',
          CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
          CFBundleInfoDictionaryVersion: '6.0',
          CFBundleName: '$(PRODUCT_NAME)',
          CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
          // EAS (versions distantes) réécrit ces deux clés sur chaque cible
          // déclarée dans appExtensions ; valeurs locales = celles de l'app.
          CFBundleShortVersionString: version,
          CFBundleVersion: build,
          EventezAppGroup: appGroup,
          NSExtension: { NSExtensionPointIdentifier: 'com.apple.widgetkit-extension' },
        }),
      );
      fs.writeFileSync(
        path.join(targetDir, `${TARGET}.entitlements`),
        plist.build({ 'com.apple.security.application-groups': [appGroup] }),
      );
      return cfg;
    },
  ]);
}

/**
 * La lib xcode enregistre le nom de cible ENTRE GUILLEMETS (`"EventezWidgets"`) :
 * `pbxTargetByName(TARGET)` ne la retrouve pas et un 2e prebuild l'ajoutait
 * en double (même piège dans la NSE). On compare donc sans les guillemets.
 */
function findTarget(project, name) {
  const section = project.pbxNativeTargetSection();
  return Object.keys(section).find(
    (key) => typeof section[key] === 'object' && String(section[key].name).replace(/"/g, '') === name,
  );
}

function withWidgetTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    if (findTarget(project, TARGET)) return cfg;

    const { widgetBundleId } = ids(cfg);
    const files = [...SWIFT_FILES, SHARED_ATTRIBUTES];

    // Groupe dans le navigateur Xcode, chemins relatifs à ios/EventezWidgets/.
    const group = project.addPbxGroup([...files, 'Info.plist', `${TARGET}.entitlements`], TARGET, TARGET);
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.getPBXGroupByKey(mainGroupKey).children.push({ value: group.uuid, comment: TARGET });

    // Le template Expo n'a pas ces sections : sans elles, addTarget saute EN
    // SILENCE la dépendance app → extension (l'appex peut alors ne pas être
    // construit avant l'étape « Embed »). On les crée vides d'abord.
    const objects = project.hash.project.objects;
    objects.PBXTargetDependency = objects.PBXTargetDependency || {};
    objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};

    const target = project.addTarget(TARGET, 'app_extension', TARGET, widgetBundleId);
    // addBuildPhase réutilise les références de fichier créées par le groupe.
    project.addBuildPhase(files, 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);

    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const settings = configurations[key].buildSettings;
      if (!settings || settings.PRODUCT_NAME !== `"${TARGET}"`) continue;
      Object.assign(settings, {
        SWIFT_VERSION: '5.0',
        IPHONEOS_DEPLOYMENT_TARGET: '16.2',
        INFOPLIST_FILE: `${TARGET}/Info.plist`,
        CODE_SIGN_ENTITLEMENTS: `${TARGET}/${TARGET}.entitlements`,
        PRODUCT_BUNDLE_IDENTIFIER: widgetBundleId,
        CODE_SIGN_STYLE: 'Automatic',
        DEVELOPMENT_TEAM: APPLE_TEAM_ID,
        TARGETED_DEVICE_FAMILY: '"1,2"',
        GENERATE_INFOPLIST_FILE: 'NO',
        SKIP_INSTALL: 'YES',
        CLANG_ENABLE_MODULES: 'YES',
        LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      });
    }
    return cfg;
  });
}

module.exports = function withEventezIosExtensions(config) {
  config = withAppSide(config);
  config = withEasDeclaration(config);
  config = withWidgetFiles(config);
  config = withWidgetTarget(config);
  return config;
};
