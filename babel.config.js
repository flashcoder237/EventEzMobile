module.exports = function(api) {
  api.cache(true);

  // En production : retirer console.log/info/debug, garder error/warn pour Sentry
  // (la lib est préservée par tree-shaking si __DEV__ guard est en place).
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  const plugins = [];

  if (isProd) {
    plugins.push([
      'transform-remove-console',
      { exclude: ['error', 'warn'] },
    ]);
  }

  // IMPORTANT : reanimated/plugin DOIT être en dernier.
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
