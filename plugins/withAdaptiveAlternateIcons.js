/**
 * Expo Config Plugin — Rend les icônes ALTERNATIVES adaptatives sur Android.
 *
 * Problème : `expo-dynamic-app-icon` pose les icônes alternatives comme de
 * simples bitmaps legacy (mipmap-{densite} / {name}.png) SANS adaptive-icon.
 * Sur Android 8+, le launcher applique alors le « traitement legacy » : il
 * rétrécit le bitmap et le pose sur un fond blanc masqué → **marges visibles**.
 * L'icône par défaut, elle, EST adaptive (via app.json `adaptiveIcon`) et
 * remplit le cadre. D'où l'incohérence « l'alternative n'occupe pas tout le
 * cadre ».
 *
 * Fix : pour chaque alternative, on écrit `mipmap-anydpi-v26/{name}.xml`
 * (adaptive-icon). Les launchers API 26+ utilisent cette version → le bitmap
 * devient le `foreground` plein cadre (comme l'icône par défaut), plus de
 * marge. Les densités legacy (< API 26) gardent le PNG.
 *
 * Doit tourner APRÈS expo-dynamic-app-icon (qui génère les bitmaps + les
 * activity-alias) → enregistré en dernier via app.config.js.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Doit correspondre aux clés du plugin expo-dynamic-app-icon (app.json) et à
// AppIconPicker (VARIANT_KEYS).
const ICON_NAMES = ['nuit', 'ocean', 'or'];

const adaptiveXml = (name) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/white"/>
    <foreground android:drawable="@mipmap/${name}"/>
</adaptive-icon>
`;

module.exports = function withAdaptiveAlternateIcons(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const res = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
      );
      const dir = path.join(res, 'mipmap-anydpi-v26');
      fs.mkdirSync(dir, { recursive: true });
      for (const name of ICON_NAMES) {
        fs.writeFileSync(path.join(dir, `${name}.xml`), adaptiveXml(name), 'utf8');
      }
      return cfg;
    },
  ]);
};
