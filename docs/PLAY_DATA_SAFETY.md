# Google Play — Déclaration "Sécurité des données" & justification des permissions

Document de référence à recopier dans **Play Console → Contenu de l'application →
Sécurité des données** (formulaire Data Safety) et dans la justification des
permissions sensibles. Basé sur les permissions réelles d'`app.json`, les SDK
intégrés et la politique de confidentialité publique.

- **URL politique de confidentialité (à coller dans Play Console)** :
  `https://eventez.online/privacy`
  (page publique, hors middleware d'auth — voir aussi `/terms`, `/legal`)
- **Âge minimum déclaré** : 16 ans (cf. politique §11 « Mineurs »)
- **Contact RGPD (canonique)** : `privacy@eventez.online`

> ⚠️ **Incohérence à corriger** : l'écran mobile utilise `privacy@eventez.online`
> (= domaine réel), mais les pages web publiques `/privacy`, `/terms`, `/legal`
> affichent encore `@eventez.cm` (`contact@`, `dpo@`, `privacy@`, `legal@`,
> `direction@`). Comme Google lit la **page web** `eventez.online/privacy`,
> aligner ces adresses sur `@eventez.online` (ou confirmer que les boîtes `.cm`
> reçoivent bien les e-mails) avant soumission.

---

## 1. Permissions Android déclarées et justification

| Permission | Utilisée pour | Justification (réviseur Play) |
|---|---|---|
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Carte interactive + « événements près de moi » | Affiche les événements à proximité et la carte. Demandée **au moment de l'usage**, avec consentement. L'app fonctionne sans (saisie manuelle de la ville). |
| `CAMERA` | Scan des QR codes (check-in billets) + sélection/prise de photo (profil, pièces jointes) | Indispensable au check-in organisateur et au partage d'images en messagerie. |
| `RECORD_AUDIO` | **Messages vocaux** dans la messagerie | Enregistrement micro via `expo-audio` (`useAudioRecorder` / `requestRecordingPermissionsAsync` / `recorder.record()` dans `ConversationScreen.tsx`). Demandée au premier appui sur le bouton micro. |
| `POST_NOTIFICATIONS` (auto via expo-notifications) | Notifications push (rappels d'événement, paiements, messages) | Opt-in système. |
| **Bloquées** : `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` | — | Explicitement retirées (`blockedPermissions`) pour minimiser la surface. |

**iOS (rappel, hors Play)** : `UIBackgroundModes: ["audio"]` est requis pour la
**lecture en arrière-plan des messages vocaux**. Sans incidence Play Store, mais
à justifier à l'App Review Apple (case « Audio » → lecture de messages vocaux).

---

## 2. Formulaire "Sécurité des données" — déclaration par type

Légende : **Collectée** = envoyée hors de l'appareil · **Partagée** = transmise à
un tiers · **Optionnelle** = l'utilisateur peut utiliser l'app sans la fournir.

### Informations personnelles

| Type de donnée | Collectée | Partagée | Optionnelle | Finalités |
|---|---|---|---|---|
| Nom (prénom/nom) | Oui | Oui¹ | Non | Gestion du compte, fonctionnalité de l'app |
| Adresse e-mail | Oui | Oui¹ | Non | Gestion du compte, fonctionnalité, communications |
| Numéro de téléphone | Oui | Oui¹ ² | Oui | Fonctionnalité, gestion du compte |
| Identifiants utilisateur (User ID) | Oui | Non³ | Non | Gestion du compte, fonctionnalité, sécurité |
| Adresse (ville/pays uniquement) | Oui | Non | Oui | Fonctionnalité (événements près de chez vous), personnalisation |

¹ Partagée avec **l'organisateur** de l'événement auquel l'utilisateur s'inscrit
(nom + e-mail, et téléphone si fourni), strictement pour la gestion de l'événement.
² Téléphone également transmis au **fournisseur SMS** (notifications), en tant que
sous-traitant.
³ Transmis à **Sentry** (crash reporting) en tant que **sous-traitant** agissant
pour notre compte — non « partagé » au sens Google (pas d'usage propre par le tiers).

### Localisation

| Type de donnée | Collectée | Partagée | Optionnelle | Finalités |
|---|---|---|---|---|
| Position approximative | Oui | Non | Oui (consentement) | Fonctionnalité (événements à proximité) |
| Position précise | Oui | Non | Oui (consentement) | Fonctionnalité (carte, distance aux événements) |

> La position n'est **pas conservée au-delà de la session** (cf. politique §7).
> Cochez « Traitée de manière éphémère » si l'app n'envoie pas la position brute
> au serveur (seule la ville saisie est persistée).

### Informations financières

| Type de donnée | Collectée par l'app | Remarque |
|---|---|---|
| Historique des achats | Oui | Liste des billets/inscriptions. Finalités : fonctionnalité, gestion du compte. Partagé avec l'organisateur. |
| Infos de paiement (n° carte / mobile money) | **Non** | Saisies directement chez les processeurs **NotchPay / CinetPay / Stripe** (WebBrowser/redirection). L'app ne voit ni ne stocke les numéros. |

### Photos / vidéos, Audio, Messages

| Type de donnée | Collectée | Partagée | Optionnelle | Finalités |
|---|---|---|---|---|
| Photos | Oui | Oui⁴ | Oui | Fonctionnalité (photo de profil, pièces jointes, images d'événement) |
| Enregistrements audio (messages vocaux) | Oui | Oui⁴ | Oui | Fonctionnalité (messagerie) |
| Messages in-app | Oui | Oui⁴ | Oui | Fonctionnalité (messagerie organisateur ↔ participant) |

⁴ Partagés uniquement avec les **destinataires de la conversation** concernée.

### Activité dans l'app & Diagnostics

| Type de donnée | Collectée | Partagée | Optionnelle | Finalités |
|---|---|---|---|---|
| Interactions dans l'app | Oui | Non | Non | Analytics, fonctionnalité |
| Journaux de plantage (crash logs) | Oui | Non³ | Non | Fonctionnalité (stabilité), analytics |
| Diagnostics / performance | Oui | Non³ | Non | Analytics, fonctionnalité |
| Identifiants d'appareil / autres ID (push tokens FCM/Expo/APNs, nom d'appareil) | Oui | Non³ | Non | Fonctionnalité (notifications), sécurité, analytics |

³ Sentry (crash/diagnostics) = sous-traitant. `sendDefaultPii: false` ; les corps
de requête HTTP sont **expurgés** des breadcrumbs (`crashReporting.ts`). Le `User ID`
et l'e-mail sont attachés pour le support (`setUser`).

> **Publicité / marketing tiers : NON.** Les notifications « suggestions
> d'événements » / réengagement sont **first-party et opt-in** (`notify_marketing`,
> désactivé par défaut). Aucune donnée n'est vendue ni utilisée pour de la pub tierce
> (cf. politique §5). Déclarer la finalité « Personnalisation », pas « Publicité ».

---

## 3. Pratiques de sécurité (section dédiée du formulaire)

| Question Play | Réponse | Preuve |
|---|---|---|
| Données chiffrées en transit ? | **Oui** | HTTPS/TLS partout ; `withNetworkSecurity` plugin ; JWT |
| L'utilisateur peut-il demander la suppression de ses données ? | **Oui** | Suppression de compte in-app + `privacy@eventez.online` (politique §8) |
| Engagement envers la "Families Policy" ? | Non applicable | App 16+, non destinée aux enfants |
| Revue de sécurité indépendante ? | Optionnel (Non par défaut) | — |

---

## 4. Checklist avant soumission

- [ ] Coller `https://eventez.online/privacy` dans Play Console (champ Politique de confidentialité)
- [ ] Aligner les e-mails des pages web `/privacy`, `/terms`, `/legal` sur `@eventez.online` (actuellement `.cm`) et confirmer que la boîte `privacy@eventez.online` reçoit bien les e-mails
- [ ] Remplir le formulaire Data Safety avec les tableaux §2 + §3
- [ ] Justifier `RECORD_AUDIO` (messages vocaux) si Play le demande — texte §1
- [ ] Vérifier que la fonctionnalité « suppression de compte » est bien exposée dans l'app (exigence Google "Account deletion")
- [ ] (Hors Play) Justifier `UIBackgroundModes: audio` à l'App Review Apple
