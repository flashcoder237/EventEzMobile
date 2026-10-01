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

#### Round 3 — lot 1 (prérequis)
- Réglages → Préférences : trois nouveaux interrupteurs locaux, à côté de
  « Sons des moments forts » : « Sons d'interface » (coupé par défaut),
  « Vibrations » (actif ; un aperçu tactile confirme l'activation), « Gestes de
  mouvement » (actif, lu par les capteurs du round 3). Lecture synchrone depuis
  un cache mémoire amorcé au démarrage (`lib/sensoryPrefs`). `haptics.safe()`
  respecte « Vibrations » ; `soundService.playUi()` respecte « Sons
  d'interface ». « Réduire les animations » coupe les futurs motifs composés,
  pas les retours de base.
- Vouvoiement : `fr.json` passé du tutoiement au vouvoiement, chaîne par
  chaîne (484 chaînes, impératifs, possessifs, pronoms, accords ; noms
  communs comme « Demande », « Paie », « Note » laissés intacts). Les
  `defaultValue` FR en dur dans le code et le guide des onglets suivent.
  Garde-fou : `i18n/__tests__/vouvoiement.test.ts`. Charte « Ton » ajoutée au
  `docs/MOBILE_STYLE_GUIDE.md` (§12).
- Erreurs humaines : `getApiErrorMessage(…, { context })` avec
  `errors.{tickets|messages|event|upload}.{offline|timeout|server|notFound|forbidden|tooLarge}`,
  en trois temps (ce qui s'est passé · ce qui est sauf · que faire). Branché :
  rafraîchissement de « Mes billets » (toast), détail d'une inscription, fiche
  événement introuvable/hors ligne, chargement des conversations et des
  messages, envoi de pièce jointe, photo de profil, photos d'événement.
  Paiement et authentification inchangés (pas d'humour, codes dédiés).
- Actions de notification : catégories `ticket_day`, `reminder`, `message`,
  `live`, `seat_held`, `connection` (contrat avec `categoryId` du backend).
  iOS : `setNotificationCategoryAsync` au démarrage, réenregistrées au
  changement de langue. Android : boutons Notifee par catégorie, et
  `notifee.onBackgroundEvent` dans `index.ts` (marquer lu et réponse rapide
  app fermée) ; « Répondre » n'ouvre plus l'app. Navigation par
  `resolveNotificationTarget` ; « J'y vais » appelle
  `POST /registrations/{id}/attendance-intent/` (404 toléré) puis ouvre le
  billet. Les taps push transmettent désormais toute leur `data` au résolveur
  (place gardée et « Lui écrire » perdaient leur contexte).
- Traductions : raccourcis de l'icône (`quickActions.*`, suivent la langue),
  boutons et résumé des notifications riches (`notifications.actions.*`),
  libellés météo (`componentsEvents.weather.*`).

#### Round 3 — lot 2 (jour J sans natif, gestes, haptique)
Tout est en JS (Reanimated, expo-location, expo-haptics et Notifee déjà
présents), sans nouvelle dépendance ni nouvelle permission.
- Socle gestes (G0) : `usePhonePosture()` (`components/ui/motion`). Un seul
  pont capteurs (GRAVITY + ACCELEROMETER Reanimated, 50 Hz), monté seulement
  écran affiché + app au premier plan + réglage « Gestes de mouvement ».
  Détecteurs PURS testés (`lib/utils/posture.ts`) : `shake` (> 13 m/s²
  utiles, ≥ 4 inversions en 700 ms, pause 1,5 s ; coupé en `__DEV__`, ignoré
  doigt posé ou < 300 ms après un toucher), `faceDown` (z < -9 stable 1,2 s,
  immobile), `faceUp` (150 ms), `presentAway`/`presentBack` (> 100° 400 ms /
  < 80° 300 ms), `raise` (à plat 1 s puis > 60° en 700 ms avec élan). Signe de
  la gravité normalisé (iOS = convention CoreMotion inversée → négation des
  trois axes). Activité tactile globale branchée sur la racine (`App.tsx`).
- Motifs haptiques (H1) : `haptics.pattern('heartbeat'|'tick'|'notch'|'wall'|'rise')`.
  Android : `performAndroidHapticsAsync` (Clock_Tick, Segment_Tick, Reject,
  Confirm…) quand dispo. Verrou global (une séquence à la fois), annulé en
  arrière-plan, respecte « Vibrations » ; « Réduire les animations » ramène un
  motif composé à son premier pas.
- Portes ouvertes (H2) : battement « lub-dub » quand la carte « Les portes
  sont ouvertes » est VUE, une fois par inscription (`useFirstSeen`), sauf si
  un rappel d'événement a vibré il y a moins de 5 min
  (`lib/notifications/recentEventPush`).
- Achat (H4) : `tick` sur +/− ; butée stock/jauge → motif `wall` + « Plus que
  N places » sous le sélecteur (plus d'alerte) ; l'alerte reste pour le
  plafond par commande (seul cas où « contacter l'organisateur » a un sens).
  Live Ops : `notch` au franchissement montant de 50/75/90/100 %.
- Place gardée (H5) : `notch` à T-5 min et T-1 min, `tick` chaque seconde des
  5 dernières, seulement écran affiché.
- Billet face contre table (G4) : la luminosité revient au système
  (adaptative Android) et l'écran peut s'éteindre ; retourné → luminosité max
  + vibration « sélection ». API propre `suspendTicketBrightness()` /
  `resumeTicketBrightness()` sur le compteur partagé de
  `useTicketDisplayGuard` (QR, détail d'inscription, billets hors ligne).
  Écran éteint pendant la suspension → au retour dans l'app, luminosité max
  (le capteur démonté n'aurait jamais vu « faceUp »).
- Mode « présenter » (G6) : écran tendu vers le contrôleur OU tap sur le QR →
  QR à 92 % de la largeur sur blanc pur, le reste s'efface en 150 ms,
  inclinaison et reflet figés. Le geste inverse (s'il l'a ouvert), un tap ou
  le retour Android reviennent.
- Preuve de validité (G7) : appui long 350 ms sur le QR → anneau en dégradé
  qui tourne AUTOUR du cadre blanc (jamais sur le QR) et suit l'inclinaison,
  heure à la seconde, cran léger chaque seconde tant que le doigt reste.
  Action d'accessibilité « Afficher la preuve de validité » (6 s). Animations
  réduites : l'heure seule.
- Lever pour ouvrir (G8) : phase « portes », Mes billets affiché, permission
  de localisation DÉJÀ accordée (jamais demandée) et < 300 m du lieu → lever
  le téléphone ouvre le billet, une fois par événement. Sinon, le geste fait
  pulser une fois le bouton « Afficher mon billet ».
- Boussole (G9) dans la carte du billet : jour J ou portes, < 3 km,
  permission déjà accordée. Flèche teintée + distance, cran « sélection »
  aligné ±12° pendant 500 ms (au plus 1 fois / 10 s), « Étalonnez la
  boussole » si le cap est imprécis. Coupée au blur, en arrière-plan et à
  moins de 40 m. Animations réduites : paliers de 15°. Lecteur d'écran :
  « Le lieu est à X m, à N heures ».
- Notification « jour J » épinglée (X2, Android) : de H-3 à la fin,
  teintée, chronomètre (jusqu'au début, puis jusqu'à la fin), actions « Mon
  billet » / « Itinéraire », session en cours pendant l'événement (si
  l'agenda répond, rafraîchie à l'ouverture de Mes billets). Déclencheurs
  Notifee TIMESTAMP sans alarmManager (WorkManager, INEXACT : jamais
  SCHEDULE_EXACT_ALARM ni service au premier plan) ; retrait automatique via
  `timeoutAfter`. Retirée au scan (`checkin_welcome`, push ou WebSocket) et
  jamais recréée. Événements en ligne exclus. Variante organisateur
  « Scanner en service » tant que l'écran de scan est ouvert. Réglage
  « Billet épinglé le jour J » (Android) ; rien si les notifications sont
  coupées. Au plus 3 événements des 7 prochains jours.

Tests sur appareil (lot 2) — iOS ET Android :
1. [ ] **Signe de la gravité** (à vérifier en premier) : billet posé face
       contre table 2 s → luminosité rendue ; retourné → max + vibration.
       Si c'est inversé sur une plateforme, inverser `normalizeAxes`.
2. [ ] **Présenter** : tendre l'écran vers quelqu'un (au-delà de la
       verticale) → QR plein écran blanc ; le ramener → retour. Tap QR →
       plein écran ; tap → retour ; retour Android → billet (pas l'écran
       d'avant). Le QR plein écran se scanne.
3. [ ] **Preuve** : appui long sur le QR → anneau autour (pas sur le QR),
       heure qui défile, un cran par seconde ; relâcher → tout s'arrête.
       TalkBack/VoiceOver : action « Afficher la preuve de validité ».
4. [ ] **Faux positifs** : marcher, monter un escalier, téléphone en poche,
       défilement rapide → aucun geste déclenché.
5. [ ] **Achat** : +/− donnent un cran ; dépasser le stock → butée + « Plus
       que N places » sans alerte ; dépasser le plafond par commande → alerte
       avec « contacter l'organisateur ».
6. [ ] **Jour J** (changer l'heure ou un événement de test proche, permission
       de localisation déjà donnée) : boussole qui pointe le lieu, cran
       aligné, message d'étalonnage près d'un aimant, disparaît < 40 m ;
       sans permission : rien n'est demandé. Phase portes : battement une
       fois ; lever le téléphone sur place → billet ouvert une seule fois.
7. [ ] **Notification épinglée (Android)** : visible à H-3 (± retard
       WorkManager), chronomètre, « Mon billet » et « Itinéraire » app
       fermée ; disparaît au scan et à la fin ; « Scanner en service »
       pendant le scan ; réglage coupé → tout disparaît.
8. [ ] **Place gardée** : crans à 5 min, 1 min et 5 dernières secondes,
       rien écran quitté. Live Ops : un cran à 50/75/90/100 %.
9. [ ] Réglages « Vibrations » coupé → plus aucun motif ; « Gestes de
       mouvement » coupé → plus aucun geste téléphone.

#### Round 3 — lot 3 (gestes et direct)

- **Secousse : un seul capteur pour toute l'app.** `ShakeHost` (App.tsx)
  écoute la secousse et l'aiguille (`lib/gestures/shakeRouter.ts`) :
  annulation en attente > geste de l'écran (`useShakeAction`) > signalement.
  Le capteur ne tourne que s'il y a quelque chose à faire ; « Gestes de
  mouvement » le coupe entièrement (socle `usePhonePosture`).
- **G1 Secouer pour annuler.** `undoStack` : une entrée, 10 s. Alimentée par
  le retrait d'un favori par balayage (Mes favoris) et l'archivage d'une
  conversation. Secousse → feuille « Annuler la dernière action ? », jamais
  d'annulation directe ; haptique « avertissement » à l'ouverture, « succès »
  à l'annulation. Le toast « Annuler » reste. **Suppression d'un message
  exclue** : pas de restauration côté serveur (tombstone local + WS).
- **G2 Secouer pour signaler** (build interne seulement,
  `EXPO_PUBLIC_SHAKE_TO_REPORT=1`) : capture `captureScreen`, bouton
  « Flouter » (c'est l'image floutée qui part), champ texte, envoi
  `Sentry.captureFeedback` avec la capture, la route, la version et le build.
  Jamais de capture sur billet, paiement, portefeuille, conversations.
  ✅ `"EXPO_PUBLIC_SHAKE_TO_REPORT": "1"` ajouté dans `eas.json` >
  `build.preview.env` et `build.development.env` — jamais en `production`.
  Sans DSN Sentry, la feuille le dit au lieu de faire semblant.
- **G3 Surprends-moi** (Découvrir) : secousse en haut du flux ou chip « Au
  hasard ». Tire un événement à venir, non réservé (via
  `getMyRegistrations`, une fois), parmi « Pour vous », recommandations et
  « près de vous » ; ouvert en aperçu Peek avec « Ouvrir » / « Encore »
  (jamais le même deux fois de suite). Haptique « sélection ».
- **G5 Chut en visio** : téléphone face contre table dans la visio Jitsi
  (écran Browser ET overlay persistant) → micro et caméra COUPÉS via
  `APP.conference.muteAudio/muteVideo(true)` (jamais de bascule « m »/« v »
  qui pourrait réactiver), double haptique « avertissement ». Au retour (ou
  en revenant dans l'app), toast « Micro et caméra coupés… » avec
  « Touchez pour les réactiver ». Jamais de réactivation automatique ; aucun
  toast si la page n'a pas confirmé la coupure. Écran Q&R du direct : coupe
  seulement les sons de l'APP (`soundService.setTransientMute`).
- **G11 Mode briquet** (direct à ambiance « nuit ») : bouton « Briquet »,
  écran noir, flamme qui penche (`useTilt`, fixe si mouvement réduit),
  luminosité max via le compteur partagé des billets
  (`holdMaxBrightness`), écran éveillé. WS `lighter on` toutes les 10 s
  tant que le téléphone n'est pas posé, `on:false` à la fermeture. « N
  briquets levés » depuis `live.update kind=lighters` (seuil serveur 5).
  Extinction après 3 min. Haptique légère au premier allumage.
- **G12 Maintenir pour applaudir** (👏 / 🔥) : rafale croissante de bulles
  locales (plafond 6) et d'haptiques légères ; un seul envoi
  `{emoji, count 1..30}` au relâcher. Action d'accessibilité « Applaudir
  longuement » (count 15).
- **G13 Échanger son contact en secouant** : réglage serveur
  `allow_shake_exchange` (Vie privée, désactivé par défaut, texte sur la
  position). Hub sur place (« Échanger par secousse ») et Connexions
  pendant l'événement du jour (« Chercher autour de moi ») ; secousse
  seulement si la localisation est DÉJÀ autorisée (le bouton peut la
  demander). Position arrondie (4 décimales), second essai 1,5 s plus tard,
  liste de candidats sans choix automatique, « Se connecter ? » →
  `/bump/confirm/` (en attente → connectés, haptique « succès »). Erreurs :
  `shake_disabled` (lien Réglages), `not_checked_in`, `clock_skew`, 429,
  `no_pair`.
- **G14 Double tap sur la bannière** de la fiche : enregistre (suit),
  jamais de retrait ; signet corail au point touché + particules, haptique
  légère. `Gesture.Exclusive(double, simple)` : le tap simple ouvre toujours
  la galerie. Pas de couche si vidéo de couverture (ses contrôles gardent
  les taps). Action d'accessibilité « Enregistrer l'événement ».
- **G15 Double tap dans le viseur = torche** : scanner organisateur, scan,
  scanner de connexions et capture de contacts exposant. Bouton torche
  ajouté là où il n'existait pas (connexions, exposant).
- **G16 Sélection à deux doigts** (Inscrits) : bouton « Sélectionner »
  dans l'en-tête ; glisser à deux doigts coche chaque ligne survolée (jamais
  décochée), `tick` au plus toutes les 40 ms, défilement bloqué pendant le
  geste. Barre d'actions : check-in manuel (existant), « Écrire aux
  inscrits sélectionnés » (modale e-mail existante), « Exporter la
  sélection » (CSV généré sur le téléphone : l'export serveur ne filtre pas
  par ids).
- **G17 Faire-part** (invitation « célébration ») : dorure qui glisse sur le
  filet (`HoloSheen` teinte or + `useTilt`) ; haptique « succès » quand
  « Je serai présent(e) » est confirmé.
- Logique pure testée : `src/lib/gestures/__tests__/gestures.test.ts`.

Tests sur appareil (lot 3) — iOS ET Android :
1. [ ] **Annuler** : balayer un favori puis secouer < 10 s → feuille, rien
       n'est annulé sans « Annuler l'action » ; après 10 s → rien. Même
       chose avec l'archivage d'une conversation. Secouer en tapant ou en
       faisant défiler → rien.
2. [ ] **Signaler** (APK preview avec la variable) : secousse sur Découvrir
       → capture + « Flouter » ; vérifier dans Sentry > User Feedback que
       l'image (floutée si demandé), la route et la version arrivent. Sur un
       billet / paiement / conversation → rien. Build production → rien.
3. [ ] **Surprends-moi** : en haut de Découvrir, secouer → aperçu ; « Encore »
       → un autre ; « Ouvrir » → fiche ; plus bas dans le flux → rien. Chip
       « Au hasard » équivalent. Un événement réservé n'apparaît jamais.
4. [ ] **Chut** : en visio, poser le téléphone face contre table → les autres
       ne vous entendent / voient plus ; retourner → toast, « Réactiver »
       rallume ; sans toucher au toast → reste coupé.
5. [ ] **Briquet** (direct « nuit », 5+ téléphones pour voir le compteur) :
       flamme qui penche, luminosité max puis rendue (adaptative Android) à
       la fermeture, extinction à 3 min ; mouvement réduit → flamme fixe.
6. [ ] **Applaudir** : maintenir 👏 → rafale qui s'accélère, un seul envoi
       au relâcher (les autres voient la rafale) ; tap simple inchangé.
7. [ ] **Échange** (2 téléphones scannés au même événement, réglage activé) :
       secouer ensemble → liste ; confirmer des deux côtés → connectés.
       Réglage coupé → message + lien Réglages ; heure manuelle décalée →
       message d'horloge ; localisation refusée → la secousse ne demande rien.
8. [ ] **Double tap bannière** : signet au doigt, l'événement est suivi ;
       re-double tap → ne retire pas ; tap simple → galerie ; tirer pour
       fermer et défiler non perturbés.
9. [ ] **Torche** : double tap dans les 4 viseurs ; boutons toujours OK.
10. [ ] **Deux doigts** : sélection fluide, ticks réguliers, défilement à un
        doigt intact ; export CSV partagé ; e-mail aux seuls sélectionnés.
11. [ ] **Faire-part** : reflet doré qui glisse ; vibration à la confirmation.
12. [ ] « Gestes de mouvement » coupé → aucune secousse ni chut ni briquet
        levé n'agit (boutons toujours disponibles).

#### Round 3 — lot 4 (mots et rituels)

Contrats backend B3 utilisés : `GET /me/since/?ts=` (`{since, count, items}`),
`GET`/`DELETE /recommendations/preferences/`, `POST
/recommendations/record_interaction/` (`event_id` UUID / `category_id`). 404
= rien affiché, jamais d'erreur visible. Chaînes dans le namespace `delight.*`
(FR vouvoiement / EN).

- **W1 Chargement qui raconte.** `useLoadingLine` / `LoadingLine` : rien sous
  1,2 s, puis une ligne par contexte (billets, favoris, notifications,
  messages, recherche, fiche), en fondu d'opacité, en pastille flottante sur
  les squelettes plein écran. **Mobile Money** (`PollingProgressBar`) : récit
  indexé sur le temps réel écoulé (0-20 s demande envoyée, 20-60 s code PIN,
  60-120 s confirmation opérateur, > 120 s « débité une seule fois ») ; aucun
  état affirmé que le serveur n'a pas renvoyé, logique de vérification
  inchangée.
- **W2 États vides utiles.** `EmptySuggestion` + prop `suggestion` sur
  `EmptyState`. Mes billets / Favoris : phrase tournante (graine journalière,
  3 variantes) + pouls de la ville (`city-pulse`, rien sous le seuil serveur) ;
  Notifications : « Découvrir des événements » ; Messages : « Scanner un
  code » ; Découvrir vide : « Rechercher un événement ». Recherche sans
  résultat : « Vouliez-vous dire « … » ? » (catégories + tags connus,
  `didYouMean`), sinon « Élargir à 50 km autour de vous » (ville → près de
  moi), sinon « Retirer les filtres ».
- **W3 Salutation contextuelle** (tableau de bord, une ligne sous le prénom) :
  attention du jour > météo PRÉVUE au lieu du prochain billet de J0 à J+2
  (coordonnées de l'ÉVÉNEMENT ; `fetchForecast` extrait d'`EventWeather` dans
  `lib/weather.ts`, cache partagé) > nouveautés des organisateurs suivis
  (`/me/since`) > rien. Prochain billet lu dans le cache « Mes billets ».
- **W4/W5 Rituels** (`lib/utils/rituals.ts`, pur, testé) : anniversaire
  (jamais l'âge ; 29 février fêté le 28), ancienneté du compte (filet doré
  `CELEBRATION_GOLD`), fête nationale (table extensible CM/CI/SN/FR…), Nouvel
  An. Une fois par jour (`lib/dailyOnce.ts`), interrupteur « Petites
  attentions » dans Réglages (actif par défaut), aucune notification push.
  Saison des pluies : seulement via la ligne météo.
- **W6 « Bon retour ».** `lib/lastOpen.ts` mémorise la visite précédente
  (démarrage + longue absence en arrière-plan). Au-delà de 21 jours : une
  carte en tête de Découvrir (3 éléments max, « Et N autres »), masquable.
  Rien si vide / 404 / annonce en cours (`useOptionalAnnouncements`). Jamais
  « vous nous avez manqué ».
- **W7 Personnalisation transparente.** **Bug corrigé** : le mobile envoyait
  `event` au lieu de `event_id` → AUCUN signal (même `view`) n'était
  enregistré. `lib/recommendations.ts` : `follow` (bouton, cœur, double tap),
  `register` (écran de succès), `share`, `search` (choix de catégorie). Deux
  premières chips de Découvrir selon les goûts (lus une fois par démarrage à
  froid), « Parce que vous aimez X et Y » sous « Pour vous », « Oublier mes
  préférences » (Réglages, confirmation, message honnête si 404/échec).
  Passage : « Tu pourrais aussi aimer » / « taillées pour toi » codés en dur
  → i18n au vouvoiement.
- **W8 Attente utile.** Paiement Mobile Money au-delà de 30 s, ou retour dans
  l'app pendant la vérification : « En attendant, préparez votre carte « J'y
  vais » » (teinte + message), SOUS la réassurance anti-double débit, les
  instructions et les boutons. Le billet sort d'une fente au rythme du temps
  réel (translation, aucune animation de layout) ; statique en mouvement
  réduit. Au succès, la carte « se détache » au moment de la fête et la carte
  story reprend teinte + message. Brouillon local, oublié après usage.
- Tests : `src/lib/__tests__/lot4Words.test.ts`,
  `src/lib/utils/__tests__/rituals.test.ts`,
  `src/components/dashboard/__tests__/lot4Rituals.test.tsx`.

Tests sur appareil (lot 4) — iOS ET Android :
1. [ ] **Mobile Money** : pendant l'attente, les 4 phrases défilent aux bons
       moments ; à 30 s la carte « J'y vais » apparaît sous les boutons (rien
       de masqué) ; quitter / revenir dans l'app avant 30 s → elle apparaît ;
       au succès, la mini-carte s'incline et le partage story reprend teinte
       + message. Mouvement réduit → carte fixe.
2. [ ] **Chargements lents** (réseau bridé) : la pastille n'apparaît qu'après
       ~1 s, jamais sur un chargement rapide.
3. [ ] **États vides** : compte neuf → Mes billets, Favoris, Notifications,
       Messages, recherche « concrets » → « Vouliez-vous dire « Concerts » ? » ;
       recherche avec une ville → « Élargir à 50 km » (demande la position).
4. [ ] **Tableau de bord** : billet demain avec coordonnées → ligne météo ;
       anniversaire (date de naissance du jour) → message + filet doré, rien
       à la session suivante du même jour ; « Petites attentions » coupé →
       rien.
5. [ ] **Bon retour** : régler `@eventez_last_open_at` à J-30 (ou attendre) →
       carte en tête de Découvrir ; masquer ; pas de carte si une annonce
       s'affiche.
6. [ ] **Recommandations** : suivre / s'inscrire / partager → vérifier en
       admin que `UserInteraction` est créé (`event_id`) ; après quelques
       signaux, chips et « Parce que vous aimez » au démarrage suivant ;
       « Oublier mes préférences » → confirmation puis message.

---

#### Round 3 — lot natif (branche `feat/r3-native`, fusionnée)

Détail complet + checklist : `docs/NATIVE_LOT_R3.md`.

- X1/X14 Live Activities (participant : portes → « en cours » ; organisateur :
  compteur de check-ins), X3 widget « Prochain billet » iOS + Android,
  X11 tuile Réglages rapides Android, X4 Siri « Montrer mon billet »,
  X5 time-sensitive, X6 `expo-calendar` « Ajouter à mon agenda »
  (**nouvelle dépendance native**), X8 langue dans les réglages système,
  X9 icône monochrome Android 13, X12 partage d'un lien eventez.online,
  X13 Handoff, G10 proximité (vocal à l'oreille), H3 canaux sonores
  `eventez_moments` / `eventez_sales`, H6 Core Haptics, H7 sons UI (OFF par
  défaut), H8 carillon de marque. X10 reporté (pas d'artwork).
- ⚠️ **Swift jamais compilé** (pas de Mac) : tout le provisioning iOS est
  gaté OFF par défaut (`EVENTEZ_IOS_EXTENSIONS`, `EVENTEZ_IOS_APP_INTENTS`,
  `EVENTEZ_IOS_TIME_SENSITIVE`, cf. `eas.json.example`). À activer sur un
  build `development` device avant toute prod.
- Backend à brancher pour H3 : envoyer `channelId`/`sound` des nouveaux canaux.

---

### Avant publication

- [ ] Relire le texte store (FR/EN ci-dessus) et le texte promotionnel.
- [ ] **Build store requis** (pas d'`expo-updates`, donc pas d'OTA) ; `app.json`
      a changé (retour prédictif Android explicitement désactivé) ; dépendance
      native ajoutée : `expo-calendar` + modules locaux du lot natif.
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
