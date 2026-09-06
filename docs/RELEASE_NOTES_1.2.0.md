# Notes de version — EventEz 1.2.0

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ⚠️ **Version en préparation — à compléter au fil de l'eau.**
> Toute modification livrée AVANT la publication s'ajoute ici, dans « Notes
> internes ». Le texte store est rédigé en dernier, à partir de cette liste :
> l'écrire au fil de l'eau produit un catalogue illisible pour l'utilisateur.

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Application nettement plus rapide au démarrage.
• Les visuels de vos événements s'affichent désormais en entier.
• Enregistrez ou partagez vos billets en un geste.
• Paiements plus fiables (Mobile Money et cartes).
• Les organisateurs vérifiés sont identifiés par un badge.
• Corrections de bugs et améliorations de performance.

---

## 🇬🇧 English

What's new in this version:

• Noticeably faster app startup.
• Event images now display in full.
• Save or share your tickets in a single tap.
• More reliable payments (Mobile Money and cards).
• Verified organizers are now identified with a badge.
• Bug fixes and performance improvements.

---

### Notes internes (ne PAS coller dans le store)

Contenu réel du build 1.2.0.

**Performance**
- Démarrage : 55 écrans passés en chargement à la demande. Le code évalué avant
  le premier rendu passe de ~45 700 à ~8 300 lignes (−82 %). Répond à l'alerte
  « vitesse » signalée par Play Console à l'upload.

**Affichage**
- Visuels d'événement rendus en entier (`contain`) sur fond flouté, au lieu
  d'être rognés (`cover`) : une affiche verticale perdait son titre et sa date.
  Appliqué aux cartes, au détail, à Mes événements, aux événements suivis, aux
  événements similaires et à la carte.
- Badge « Organisateur vérifié » enfin visible : la donnée remontait déjà mais
  n'était affichée nulle part hors admin — le KYC ne produisait donc aucun
  signal de confiance pour l'acheteur.
- Badges : icônes corrigées (le backend stocke des noms Lucide qu'Ionicons ne
  connaît pas — tous affichaient « ? ») et médaillon coloré par badge.
- Rangée incomplète de badges qui s'étirait sur toute la largeur.
- Bouton flottant « nouveau message » qui chevauchait la barre d'onglets.
- Icônes des raccourcis long-press sur l'icône de l'app (carrés vides).
- Nom « EventEz » au lieu du nom de package dans les écrans système Android.

**Événements terminés** (cohérence sur `end_date`, pas `start_date`)
- L'onglet « Passés » de Mes Billets basculait un événement dès son DÉMARRAGE.
- « Annuler l'inscription » restait proposé sur un événement déjà joué —
  garde ajoutée côté backend également, l'API l'acceptait.
- Menu d'actions d'un événement terminé réduit à voir / dupliquer / supprimer.
- Dupliquer un événement passé produisait une copie elle-même « passée », donc
  non modifiable. La copie est décalée à J+7 en conservant sa durée.

**Fonctionnalités**
- Programme pionniers : statut activable en admin, déclenchant badge, 0 % de
  commission 12 mois, plan Essentiel et notification (e-mail + push).
- Parrainage rendu fonctionnel de bout en bout : le lien partagé contient enfin
  un `?ref=`, ouvre l'app, et le code est transmis à l'inscription. Aucune
  conversion n'était attribuée auparavant.
- Visio : bouton « Rejoindre » depuis le reçu d'inscription, PiP Android.
- Exposants : parcours candidature + paiement de stand.
- Billet hors-ligne téléchargeable.

**Deep links (Android + iOS)**
- Suppression des icônes alternatives (`expo-dynamic-app-icon`) : les
  activity-alias qu'elles créaient désactivaient MainActivity (porteuse des
  intent-filters https) → dès qu'un utilisateur changeait d'icône, TOUS les
  universal links ouvraient le navigateur au lieu de l'app. Diagnostiqué via
  `adb dumpsys package`. Feature retirée entièrement.
- Correction du nom d'app (`net.overbrand.eventez` → « EventEz ») dans les
  écrans système, effet de bord des mêmes activity-alias.
- Liens email `/dashboard/*` réécrits vers les écrans mobiles (rewriteDashboardPath)
  + intent-filters/AASA correspondants ; bug d'écran cible « MyTickets ».
- SHA-256 de la clé Play Store (`60:DF:95…`) ajouté à `assetlinks.json` : la
  vérification autoVerify échouait sinon (aucune empreinte ne correspondait).
- Deep link ouvert au premier lancement : bypass de l'onboarding (sinon l'écran
  de bienvenue « avalait » la cible du lien).

**Écran Live (visio)**
- Badge de votes qui affichait « NaN » (champ `upvote_count`/`is_upvoted` mal mappé).
- Barre de saisie qui chevauchait la barre de navigation système (safe-area bas).

**Conformité Google Play (rejet version code 15 corrigé)**
- Retrait des permissions `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` : l'app ne
  fait qu'un usage ponctuel des médias → la politique Android 13+ impose le
  photo picker système. La sélection d'images passe déjà par lui (aucune
  permission) ; la sauvegarde galerie passe en writeOnly. Double garantie :
  `blockedPermissions` (app.json) + `tools:node="remove"` (le manifest merger
  gagne même si une dépendance les redéclare). Ne PAS déclarer
  expo-media-library comme plugin — il les ré-ajouterait.

**Médias : télécharger / partager / enregistrer**
- Nouveau sheet unifié « Enregistrer dans la galerie / Partager » sur les
  billets, récapitulatifs et QR (les boutons « Télécharger » ouvraient
  directement le partage sans laisser le choix).
- « Enregistrer dans la galerie » depuis une discussion sauvegarde désormais
  RÉELLEMENT l'image (avant, selon l'écran, ça faisait juste un partage).
- Retrait du repli QR distant (`api.qrserver.com`) qui envoyait l'URL de
  vérification du billet chez un tiers ; génération QR 100 % locale.
- Socle média centralisé (`lib/media/mediaActions.ts` + `useSaveOrShareSheet`).

**Paiement multi-passerelles (mobile)**
- Le badge affichait « NotchPay » pour des paiements CamPay / pawaPay :
  provider réel désormais correct.
- Routage CamPay / pawaPay câblé côté mobile + gestion du flux USSD.
- Validation téléphone/pays pilotée par l'API (fin des hypothèses « Cameroun »
  codées en dur).

**Attribution & suivi**
- Attribution UTM branchée (le client existait mais n'était jamais appelé).

**Visio & divers (correctifs récents)**
- Notification de sortie de salle visio + réparation d'un JWT visio perdu.
- Join visio depuis le détail événement : message 503 dédié quand la visio est
  désactivée, au lieu d'une erreur générique.
- Recherche d'événements qui s'effaçait toute seule ; visio côté organisateur ;
  notifications sans écran cible.

**Version affichée**
- Numéro de version du profil rendu dynamique (lu depuis `Constants.expoConfig.version`,
  était figé à « v1.0.0 »). Corrigé aux DEUX endroits (Profil + Réglages).

**Backend livré en parallèle (nécessite redéploiement)**
- Inscriptions JAMAIS confirmées (piège PK UUID sur `not self.pk` dans
  `Registration.save()`) → events gratuits/visio : aucune notif de confirmation
  ni lien visio, et purge auto à 30 min. Corrigé + email/in-app/push.
- Même piège corrigé sur `PlatformWallet` (garde de singleton inopérante).
- Tâches Celery `session_tasks` non enregistrées → `KeyError` worker.
- Carte « Mes Events » affichait 0 vue (`view_count` absent du serializer liste).
- Build EAS Android : module `eventez-pip` sans `versionName` → échec de config.

**Retraits organisateur (backend + web)**
- Coordonnees bancaires verrouillees : `bank_account_number` etait modifiable
  via l'API alors que le Mobile Money etait deja verrouille juste a cote
  (compte compromis -> RIB change -> virement a l'attaquant).
- Restitution du solde sur refus DEFINITIF d'une passerelle. Jamais sur un
  timeout : le debit est peut-etre parti, on verifie d'abord.
- Trois garde-fous configurables A CHAUD en administration (Paiements ->
  Configuration -> « Securite des retraits »), tous debrayables :
  double validation au-dela d'un seuil (0 = desactive, deux administrateurs
  DISTINCTS requis), KYC verifie exige, blocage si des remboursements sont dus.
- E-mails de suivi de retrait : il n'en existait AUCUN. L'organisateur n'etait
  prevenu qu'en in-app — donc pas du tout s'il n'ouvre pas l'application.
  Quatre etapes desormais notifiees (demande recue / en cours d'envoi / verse /
  echec) en in-app + push + e-mail, avec numero de compte masque.
- Les retraits verses via pawaPay, CamPay et la reconciliation ne notifiaient
  RIEN. Tous les chemins passent maintenant par une source unique
  (`payout_notifications.notify_payout`), idempotente sur rejeu de webhook.
- Web : les refus de retrait affichaient « une erreur est survenue ». Les
  motifs actionnables (plafond par retrait, plafond journalier avec le montant
  restant, KYC, remboursements) sont maintenant affiches tels quels.

**Rappel avant publication**
- Rebuild natif OBLIGATOIRE (permissions média retirées, icônes alternatives
  supprimées, module pip, deeplinks) : une mise à jour OTA ne suffit pas.
- Après build Android : vérifier que le manifeste ne contient plus
  `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`, puis re-soumettre via **Publishing
  overview** (le rejet Play sera levé). Ne PAS remplir le formulaire de
  déclaration photo picker.
- Appliquer les migrations backend : `accounts/0027`, `notifications/0025`,
  `payments/0058`, `payments/0059`, `notifications/0028`.
- Vérifier que `apple-app-site-association` déployé contient bien le Team ID
  `9T6HK8G8B5` (le placeholder cassait les Universal Links iOS).
- Redéployer le backend (`deploy.sh update`) + redémarrer worker/beat pour les
  correctifs inscriptions/Celery/vues/paiement.
