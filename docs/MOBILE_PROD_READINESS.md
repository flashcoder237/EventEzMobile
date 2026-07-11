# EventEz Mobile — Production Readiness

Audit du 2026-07-11. La **config est mature** (permissions minimales +
`blockedPermissions`, App Links `autoVerify` exhaustifs, plugins natifs custom,
`eas.json` gitignoré, `autoIncrement`, tokens en secure-store). Ce document
liste ce qui **reste à faire pour shipper sereinement** — surtout de
l'opérationnel (secrets, console GCP/Sentry) que le code ne peut pas provisionner.

---

## 🔴 P0 — Observabilité : crash reporting quasi inactif en prod

`src/services/crashReporting.ts` est bien écrit (Sentry, PII filtering, user
context, ErrorBoundary), et `initCrashReporting()` est appelé dans `App.tsx`.
**MAIS** :

1. **`EXPO_PUBLIC_SENTRY_DSN` n'est dans aucun env de `eas.json`** → `init()`
   sort en early-return → **0 crash reporté en prod** (on vole à l'aveugle).
2. **Pas de plugin `@sentry/react-native/expo`** dans `app.json` → même avec le
   DSN, **les sourcemaps ne sont pas uploadées** → les stacks de prod sont
   minifiées/illisibles.

### À faire
```bash
# (1) Provisionner le DSN comme secret EAS (auto-injecté au build, pas dans eas.json)
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://xxxx@oXXXX.ingest.sentry.io/XXXX"
eas secret:create --scope project --name EXPO_PUBLIC_ENV --value "production"

# (2) Ajouter le plugin Sentry Expo pour l'upload auto des sourcemaps
npx @sentry/wizard@latest -i reactNative   # configure le plugin + SENTRY_AUTH_TOKEN
# ou manuellement dans app.json > plugins :
#   ["@sentry/react-native/expo", { "organization": "<org>", "project": "<project>" }]
# + SENTRY_AUTH_TOKEN comme secret EAS (upload sourcemaps au build).
```
> Le code passe déjà `release` (`net.overbrand.eventez@<version>`) et
> `environment` — il ne manque que le DSN + le plugin.

---

## 🟡 P1 — Restreindre la clé Google Maps (fraude de facturation)

La clé Maps (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) **n'est pas fuitée dans le repo**
(`eas.json` gitignoré) — mais comme c'est une variable `EXPO_PUBLIC_`, elle est
**embarquée en clair dans l'APK** (nature des clés Maps client). La seule vraie
protection = **restreindre la clé dans Google Cloud Console** :

- Application restriction : **Android apps** → package `net.overbrand.eventez` +
  empreinte **SHA-1** (celle du keystore de release EAS : `eas credentials`).
- API restriction : uniquement **Maps SDK for Android** (+ éventuellement
  Geocoding si utilisé), rien d'autre.

Optionnel (hygiène) : sortir la clé de `eas.json` local aussi →
`eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <key>` puis la
retirer de `eas.json` (auto-injectée au build).

---

## 🟡 P1 — OTA updates (hotfix sans passer par le store)

`expo-updates` **n'est pas installé** → le moindre correctif JS impose une
nouvelle soumission au Play Store (jours de délai). Fortement recommandé pour
itérer vite :
```bash
npx expo install expo-updates
eas update:configure
# puis `eas update --branch production` pour pousser un fix JS en minutes.
```
Décision produit — mais pour une app jeune qui bouge, ça vaut le coup.

---

## 🟢 Déjà bon (vérifié)

- **Permissions** : minimales (COARSE/FINE location, CAMERA, RECORD_AUDIO), avec
  `blockedPermissions` explicites + descriptions d'usage. ✅
- **App Links** `autoVerify` : events / organizers / speakers / payment / verify
  / reset-password / transfer / team-invitation. ✅
- **Suppression de compte in-app** (`delete_account`) — exigée par Google Play. ✅
- **Secrets** : `eas.json`, `google-service-account.json`, `eventez-*-*.json`
  gitignorés ; tokens en `expo-secure-store`. ✅
- **Build** : `appVersionSource: remote` + `autoIncrement`, AAB en prod, submit
  Android configuré (track internal). ✅
- **PII Sentry** : `sendDefaultPii: false`, bodies redaction. ✅

## ⚪ À vérifier / compléter (non bloquant)
- `google-services.json` est **tracké par git** (config Firebase client) — souvent
  toléré (clés restreintes), sinon le gitignorer.
- **E2E** : Maestro en place (`.maestro/*.yaml`, `test:e2e:organizer`) sur les
  parcours organisateur. À étendre au parcours **acheteur** (découverte →
  achat → paiement → billet/QR) pour couvrir le tunnel de revenus.
- **Play Data Safety form** : à remplir (collecte email/téléphone/paiement).
- **Réseau dégradé** : course refresh-token, file de mutations offline au retour.
- **iOS submit** : `submit.production.ios` non configuré (Android-first OK).
