# Notes de version — EventEz 1.3.5

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Version par-dessus 1.3.4** (passée à 1.3.5 le 2026-09-29). Contient le
> « round 2 » micro-delight : transitions et gestes, billet qui vit avec
> l'événement, plateforme en temps réel, moments organisateur, plus les
> retours utilisateur de fin de cycle (vidéo YouTube, bilan).
> Si une partie du round 2 figurait déjà dans le build 1.3.4 envoyé, la
> retirer de ces notes.

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Plus fluide : les événements s'ouvrent d'un geste depuis leur carte, et de nouveaux raccourcis (appui long, glisser pour enregistrer).
• Votre billet vous accompagne : rappels la veille, accès direct le jour J, souvenir après l'événement.
• En direct : places qui se remplissent, questions, sondages et réactions en temps réel.
• Pour les organisateurs : premier inscrit, « complet », suivi des retraits et bilan de l'événement.
• Vidéos YouTube corrigées et nombreuses améliorations.

---

## 🇬🇧 English

What's new in this version:

• Smoother: events open with a single gesture from their card, plus new shortcuts (long press, swipe to save).
• Your ticket has your back: reminders the day before, instant access on the day, a keepsake afterwards.
• Live: seats filling up, questions, polls and reactions in real time.
• For organizers: first registration, "sold out", payout tracking and an event recap.
• YouTube videos fixed and many improvements.

---

### Notes internes (ne PAS coller dans le store)

#### Round 2 — lot M (« Mieux » : reprise du round 1)
- Un seul langage de mouvement : `src/constants/motion.ts` (tokens nommés par
  intention, recopie de `docs/motion-tokens.json`, test de parité). Les
  anciens `SpringPresets` / `ANIMATION_DURATION` en sont des alias ; toutes
  les primitives micro-animations s'y alignent (reflets 700 ms, pop ≤ 1,12,
  entrée depuis 0,96, inclinaison ≤ 3°).
- Barre d'onglets « liquide » : essayée puis ANNULÉE à la demande de
  l'utilisateur (il préfère le dessin précédent). La barre reste celle de
  1.3.4 d'origine (pilule qui s'étire en timing, sans rebond) ; seule la
  transition directionnelle du contenu entre onglets (lot T-B) est gardée.
- Recherche calme : anneau fixe au focus et bref éclat à chaque frappe (plus
  de rotation pendant la saisie) ; l'état « chargement » n'apparaît qu'après
  300 ms. Toucher la barre de Découvrir : simple pression, plus de comète
  jouée sous la transition.
- Toucher juste : la vibration des cartes et boutons part à la validation,
  plus à l'enfoncement (commencer un défilement sur une carte ne vibre plus) ;
  délai de 80 ms dans les listes ; nouvelle primitive `<Press>`.
- Compteurs du Profil : comptage une fois par session, puis seules les
  variations s'animent ; un seul nœud texte (plus de saut de ligne de base).
- Une seule cloche (`NotifyBell`) : ne réagit qu'à une hausse, après le
  chargement ; l'en-tête compact masqué de Découvrir est en pause (cloche,
  exemples de recherche). Le badge ne saute plus quand on lit une notification.
- Paiement réussi : son et vibration partent ensemble, à la fin du tracé de la
  coche (orchestrateur `utils/feedback`). La révélation du QR vibre en
  « sélection » ; « succès » est réservé au paiement et au scan validé.
- Messages : l'envoi n'est plus bloqué par l'animation de l'avion et le
  clavier reste ouvert ; seul un double tap du même message est ignoré.
- « Réduire les animations » lu dès le premier rendu (tampon, compteurs ne
  s'animent plus une frame).
- Justesses : points « en direct » en phase (horloge partagée) ; inclinaison
  du billet lissée par frame et figée après 2 s d'immobilité (QR stable au
  scanner) ; bords estompés des chips en rendu matériel et suivis sur le
  thread UI ; fond de l'en-tête compact lié au défilement.

#### Round 2 — lot T (A) (continuité)
- Vol carte → fiche (T1) : l'image de la carte touchée s'agrandit jusqu'à la
  bannière de la fiche (FLIP en contre-échelle, transform uniquement, jamais
  déformée), le reste de l'écran arrive en fondu. Fait main
  (`ui/motion/HeroFlight`) : les transitions partagées de Reanimated 4.1 ne
  sont pas disponibles sur la nouvelle architecture. Branché sur Découvrir
  (à la une, près de toi, recommandation, « Pour vous »), la recherche et les
  Favoris. Jamais pour une couverture vidéo ; rien avec « Réduire les
  animations » (fondu court de la pile à la place).
- Retour qui rembobine (T2) : les boutons retour de la fiche refont le vol à
  l'envers si la carte d'origine est encore à l'écran. iOS : tirer la fiche
  vers le bas au-delà de 110 px la ferme (vibration au seuil, chevron qui
  apparaît). Android : geste non proposé (pas de sur-défilement élastique sur
  ce ScrollView), retour système et bouton inchangés.
- Arrivée de la fiche (T12) : titre / date / lieu glissent de 8 px en fondu
  (40 ms), la barre de réservation monte depuis le bas (120 ms, ressort sans
  dépassement). Rien au retour sur l'écran ni au rafraîchissement.
- Billet qui se soulève (T14) : de Mes billets au détail de l'inscription
  (là où vit le vrai QR), la carte du billet vole jusqu'à sa place au lieu de
  la feuille modale ; le QR reste noir sur blanc, rien par-dessus.
- Un seul en-tête sur Découvrir (T15) : le grand titre se replie vers le haut
  pendant que la recherche et les chips glissent et restent en tête, puis
  l'en-tête s'aimante ouvert ou replié au lâcher. Fin du second en-tête
  compact (deuxième cloche, deuxième placeholder, aura invisible). La cloche
  passe à droite de la recherche pour rester accessible une fois replié.

#### Round 2 — lot T (B) (gestes)
- Même langage de pile (T3) : Android adopte le glissement façon iOS (l'écran
  du dessous recule en parallaxe, `ios_from_right`). Sur iOS, retour depuis
  n'importe où dans l'écran pour les écrans sans carrousel (Session,
  Intervenant, Organisateur, Avis, Villes, Réglages, Confidentialité, CGU,
  Utilisateurs bloqués) — jamais sur la fiche événement. Retour prédictif
  Android 14 essayé puis DÉSACTIVÉ (`predictiveBackGestureEnabled: false`) : avec
  lui, React Navigation ne reçoit plus le bouton retour et l'app se fermait
  au lieu de revenir à l'écran précédent.
  Le paiement garde `gestureEnabled: false`.
- Feuilles natives à crans (T4) : l'écran QR en feuille à 60 % a été essayé
  puis RETIRÉ à la demande de l'utilisateur (il préfère que le billet s'ouvre
  en écran, comme avant). La demande de remboursement en feuille a aussi été
  retirée : elle s'ouvre comme avant. Le détail
  d'inscription garde son vol T14 (pas de feuille, pour ne pas casser le vol).
- Une physique pour les feuilles (T5) : primitive `SpringSheet` — lâcher
  projeté selon la vitesse du doigt, aimantation au cran, élasticité, ressort
  interruptible (on rattrape la feuille en vol), voile 0 → 0,4, la liste
  interne rend la main quand elle est tout en haut. Migrées : feuille
  d'actions organisateur, sélecteur avec recherche (catégories, modèles…),
  filtres de la recherche.
- Aperçu au toucher long (T6) : sur toutes les cartes d'événement, maintenir
  soulève la carte (fond flouté) avec Enregistrer / Partager / Ouvrir ; on
  glisse sur l'action et on relâche. « Ouvrir » enchaîne sur le vol vers la
  fiche. Les mêmes actions sont proposées au lecteur d'écran (rotor).
- Balayer pour enregistrer (T7) : flux « Pour vous » de Découvrir et résultats
  de recherche (une colonne) — signet corail derrière la carte, vibration au
  seuil, éclat à l'enregistrement. Favoris : balayer une archive vers la
  gauche la retire, avec « Annuler » dans le toast (la ligne se replie en
  timing, sans ressort).
- Conversations (T8) : balayage sur le thread UI (fin des saccades), actions
  révélées progressivement, balayage complet = Archiver (gauche) ou Couper les
  notifications (droite), une seule ligne ouverte à la fois.
- Onglets (T9) : le contenu arrive du côté de l'onglet choisi (±16 px + fondu,
  200 ms ; rien en « Réduire les animations »). Mes billets : un seul
  indicateur glisse sous les statuts, la liste entre du côté choisi.
- Carrousels de Découvrir (T13) : chaque carte se cale au lâcher (proches,
  gratuits, organisateurs).
- ⚠️ `app.json` modifié (retour prédictif) : effet au prochain build natif
  (déjà requis pour cette version, pas d'OTA).

#### Round 2 — lot S (moments signatures)
- Horloge du billet (S1) : dans « Mes billets », le billet le plus proche passe
  en tête avec la posture de sa phase — « dans une semaine », la veille
  (checklist lieu / heure / billet hors ligne prêt / « Dire que j'y vais »), le
  jour J (gros bouton « Afficher mon billet » + itinéraire), portes ouvertes (un
  seul gros bouton), en cours. Changement de phase par simple fondu. Logique
  partagée avec le web (`lib/utils/ticketPhase.ts`, jours comptés dans le
  fuseau de l'événement, repli Douala).
- Jour J (S2) : « C'est aujourd'hui » et le rappel ouvrent directement le
  billet quand l'inscription est connue ; raccourci d'icône « Mon billet ·
  {titre} » les jours d'événement (retiré ensuite) ; carte « Ce soir » teintée
  en tête de Découvrir avec « Y aller ».
- Mode « sur place » (S3) : au scan réel, carte « Vous êtes entré · 20:14 ·
  213e » teintée en haut de l'écran, une vibration « succès » ; le billet
  scanné devient un hub (session en cours / suivante, Q&A, plan, networking) ;
  la bannière « En direct » d'un événement présentiel ouvre ce hub.
- Couleur de chaque événement (S4) : filet et pastilles du billet (écran QR,
  détail d'inscription), cartes de Mes billets, halo sous la bannière de la
  fiche, carte « J'y vais » et paiement réussi. Repli indigo ; jamais sur le QR.
- Registres d'ambiance (S5) : célébration (titre en serif système, filet doré,
  fond ivoire en clair), nuit (halo plus dense), savoir (le programme remonte
  avec les 3 prochaines sessions). Fiche, billet, RSVP.
- Lumière selon l'heure (S6) : le haut du fond se réchauffe à peine à l'aube,
  tire vers l'indigo le soir (plus discret en sombre) ; la salutation du
  tableau de bord suit.
- « Vous y étiez » (S8) : la notification du lendemain ouvre une feuille
  souvenir (« 37e sur 412 »), note en un geste, « Plus tard », « Partager en
  story ». Distincte de la demande de note du store.
- « J'y vais » / « J'y étais » (S9) : carte story teintée sur l'écran QR (une
  semaine avant et la veille) et dans Mes billets ; jamais de QR ni de
  référence sur la carte partagée.
- Premier billet (S10) : « Votre premier billet EventEz · {date} » sur le
  paiement réussi, sans confettis de plus.
- L'année EventEz (S11) : écran story en tap-through (6-7 slides, une animation
  par slide, fondu si animations réduites), carte finale partageable, accessible
  depuis Souvenirs et la notification de décembre.
- « Il y a un an » (S12) : la notification ouvre Souvenirs sur l'événement, avec
  « La nouvelle édition est en vente » quand elle existe.
- Clins d'œil (S13) : appui long sur « #1 » dans Souvenirs ; 7 taps sur la
  version dans les réglages (« Fait à Douala »).
- Réglages : « Prévenir mes connexions » (désactivé par défaut), « Il y a un
  an » en notification (opt-in), « Mon année EventEz » (opt-out).
- Correctifs au passage : dates en français codées en dur (mois de la tuile du
  détail d'inscription, dates des Souvenirs) remplacées par la langue de l'app.

---

#### Round 2 — lot O (organisateur)
- Échelle de célébration : une vente ordinaire ne déclenche rien ; premier
  participant → carte sobre (coche dessinée, « Awa K. · 5 000 XAF »,
  « Partager pour accélérer ») ; palier (10/50/100…) → puce discrète sur
  l'événement ; complet → tampon « COMPLET » + vibration + confettis, UNE fois
  dans la vie de l'événement (clé partagée entre la carte en direct et
  « Mes événements »). Hôte `OrganizerMomentHost` monté dans `App.tsx`,
  alimenté par le bus des notifications en direct (`organizer_milestone`).
- « Mes événements » : barre « Complet » qui se remplit (scaleX) + reflet +
  tampon ; tampon vert « EN LIGNE » la première fois qu'un événement validé il
  y a moins de 14 jours est vu ; bouton Partager (lien suivi
  `utm_source=organizer_app`, « Partagé via WhatsApp » sur iOS) ; bouton
  « Voir le bilan » dans la carte de chaque événement terminé depuis 24 h (la
  bannière séparée en tête de liste a été retirée : elle cassait la page).
- Onglet Organiser : inscrits et solde roulent depuis la valeur de la dernière
  visite (plus de 2 h), puce « +12 depuis hier 18:40 » qui s'efface en 6 s ;
  rien si l'écart est négatif.
- Portefeuille : chaque retrait affiche un rail Demandé → (Approuvé) → Envoyé
  avec les heures. Issue incertaine (`delivery_state = verifying`) → ambre
  « Vérification en cours auprès de l'opérateur », JAMAIS « Envoyé » (règle de
  résilience payout). Versé vu pour la première fois → coche dessinée
  « Versé sur MTN •••42 · 14:05 ». Fonds libérés depuis la dernière visite :
  l'attente décompte puis le disponible compte, puce « Libéré · Concert X ».
  « Disponible dans 18 h » sous 48 h.
- Live Ops : pourcentage qui roule, barre en scaleX, nouveaux check-ins insérés
  par le haut avec un voile vert (ou puce « +3 nouveaux » si l'on lit plus
  bas), « Portes ouvertes à 18:42 », « Pic · 42 entrées / 15 min » (barre en
  dégradé), « Salle presque pleine » à 90 % — un seul moment par
  rafraîchissement, rien au premier chargement.
- Scanner : le viseur rend la main en 250 ms (au lieu de 1,5 s bloquées) ;
  la carte du résultat reste lisible 1,5 s ; le même QR resté dans le cadre
  reste ignoré 3 s (garde existante). Compteur « validés » qui roule, puce
  tous les 100 scans (au-dessus des statistiques, jamais sur le viseur).
  Fermer le scanner ouvre une feuille « Fin de service » (entrées validées,
  cadence/min, refusés, état de la file hors ligne : synchronisation →
  « Synchronisé », ou ambre si des scans attendent) au lieu d'une alerte
  d'erreur ; « Reprendre », « Voir le direct », « Terminer ».
- Graphiques (TrendLineChart) : le tracé se révèle de gauche à droite une
  seule fois ; un changement de données ne le rejoue pas.
- Nouvel écran « Bilan » (`EventRecap`, écran poussé) : présents / attendus,
  recettes, note moyenne (étoiles une à une, une fois), meilleur commentaire,
  derniers avis, « Remercier les participants », « Voir les fonds ».
  Notification `event_recap_ready` → cet écran ; `organizer_milestone` →
  gestion des inscrits.
- `CountUpText` : props `from` (départ depuis l'ancienne valeur, décompte
  possible), `group` (séparateur de milliers) et `delay`.
- Logique pure testée : `src/lib/utils/organizerMoments.ts` (25 tests).

#### Round 2 — lot V (plateforme vivante)
- Socle temps réel : les topics `event:`, `live:` et `organizer:` passent par
  la socket de notifications existante (aucune connexion de plus).
  `src/lib/realtime/topicManager.ts` compte les références, ne demande jamais
  plus de 3 topics, se réabonne à la reconnexion, ne redemande jamais un topic
  refusé (`forbidden` / `invalid`) et attend une place libérée après un refus
  `limit` (pas de boucle). Hooks `useEventPulse`, `useLiveTopic`,
  `useOrganizerTopic`.
- Honnêteté : l'app n'affiche QUE ce que le serveur renvoie (seuils et arrondis
  côté backend) ; un champ `null` n'affiche rien.
- Fiche événement :
  - « N+ personnes regardent » et « N personnes déjà sur place » sous le titre ;
  - « Réservé il y a N min / dans l'heure / aujourd'hui » au-dessus des
    billets (jamais qui, jamais combien) ;
  - jauge par tarif alimentée par le pouls : elle avance sur une vraie baisse
    du stock (scaleX + une lueur), « Complet » arrive en fondu et la CTA du
    bas se désactive sans recharger ;
  - « Awa et 2 de vos connexions y vont » (consentement explicite côté
    serveur) remplace les prénoms anonymes ; textes du bloc « Qui y va »
    traduits (ils étaient en français en dur) ;
  - organisateur joignable (« En ligne » ou « Répond généralement en moins
    de… ») sur la fiche et sur le profil organisateur ;
  - place gardée 15 min (notification `waitlist_available` kind `seat_held`) :
    bannière avec compte à rebours réel qui s'arrête à l'expiration.
- Direct : Q&R et sondages en temps réel (les questions se réordonnent en
  timing, les barres glissent en scaleX), réactions 👏 🔥 ❤️ 🎉 avec au plus
  6 bulles par fenêtre agrégée — écran Live et onglet visio (inscrits).
- Carte : halo corail lent sur les événements en direct (10 au plus, seule
  boucle ; anneau fixe au-delà), contour « ce soir » (dans les 3 h), puce
  « N en direct autour de vous » qui filtre la carte.
- « Karim est arrivé · Lui écrire » (notification `connection_arrived`) :
  carte en direct + routage vers la conversation.
- Découvrir : pouls de la ville (réservations du jour, événements en direct),
  rien sous le seuil.
- Sessions en cours : « N présents · X % de la salle » (agenda et détail).
- Signature sonore : tableau unique moment → son → vibration
  (`LIVE_MOMENTS` dans `utils/feedback`). Aucun fichier audio ajouté (pas
  d'OTA, un asset exigerait un build) : les variantes « billet reçu »,
  « arrivée » et « vente » sont des alias des sons existants. Réglage son et
  mode silencieux respectés ; le module audio est chargé à la demande.
- Organisateur : carte « Ventes en direct » (`sale.live`) sur l'onglet
  Organiser — le montant roule, puce « +1 VIP » ou « +7 en 1 min », vibration
  légère ; jamais cumulé au solde du wallet. Live Ops s'abonne à
  `organizer:{id}` : chaque check-in poussé relit le direct, le polling de
  repli passe de 15 à 60 s.

#### Round 2 — revue finale mobile
- Vol carte → fiche : la carte d'origine ne peut plus rester masquée (démontage
  de la fiche, retour par geste système, mesure tardive) ; plus d'image doublée
  pendant le rembobinage.
- Aperçu au toucher long : si le système annule le geste après l'ouverture, le
  fond ferme de nouveau l'aperçu (il restait bloqué).
- Temps réel : un écran qui n'est plus au premier plan rend ses topics (la
  fiche visible n'est plus affamée par celles restées dans la pile, plafond de
  3 par socket) ; l'écran Live se resynchronise à son retour.
- Pas de toast en double avec les cartes « Vous êtes entré », « Premier
  participant » et « COMPLET » quand la push arrive app ouverte.
- Libellé d'accessibilité de la carte organisateur traduit.

#### Retours utilisateur avant publication
- Vidéo YouTube des cartes et du plein écran : « Erreur 153 — erreur de
  configuration du lecteur vidéo ». YouTube refuse désormais les lecteurs
  chargés sans Referer ; la WebView ouvrait l'URL d'embed directement. Le
  lecteur est maintenant servi depuis une page hôte dont l'origine est notre
  site (`buildEmbedSource`, `EventCoverVideoModal`).
- Vidéo YouTube de couverture pilotée par l'app (`YouTubeCoverPlayer`, API
  IFrame) : même comportement qu'une vidéo téléversée — lecture muette auto,
  pause hors écran / en arrière-plan / au bouton, son au tap, agrandir.
  L'interface YouTube n'est jamais visible (poster tant que ça ne joue pas,
  image en cas d'erreur). À l'accueil : aperçu muet de 3 extraits de 4 s en
  boucle.
- « Mes événements » : la carte « Le bilan est prêt » cassait la mise en page ;
  remplacée par un bouton « Voir le bilan » dans la carte de l'événement.

- Pouls d'un événement : sur un serveur qui n'a pas encore la route
  `/events/{id}/pulse/` (backend pas redéployé), la 404 n'est plus loggée en
  erreur et l'app arrête de la redemander pour la session ; les signaux
  restent simplement vides.

- Vidéo YouTube invisible sur la fiche : YouTube refusait encore le lecteur
  (une page chargée localement dans la WebView n'envoie pas de Referer fiable
  sur Android). Le lecteur charge désormais une vraie page hébergée,
  `https://eventez.online/embed/youtube.html` (modes cover / preview / full),
  avec repli sur la page locale si elle n'est pas encore déployée. Le plein
  écran vidéo utilise la même page.

- Bouton retour Android : dans l'APK 1.3.5, il fermait directement l'app. Le
  retour prédictif activé au lot T3 empêchait React Navigation de recevoir
  l'événement retour. Désactivé dans `app.json` (comme en 1.3.4) : nouveau
  build natif nécessaire.

- Luminosité qui ne redevenait pas adaptative après avoir affiché un billet :
  sur Android, la « restauration » réappliquait une valeur fixe (ce qui coupe
  la luminosité adaptative) ; en enchaînant détail → QR, le max pouvait être
  pris pour la luminosité d'origine ; quitter trop vite ne restaurait rien.
  Compteur partagé entre écrans billet, retour au système
  (`restoreSystemBrightnessAsync`) sur Android, valeur d'origine sur iOS.

- Réaction emoji qui disparaissait en revenant dans une discussion : elle
  n'était appliquée qu'en mémoire, jamais écrite dans SQLite (source de
  vérité relue à l'ouverture). Les réactions (les miennes et celles reçues par
  WS) sont désormais persistées (`applyLocalReaction`). Côté backend, une
  réaction fait maintenant avancer `updated_at` du message, sinon la synchro
  delta ne la renvoyait jamais (autre appareil, app fermée) — déploiement
  backend nécessaire, sans migration.

- Raccourcis de l'appui long sur l'icône de l'app : icônes invisibles. Les
  pictogrammes sont blancs et le plugin `expo-quick-actions` les posait sur un
  fond blanc par défaut (Android). Fond indigo de marque dans `app.json` ; sur
  iOS, symboles système (`symbol:safari`, `symbol:ticket`,
  `symbol:qrcode.viewfinder`). Nouveau build natif nécessaire.

- Rappels d'événement qui partaient IMMÉDIATEMENT au lieu de la veille et 1 h
  avant : le déclencheur n'avait pas `type: 'date'` (exigé par
  expo-notifications 0.32), lu comme « afficher maintenant ». Corrigé, textes
  traduits FR/EN, et un seul canal Android « Rappels » (l'ancien
  `event-reminders` en double est supprimé).

---

### Avant publication

- [ ] Relire le texte store (FR/EN ci-dessus) et le texte promotionnel.
- [ ] **Build store requis** (pas d'`expo-updates`, donc pas d'OTA) ; `app.json`
      a changé (retour prédictif Android explicitement désactivé), aucune
      dépendance native ajoutée.
      Numéro de build géré par EAS (`appVersionSource: remote` + `autoIncrement`).
- [ ] **Backend déployé AVANT la sortie** (sinon les écrans du round 2 restent
      vides ou en erreur) : `migrate` (accounts 0030-0031, events 0058,
      gamification 0003-0004, notifications 0033-0034), `backfill_theme_tint`
      (d'abord `--dry-run`), `compilemessages`, redémarrer Celery beat ET
      workers, Redis joignable par le cache, le channel layer et les workers,
      redémarrer Daphne (ws).
- [ ] Web déployé en même temps (mêmes contrats temps réel) — il sert aussi la
      page lecteur `/embed/youtube.html` dont dépendent les vidéos YouTube.

#### Tests sur appareil — liste consolidée et priorisée

Faire chaque point sur iOS ET Android (dont un Android d'entrée de gamme),
puis repasser les points 1 à 6 avec « Réduire les animations » et en thème
sombre. Backend B1 + B2 déployés (migrations, Redis, Daphne) pour 8 à 10.

1. [ ] **Scanner organisateur** : valide (vert) / déjà scanné (ambre, sans son
       de succès) / autre événement / refusé ; rythme 250 ms sans double scan du
       même QR ; feuille « Fin de service » hors ligne puis en ligne.
2. [ ] **Billet** : l'écran QR s'ouvre en écran (comme avant) ; QR noir sur
       blanc bien scanné à la porte même avec la teinte de l'événement ;
       inclinaison qui ne gêne pas le défilement et se fige posée ; révélation
       biométrique avec une seule vibration.
3. [ ] **Paiement réussi / échoué** : une seule vibration, son et coche
       ensemble, confettis après la coche ; « premier billet » ; échec sobre.
4. [ ] **Vol carte → fiche et retour** (Découvrir, recherche, Favoris, Mes
       billets → détail) : la carte d'origine réapparaît TOUJOURS, y compris
       après un retour par geste système ou un retour très rapide ; tirer
       pour fermer (iOS).
5. [ ] **Découvrir** : tab bar identique à avant (aucune « danse ») ; en-tête
       unique (repli, aimantage, fond opaque, tirer pour rafraîchir, tour
       guidé « recherche » bien ciblé) ; chip « Tous » non voilé ; carte
       « Ce soir » ; aperçu au toucher long (pas de navigation parasite, fond
       qui ferme l'aperçu) ; balayer pour enregistrer sans gêner le défilement.
6. [ ] **Messages** : envoi immédiat, pas de double envoi en tapant vite,
       clavier qui reste ouvert ; balayage des conversations.
7. [ ] **Notifications** : au lancement avec des non-lus, ni sonnerie ni
       vibration de la cloche ; une nouvelle notification → badge + cloche ;
       carte « Vous êtes entré » sans toast en double ; « Premier
       participant » / « COMPLET » (une seule fois) sans toast en double.
8. [ ] **Fiche en direct** : « regardent » / dernière réservation (rien sous le
       seuil) ; jauge qui avance pendant une vente faite depuis un autre
       appareil ; bascule « Complet » sans recharger ; ouvrir 4 fiches
       d'affilée → la fiche visible reçoit toujours son pouls.
9. [ ] **Direct** (deux téléphones) : Q&R et sondage en temps réel, réactions
       (6 bulles max), retour sur l'écran après l'avoir quitté → l'état est à
       jour.
10. [ ] **Organisateur** : onglet Organiser « +N depuis… » et ventes en direct ;
        Live Ops poussé (couper le réseau → polling 60 s) ; rail de retrait
        (vérification jamais affichée « versé ») ; écran Bilan.

Ensuite, si le temps le permet : horloge du billet (changer l'heure du
téléphone), raccourci d'icône « Mon billet », « Vous y étiez », « L'année
EventEz », carte (halo, « ce soir »), onboarding, pull-to-refresh coloré,
feuilles SpringSheet (filtres, sélecteur).

- [ ] **Vidéo YouTube** (priorité) : sur la fiche, lecture muette, pause au
      scroll / en arrière-plan, son, agrandir ; à l'accueil, aperçu de 3
      extraits en boucle ; aucune interface ni erreur YouTube visible.
- [ ] **Mes événements** : bouton « Voir le bilan » dans la carte d'un
      événement terminé depuis 24 h.
