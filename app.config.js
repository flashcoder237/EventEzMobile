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
  // Règles ProGuard/R8 pour les libs natives — sinon R8 supprime/renomme des
  // classes appelées par réflexion (JNI, Gson, opérateurs natifs) et l'app
  // release crash silencieusement. Injectées dans le proguard-rules.pro généré.
  const extraProguardRules = [
    '# --- EventEz : keep rules pour les libs natives (R8 release) ---',
    '-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod',
    '-keepattributes SourceFile,LineNumberTable',
    '# React Native core / Hermes / JNI',
    '-keep,includedescriptorclasses class com.facebook.** { *; }',
    '-keep class com.facebook.jni.** { *; }',
    '-dontwarn com.facebook.**',
    '# Reanimated + Gesture Handler (worklets, accès natif)',
    '-keep class com.swmansion.reanimated.** { *; }',
    '-keep class com.swmansion.gesturehandler.** { *; }',
    '# react-native-svg',
    '-keep public class com.horcrux.svg.** { *; }',
    '# react-native-maps',
    '-keep class com.google.android.gms.maps.** { *; }',
    '-keep interface com.google.android.gms.maps.** { *; }',
    '-keep class com.airbnb.android.react.maps.** { *; }',
    '# Google Sign-In / Play Services auth',
    '-keep class com.google.android.gms.auth.** { *; }',
    '-keep class com.google.android.gms.common.** { *; }',
    '# Notifee + expo-notifications + Firebase Messaging',
    '-keep class app.notifee.** { *; }',
    '-keep class com.google.firebase.** { *; }',
    '-dontwarn com.google.firebase.**',
    '# react-native-webview',
    '-keep class com.reactnativecommunity.webview.** { *; }',
    '# Modèles sérialisés par réflexion (Gson/JSON) — ne pas obfusquer les champs',
    '-keepclassmembers class ** { @com.google.gson.annotations.SerializedName <fields>; }',
    '-keepclassmembers,allowobfuscation class * { @com.facebook.react.bridge.ReactMethod <methods>; }',
    '# OkHttp / Okio (réseau)',
    '-dontwarn okhttp3.**',
    '-dontwarn okio.**',
  ].join('\n');

  expo.plugins = [
    ...(expo.plugins || []),
    // R8/ProGuard activé en release Android : app plus légère + mapping de
    // dé-obscurcissement uploadé (crashs/ANR lisibles dans Play Console).
    // extraProguardRules protège les libs natives appelées par réflexion.
    ['expo-build-properties', {
      android: {
        enableProguardInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
        extraProguardRules,
      },
    }],
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    // Force jvmTarget=17 sur tous les modules Kotlin (fix mismatch Java 17 /
    // Kotlin 11 de expo-dynamic-app-icon au build Android).
    './plugins/withAndroidKotlinJvmTarget',
    // Rend les icônes alternatives adaptatives sur Android (sinon marges du
    // traitement legacy). DOIT rester après expo-dynamic-app-icon.
    './plugins/withAdaptiveAlternateIcons',
    // iOS : désactive la signature des resource bundles (Xcode 14+ l'exige
    // sinon, ce qui casse le build EAS sur des pods comme GoogleMaps).
    './plugins/withIosResourceBundleSigning',
  ];

  return { ...config, ...expo };
};
