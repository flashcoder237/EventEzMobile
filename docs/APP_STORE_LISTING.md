# Fiche App Store Connect — EventEz (prête à copier)

Contenu de chaque champ, en **français** (localisation principale) et **anglais**
(à ajouter comme localisation secondaire dans App Store Connect → App Information →
+ Localisation → English). Toutes les valeurs techniques ci-dessous sont **vérifiées
dans le code** (`app.json`, `app.config.js`, `eas.json`, `src/`) — pas d'invention.

> Rappels de format Apple : Nom ≤ 30 car., Sous-titre ≤ 30 car., Mots-clés ≤ 100 car.
> (séparés par des virgules, sans espace), Description ≤ 4000 car., Promotional Text
> ≤ 170 car. (modifiable sans nouvelle revue).

> **App Store Connect** : https://appstoreconnect.apple.com/apps/6794599216/

---

## 0. Checklist de soumission (ordre conseillé)

- [ ] App Information (bundle, catégories, URLs, droits) — §1
- [ ] Champs localisés FR — §2
- [ ] Champs localisés EN — §3
- [ ] **Age Rating** (questionnaire de classification) — §4
- [ ] **In-App Purchases** : répondre **NON** — §5
- [ ] **Export Compliance** : chiffrement non exempté = **NON** — §6
- [ ] **App Privacy** (questionnaire données) — §7
- [ ] **Sign-In / logins** (guideline 4.8) — §8
- [ ] **UGC & modération** (guideline 1.2) — §9
- [ ] **App Review** : compte de démo + notes — §10
- [ ] **Captures 6,5"** (1 à 10, format exact) — §11
- [ ] Vérifs techniques build (buildNumber EAS) — §12
- [ ] **Champs de la page version + Build + Publication** — §13

---

## 1. Informations générales (App Information)

| Champ | Valeur | Source |
|---|---|---|
| **Bundle ID** | `net.overbrand.eventez` | app.json |
| **Apple ID (ascAppId)** | `6794599216` | eas.json |
| **Apple Team ID** | `9T6HK8G8B5` | eas.json |
| **Compte Apple (submit)** | `brice.temena@gmail.com` | eas.json |
| **Version marketing (CFBundleShortVersionString)** | `1.0.0` | app.json |
| **Build number (CFBundleVersion)** | Géré par **EAS** (`appVersionSource: remote`, `autoIncrement` en prod) — pas de valeur en dur | eas.json |
| **Nom principal / Primary language** | Français (France) | — |
| **Catégorie principale** | Événements (Events) | — |
| **Catégorie secondaire** | Réseaux sociaux (Social Networking) *(facultatif)* | — |
| **URL de confidentialité** | https://eventez.online/privacy | — |
| **URL support** | https://eventez.online/contact | — |
| **URL marketing** *(facultatif)* | https://eventez.online | — |
| **Droits / Copyright** | 2026 OverBrand | — |
| **Associated domains (deep links)** | `applinks:eventez.online` | app.json |

---

## 2. Champs localisés — 🇫🇷 FRANÇAIS

### Nom (≤ 30)
```
EventEz
```

### Sous-titre (≤ 30)
```
Billetterie & événements
```

### Mots-clés (≤ 100, séparés par des virgules)
```
événement,billet,billetterie,ticket,QR,inscription,concert,mobile money,organisateur,agenda,scan
```

### Texte promotionnel (≤ 170, modifiable sans revue)
```
Achetez vos billets, gérez vos inscriptions et accédez à vos événements avec un QR code — le tout depuis votre poche.
```

### Description (≤ 4000)
```
EventEz est la plateforme qui réunit organisateurs et participants autour des événements qui comptent.

POUR LES PARTICIPANTS
• Découvrez des événements près de chez vous grâce à la carte interactive.
• Achetez vos billets en quelques secondes par Mobile Money (MTN, Orange) ou par carte.
• Recevez vos billets avec un QR code, présentables directement à l'entrée.
• Ajoutez vos billets à Apple Wallet pour un accès instantané.
• Suivez vos organisateurs préférés et ne manquez plus aucun événement.
• Échangez avec les organisateurs via la messagerie intégrée.

POUR LES ORGANISATEURS
• Créez un événement en quelques minutes : billetterie ou inscription personnalisée.
• Définissez plusieurs types de billets, des codes promo et des places limitées.
• Encaissez en toute sécurité et suivez vos revenus en temps réel.
• Validez les entrées en scannant les QR codes, même hors connexion.
• Communiquez avec vos participants et suivez vos statistiques.

PAIEMENTS ADAPTÉS
EventEz prend en charge le Mobile Money (MTN Money, Orange Money) et les cartes
bancaires, pour des paiements simples et sécurisés.

Créez votre compte gratuitement et lancez-vous. Vous pouvez vous connecter avec
Apple, Google ou votre e-mail, et supprimer votre compte à tout moment depuis
l'application.
```

### Nouveautés de cette version (What's New)
```
Première version d'EventEz sur iPhone :
• Achat de billets par Mobile Money et carte
• Billets avec QR code + ajout à Apple Wallet
• Création et gestion d'événements pour les organisateurs
• Check-in par scan, même hors connexion
• Messagerie entre participants et organisateurs
Merci de votre confiance — écrivez-nous à support@eventez.online pour tout retour.
```

---

## 3. Champs localisés — 🇬🇧 ENGLISH

### Name (≤ 30)
```
EventEz
```

### Subtitle (≤ 30)
```
Tickets & events
```

### Keywords (≤ 100, comma-separated)
```
event,ticket,ticketing,QR,registration,concert,mobile money,organizer,agenda,scan,check-in
```

### Promotional Text (≤ 170)
```
Buy tickets, manage registrations and get into your events with a QR code — all from your pocket.
```

### Description (≤ 4000)
```
EventEz brings organizers and attendees together around the events that matter.

FOR ATTENDEES
• Discover events near you with the interactive map.
• Buy tickets in seconds via Mobile Money (MTN, Orange) or card.
• Get your tickets with a QR code, ready to show at the door.
• Add tickets to Apple Wallet for instant access.
• Follow your favorite organizers and never miss an event.
• Chat with organizers through built-in messaging.

FOR ORGANIZERS
• Create an event in minutes: ticketing or custom registration.
• Set multiple ticket types, promo codes and limited capacity.
• Get paid securely and track your revenue in real time.
• Check attendees in by scanning QR codes, even offline.
• Message your attendees and follow your stats.

PAYMENTS THAT FIT
EventEz supports Mobile Money (MTN Money, Orange Money) and bank cards for simple,
secure payments.

Create your account for free and get started. Sign in with Apple, Google or email,
and delete your account anytime from within the app.
```

### What's New
```
First release of EventEz on iPhone:
• Buy tickets via Mobile Money and card
• Tickets with QR code + Add to Apple Wallet
• Create and manage events as an organizer
• Scan-based check-in, even offline
• Messaging between attendees and organizers
Thanks for trying EventEz — email support@eventez.online with any feedback.
```

---

## 4. Age Rating (questionnaire de classification)

L'app contient de la **messagerie et du contenu généré par les utilisateurs**
(messages texte/vocaux, photos, événements créés par des tiers). À déclarer
honnêtement, sinon rejet.

| Question du questionnaire | Réponse | Pourquoi |
|---|---|---|
| Contenu généré par les utilisateurs / réseaux sociaux | **Oui** | Messagerie, photos, événements publics (§9) |
| Contrôles de modération (signalement, blocage) | **Oui** | report + block + modération admin (§9) |
| Violence, contenu sexuel, drogues, jeux d'argent, etc. | **Aucun / None** | L'app ne diffuse pas ce type de contenu |
| Accès web sans restriction | **Non** (WebBrowser limité au paiement PSP) | `PaymentScreen` ouvre une session auth ciblée |

➡️ Classification attendue : avec UGC/messagerie **non filtrée par âge**, Apple pousse
souvent vers **17+**. Rester cohérent avec ce qui est réellement dans l'app — la présence
de messagerie ouverte conduit typiquement à 17+.

---

## 5. In-App Purchases (IAP) — répondre **NON**

| Question | Réponse factuelle | Justification (code) |
|---|---|---|
| Achats intégrés Apple (StoreKit) ? | **NON** | Aucune dépendance IAP (`StoreKit` / `react-native-iap` / `expo-in-app-purchases` / `RevenueCat`) — 0 occurrence dans `src/` et `package.json` |
| Comment les paiements sont-ils faits ? | **PSP externe via navigateur** | `PaymentScreen` : POST `/api/payments/initiate/` → `WebBrowser.openAuthSessionAsync(payment_url)` (CinetPay / Mobile Money MTN·Orange·Moov / carte) |
| Ce qui est vendu | **Billets d'événements physiques / inscriptions** + abonnement organisateur | Biens & services réels hors app → **exemptés d'IAP** (guideline 3.1.3 / 3.1.5) |

➡️ **In-App Purchases = NON.** L'app vend l'accès à des **événements réels** (biens/services
physiques), payés via un prestataire tiers — cas explicitement **exempté** de StoreKit.

> ⚠️ **Vigilance 3.1.1 (à préempter en notes de revue) :** l'app comporte un écran
> d'**abonnement organisateur** (`SubscriptionScreen`). Préciser qu'il s'agit d'un
> **service B2B pour organisateurs** (service de billetterie), pas du déblocage de
> fonctionnalités de l'app pour un consommateur — sinon Apple peut exiger l'IAP. Texte en §10.

---

## 6. Export Compliance (chiffrement)

| Champ | Valeur | Source |
|---|---|---|
| `ITSAppUsesNonExemptEncryption` | **false** | `app.json` → `ios.infoPlist` |

➡️ À la question « Votre app utilise-t-elle du chiffrement ? » : **uniquement du
chiffrement exempté (HTTPS standard)**. Comme `ITSAppUsesNonExemptEncryption:false` est
déjà dans l'Info.plist, App Store Connect **ne redemande pas** la déclaration à chaque
build. Aucun document CCATS à fournir.

---

## 7. App Privacy (questionnaire — résumé des réponses)

À remplir dans App Store Connect → App Privacy. Base détaillée :
`docs/PLAY_DATA_SAFETY.md`. Réponses de haut niveau :

| Type de donnée | Collectée ? | Liée à l'identité ? | Utilisée pour du tracking ? |
|---|---|---|---|
| Coordonnées (e-mail, nom, téléphone) | Oui | Oui | Non |
| Identifiants (user ID) | Oui | Oui | Non |
| Localisation approximative | Oui | Oui | Non |
| Contenu utilisateur (photos, messages, vocaux) | Oui | Oui | Non |
| Données d'achat | Oui | Oui | Non |
| Diagnostics (crash Sentry) | Oui | **Non** | Non |

→ **Aucune donnée utilisée pour du tracking.** Confirmé côté code : **pas d'App Tracking
Transparency ni d'IDFA** (aucune occurrence dans `src/`), donc **pas de prompt ATT** et la
colonne « tracking » est **Non** partout.

---

## 8. Logins / Sign-In (guideline 4.8)

| Méthode | Présent ? | Source |
|---|---|---|
| **Sign in with Apple** | **Oui** (iOS) | `useSocialAuth.ts` (`AppleAuthentication.signInAsync`) ; `app.json` `usesAppleSignIn:true` ; plugin `expo-apple-authentication` |
| Google | Oui | `useSocialAuth.ts` (`@react-native-google-signin`) |
| E-mail / mot de passe | Oui | `authAPI` (Login/Register) |
| Téléphone (OTP SMS) | Oui | `usePhoneAuth` |

➡️ **Guideline 4.8 respectée** : un login social tiers (Google) est proposé **avec**
Sign in with Apple. Navigation **browse-first** : l'app est utilisable sans compte,
la connexion n'est requise que pour les actions (achat, messagerie).

---

## 9. Contenu généré par les utilisateurs & modération (guideline 1.2)

L'app comporte du UGC (messagerie texte/vocale, photos, événements). Les **3 exigences
Apple** sont couvertes :

| Exigence 1.2 | Présent ? | Source |
|---|---|---|
| **Signaler** un contenu | Oui | `MessageActionModal` (action `report`) → API `reportMessage` → POST `/message-reports/` |
| **Bloquer** un utilisateur | Oui | `blockUser` → `/users/{id}/block/` et `/user-messaging-settings/block_user/` (+ déblocage) |
| **Modération** (staff) | Oui | `ModerationScreen` (écran admin/modérateur) |

➡️ À déclarer : présence d'UGC + mécanismes de filtrage/signalement/blocage.
Ceci alimente aussi le §4 (Age Rating).

---

## 10. App Review — informations pour la revue Apple

Apple teste l'app avec un vrai compte. Fournir tout ce qui évite un rejet
« impossible de tester ».

| Champ | Valeur |
|---|---|
| **Sign-In required?** | Oui pour certaines actions (navigation possible sans compte — browse-first) |
| **Compte de démo — e-mail** | `review@eventez.online` |
| **Compte de démo — mot de passe** | ⚠️ **À renseigner** (celui généré à la création du compte) |
| **Contact — prénom / nom** | Brice Temena |
| **Contact — e-mail** | brice.temena@gmail.com |
| **Contact — téléphone** | ⚠️ **À renseigner** (numéro joignable) |

### ⚙️ Compte de revue à créer (admin Django → Nouvel utilisateur)

Un **compte ORGANISATEUR** — il couvre à la fois le parcours participant (parcourir,
acheter, messagerie, billet QR/Wallet) ET la partie organisateur mise en avant dans la
fiche (créer/gérer un événement, check-in). **Ni admin, ni modérateur** (back-office
hors périmètre grand public, risque de dérouter le testeur).

| Champ du formulaire | Valeur |
|---|---|
| **Email** | `review@eventez.online` — domaine `@eventez.online` **protégé** de `clear_demo_data` (compte durable, ne sera pas purgé) |
| **Nom d'utilisateur** | `apple_review` |
| **Prénom / Nom** | `Apple` / `Review` |
| **Téléphone** | un E.164 valide (pas besoin de recevoir de SMS) |
| **Mot de passe** | **« Générer » puis NOTER** (≥ 8 car.) → à coller dans App Store Connect |
| **Rôle** | ☑️ **Organisateur** |
| **Compte actif** | ☑️ **Oui** (sinon connexion impossible) |
| **Profil vérifié** | ☑️ **Oui** (sinon mur de vérification → rejet « impossible de tester ») |

> **Étape indispensable après création** : se connecter avec ce compte et **créer
> 1 événement publié/validé avec un type de billet GRATUIT (prix 0)**. Cela permet au
> testeur Apple de vérifier le parcours d'inscription + billet QR **sans paiement réel**
> (cohérent avec la note de revue « aucun débit réel en test »). Sans événement
> testable, l'app paraît vide → risque de rejet.

### Notes pour la revue (à coller dans « Notes »)
```
FR :
- La navigation (accueil, recherche, détail d'événement, carte) est accessible SANS compte.
- Certaines actions (achat de billet, messagerie) nécessitent une connexion : utiliser
  le compte de démo fourni ci-dessus.
- Paiements : l'app N'UTILISE PAS d'achats intégrés Apple. Les billets d'événements
  (biens/services physiques) sont payés via un prestataire externe (CinetPay / Mobile
  Money MTN·Orange / carte), ouvert dans une session navigateur sécurisée. Aucun débit
  réel n'est effectué en environnement de test.
- L'écran "Abonnement" concerne les ORGANISATEURS (service B2B de billetterie), il ne
  débloque pas de fonctionnalités de l'app pour un participant → hors périmètre IAP.
- Sign in with Apple est proposé, ainsi que Google, e-mail et téléphone (OTP).
- Contenu généré par les utilisateurs : messagerie avec Signalement + Blocage, et
  modération côté équipe.
- Suppression de compte : Profil > Paramètres > "Supprimer mon compte" (irréversible).

EN:
- Browsing (home, search, event details, map) works WITHOUT an account.
- Some actions (buying a ticket, messaging) require sign-in: please use the demo
  account provided above.
- Payments: the app does NOT use Apple In-App Purchase. Event tickets (physical
  goods/services) are paid through an external provider (CinetPay / Mobile Money
  MTN·Orange / card) opened in a secure browser session. No real charge occurs in test.
- The "Subscription" screen is for ORGANIZERS (B2B ticketing service); it does not
  unlock in-app features for attendees → outside IAP scope.
- Sign in with Apple is offered, along with Google, email and phone (OTP).
- User-generated content: messaging with Report + Block, plus team-side moderation.
- Account deletion: Profile > Settings > "Delete my account" (irreversible).
```

---

## 11. Aperçus et captures d'écran (App Store Connect → « Aperçus et captures d'écran »)

> ⚠️ App Store Connect **exige au moins 1 capture** pour la taille demandée avant de
> pouvoir soumettre. **Les 3 premières** apparaissent sur les fiches d'installation —
> soigne-les. Apple réutilise ces captures **pour toutes les langues** (pas besoin d'en
> refaire en anglais).

### iPhone — **écran de 6,5 pouces** (SEULE taille demandée par le formulaire)
- **Dimensions acceptées (au pixel près)** : `1242 × 2688`, `2688 × 1242`, `1284 × 2778`
  ou `2778 × 1284` px (portrait ou paysage).
- **Quantité** : de **1 à 10**. (Sur ta capture d'écran : **7/10** — déjà suffisant pour
  soumettre ; tu peux compléter jusqu'à 10.)
- **Format** : PNG ou JPEG, sans transparence, sans coins arrondis ni encoche ajoutée.

### iPad — **NON requis**
`ios.supportsTablet: false` dans `app.json` → app iPhone-only. **Aucune capture iPad**
à fournir. ✅ (Le formulaire affiche un onglet iPad, mais il n'est pas obligatoire ici.)

### Apple Watch / App iMessage — **NON concernés**
L'app n'utilise ni WatchKit ni le framework Messages → rien à fournir dans ces onglets.

### Aperçu vidéo (App Preview) — **facultatif**
0/3 requis. À ignorer pour le premier envoi.

### Icône App Store (dans le build, pas dans ce formulaire)
1024×1024 px, opaque, sans coins arrondis (`assets/icon2.png` convient). Elle est
embarquée dans le build EAS, pas téléversée ici.

### Idées d'écrans à capturer (7 à 10)
Carte des événements · détail d'un événement · achat de billet (choix méthode) ·
billet avec QR + bouton « Ajouter à Wallet » · tableau de bord organisateur ·
scan de check-in · messagerie. → Les **3 premières** = les plus vendeuses (carte,
détail événement, billet QR).

> 💡 Générer les captures au bon format : lancer l'app dans le **simulateur iPhone
> (14 Plus / 15 Plus = 6,5")**, `Cmd+S` pour capturer — la résolution native tombe
> pile dans les dimensions acceptées.

---

## 12. Vérifications techniques (usage strings & build)

### Usage strings iOS (Info.plist) — toutes justifiées par un usage réel

| Clé | Texte (résumé) | Utilisation réelle dans le code |
|---|---|---|
| `NSCameraUsageDescription` | Scanner les QR codes | `QRScannerScreen`, `ScanScreen`, `ConnectionScannerScreen` (expo-camera) |
| `NSLocationWhenInUseUsageDescription` | Événements à proximité | `MapScreen` (`getCurrentPositionAsync`) — **WhenInUse uniquement** |
| `NSPhotoLibraryUsageDescription` | Photos dans messages/événements | `useEventFormImages` (`launchImageLibraryAsync`) |
| `NSPhotoLibraryAddUsageDescription` | Enregistrer billets/images | expo-media-library (13 fichiers) |
| `NSMicrophoneUsageDescription` | Messages vocaux | `ConversationScreen` / `InputToolbar` (expo-audio) |
| `NSFaceIDUsageDescription` | Verrouillage & actions sensibles | `useBiometricConfirm`, `useAppLock` |

✅ **Cohérence vérifiée** : aucune usage string déclarée sans usage réel, et aucune
permission utilisée sans string. `NSContactsUsageDescription` **absent** — normal,
`expo-contacts` n'est pas utilisé (ne pas l'ajouter).

### Points de vigilance build (avant `eas submit`)

1. **`ios.buildNumber`** : non figé en local (piloté par EAS `appVersionSource:remote`
   + `autoIncrement` en prod). Vérifier que le 1er build EAS pousse bien un buildNumber,
   sinon la soumission échoue.
2. **`supportsTablet: false`** → app iPhone-only, **aucune capture iPad requise** (cf. §11).
3. **Plugin `@react-native-google-signin`** : ~~déclaré deux fois~~ → **corrigé**
   (dédupliqué, source unique = `app.config.js` alimenté par
   `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`). ✅
4. **`ITSAppUsesNonExemptEncryption: false`** déjà présent → pas de re-déclaration
   export-compliance à chaque build.

---

## 13. Champs de la page « App iOS Version 1.0 » (soumission)

Correspondance directe avec le formulaire App Store Connect que tu remplis :

| Section du formulaire | Quoi mettre | Référence |
|---|---|---|
| **Texte promotionnel** | Voir §2 (FR) / §3 (EN) — ≤ 170 car. | §2/§3 |
| **Description** | Voir §2 (FR) / §3 (EN) — ≤ 4000 car. | §2/§3 |
| **Mots-clés** | Voir §2 (FR) / §3 (EN) — ≤ 100 car. | §2/§3 |
| **URL de l'assistance** | `https://eventez.online/contact` | §1 |
| **URL marketing** | `https://eventez.online` | §1 |
| **Version** | `1.0.0` | §1 |
| **Copyright** | `2026 OverBrand` | §1 |
| **Fichier de couverture géographique** | *Aucun* (laisser vide — pas de restriction géo) | — |

### Build
- Téléverse le build via **EAS** : `eas submit -p ios --profile production` (ou
  Transporter). Le build apparaît ensuite dans la section « Build » à sélectionner.
- **Chiffrement / conformité des exportations** : rien à téléverser. Comme
  `ITSAppUsesNonExemptEncryption:false` est dans l'Info.plist, Apple **ne demande pas**
  de documents CCATS (cf. §6). Si l'UI insiste : répondre « utilise uniquement du
  chiffrement standard exempté (HTTPS) ».

### Achats intégrés et abonnements
- **Ne rien ajouter ici.** L'app n'utilise pas l'IAP Apple (cf. §5). L'abonnement
  organisateur est un service B2B hors StoreKit → à expliquer dans les Remarques.

### Game Center
- **Non concerné** (l'app n'utilise pas Game Center).

### Informations utiles à la vérification de l'app
- **Connexion requise** : ✅ cocher (certaines actions exigent un compte).
- **Nom d'utilisateur / Mot de passe** : ⚠️ **compte de démo RÉEL à créer et tester**
  (ex. `review@eventez.online`). Sans ça → rejet « impossible de tester ». (cf. §10)
- **Coordonnées** : Prénom `Brice` · Nom `Temena` · E-mail `brice.temena@gmail.com`
  · **Téléphone ⚠️ à renseigner** (numéro joignable).
- **Remarques (≤ 4000 car.)** : coller le bloc FR+EN de §10 (browse-first, paiements
  externes non-IAP, abonnement B2B, suppression de compte, logins).
- **Pièce jointe** : facultatif (ex. courte vidéo de parcours si utile). Non requis.

### Publication de la version dans l'App Store
Trois choix — **recommandé : « Publier manuellement »** pour un 1er lancement (tu
déclenches la mise en ligne quand tu es prêt, après approbation) :
- *Manuellement* → tu publies d'un clic après approbation. **← recommandé.**
- *Automatiquement* → mise en ligne dès l'approbation (sans contrôle du timing).
- *Automatiquement après une date* → publication planifiée après approbation.

---

## Documents liés
- `docs/APP_STORE_CHECKLIST.md` — checklist de préparation store iOS.
- `docs/PLAY_DATA_SAFETY.md` — base détaillée des données collectées (réutilisée en §7).
