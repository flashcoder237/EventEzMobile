# Notes de version — EventEz 1.3.7

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Version par-dessus 1.3.6** (build Android production n° 32 du
> 2026-10-04, commit `96b3208`). Contient les retours testeur du 2026-10-07
> (54 points) et le correctif du widget Android. Le dernier build iOS publié
> est le 1.3.3 : **si 1.3.4 → 1.3.6 ne sont jamais sortis sur l'App Store**,
> fusionner leurs textes store avec celui-ci pour iOS.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Événements à code d'accès : l'inscription aboutit après un code valide.
• Messagerie : photos et avatars corrigés, messages marqués désormais privés.
• Visio : l'image dans l'image démarre de façon fiable en quittant l'app.
• Organisateurs : invitations d'équipe envoyées, rapports lisibles, émargement avec les billets.
• Widget « Prochain billet » réparé sur Android, carte du lieu plus rapide et nombreuses améliorations.

---

## 🇬🇧 English

What's new in this version:

• Access-code events: registration now completes after a valid code.
• Messaging: photos and avatars fixed, starred messages now private.
• Video calls: picture-in-picture starts reliably when you leave the app.
• Organizers: team invitations are sent, reports are readable, sign-in sheets list tickets.
• “Next ticket” widget fixed on Android, faster venue map and many improvements.

---

### Notes internes (ne PAS coller dans le store)

Détail complet des 54 points : mémoire `project_test_feedback_cedric_2026_10`.
Ne sont listés ici que ceux qui touchent l'app ou exigent un déploiement.

#### Widget Android « Prochain billet » — « Impossible de charger le widget »
- **Cause réelle (logcat du launcher, 2026-10-08)** :
  `Class not allowed to be inflated android.view.View`. Le voile
  `eventez_widget_scrim` ajouté avec le visuel (commit `78870a6`, donc
  présent dans les builds 1.3.5 et 1.3.6) était un `<View>` nu, classe
  interdite dans les RemoteViews → échec à CHAQUE rendu, avec ou sans billet.
  Remplacé par un `ImageView` (`src` = dégradé, `fitXY`). Vérifié sur
  appareil : plus d'erreur d'inflation.
- Durcissement annexe (pas la cause) : `WidgetImageCache.kt` borne le bitmap
  décodé (largeur 480 + nombre de pixels) sous le quota Binder ~1 Mo.
- Les notes de la 1.3.6 mentionnent aussi ce correctif : elles ont été
  complétées après coup, il n'est PAS dans le build 1.3.6.

#### Carte en mode sombre — après le build n° 35 (OTA possible)
- Les fonds CARTO (`basemaps.cartocdn.com`) exigent désormais une clé API :
  chaque tuile devenait une image « API KEY REQUIRED ». `WebViewMap` passe sur
  OSM dans les deux thèmes, assombri par filtre CSS. Correctif JS seul
  (commit `a496c81`), PAS dans le build 1.3.7 n° 35 → livrable par OTA.
  Même correctif côté web (`NearestEventsMap`, carte de l'accueil).

#### Inscription / accès
- Inscription à un event protégé par code impossible : le serveur exige
  maintenant le jeton `X-Event-Access-Token` comme preuve équivalente ; le
  client stocke le jeton sous l'UUID réel ET le slug, et le rejoue sur
  `POST /registrations/`.
- Favori « qui ne fait rien » hors connexion : `useVerificationGuard` émettait
  un événement sans abonné → navigation vers Login.

#### Messagerie
- Image de message blanche (pièces jointes optimistes fusionnées par index →
  par type + nom). Avatar « U » (payload WS sans `sender_avatar` /
  `sender_name`).
- Marquage des messages : n'était plus privé (booléen global diffusé) →
  `StarredMessage` par lecteur, endpoint `/messages/starred/`.

#### Visio
- PiP Android : déclenché via `onUserLeaveHint` + `setPipAutoEnter(true)`
  (natif, module `eventez-pip`), UI masquée en PiP, ratio borné ; hook
  `usePictureInPicture` supprimé. iOS : PiP système impossible pour une
  WebView, la bulle in-app reste le plafond.
- Safe-area de la WebView visio.

#### Organisateur
- Catégorie suggérée à la création (`suggestCategory`) ; modèles d'événement
  avec catégorie (migration backend 0059).
- Caisse masquée sur un event en ligne gratuit (+ garde backend).
- Profil organisateur : onglets À venir / Passés.
- Écran de félicitations : chips compactes. `BrandLoader` dans
  `LoadingSpinner`. Description publique coupée corrigée. Badge onglet Billets.
- Carte de sélection du lieu plus rapide (montage conditionnel, sélection
  immédiate, géocodage annulable).

#### Publicités
- Ratio 16:9 réel (plus de visuel rogné) ; rotation pondérée côté serveur ;
  libellé « PUBLICITÉ ».

---

### Avant publication

- [ ] **Build store requis** (pas d'OTA) : layout + Kotlin du widget, module
      natif `eventez-pip`.
- [ ] **Backend déployé AVANT** : migrations `events 0059` et
      `user_messages 0024` (reprise des marquages existants), jeton d'accès
      accepté à l'inscription, `/messages/starred/`, champs avatar/nom dans le
      payload WS, garde caisse, rotation des pubs.
- [ ] Web déployé (jeton d'accès, factures, pointage en lot).
- [ ] **Carte Android** : la clé Google Maps est refusée (« API not
      activated ») → activer « Maps SDK for Android » + facturation sur son
      projet Cloud, et ajouter le SHA-1 de signature EAS / Play aux
      restrictions. Indépendant du build, mais la carte reste blanche tant que
      ce n'est pas fait.
- [ ] Tests appareil prioritaires :
  1. Widget : le poser sans billet → « Aucun billet à venir » ; avec billet
     et affiche → image + voile.
  2. Event à code : saisir le code puis s'inscrire jusqu'au bout.
  3. Visio : quitter l'app en appel → PiP ; revenir → UI complète.
  4. Messagerie : envoyer photo + vocal ensemble ; marquer un message, vérifier
     que l'interlocuteur ne le voit pas marqué.
- [ ] Relire le texte store FR/EN ci-dessus.
