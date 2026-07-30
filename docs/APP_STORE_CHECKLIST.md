# App Store — checklist de soumission iOS

État de préparation de `EventEzMobile` pour l'App Store (audit 2026-07-25).
Complément iOS de l'audit Play Store (cf. mémoire `project_mobile_prod_readiness`).

Légende : ✅ fait · ⚠️ à finaliser par toi (console/hors code) · 🔴 bloquant

---

## 1. Code & config — RÉSOLU

- ✅ **Usage strings iOS** ajoutées dans `app.json` (`ios.infoPlist`) :
  - `NSPhotoLibraryUsageDescription` — sélection d'images (messages, événements)
  - `NSPhotoLibraryAddUsageDescription` — sauvegarde billets/images en galerie
  - `NSMicrophoneUsageDescription` — messages vocaux
  - `NSFaceIDUsageDescription` — verrouillage app + confirmation d'actions sensibles
  - Caméra + Localisation : déjà couvertes par les plugins `expo-camera` / `expo-location`
- ✅ **`ITSAppUsesNonExemptEncryption: false`** déclaré → Apple ne pose plus la
  question de conformité export à chaque build. *(App = HTTPS standard, pas de crypto
  propriétaire. Si tu ajoutes un jour du chiffrement non exempté, repasser à `true` +
  fournir la doc de conformité.)*
- ✅ **`submit.production.ios`** ajouté dans `eas.json` (`appleTeamId` pré-rempli).
- ✅ **Sign in with Apple** présent (`useSocialAuth.ts` + `usesAppleSignIn: true`) —
  **obligatoire** car l'app propose aussi Google Sign-In.
- ✅ **Suppression de compte** accessible depuis `SettingsScreen` (obligatoire App
  Store depuis 2022), avec confirmation.
- ✅ **App icon iOS** (`icon2.png`) sans canal alpha — Apple rejette les icônes
  transparentes ; ici opaque, donc conforme.
- ✅ **Sentry** en `sendDefaultPii: false`, aucun tracking cross-app → **pas d'ATT**
  (`NSUserTrackingUsageDescription`) requise.

---

## 2. À finaliser par toi — console / hors code

### 2.1 ⚠️ Compléter `eas.json` → `submit.production.ios`

```jsonc
"ios": {
  "appleId": "REMPLIR_APPLE_ID_EMAIL",        // ton e-mail Apple Developer
  "ascAppId": "REMPLIR_APP_STORE_CONNECT_APP_ID", // l'App ID généré à l'étape 2.3
  "appleTeamId": "9T6HK8G8B5"                 // déjà rempli
}
```

- `appleId` = l'e-mail de ton compte Apple Developer.
- `ascAppId` = l'**Apple ID de l'app** (numérique) affiché dans App Store Connect une
  fois la fiche créée (App Information → General → « Apple ID »).

### 2.2 🔴 Provisionner le DSN Sentry (crash reporting prod)

Le code lit `EXPO_PUBLIC_SENTRY_DSN` ; s'il est vide, Sentry est **silencieux** en
prod (tu voles à l'aveugle sur les crashes). Ne PAS mettre le DSN en clair dans
`eas.json` — utiliser un EAS Secret :

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN \
  --value "https://<clé>@o<org>.ingest.sentry.io/<projet>"
```

Le DSN se trouve dans Sentry → Settings → Projects → (projet) → Client Keys (DSN).

### 2.3 ⚠️ Créer la fiche dans App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → `+` →
   **New App**.
2. Plateforme iOS, nom « EventEz », langue principale Français, bundle ID
   `net.overbrand.eventez` (doit exister dans ton compte Developer), SKU libre.
3. Récupérer l'**Apple ID** numérique généré → le mettre dans `ascAppId` (étape 2.1).

### 2.4 ⚠️ Remplir le questionnaire App Privacy

App Store Connect → (app) → **App Privacy**. C'est l'équivalent iOS du Data Safety
Android. Base de travail déjà rédigée : `EventEzMobile/docs/PLAY_DATA_SAFETY.md`
(mêmes catégories de données à déclarer). Points à cocher au minimum :

- Données de contact (e-mail, nom), identifiants utilisateur — liés au compte.
- Localisation approximative (recherche d'événements à proximité).
- Contenu utilisateur (photos, messages, vocaux).
- Données de diagnostic (crash Sentry) — **non liées à l'identité** (`sendDefaultPii:false`).
- Aucune donnée utilisée pour du **tracking** (cohérent avec l'absence d'ATT).

### 2.5 ⚠️ Assets & métadonnées store

- **Screenshots** iPhone 6.7" et 6.5" (au moins un jeu). iPad si `supportsTablet` reste `true`.
- Description, mots-clés, catégorie, sous-titre.
- **URL politique de confidentialité** : `https://eventez.online/privacy` (déjà en ligne).
- Icône marketing 1024×1024 (sans alpha) — `icon2.png` convient.
- Coordonnées de contact + note pour la revue (compte de test si des écrans exigent
  un login).

---

## 3. Build & soumission

```bash
# 1. Build production iOS (EAS gère signing + provisioning)
eas build --platform ios --profile production

# 2. Soumettre à App Store Connect
eas submit --platform ios --profile production
```

Puis dans App Store Connect : attacher le build à la version, remplir « What's New »,
et **Submit for Review**.

> Avant la toute première soumission, un **build de test via TestFlight** est fortement
> recommandé : installe sur un iPhone réel et valide notamment le flux Wallet
> (« Add to Apple Wallet ») une fois les certs Wallet en place — cf.
> `EventEzBackend/docs/APPLE_WALLET_SETUP.md`.

---

## 4. Récapitulatif « ça part ou pas ? »

- **Avant les correctifs §1** : rejet quasi certain (accès Photo/Micro/Face ID sans
  justification = motif de rejet Apple systématique).
- **Après §1** : le build passe la revue technique. Ne restent que des étapes
  **console** (§2) — aucune ne touche au code.
