# Notes de version — EventEz 1.3.4

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Version par-dessus 1.3.3** (version passée à 1.3.4 dans `app.json` et
> `package.json` le 2026-09-29). Trois axes : une app nettement plus rapide
> (démarrage, écrans, listes), une couche de micro-animations et de retours
> haptiques sur tout le parcours, et des correctifs de paiement Mobile Money.

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Plus rapide : l'app démarre plus vite et les écrans s'ouvrent instantanément.
• Plus vivante : animations et retours haptiques discrets, de la recherche jusqu'à votre billet.
• Billet façon Wallet : un reflet qui suit l'inclinaison du téléphone, et un QR plus facile à scanner.
• Paiement Mobile Money plus fiable, avec des messages clairs en cas de refus.
• Nombreuses corrections d'affichage et de traduction.

---

## 🇬🇧 English

What's new in this version:

• Faster: the app starts quicker and screens open instantly.
• More alive: subtle animations and haptic feedback, from search to your ticket.
• Wallet-style ticket: a sheen that follows your phone's tilt, and a QR code that scans more easily.
• More reliable Mobile Money payments, with clear messages when a payment is declined.
• Many display and translation fixes.

---

### Notes internes (ne PAS coller dans le store)

**Aussi dans cette version (commits depuis le bump 1.3.3, `7839c20`)**

> ⚠️ Vérifier que `9545d41` et `61fb861` n'étaient pas déjà dans le build 1.3.3
> publié ; sinon retirer les lignes correspondantes.

- Paiement Mobile Money via CinetPay : le numéro de téléphone était omis à
  l'initiation (`1004 INVALID_PARAMS`), les paiements échouaient. Le numéro est
  désormais validé pour tout Mobile Money, quel que soit le fournisseur (`dd0f91c`).
- Paiement bloqué / refusé (anti-fraude 24 h) : vrai message lisible au lieu de
  « false » ; `extractErrorMessage` lit `data.message` en priorité (`54e458b`).
- Démarrage rapide : splash piloté par un signal « app prête » (0,75–2,5 s au
  lieu de 3,4 s fixes), utilisateur en cache affiché tout de suite, une seule
  langue chargée au démarrage, fonts en parallèle, React Compiler (`22504ac`,
  `1d62509`).
- Écrans instantanés : fiche événement ouverte avec l'aperçu de la carte,
  caches Profil / Découvrir respectés, listes sans items invisibles 1,5 s,
  Découvrir virtualisé avec miniatures d'images (`48f91d4`, `1d62509`).
- Actions optimistes : marquer lu / suivre un utilisateur sans attendre le
  serveur (rollback en cas d'échec) ; outbox rafraîchi sur événement (`1d62509`).
- Crash « Property 'Resolved' doesn't exist » corrigé (React Compiler et
  écrans lazy) (`1d62509`).
- Traductions : « Partager », « Organisateur », mois des cartes, bannière de
  connexion lente, dates de l'agenda et de la fiche suivent la langue (`1d62509`).
- Messagerie, check-in hors ligne, thème éditorial, deep links
  `/dashboard/registrations/` et `/dashboard/events/` (`61fb861`).
- Messages tronqués à l'affichage, modales sous la barre d'état Android, visio,
  lecteur vidéo (`9545d41`).

**Micro-delight — fondations (lot 0)**
- Nouvelles primitives d'animation dans `src/components/ui/motion` : porte
  `useMotionGate` (animations réduites, app en arrière-plan, écran masqué),
  orchestrateur `moments` (un effet à la fois, une fois par session),
  `GradientBorder`, `GradientIcon`, `GlintSweep`, `RollingText`, `CountBadge`,
  `LiveDot`, `DrawCheck`, `useTilt` (gyroscope via Reanimated, sans dépendance
  native), `RotatingPlaceholder`. Dégradés `aurora` / `coralViolet` (variantes
  sombres auto) dans le thème.
- `utils/haptics` : `throttled(kind, ms)` et `celebrate()` ; la plupart des
  appels directs à `expo-haptics` passent désormais par l'utilitaire.
- Style guide mobile §6.1 : règles de mouvement émotionnel et d'haptique.

**Corrections repérées pendant l'audit**
- Scanner organisateur : un billet **déjà scanné** ou venant d'un **autre
  événement** vibrait et sonnait comme un succès. Désormais : vibration
  d'avertissement, aucun son. Idem présence de session déjà enregistrée.
- Scanner : ligne de scan et point « live » figés en mode économie batterie et
  quand « Réduire les animations » est actif.
- Favoris : les événements déjà enregistrés ne rebondissent plus à l'affichage
  des listes ; vibration légère à l'enregistrement, rien au retrait.
- Découvrir : l'exemple qui défile dans la recherche ne redessine plus tout
  l'écran toutes les 3 s, et s'arrête quand l'écran n'est pas affiché.
- Cloche de Découvrir : une pulsation à l'arrivée d'une notification au lieu
  d'une pulsation infinie.
- Scan participant : une seule vibration (il y en avait deux) ; le succès
  d'une mise en relation vibre quand la connexion est réellement créée.
- Barre d'onglets : le reflet passe une fois à l'arrivée sur l'onglet et au
  retour dans l'app, au lieu de tourner en boucle toutes les 15 s ; respecte
  « Réduire les animations ».
- Bandeau « En direct » : point radar partagé, en pause en arrière-plan.
- Confettis : désactivés quand « Réduire les animations » est actif.
- Paiement échoué : fondu + une secousse et vibration d'erreur (au lieu d'une
  entrée « rebond » joyeuse sans vibration).
- Paiement réussi : la vibration tombe quand l'icône apparaît, plus au montage.

**Micro-delight — signature (lot 1)**
- Recherche Découvrir : une « aura » indigo → violet → corail fait un tour du
  champ au premier affichage de la session, au retour dans l'app après 10 min
  et au toucher (vibration « sélection ») ; la loupe passe en dégradé pendant
  le balayage. Même effet au toucher sur la barre compacte.
- Écran de recherche : anneau vivant pendant la saisie (tourne lentement,
  accélère à chaque frappe, rapide pendant le chargement) ; vibration légère
  quand des résultats arrivent après une recherche de plus de 0,4 s ; anneau
  corail bref quand il n'y a aucun résultat.
- Barre d'onglets : la pilule s'étire en ressort, l'icône active fait un petit
  « pop », le libellé entre en fondu ; vibration « sélection » au changement
  d'onglet (au lieu d'un impact).
- Badges non lus (onglets Messages / Profil, conversations) : la pastille
  éclate et le chiffre roule quand le compteur monte — jamais au chargement.
- Cloche de Découvrir : elle sonne (balancement) avec une vibration légère
  quand une notification arrive écran affiché (au plus une fois / 10 s).
- Favoris / suivre : petit éclat de 6 particules à l'enregistrement ; signet
  en dégradé corail → violet sur les cartes « À la une » ; suivre un événement
  vibre à l'activation seulement et n'anime plus quand le statut arrive du
  serveur.

**Micro-delight — récompenses (lot 2)**
- Paiement réussi : la coche se dessine au trait sur le cercle ; la vibration
  de fête (succès + écho léger) tombe à la fin du trait, puis un anneau part
  une seule fois et les confettis suivent (60 au lieu de 150). Fin de
  l'anneau qui pulsait à l'infini.
- Billet (écran QR) : effet holographique façon Wallet — la carte s'incline
  légèrement (±2,5°) avec le téléphone et un reflet irisé glisse sur l'en-tête,
  jamais sur le QR. Gyroscope via Reanimated (aucune dépendance native),
  coupé hors écran, en « Réduire les animations » et après 15 s d'immobilité ;
  repli au doigt (glissement horizontal, le défilement vertical reste prioritaire).
- Billet verrouillé (biométrie) : le cadenas s'efface, le QR apparaît en zoom
  et les 4 coins arrivent en cascade ; vibration « succès » à l'arrivée du
  dernier coin.
- Billet scanné : un tampon « VALIDÉ » s'écrase sur la bannière (écran QR) et
  sur la carte (Mes billets) la PREMIÈRE fois que l'app le voit (vibration au
  contact), puis reste posé, statique.
- Création d'événement : la soumission ouvre une feuille dédiée — tampon
  « EN REVUE » (vibration « succès » au contact), titre de l'événement en
  dégradé, mêmes actions qu'avant — au lieu de l'alerte générique.
- Scanner organisateur : les coins du viseur disent le résultat — vert qui se
  resserre avec un voile bref (valide), ambre avec un petit « tic » (déjà
  scanné / billet d'un autre événement), rouge qui secoue (refusé). Les
  compteurs Scannés / Validés / Refusés font un petit « pop » quand ils montent.
- Favoris : l'éclat ne joue plus quand l'état « favori » arrive du serveur
  après l'affichage de la carte — seulement après un vrai toucher.

**Micro-delight — le vivant (lot 3)**
- Profil (carte « Mon tableau de bord ») : les stats comptent de 0 à leur
  valeur à la première apparition (600 ms, écrit sur le thread UI, sans
  re-render) ; ensuite un chiffre qui augmente roule avec un bref éclat.
- Mes billets : l'anneau J-x se remplit à chaque arrivée sur l'onglet (700 ms).
  À J-1 / J-0, l'arc et le « J-x » passent en dégradé indigo → corail avec un
  seul pouls de halo.
- Compte à rebours du billet : dans la dernière heure, seuls les chiffres qui
  changent roulent et la pastille reçoit un liseré en dégradé ; au passage
  « en direct » vu à l'écran, fondu vers la pastille live + une vibration légère.
- Point « en direct » homogène partout (radar unique, en pause écran masqué /
  arrière-plan / animations réduites) : Mes billets, compte à rebours, agenda
  (session en cours), onglet visio, Live Ops (fin de la pulsation infinie),
  tableau organisateur.
- Chips : Découvrir — chip « Tous » en dégradé de marque ; toutes les chips
  répondent au doigt (échelle 0,95 + vibration « sélection »). Recherche —
  filtres rapides : le fond glisse d'une couleur à l'autre (180 ms) et l'icône
  fait un petit pop à l'activation. Les bords des rangées s'estompent
  seulement quand du contenu est caché de ce côté.
- Messagerie : vibration légère à l'envoi + l'avion « décolle » (l'envoi part
  immédiatement depuis le lot 4, le vol est joué en parallèle) ; échange
  micro ↔ envoyer en fondu-zoom ; à la livraison la 2e coche glisse, à la
  lecture elle passe au violet de marque en fondu (jamais au chargement).
- Skeletons : une seule horloge de reflet partagée pour tout l'écran (au lieu
  d'une boucle par bloc) → un balayage unique et cohérent, moins de batterie ;
  le reflet n'apparaît qu'après 400 ms (un chargement rapide ne clignote pas)
  et prend une teinte indigo légère.
- QR codes (billet, détail d'inscription, affichage commun) : noir pur sur
  blanc au lieu du violet, pour la fiabilité du scan (aligné sur le web).

**Micro-delight — finitions (lot 4)**
- Messagerie : le message part tout de suite (le délai de ~100 ms du lot 3
  est supprimé) ; l'avion décolle en parallèle, verrou anti double envoi gardé.
- Découvrir :
  - re-toucher l'onglet Découvrir (qui remonte le flux) fait faire un tour à la
    boussole, avec une vibration légère ;
  - en tirant vers le bas, le grand titre grossit légèrement (façon iOS) ;
  - header compact : fond désormais OPAQUE (clair et sombre ; avant, on voyait
    les cartes à travers), il glisse de −8 px et seul son contenu apparaît en
    fondu ; un filet indigo → violet → corail se dessine à mesure qu'on défile ;
  - la carte « À la une » reçoit un reflet une seule fois par session, et son
    étoile passe en dégradé corail → violet ;
  - bouton « remonter » : arrive en zoom-ressort, flèche en dégradé, vibration
    « sélection » au toucher.
- Tirer pour rafraîchir (Android) : le spinner passe par indigo, violet et
  corail sur Découvrir, Mes billets, Favoris, Messages, Profil, Notifications
  et les autres listes principales. La version iOS « EZ qui se remplit » n'est
  pas faite (le décalage négatif n'existe que sur iOS, gain faible).
- Profil : une fois par session, un anneau en dégradé fait le tour de l'avatar
  et un reflet passe sur le badge « Vérifié ».
- Notifications in-app : liseré vertical en dégradé avec une lumière qui le
  descend une fois ; vibration légère (au lieu de medium) et au plus une toutes
  les 3 s pour les messages.
- Onboarding : les points de pagination s'étirent en continu pendant le
  glissement (plus de saut), le point actif est en dégradé, une vibration
  « sélection » à chaque page, et une aura fait un tour autour du bouton de la
  dernière page.
- Carte : le marqueur choisi fait un « pop » avec un halo en dégradé qui tourne
  deux fois ; après un chargement, les 20 premiers marqueurs apparaissent en
  cascade ; vibration « sélection » au toucher d'un marqueur ; l'icône
  « me localiser » passe en dégradé 3 s après un recentrage. Coupé avec
  « Réduire les animations ».
- Icônes en dégradé ponctuelles : états vides (l'icône passe du gris au dégradé
  à l'apparition), billet obtenu sur l'écran de paiement réussi.
- Correctif interne : `GlintSweep` ne joue plus à la simple mesure de sa taille.

#### Micro-animations — revue finale
- Badges d'onglet et cloche de Découvrir : ne « poppent » / ne sonnent / ne
  vibrent plus au lancement quand les compteurs arrivent du serveur (0 → n) ;
  fenêtre de chargement de 4 s après le montage (`useSettled`).
- Mes billets : plusieurs tampons « VALIDÉ » affichés d'un coup ne donnent
  qu'une vibration (plafond 1,5 s).
- Coche dessinée (`DrawCheck`) : l'action de fin (vibration, confettis) ne part
  qu'une fois, même si « Réduire les animations » est détecté après coup.

---

### Avant publication

- [ ] Relire le texte store (FR/EN ci-dessus) et le texte promotionnel.
- [ ] **Build store requis** : le projet n'embarque pas `expo-updates`, donc pas
      d'OTA. Aucune dépendance native n'a été ajoutée dans cette version.
      `eas.json` : `appVersionSource: remote` + `autoIncrement`, le numéro de
      build est géré par EAS.
- [ ] Pousser ensemble les commits de la version (micro-animations `beae3ba`
      dépend de `1d62509`).
- [ ] Vérifier que le correctif CinetPay est bien déployé côté backend si
      nécessaire, et faire un paiement Mobile Money réel CinetPay.
- [ ] Tester sur device : scanner (valide / déjà scanné / autre event), favoris
      dans les listes, retour haptique paiement réussi/échoué, « Réduire les
      animations » activé.
- [ ] Lot 1 sur device (surtout Android d'entrée de gamme) : aura du champ
      Découvrir (1er affichage), anneau de l'écran de recherche pendant la
      frappe, badges d'onglets qui montent, cloche, éclat du favori.
- [ ] Lot 2 sur device : inclinaison + reflet du billet (gyroscope iOS et
      Android, arrêt après 15 s posé, défilement vertical non gêné), révélation
      biométrique, tampon « VALIDÉ » (une seule fois par billet), feuille
      « EN REVUE » après soumission, viseur du scanner (3 états), coche +
      confettis du paiement réussi.
- [ ] Lot 3 sur device : comptage des stats du Profil, anneau J-x (et J-0 en
      dégradé), dernière heure du compte à rebours, chips qui répondent au
      doigt + bords estompés, envoi d'un message immédiat,
      reflet des skeletons synchronisé, scan d'un QR noir (billet) à la porte.
- [ ] Lot 4 sur device : header compact opaque de Découvrir (clair ET sombre),
      re-tap de l'onglet Découvrir (boussole), titre qui grossit en tirant,
      spinner coloré (Android), anneau de l'avatar du Profil, liseré des
      notifications in-app, points de l'onboarding (Android bas de gamme),
      marqueurs de la carte (pop, halo, cascade, zoom sans rejouer).

> La suite (micro-delight « round 2 », retours de fin de cycle) est dans
> `RELEASE_NOTES_1.3.5.md`.
