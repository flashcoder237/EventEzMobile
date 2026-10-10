/**
 * Les chaines d'usage iOS exigees AU DEMARRAGE par des modules natifs.
 *
 * INCIDENT (2026-10-10) : l'app restait bloquee sur le splash sur iPhone —
 * Android fonctionnait, aucun crash visible, aucun log. Cause :
 *
 *     ExpoCalendar.MissingCalendarPListValueException
 *       -> RemindersPermissionRequester.getPermissions()
 *       -> ExpoCalendarModule.initializePermittedEntities()
 *       -> OnCreate (enregistrement du module, AVANT tout JS)
 *
 * `expo-calendar` interroge le requester « Rappels » DES SON ENREGISTREMENT,
 * que l'app utilise les rappels ou non. Si la chaine d'usage correspondante
 * manque du Info.plist, le requester appelle `EXFatal` et l'application meurt
 * avant le premier rendu React.
 *
 * Or `app.json` portait `"remindersPermission": false`, ce qui demande
 * explicitement au plugin de SUPPRIMER `NSRemindersUsageDescription`. Le
 * reglage est accepte par le plugin — il est juste incompatible avec ce que le
 * module fait au demarrage.
 *
 * Pourquoi ce test existe : le defaut est INVISIBLE en JS. Ni `expo-doctor`
 * (18/18 au moment de l'incident), ni les tests, ni le typecheck ne le voient ;
 * il ne se manifeste que sur un appareil iOS reel, apres un build complet.
 * Une relecture de code ne le rattrape pas non plus — `false` a l'air d'une
 * valeur raisonnable pour « on ne veut pas cette permission ».
 */

import * as fs from 'fs';
import * as path from 'path';

type PluginEntry = string | [string, Record<string, unknown>];

function appJson(): any {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'),
  );
}

function pluginOptions(name: string): Record<string, unknown> | null {
  const plugins: PluginEntry[] = appJson().expo.plugins ?? [];
  for (const p of plugins) {
    if (Array.isArray(p) && p[0] === name) return p[1] ?? {};
  }
  return null;
}

describe('chaines d’usage iOS requises au demarrage', () => {
  it('expo-calendar declare une chaine pour les RAPPELS', () => {
    const opts = pluginOptions('expo-calendar');
    expect(opts).not.toBeNull();

    const reminders = opts!.remindersPermission;

    // `false` supprime NSRemindersUsageDescription -> EXFatal au lancement.
    // `undefined` laisserait la chaine par defaut d'Expo : acceptable pour le
    // demarrage, mais on exige une chaine EXPLICITE et en francais, car c'est
    // elle qu'Apple affiche et relit en revue.
    expect(reminders).not.toBe(false);
    expect(typeof reminders).toBe('string');
    expect((reminders as string).length).toBeGreaterThan(10);
  });

  it('expo-calendar declare une chaine pour l’AGENDA', () => {
    const opts = pluginOptions('expo-calendar');
    const calendar = opts!.calendarPermission;

    expect(calendar).not.toBe(false);
    expect(typeof calendar).toBe('string');
  });

  it('aucun plugin de permission ne vaut `false`', () => {
    // Regle generale tiree de l'incident : desactiver une chaine d'usage par
    // `false` est un pari sur le fait que le module natif ne la demandera
    // jamais. expo-calendar prouve que ce pari peut etre perdu — et le prix
    // est une app qui ne demarre pas, sans aucun message.
    const plugins: PluginEntry[] = appJson().expo.plugins ?? [];
    const offenders: string[] = [];

    for (const p of plugins) {
      if (!Array.isArray(p)) continue;
      const [name, opts] = p;
      for (const [key, value] of Object.entries(opts ?? {})) {
        if (/permission/i.test(key) && value === false) {
          offenders.push(`${name}.${key}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('les chaines d’usage sensibles sont presentes dans infoPlist', () => {
    // Apple rejette un binaire qui touche une API protegee sans sa chaine.
    const ip = appJson().expo.ios?.infoPlist ?? {};
    for (const key of [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSPhotoLibraryUsageDescription',
      'NSFaceIDUsageDescription',
    ]) {
      expect(typeof ip[key]).toBe('string');
    }
  });
});
