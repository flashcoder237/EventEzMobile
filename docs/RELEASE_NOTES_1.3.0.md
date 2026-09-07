# Notes de version — EventEz 1.3.0

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ⚠️ **Version en préparation — à compléter au fil de l'eau.**
> Toute modification livrée AVANT la publication s'ajoute ici, dans « Notes
> internes ». Le texte store est rédigé en dernier, à partir de cette liste :
> l'écrire au fil de l'eau produit un catalogue illisible pour l'utilisateur.

> ℹ️ **Cette version cumule 1.2.0 et 1.3.0.** La 1.2.0 a été préparée mais
> jamais publiée : son contenu n'a donc jamais atteint un utilisateur et il est
> repris ici. `RELEASE_NOTES_1.2.0.md` est conservé comme archive de travail —
> ne pas le publier séparément.

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Messagerie repensée : elle fonctionne désormais hors connexion. Vos messages partent dès le retour du réseau.
• Vendez des billets sur place, même sans connexion, avec clôture de caisse.
• Organisez un mariage : invités, réponses, plan de table et liste de cadeaux.
• Imprimez badges, feuille d'émargement et attestations depuis votre téléphone.
• Salons : les exposants enregistrent leurs contacts en scannant un badge, avec l'accord du visiteur.
• Découvrez les organisateurs qui programment près de chez vous.
• Application nettement plus rapide au démarrage, visuels affichés en entier.
• Paiements plus fiables (Mobile Money et cartes).
• Corrections de bugs et améliorations de performance.

---

## 🇬🇧 English

What's new in this version:

• Redesigned messaging that now works offline. Your messages send as soon as you're back online.
• Sell tickets on site, even without a connection, with end-of-day cash reconciliation.
• Plan a wedding: guests, RSVPs, seating chart and gift registry.
• Print badges, attendance sheets and certificates straight from your phone.
• Trade shows: exhibitors save contacts by scanning a badge, with the visitor's consent.
• Discover organisers running events near you.
• Noticeably faster app startup, and event images now display in full.
• More reliable payments (Mobile Money and cards).
• Bug fixes and performance improvements.

---

### Notes internes (ne PAS coller dans le store)

Contenu réel du build 1.3.0. **Deux cycles cumulés** : le contenu de 1.2.0
(jamais publiée) puis les 25 commits qui ont suivi.

---

## Partie A — Nouveautés propres à 1.3.0

**Messagerie — refonte offline (phases 2 à 5)**
- Base SQLite locale + moteur de synchronisation delta : l'inbox s'affiche
  instantanément depuis le cache au lieu d'attendre le réseau.
- File d'envoi persistante avec pièces jointes : un message écrit hors
  connexion n'est jamais perdu, il part au retour du réseau.
- Message optimiste conservé en base à l'état « en attente », donc visible
  après un redémarrage de l'app.
- Recherche fonctionnelle hors connexion ; rejeu des fichiers dont l'envoi a
  échoué faute de réseau.
- Idempotence d'envoi et collision d'identifiants temporaires corrigées : un
  renvoi ne crée plus de doublon.
- Purge SQLite au blocage d'un contact : les messages d'une personne bloquée
  disparaissent réellement de l'appareil, pas seulement de l'affichage.
- Virtualisation de la liste : les longues conversations ne saccadent plus.
- Lisibilité : corps de message agrandi, bandeaux allégés, en-tête revu,
  réactions tappables, nom de l'expéditeur affiché dans les groupes.
- Économiseur de données sur images en 3G ; actions accessibles au lecteur
  d'écran ; retour haptique et gestes réflexes (retry directement sur la bulle
  en échec) ; pastille « N nouveaux messages ».
- 4 tours de correctifs QA + une validation par 5 personas utilisateurs.

**Module mariage (organisateur, mobile)**
Le mobile ne couvrait RIEN de la gestion mariage — l'API locale était
100 % côté invité.
- Liste des invités avec statistiques de couverts, édition d'un RSVP
  (nombre de convives, régime alimentaire, note), relance individuelle ou
  groupée des invités restés sans réponse.
- Liste de cadeaux / cagnotte : création, édition, articles avec lien externe,
  total récolté, partage du lien public.
- Plan de table nominatif : tables avec occupation, invités confirmés non
  placés, placement et désassignation. La garde de capacité est appliquée
  côté serveur ; le sélecteur grise en plus les tables trop petites.

**Guichet (vente sur place)**
- Écran guichet + clôture de caisse.
- Mode hors connexion : une vente n'est JAMAIS perdue. Les ventes qui
  échouent partent dans une file « à régulariser » plutôt que d'être
  supprimées.

**Documents imprimables de l'organisateur**
Badges, feuille d'émargement et attestations existaient côté serveur et sur le
web, mais aucun écran mobile ne les appelait — alors que l'organisateur qui
prépare son accueil a justement son téléphone en main.
- Placés dans l'écran des inscriptions, à côté de l'export.
- Chaque document porte une indication : « attestation » et « émargement » se
  ressemblent, mais l'une exige une présence constatée et l'autre se prépare
  avant l'événement.

**Salons — capture de contacts exposant**
Le module existait UNIQUEMENT en API : aucun écran, donc aucun exposant ne
pouvait s'en servir.
- Écran de scan (usage debout, une main) : qualification chaud/tiède/froid en
  un geste, saisie manuelle de repli, refus de consentement expliqué avec la
  marche à suivre plutôt qu'un échec muet.
- Écran « Mes contacts » avec export CSV : c'est le livrable qui justifie le
  stand.
- Consentement DÉDIÉ du visiteur, distinct de la visibilité dans l'annuaire :
  apparaître dans l'annuaire et autoriser une entreprise à repartir avec ses
  coordonnées sont deux finalités différentes.

**Droits RGPD du visiteur**
- Écran « Mes données chez les exposants » : savoir quelles entreprises
  détiennent ses coordonnées et les faire effacer, une par une ou d'un coup.
  L'écran existe aussi sur le web — un droit qu'une moitié des utilisateurs ne
  peut pas exercer n'en est pas un.
- La confirmation nomme ce qui part (nom, e-mail, téléphone) ET ce qui reste
  (le fait du contact, pour le bilan de salon de l'exposant).

**Accueil et profil**
- Rail « Organisateurs près de chez vous », basé sur la ville déclarée du
  profil, avec repli national si elle ne donne rien. Les profils sans aucun
  événement publié sont exclus.
- Vitrine organisateur sur l'écran Profil : aperçu de ce que voient les
  autres, bouton de partage du profil public (lien déjà géré en deep link).
- Sélection d'un lieu enregistré à la création d'un événement : le lieu
  remplit les champs sans les verrouiller.

**Correctifs**
- Un billet NON PAYÉ s'affichait comme payé (indicateur « en attente » masqué).
- Cagnotte inatteignable : l'écran et son deeplink existaient, mais aucun
  bouton n'y menait — un invité ne voyait jamais la cagnotte depuis l'app.
- Position en liste d'attente : la donnée était chargée et typée mais jamais
  affichée. Le participant savait qu'il était inscrit, pas où il en était.
- Suivi des remboursements rendu accessible.
- Récapitulatif RSVP visible et motif d'annulation affiché.
- Clic sur la notification « un exposant a enregistré vos coordonnées » :
  menait à la page de l'événement (une billetterie) au lieu de l'écran
  permettant de retirer ces données.

---

## Partie B — Contenu de 1.2.0, jamais publié

Repris intégralement ; le détail complet reste dans `RELEASE_NOTES_1.2.0.md`.

**Performance**
- Démarrage : 55 écrans passés en chargement à la demande. Le code évalué
  avant le premier rendu passe de ~45 700 à ~8 300 lignes (−82 %). Répond à
  l'alerte « vitesse » signalée par Play Console.

**Affichage**
- Visuels d'événement rendus en entier sur fond flouté au lieu d'être rognés :
  une affiche verticale perdait son titre et sa date.
- Badge « Organisateur vérifié » enfin visible ; icônes de badges corrigées ;
  rangée de badges qui s'étirait ; bouton flottant qui chevauchait la barre
  d'onglets.

**Événements terminés** (cohérence sur `end_date`, pas `start_date`)
- L'onglet « Passés » basculait un événement dès son DÉMARRAGE.
- « Annuler l'inscription » restait proposé sur un événement déjà joué.
- Dupliquer un événement passé produisait une copie elle-même « passée ».

**Fonctionnalités**
- Programme pionniers ; parrainage fonctionnel de bout en bout.
- Visio : bouton « Rejoindre » depuis le reçu d'inscription, PiP Android.
- Exposants : parcours candidature + paiement de stand.
- Billet hors-ligne téléchargeable.
- Notifications de retrait ; recherche partageable (URL filtrée → app
  pré-filtrée).

**Deep links (Android + iOS)**
- Liens e-mail `/dashboard/*` réécrits vers les écrans mobiles.
- SHA-256 de la clé Play Store ajouté à `assetlinks.json`.
- Deep link ouvert au premier lancement : bypass de l'onboarding.

**Conformité Google Play** (rejet du version code 15 corrigé)
- Retrait des permissions `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`.

**Médias**
- Sheet unifié « Enregistrer dans la galerie / Partager ».
- Retrait du repli QR distant (`api.qrserver.com`) qui envoyait l'URL du
  billet à un tiers.

**Paiement multi-passerelles**
- Le badge affichait « NotchPay » pour des paiements CamPay / pawaPay.
- Routage CamPay / pawaPay câblé, gestion du flux USSD.
- Validation téléphone/pays pilotée par l'API (fin des hypothèses
  « Cameroun »).

**Attribution**
- Attribution UTM branchée (le client existait mais n'était jamais appelé).

---

### Avant publication

- [ ] Relire le texte store : il doit rester une dizaine de lignes lisibles,
      pas le catalogue ci-dessus.
- [ ] Vérifier que `app.json` et `package.json` sont bien en 1.3.0
      (`versionCode` / `buildNumber` sont auto-incrémentés par EAS).
- [ ] Lancer la suite de tests backend complète et les tests mobile.
- [ ] Vérifier la parité des traductions FR/EN.
