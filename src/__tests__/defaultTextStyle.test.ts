/**
 * Police par défaut appliquée à tout <Text> / <TextInput>.
 *
 * App.tsx patche `Text.render` pour injecter Montserrat dans les nœuds qui ne
 * déclarent pas de `fontFamily`. Sur Android, une police custom dont les
 * métriques dépassent la boîte mesurée ROGNE la fin du texte au lieu de le
 * renvoyer à la ligne — d'où les troncatures observées en production :
 *
 *   « Ok on reste encore »     → « Ok on reste »
 *   « 500.0 Mo »               → « 500.0 »
 *   « Pensez à sauvegarder. »  → « Pensez à »
 *
 * `includeFontPadding: false` neutralise le padding vertical qu'Android dérive
 * de ces métriques. Il est injecté AVEC la police, donc il couvre d'un coup
 * les ~234 styles de l'app qui omettent `fontFamily` — y compris des écrans de
 * paiement et de billetterie, où un texte coupé coûte cher.
 *
 * Ce test lit la source d'App.tsx : le patch s'exécute au chargement du
 * module, avant tout rendu, et n'est pas observable autrement.
 */
import fs from 'fs';
import path from 'path';

const appSource = fs.readFileSync(path.join(__dirname, '..', '..', 'App.tsx'), 'utf8');

describe('style de texte par défaut', () => {
  it('déclare une police par défaut', () => {
    expect(appSource).toContain("DEFAULT_FONT_FAMILY = 'Montserrat_400Regular'");
  });

  it('neutralise le padding de police Android dans le style par défaut', () => {
    // LE correctif racine. Sans lui, chaque style omettant `fontFamily` est
    // exposé à la troncature du dernier mot.
    const start = appSource.indexOf('const DEFAULT_TEXT_STYLE');
    expect(start).toBeGreaterThan(-1);
    const block = appSource.slice(start, appSource.indexOf('};', start));
    expect(block).toContain('fontFamily: DEFAULT_FONT_FAMILY');
    expect(block).toContain('includeFontPadding: false');
  });

  it('injecte le style par défaut AVANT le style utilisateur (surchargeable)', () => {
    // L'ordre compte : le style local doit pouvoir écraser la valeur par
    // défaut, jamais l'inverse.
    // (Sans style user, l'objet constant est réutilisé tel quel — perf.)
    expect(appSource).toContain('[DEFAULT_TEXT_STYLE, userStyle]');
    expect(appSource).toContain('const userStyle = element.props.style');
  });

  it('applique le patch à Text ET TextInput', () => {
    expect(appSource).toContain('patchDefaultFont(RNText)');
    expect(appSource).toContain('patchDefaultFont(RNTextInput)');
  });

  it('ne patche qu’une seule fois (garde d’idempotence)', () => {
    expect(appSource).toContain('__fontPatched');
  });
});
