/**
 * Vérifie les plugins iOS du lot natif SANS Mac : applique
 * withEventezIosExtensions + withEventezAppIntents (deux fois, pour
 * l'idempotence) sur le projet Xcode du template Expo SDK 54, puis contrôle le
 * pbxproj obtenu. `expo prebuild --platform ios` refuse de tourner sous Windows ;
 * ce script couvre ce trou. Il ne compile pas le Swift : seul un build EAS le fait.
 *
 *   node scripts/smoke-ios-native-plugins.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { compileModsAsync } = require(path.join(ROOT, 'node_modules/@expo/config-plugins'));
const xcode = require(path.join(ROOT, 'node_modules/xcode'));
const withExt = require(path.join(ROOT, 'plugins/withEventezIosExtensions'));
const withIntents = require(path.join(ROOT, 'plugins/withEventezAppIntents'));

function assert(cond, msg) {
  if (!cond) throw new Error(`ÉCHEC : ${msg}`);
  console.log(`ok  ${msg}`);
}

(async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'eventez-ios-smoke-'));
  execSync('npm pack expo-template-bare-minimum@sdk-54 --silent', { cwd: work });
  const tgz = fs.readdirSync(work).find((f) => f.endsWith('.tgz'));
  execSync(`tar xzf ${tgz}`, { cwd: work });

  const proj = path.join(work, 'proj');
  fs.mkdirSync(path.join(proj, 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(proj, 'modules/eventez-native/ios'), { recursive: true });
  fs.cpSync(path.join(work, 'package/ios'), path.join(proj, 'ios'), { recursive: true });
  for (const dir of ['eventez-widgets', 'eventez-app-intents']) {
    fs.cpSync(path.join(ROOT, 'plugins', dir), path.join(proj, 'plugins', dir), { recursive: true });
  }
  fs.copyFileSync(
    path.join(ROOT, 'modules/eventez-native/ios/EventezActivityAttributes.swift'),
    path.join(proj, 'modules/eventez-native/ios/EventezActivityAttributes.swift'),
  );
  fs.writeFileSync(path.join(proj, 'package.json'), '{"name":"smoke","version":"1.0.0"}');

  for (let pass = 0; pass < 2; pass++) {
    let config = {
      name: 'HelloWorld',
      slug: 'smoke',
      version: '1.3.5',
      ios: { bundleIdentifier: 'net.overbrand.eventez' },
      _internal: { projectRoot: proj },
    };
    config = withIntents(withExt(config));
    await compileModsAsync(config, { projectRoot: proj, platforms: ['ios'], assertMissingModProviders: false });
  }

  const p = xcode.project(path.join(proj, 'ios/HelloWorld.xcodeproj/project.pbxproj'));
  p.parseSync();
  const targets = Object.values(p.pbxNativeTargetSection()).filter((t) => typeof t === 'object');
  const widget = targets.filter((t) => String(t.name).replace(/"/g, '') === 'EventezWidgets');
  assert(widget.length === 1, 'une seule cible EventezWidgets après deux prebuilds');
  const objects = p.hash.project.objects;
  const sourcesOf = (t) =>
    objects.PBXSourcesBuildPhase[t.buildPhases.find((b) => b.comment === 'Sources').value].files.map((f) => f.comment);
  assert(sourcesOf(widget[0]).length === 4, 'quatre fichiers Swift dans l’extension');
  const main = p.getFirstTarget().firstTarget;
  assert(sourcesOf(main).some((c) => c.includes('EventezAppIntents.swift')), 'App Intents compilés dans l’app');
  assert((main.dependencies || []).length === 1, 'l’app dépend de l’extension');
  const embed = Object.values(objects.PBXCopyFilesBuildPhase).filter((x) => typeof x === 'object');
  assert(embed.some((x) => x.dstSubfolderSpec === 13 && x.files.length === 1), 'étape d’intégration de l’appex (PlugIns)');
  console.log(`\nProjet généré : ${proj}`);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
