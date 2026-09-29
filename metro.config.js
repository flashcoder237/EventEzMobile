/* eslint-disable @typescript-eslint/no-var-requires */
// Metro config — part de la config Expo par défaut et n'active QUE les
// `inlineRequires` (perf de démarrage : un module n'est évalué qu'au premier
// usage d'un de ses bindings, au lieu de TOUT le graphe d'imports au boot).
//
// ⚠️ Conséquence à garder en tête : un module importé pour un binding n'est
// plus évalué au chargement de l'importeur mais au premier accès au binding.
// Un module dont on a besoin pour ses EFFETS DE BORD au boot doit donc être
// importé en side-effect pur (`import './x'`) — ces imports-là ne sont jamais
// inlinés et restent exécutés dans l'ordre (cf. App.tsx : i18n).
//
// `experimentalImportSupport` : on conserve la valeur par défaut d'Expo SDK 54
// (true — transform ESM de Metro avec live bindings), pour ne pas changer la
// sémantique des modules en même temps que l'inlining.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const defaultGetTransformOptions = config.transformer.getTransformOptions;

config.transformer.getTransformOptions = async (...args) => {
  const base = defaultGetTransformOptions ? await defaultGetTransformOptions(...args) : {};
  return {
    ...base,
    transform: {
      ...(base && base.transform),
      inlineRequires: true,
    },
  };
};

module.exports = config;
