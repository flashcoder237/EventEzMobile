# Lot natif — round 3 (branche `feat/r3-native`)

Tout ce qui demande du code natif ou une configuration de build (prebuild) :
widgets, Live Activities, Siri, tuile Réglages rapides, partage entrant,
Handoff, proximité, Core Haptics, sons. **Rien de tout ça ne se voit dans
Expo Go** : il faut un build EAS (`development` d'abord).

## Ce qui est livré

| # | Fonction | Plateforme | Activation |
|---|---|---|---|
| X1 | Live Activity participant : compte à rebours jusqu'à l'ouverture des portes, puis « en cours » (bascule seule via `staleDate`) | iOS 16.2+ | `EVENTEZ_IOS_EXTENSIONS=1` |
| X3 | Widget « Prochain billet » (petit, moyen, écran verrouillé) | iOS 16.2+ / Android | iOS : `EVENTEZ_IOS_EXTENSIONS=1` · Android : toujours |
| X4 | « Montrer mon billet » (Siri, Spotlight, Raccourcis, bouton Action) → `eventez://tickets` | iOS 16+ | `EVENTEZ_IOS_APP_INTENTS=1` |
| X5 | Entitlement notifications urgentes (le backend envoie déjà `interruptionLevel`) | iOS 15+ | `EVENTEZ_IOS_TIME_SENSITIVE=1` |
| X6 | « Ajouter à mon agenda » : éditeur natif du système, sans permission d'accès au calendrier ; sur le billet (QRCode) et la fiche | iOS / Android | toujours |
| X8 | Langue de l'app dans les réglages système (fr, en) ; un changement côté système est appliqué au retour dans l'app et transmis au backend | iOS / Android 13+ | toujours |
| X9 | Icône monochrome Android 13 (« icônes à thème »), dérivée de `icon2.png` | Android 13+ | toujours |
| X11 | Tuile Réglages rapides « Mon prochain billet » | Android 7+ | toujours |
| X12 | « Partager vers EventEz » : un lien eventez.online partagé ouvre le bon écran | Android | toujours |
| X13 | Handoff : fiche événement / organisateur / intervenant reprise sur Mac ou iPad | iOS | toujours |
| X14 | Live Activity organisateur : compteur d'accueil (« accueillis depuis ce téléphone ») dès le 1er scan | iOS 16.2+ | `EVENTEZ_IOS_EXTENSIONS=1` |
| G10 | Écran éteint contre l'oreille pendant un message vocal | iOS / Android | réglage « Gestes physiques » |
| H3 | Canaux sonores `eventez_moments` (carillon) et `eventez_sales` (vente) | Android (+ son iOS) | créés au démarrage, inactifs tant que le backend ne les cible pas |
| H6 | Motifs Core Haptics (`celebrate`, `heartbeat`, `doors`, `rise`, `tick`, `wall`) ; `feedback.celebrate` les utilise | iPhone 8+ | réglage « Vibrations » |
| H7 | Sons d'interface (tap) sur `feedback.confirm()` | iOS / Android | réglage « Sons d'interface » (coupé par défaut) |
| H8 | Carillon de marque (billet reçu) et double note (vente) | iOS / Android | réglage « Sons » existant |
| X10 | Icône alternative | — | **reporté** (pas d'illustration) |

Les sons et l'icône monochrome sont générés par script, sans asset tiers :
`scripts/generate_ui_sounds.py` et `scripts/generate_monochrome_icon.py`.

## Où est le code

- `modules/eventez-native/` : module Expo local (Swift + Kotlin) et son API JS
  (`src/index.ts`). Chaque fonction est un no-op sans module natif.
- `plugins/withEventezIosExtensions.js` + `plugins/eventez-widgets/*.swift` :
  extension WidgetKit/ActivityKit, App Group, déclaration EAS.
- `plugins/withEventezAppIntents.js`, `plugins/withEventezTimeSensitive.js`,
  `plugins/withAndroidShareIntent.js`.
- `src/lib/native/*` : logique JS (prochain billet, Live Activities, partage,
  Handoff, langue système, canaux, haptique, sons, agenda) + tests.
- `src/components/native/NativeBridgesHost.tsx` : point de montage unique,
  dans `RootNavigator`.
- Chaînes : namespace i18next `native` (`src/lib/native/i18n.ts`), FR/EN,
  vouvoiement. `fr.json` et `en.json` ne sont pas touchés.

## Comment tester

1. Copier les trois variables `EVENTEZ_IOS_*` dans `eas.json` > `build` >
   `development` > `env` (cf. `eas.json.example`).
2. `npx eas-cli build --profile development --platform ios` puis `android`.
   Au premier build iOS, EAS crée l'identifiant `net.overbrand.eventez.EventezWidgets`,
   son profil et l'App Group `group.net.overbrand.eventez` (répondre oui).
   Le profil `development` cible le simulateur iOS : pour un iPhone réel,
   créer un profil `development-device` sans `ios.simulator`.
3. Vérifier sur appareil :
   - avoir un billet dans les 4 h avant l'ouverture des portes → Live Activity
     sur l'écran verrouillé et dans la Dynamic Island ; à l'heure des portes, elle
     passe en « Portes ouvertes · en cours » sans ouvrir l'app ;
   - ajouter le widget « Prochain billet » → titre, date, lieu ; un tap ouvre le billet ;
   - Android : ajouter la tuile « Mon prochain billet » dans les Réglages rapides ;
     un tap (écran verrouillé) demande le déverrouillage puis ouvre le billet ;
   - « Dis Siri, montrer mon billet EventEz » ;
   - se déconnecter → widget vide, Live Activity fermée ;
   - organisateur : scanner un billet, sortir de l'app → compteur dans la Dynamic Island ;
   - partager un lien eventez.online depuis WhatsApp vers EventEz (Android) ;
   - Réglages Android › Applis › EventEz › Langue → English, revenir dans l'app ;
   - écouter un message vocal, porter le téléphone à l'oreille → écran éteint ;
   - Android 13 : activer les icônes à thème → icône monochrome.
4. Sans Mac, `node scripts/smoke-ios-native-plugins.js` vérifie le projet Xcode
   généré (cible unique, sources, dépendance, intégration de l'appex).

## Vérifié ici (Windows)

- `tsc --noEmit` ; Jest complet (211 suites, 2 362 tests) dont 4 suites nouvelles.
- `expo config --type introspect` avec les trois drapeaux : Info.plist,
  entitlements, déclaration EAS, manifeste Android corrects.
- Android : `:eventez-native:compileDebugKotlin`, ressources du module et
  fusion du manifeste de l'app OK (permissions calendrier retirées).
- iOS : **le Swift n'a pas pu être compilé** (pas de Xcode) ; seul le pbxproj
  est vérifié par le script de smoke test.

## À faire côté backend (hors de cette branche)

- H3 : envoyer `channelId: "eventez_moments"` + `sound: "eventez_chime.wav"`
  pour `event_today` / portes ouvertes, et `channelId: "eventez_sales"` +
  `sound: "eventez_sale.wav"` pour les ventes organisateur
  (`NotificationService._get_channel_id`). Les apps déjà installées gardent les
  anciens canaux, qui ne changent pas.

## Fusion avec main

- Les lots 1 à 4 du round 3 ne sont pas commités sur main. Cette branche part de
  `a2a31e3` et en dépend très peu :
  - `src/lib/sensoryPrefs.ts` est une **copie identique** de celui de main (la
    fusion le résout seule) ; le montage `primeSensoryPrefs` est idempotent ;
  - `richHaptics` utilise `haptics.pattern` (lot 2) s'il existe, sinon un repli ;
  - le réglage « Sons d'interface » (lot 1) pilote H7 ; sans lui, H7 reste muet.
- Fichiers existants touchés (risque de conflit surtout sur les deux écrans) :
  `QRCodeScreen.tsx` (+1 import, +1 bloc), `QRScannerScreen.tsx` (+1 import,
  +1 appel), `RootNavigator.tsx` (fragment + `<NativeBridgesHost />`),
  `MessageBubble.tsx` (+1 hook), `AddToCalendarButton.tsx`, `utils/feedback.ts`,
  `app.json`, `app.config.js`, `package.json`/`yarn.lock` (expo-calendar),
  `eas.json.example`.
- Après fusion : reporter le résumé dans `RELEASE_NOTES_1.3.5.md` (ou la version
  suivante, car les extensions iOS changent le binaire).
