// Le package @react-native-google-signin/google-signin a un build ESM
// (lib/module) cassé sur Hermes/Metro, donc on importe explicitement le build
// CommonJS (lib/commonjs). Ce build n'expose pas de fichier .d.ts à côté du
// .js, donc TS ne peut pas inférer les types. On re-déclare le module pour
// qu'il pointe vers les types officiels du package racine.
declare module '@react-native-google-signin/google-signin/lib/commonjs' {
  export * from '@react-native-google-signin/google-signin';
}
