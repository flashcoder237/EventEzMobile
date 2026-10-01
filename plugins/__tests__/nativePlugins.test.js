/**
 * Plugins de config du lot natif : vérifie ce qui peut l'être sans prebuild
 * (déclarations ajoutées, idempotence). La compilation native, elle, ne se
 * vérifie que par un build EAS development.
 */
const withAndroidShareIntent = require('../withAndroidShareIntent');
const withEventezIosExtensions = require('../withEventezIosExtensions');

function baseConfig() {
  return {
    name: 'EventEz',
    slug: 'EventEzMobile',
    version: '1.3.5',
    ios: { bundleIdentifier: 'net.overbrand.eventez' },
    android: { package: 'net.overbrand.eventez' },
  };
}

describe('withEventezIosExtensions', () => {
  it('déclare l’extension à EAS (provisioning + App Group) une seule fois', () => {
    let config = withEventezIosExtensions(baseConfig());
    config = withEventezIosExtensions(config);
    const exts = config.extra.eas.build.experimental.ios.appExtensions;
    expect(exts).toHaveLength(1);
    expect(exts[0]).toEqual({
      targetName: 'EventezWidgets',
      bundleIdentifier: 'net.overbrand.eventez.EventezWidgets',
      entitlements: { 'com.apple.security.application-groups': ['group.net.overbrand.eventez'] },
    });
  });

  it('enregistre les mods iOS attendus (entitlements, Info.plist, xcodeproj, fichiers)', () => {
    const config = withEventezIosExtensions(baseConfig());
    expect(typeof config.mods.ios.entitlements).toBe('function');
    expect(typeof config.mods.ios.infoPlist).toBe('function');
    expect(typeof config.mods.ios.xcodeproj).toBe('function');
    expect(typeof config.mods.ios.dangerous).toBe('function');
  });
});

describe('withAndroidShareIntent', () => {
  it('enregistre un mod de manifeste Android', () => {
    const config = withAndroidShareIntent(baseConfig());
    expect(typeof config.mods.android.manifest).toBe('function');
  });
});

describe('app.config.js — opt-in iOS', () => {
  const load = () => {
    jest.resetModules();
    return require('../../app.config.js')({ config: {} });
  };
  const names = (cfg) => cfg.plugins.map((p) => (Array.isArray(p) ? p[0] : p));

  afterEach(() => {
    delete process.env.EVENTEZ_IOS_EXTENSIONS;
    delete process.env.EVENTEZ_IOS_APP_INTENTS;
    delete process.env.EVENTEZ_IOS_TIME_SENSITIVE;
  });

  it('n’ajoute aucune extension iOS par défaut (build production inchangé)', () => {
    const cfg = load();
    expect(names(cfg)).not.toContain('./plugins/withEventezIosExtensions');
    expect(names(cfg)).not.toContain('./plugins/withEventezAppIntents');
    expect(names(cfg)).not.toContain('./plugins/withEventezTimeSensitive');
    expect(names(cfg)).toContain('./plugins/withAndroidShareIntent');
  });

  it('active chaque brique par sa variable', () => {
    process.env.EVENTEZ_IOS_EXTENSIONS = '1';
    process.env.EVENTEZ_IOS_APP_INTENTS = '1';
    process.env.EVENTEZ_IOS_TIME_SENSITIVE = '1';
    const cfg = load();
    expect(names(cfg)).toEqual(
      expect.arrayContaining([
        './plugins/withEventezIosExtensions',
        './plugins/withEventezAppIntents',
        './plugins/withEventezTimeSensitive',
      ]),
    );
  });
});
