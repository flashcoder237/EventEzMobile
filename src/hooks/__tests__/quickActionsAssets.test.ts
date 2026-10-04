/**
 * Cohérence des raccourcis d'icône d'app (long-press sur l'icône).
 *
 * Trois endroits doivent rester alignés, et rien ne le vérifie au build :
 *   1. les clés d'icône Android du hook (`shortcut_discover`…)
 *   2. la table `androidIcons` du plugin expo-quick-actions dans app.json
 *   3. les PNG sources sur le disque
 *
 * Un décalage ne casse ni le typage ni le runtime : Android affiche un carré
 * vide à la place de l'icône, et personne ne s'en aperçoit avant un build.
 *
 * Les PNG sont régénérés depuis design-handoff/eventez-svg-redesign/redesign/
 * brand/Shortcut*.svg — voir INTEGRATION.md.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const hookSrc = fs.readFileSync(path.join(ROOT, 'src/hooks/useQuickActions.ts'), 'utf8');

/** Config du plugin expo-quick-actions, telle que le build la lira. */
const pluginConfig = (() => {
  const entry = (appJson.expo.plugins as unknown[]).find(
    (p) => Array.isArray(p) && String(p[0]).includes('quick-actions')
  ) as [string, { androidIcons: Record<string, { foregroundImage: string; backgroundColor: string }> }];
  return entry?.[1];
})();

describe('raccourcis d’icône d’app', () => {
  it('le plugin expo-quick-actions est déclaré', () => {
    expect(pluginConfig).toBeDefined();
    expect(pluginConfig.androidIcons).toBeDefined();
  });

  it('les clés Android du hook existent toutes dans app.json', () => {
    // Clés citées côté Android dans ICONS (hors symboles iOS `symbol:…`).
    const used = [...hookSrc.matchAll(/'(shortcut_[a-z]+)'/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const key of new Set(used)) {
      expect(Object.keys(pluginConfig.androidIcons)).toContain(key);
    }
  });

  it('aucune icône déclarée sans être utilisée', () => {
    const used = new Set([...hookSrc.matchAll(/'(shortcut_[a-z]+)'/g)].map((m) => m[1]));
    for (const key of Object.keys(pluginConfig.androidIcons)) {
      expect(used.has(key)).toBe(true);
    }
  });

  it.each(Object.entries(pluginConfig?.androidIcons ?? {}))(
    '« %s » pointe sur un PNG présent',
    (_key, cfg: any) => {
      const p = path.join(ROOT, cfg.foregroundImage);
      expect(fs.existsSync(p)).toBe(true);
      // Un fichier vide ou tronqué passerait existsSync sans rien dessiner.
      expect(fs.statSync(p).size).toBeGreaterThan(500);
    }
  );

  it.each(Object.entries(pluginConfig?.androidIcons ?? {}))(
    '« %s » a un fond coloré (sinon icône blanche invisible)',
    (_key, cfg: any) => {
      // Les pictogrammes sont BLANCS sur transparent : sans backgroundColor,
      // le fond par défaut est blanc et le raccourci paraît vide.
      expect(cfg.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(cfg.backgroundColor.toUpperCase()).not.toBe('#FFFFFF');
    }
  );

  it('iOS utilise des symboles système', () => {
    // Sur iOS on passe des SF Symbols (`symbol:…`), rendus dans la couleur du
    // système : pas d'asset à fournir, donc rien à désaligner.
    expect(hookSrc).toMatch(/symbol:[a-z.]+/);
  });
});
