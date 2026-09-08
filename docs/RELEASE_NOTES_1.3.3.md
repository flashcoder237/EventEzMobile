# Notes de version — EventEz 1.3.3

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Correctif par-dessus 1.3.2.** Gros cycle de fiabilité issu de tests
> utilisateurs simulés (plusieurs profils) : navigation plus simple pour revenir
> à l'accueil, expérience vidéo repensée sur les fiches événement, et de
> nombreuses corrections de stabilité, d'accessibilité et de confiance
> (paiement, cagnotte, remboursement).

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Navigation plus fluide : revenir à l'accueil est plus simple, plus de longues suites de « retour ».
• Vidéo des événements repensée : lecture avec le son d'un tap, plein écran, et respect de votre batterie et de vos données.
• Paiement plus rassurant : on vous confirme clairement que vous ne serez débité qu'une seule fois.
• Nombreuses corrections de stabilité, d'accessibilité et d'affichage.

---

## 🇬🇧 English

What's new in this version:

• Smoother navigation: getting back home is easier, no more long chains of "back".
• Reimagined event videos: tap for sound, fullscreen, and mindful of your battery and data.
• More reassuring payment: you're clearly told you'll only be charged once.
• Many stability, accessibility and display fixes.

---

### Notes internes (ne PAS coller dans le store)

Cycle piloté par des campagnes de **test utilisateur simulé** (panels de personas :
fêtard pressé, invitée peu tech, organisateur, exposant, power-user fintance,
animateur de live) qui ont critiqué l'app en conditions réelles, plus des audits
de code multi-agents. Les correctifs ci-dessous en découlent.

---

**Navigation — désempilement (retour à l'accueil)**
- Fin de l'empilement infini event → event similaire → event : `SimilarEventsSection`
  passe de `push` à `replace` + `getId` sur EventDetails (rouvrir le même event ne
  crée plus de doublon). La pile ne grossit plus sans limite.
- Reset aux fins de parcours : après paiement (réussi/échoué) et après création
  d'événement, la pile s'effondre proprement vers l'accueil / Mes billets / Mes
  événements au lieu de laisser 6-10 écrans empilés en dessous. Helpers
  `resetToMainTab` / `resetToMainThen`.
- Écrans sans AUCUNE sortie débloqués : `VerificationRequestsAdmin` (aucun bouton
  retour) et `BoxOffice` (caisse POS plein écran) reçoivent un retour ; bouton
  Accueil réutilisable ajouté à `EditorialHeader` (prop `home`).

**Cover video des fiches événement — refonte façon Instagram**
- Autoplay muet + boucle ; **son au tap** (icône 🔇→🔊, sur place) ; **agrandir**
  vers un lecteur plein écran avec contrôles. Le tap sur la vidéo n'ouvre plus la
  galerie photo par erreur.
- Optimisations mobiles : **pause au scroll**, **pas d'autoplay en data éco/3G**
  (poster + play), respect de « réduire les animations », **audio focus** (coupe
  la musique des autres apps), **arrêt de la vidéo** en quittant la fiche ET en
  arrière-plan.
- Corrections des fuites détectées au test : audio focus relâché au démontage,
  `unloadAsync` du lecteur, garde-fou data non contournable, écran non figé si la
  vidéo échoue, spinner du plein écran réarmé.
- Accessibilité : `accessibilityLabel` sur son/agrandir/play, cibles 44×44
  déplacées en bas-gauche (plus de confusion avec suivre/partager).

**Paiement, cagnotte, remboursement — confiance (retours « peu tech » + « fintech »)**
- Réassurance anti-double-débit VISIBLE pendant l'attente de paiement.
- Cagnotte mariage : message avant la redirection vers la page de paiement +
  remerciement au retour ; rate-limit (429) affiché correctement.
- « FCFA » au lieu de « XAF » en confirmation biométrique ; « PAIEMENT » au lieu
  de « CHECKOUT ».
- Remboursement : délai cohérent (3-5 jours partout, était contradictoire) ;
  clause CGV + politique de remboursement entièrement cliquable.

**Audit correctifs P0/P1 (crashs, doublons, édition)**
- Crash de la liste de connexions (nom vide) corrigé.
- Doublon de message après coupure réseau (réconciliation SQLite) corrigé ;
  bulle de message tronquée qui ne se réconciliait pas au serveur corrigée.
- Édition d'événement : plus de dépublication involontaire ; galerie et **agenda
  (intervenants/pistes)** correctement rechargés et synchronisés (plus de
  doublons au save).
- Code d'accès refusé : feedback au lieu d'un échec silencieux. « Nouveau
  message » ouvre le bon fil 1-1. Mariage privé par défaut. États vides qui ne
  se confondent plus avec un échec réseau. Nombreuses clés i18n FR/EN.

**Live / organisateur**
- Confirmation avant de raccrocher la visio (évite de couper son propre direct).
- Action « Démarrer le direct » découvrable dans le menu organisateur.
- Gestion mariage accessible avant validation de l'événement.

---

### Avant publication

- [ ] Relire le texte store : quatre lignes lisibles, pas la liste interne.
- [ ] Vérifier que `app.json` et `package.json` sont bien en 1.3.3
      (`versionCode` / `buildNumber` auto-incrémentés par EAS).
- [ ] Tester sur device les points non validables sans émulateur : expérience
      vidéo (son au tap, pause au scroll, arrière-plan), navigation (reset après
      paiement / création), sorties des écrans caisse/admin.
- [ ] Déployer le backend (garde-fou host-first visio) AVANT de diffuser le build.
