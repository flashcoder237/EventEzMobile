/* eslint-disable @typescript-eslint/no-var-requires */
// Source de verite de la config Expo. Le precedent app.json est conserve pour
// reference mais c'est ce fichier qui est lu (Expo prefere app.config.* > app.json).
const base = require('./app.json');

module.exports = ({ config }) => {
  const expo = { ...base.expo };

  // Cle Google Maps : lue depuis l'env, JAMAIS commitee.
  // - En dev : .env (gitignore)
  // - En CI / EAS Build : EAS Secret `GOOGLE_MAPS_API_KEY`
  const googleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';

  if (!googleMapsApiKey && process.env.NODE_ENV !== 'test') {
    console.warn(
      '[app.config] GOOGLE_MAPS_API_KEY absent — la carte Android ne s\'affichera pas.',
    );
  }

  expo.android = {
    ...expo.android,
    config: {
      ...(expo.android?.config || {}),
      googleMaps: { apiKey: googleMapsApiKey },
    },
  };

  // Plugin Google Sign-In : iosUrlScheme lu depuis l'env, jamais commité.
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || '';
  if (!iosUrlScheme && process.env.NODE_ENV !== 'test') {
    console.warn(
      '[app.config] EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME absent — Google Sign-In iOS ne fonctionnera pas.',
    );
  }
  expo.plugins = [
    ...(expo.plugins || []),
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
  ];

  return { ...config, ...expo };
};
