# Audit UX — Parcours Invité → Achat de Billet (Mobile)

**Date** : 2026-04-28
**Auditeur** : Claude (lecture de code, simulation utilisateur)
**Profil simulé** : Visiteur invité (non connecté, browse-first), achète son premier billet
**Parcours** : Discover → EventDetails → TicketPurchase → Login → Payment → PaymentSuccess → MyTickets
**Méthodologie** : Lecture du code source de chaque écran, reconstruction de l'expérience utilisateur, identification des frictions à partir de la logique réelle implémentée (textes, états vides, gestion d'erreurs, animations, accessibilité).

> ⚠️ Limite méthodologique : ce rapport reflète ce qu'un utilisateur **devrait** voir d'après le code. Il ne capture pas les bugs runtime, les latences réseau réelles, les rendus visuels exacts ni les défauts d'animation perceptibles uniquement sur device.

---

## ÉTAPE 1 — DiscoverScreen (page d'accueil invité)

### 🖱 ACTION EFFECTUÉE
J'ouvre l'application pour la première fois. Sans être connecté, j'arrive directement sur l'onglet Discover (parcours "browse-first" — pas de mur d'authentification). Je laisse défiler le squelette de chargement, puis je commence à scroller.

### 👁 CE QUE JE VOIS
- Toile crème claire `#F6F6F9` avec un filigrane "EZ" en arrière-plan (typographie éditoriale très assumée).
- Bandeau supérieur arrondi (rayon 32 en bas) qui ressemble à un magazine : eyebrow rouge corail "**DÉCOUVRIR • DOUALA**", puis un gros titre extra-bold "**Ce qui bouge**".
- À droite du titre : icônes ronds gris pour Messages et Notifications (avec point corail si non lus).
- Sous le titre, une grosse barre de recherche atypique : icône loupe indigo dans un disque, eyebrow "QUOI · CE SOIR", placeholder rotatif toutes les 3s ("Concert à Douala...", "Festival ce weekend...", etc.), pilule "Filtres" indigo à droite.
- Une rangée de chips horizontales : "Tout" sur fond indigo (sélectionné par défaut) puis 8 catégories sur fond gris.
- Une carte "hero" verticale 240px : image avec gradient, pilule "EN VEDETTE", icône bookmark, titre superposé en blanc, footer avec tuile date (jour/mois) + lieu + heure + pilule prix.
- Section "PRÈS DE TOI / Populaire dans le coin" en scroll horizontal (cards portrait 220x130).
- Pour un invité : carte CTA "CONNEXION / Des recommandations taillées pour toi" (fond gradient soft) avant les sections suivantes.
- Section "À VENIR / The Incoming" : 4 cartes verticales façon ticket (perforation pointillée verticale entre tuile date et corps).
- Grille "TOUS LES GENRES / Explorer" : 6 cards 2 colonnes avec image + dot coloré + nombre d'événements.
- Section "ZÉRO FRANC / Gratuit, sans condition" sur fond gradient (indigo→corail très lavé), 6 cards horizontales avec badge "GRATUIT".
- Au scroll, un compact header sticky apparaît (search bar + cloche notifications).

### 🧠 CE QUE JE COMPRENDS
- L'identité visuelle est forte, éditoriale, presque magazine. C'est cohérent et ça donne une impression premium.
- Le ton parle français camerounais ("ce qui bouge", "dans le coin", "zéro franc"). Bon point pour l'ancrage local.
- La hiérarchie est claire : un événement vedette, des recommandations géographiques, des suggestions, des catégories, du gratuit.
- Le CTA login pour invité est intelligent : il ne bloque pas, il *invite*.
- Mais : "**DOUALA**" est affiché alors que je n'ai même pas encore donné ma permission de localisation. C'est codé en dur dans l'eyebrow, peu importe où je suis.

### 😊 RESSENTI UTILISATEUR
**Confiance** : la qualité du design est immédiatement perceptible. Polices, espacements, dégradés subtils, micro-pilules — c'est soigné.
**Léger malaise** : trop de sections différentes sur un seul scroll (hero, nearby, rec, incoming, categories, free) = densité élevée. Sur écran moyen, on doit scroller longtemps.
**Curiosité** : les rotations de placeholder dans la barre de recherche sont engageantes.
**Frustration latente** : les icônes bookmark sont visibles partout mais cliquer dessus ne fait rien (pas d'`onPress` câblé sur les cards).

### ⚠ PROBLÈMES DÉTECTÉS
1. **`DÉCOUVRIR • DOUALA` codé en dur** (ligne 897). Si l'utilisateur est à Yaoundé, Bafoussam, Limbé, l'eyebrow ment. Devrait être dynamique selon `location` ou désactivé tant que la perm n'est pas accordée.
2. **Permission de localisation demandée silencieusement** au mount via `requestLocation()` (ligne 250-260) sans pré-explication. iOS et Android afficheront le dialogue système nu, sans contexte → taux de refus élevé garanti.
3. **Bookmarks décoratifs** : les icônes `bookmark-outline` (lignes 380, 500) sont des `<View>` non-cliquables. Visuellement, l'utilisateur s'attend à pouvoir sauvegarder. C'est un *false affordance*.
4. **Erreurs réseau invisibles** : tous les `.catch()` (lignes 187, 196, 205, 213, 217, 246, 258) sont silencieux (`__DEV__ && console.error`). Si l'API tombe, l'utilisateur voit des sections vides sans aucune explication.
5. **Aucun état d'erreur global** : pas de "Pas de connexion / Impossible de charger" si tout échoue. L'utilisateur reste face à un écran avec juste l'en-tête.
6. **Aucun état "vide"** : si zéro événement à afficher (cas légitime au lancement), aucune section n'apparaît → l'utilisateur ne comprend pas si l'app charge ou s'il n'y a rien.
7. **Cascade d'animations longue** : delays 200/300/380/460/540/620ms = ~620ms avant que la dernière section apparaisse. Sur un device lent, ça paraîtra encore plus lent.
8. **Chip "Tout" trompeur** : visuellement actif (indigo + flash) mais déclenche `activateSearch()` sans paramètre comme un simple bouton de recherche. Pas de feedback "filtre actif".
9. **Style mort** : `headerDot` (ligne 1222) est défini mais jamais rendu (commentaire vide ligne 903).
10. **Header pas sticky** : seul le `compactHeader` apparaît au scroll, mais on perd les chips de catégorie quand on scrolle. Sur un long feed, on doit remonter pour changer de catégorie.
11. **Fallback `Lieu à confirmer`** (ligne 418) : si la majorité des events ne précisent pas leur ville, la section "près de toi" devient vide-d'information.
12. **`InteractionManager.runAfterInteractions()`** sur `fetchRecommendations` + `requestLocation` (ligne 265) : sur device lent, les recommandations et la nearby section apparaissent visiblement *après* le reste → effet de "pop-in" tardif.
13. **Pas d'accessibilité sur les sections** : les cards événement n'ont pas de `accessibilityLabel`/`accessibilityRole`. Les lecteurs d'écran annoncent juste "image, image, image".

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Eyebrow dynamique** : remplacer `DÉCOUVRIR • DOUALA` par `DÉCOUVRIR • {city}` où `city` vient soit du reverse-geocode de `location`, soit d'une sélection utilisateur (avec sélecteur "📍 Douala ▾" cliquable). Fallback : juste `DÉCOUVRIR`.
2. **Permission localisation contextuelle** : afficher une mini-card discrète "Active ta position pour voir ce qui bouge près de toi" avec bouton "Activer" qui *ensuite* demande la permission. Bien meilleur taux d'acceptation.
3. **Connecter les bookmarks** : soit câbler `onPress` vers une mutation "save event" (avec auth-guard pour invités), soit retirer l'icône des cards tant que la fonctionnalité n'est pas prête. Un bouton qui ne fait rien est pire que pas de bouton.
4. **État d'erreur visible** : ajouter un toast ou bandeau "Connexion lente, réessayer" quand au moins 2 des 4 fetch échouent. Le `__DEV__ && console.error` ne sert qu'aux devs.
5. **Empty state honnête** : si toutes les sections sont vides après le chargement, afficher une illustration + "Aucun événement disponible pour le moment. Reviens bientôt !"
6. **Réduire la cascade** : delays max 100-200ms total, ou animer les sections au moment où elles entrent dans le viewport (`onViewableItemsChanged`) plutôt qu'au mount.
7. **Chip "Tout" → vrai état** : tracker la catégorie sélectionnée localement, "Tout" est juste reset, et seules les cards de la catégorie active s'affichent dans le hero/nearby/upcoming.
8. **Sticky chips au scroll** : intégrer les chips de catégorie dans le compactHeader (ou un sous-header sticky séparé) pour permettre de changer de filtre depuis n'importe où dans le feed.
9. **Skeleton plus léger** : `DiscoverScreenSkeleton` charge sûrement le squelette de toutes les sections. Vérifier qu'il ne coûte pas plus cher que les requêtes elles-mêmes.

---

## ÉTAPE 2 — EventDetailsScreen (page de l'événement)

### 🖱 ACTION EFFECTUÉE
Je tape sur la carte hero "EN VEDETTE" du Discover. La transition se fait, l'image se précharge. J'arrive sur la page de l'événement. Je scroll de haut en bas pour voir tout le contenu, puis je tape le CTA "Acheter des billets" en bas.

### 👁 CE QUE JE VOIS
- Bandeau de 360px de haut avec image, **effet parallax** au scroll (l'image se zoome légèrement quand on tire vers le bas).
- Triple gradient noir-transparent-noir par-dessus pour la lisibilité.
- En haut : bouton retour + bouton "favoris" + bouton "partager" sur fond blanc semi-transparent (44x44, ombrés). Tous trois en floating absolu.
- Mini-pilule en bas à droite du bandeau : "1 / N" ou "Agrandir" — invite à ouvrir la galerie.
- Au scroll, un **BlurHeader** apparaît en haut (effet glass) avec le titre de l'événement + bouton retour/partager. Les boutons floating fade out (opacité 1→0 entre offset 100 et 200).
- Le contenu commence avec une "carte" arrondie (rayon 4xl) qui remonte de 32px au-dessus de l'image.
- Eyebrow rouge `ÉVÉNEMENT · {CATÉGORIE}`, pilule date "📅 25 mai 2026 · 19:00" sur fond indigo très clair.
- Gros titre 32px en display extra-bold.
- Carte "Organisé par" : avatar + nom + bouton "Suivre" indigo.
- Ligne "Partager :" avec 3 icônes (partage générique, WhatsApp vert, Ajouter au calendrier).
- Carte "Lieu" cliquable avec icône `location` + nom + adresse + chevron.
- Stats Row : Inscrits | Vues | Favoris (3 colonnes séparées par lignes verticales).
- Section AboutTab (description complète).
- Section "INFO UTILE / Bon à savoir" : grille de pills 2-col avec mini-icônes (heure check-in, type d'événement, capacité, gratuit, etc.).
- Section "LA COMMUNAUTÉ / Qui y va ?" : 3 avatars génériques empilés + "+N personne(s) inscrite(s)".
- Section "GALERIE / Photos" en scroll horizontal (si plus d'une image).
- Section TicketsTab (sélection des billets).
- Section AgendaTab (sessions, si applicable).
- Section LocationTab (carte/adresse).
- Section ReviewsTab (avis).
- Section SponsorsTab.
- **Bottom bar sticky** avec effet glass blur : à gauche prix "À partir de X FCFA" + équivalent en EUR via `ConvertedPrice`, à droite gros bouton CTA gradient indigo→corail "🔒 Acheter des billets →".

### 🧠 CE QUE JE COMPRENDS
- Cette page concentre absolument tout — c'est un *one-page event detail* à la Eventbrite. C'est cohérent avec la note dans CLAUDE.md ("single scrollable page (no more 12 tabs)").
- L'icône `lock-closed` sur le CTA principal annonce **silencieusement** qu'il faut être connecté pour acheter (déclenché par `requireAuth()`). Mais l'utilisateur invité ne sait pas pourquoi ce cadenas est là tant qu'il ne tape pas.
- Le bouton "Suivre" sur l'organisateur ne **suit pas** : il appelle `handleContactOrganizer` (donc ouvre une conversation). Le label est trompeur.
- "Qui y va ?" affiche 3 avatars **génériques en gris** (icônes `person`) et juste un compteur. C'est une preuve sociale faible — pas vraiment des avatars réels.
- Le calcul `minPrice` se base sur `event.ticket_types`, et si la liste est vide, affiche "Gratuit". Risqué si la liste n'est juste pas encore chargée.

### 😊 RESSENTI UTILISATEUR
**Très positif** : le parallax du banner, le BlurHeader qui slide-in, la carte arrondie qui chevauche l'image — c'est cinématographique. On sent que c'est travaillé.
**Léger embarras** : la section "Qui y va ?" avec ses avatars gris fait penser à une fonctionnalité incomplète. Les utilisateurs avertis comprennent que ce sont des placeholders.
**Confusion ponctuelle** : "Suivre" l'organisateur qui ouvre une conversation = je m'attendais à le mettre en favoris. Ça ne correspond pas au verbe.
**Latence** : la page contient ~10 sections lourdes (AboutTab, TicketsTab, AgendaTab, LocationTab carte, ReviewsTab API, SponsorsTab API). Sur réseau lent, le scroll vers le bas révèle des sections vides qui se peuplent peu à peu.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Bouton "Suivre" trompeur** (ligne 522) : libellé "Suivre" mais `onPress={handleContactOrganizer}` → ouvre une conversation. Confusion verbe/action.
2. **Cadenas non expliqué** sur le CTA principal (ligne 1004) : `Ionicons name="lock-closed"` est rendu pour un invité, mais il n'y a aucune mention textuelle "Connexion requise" → l'utilisateur clique, est redirigé vers Login, ne comprend pas pourquoi.
3. **Avatars "Qui y va ?" génériques** (ligne 786-790) : 3 cercles gris identiques avec icônes `person` — donne une impression "feature inachevée". Soit on charge des vrais avatars, soit on ne montre pas cette section.
4. **`minPrice` peut afficher "Gratuit" pendant le chargement** (ligne 308-310) : `event.ticket_types?.length > 0 ? Math.min(...) : 0` → si la liste arrive après, on affiche "Gratuit" en attendant. Trompeur.
5. **`ConvertedPrice`** (ligne 911) : appelle vraisemblablement une API de FX. Si elle échoue, est-ce que le composant affiche un fallback ou disparaît silencieusement ?
6. **Sections lourdes côte-à-côte** : AboutTab + TicketsTab + AgendaTab + LocationTab (carte) + ReviewsTab + SponsorsTab dans un seul `ScrollView` — chacun fait probablement ses propres fetches → cascade de spinners. Lazy-loading manquant.
7. **`handleVerifyAccessCode`** (ligne 179) : en cas de succès appelle `navigation.replace('EventDetails', ...)` — refait tout le chargement de l'écran. UX brutale (le scroll position est perdu, animation entrée rejouée).
8. **Pas de retour de pression** sur les zones tactiles importantes : la carte organizer (ligne 494) est statique, alors qu'on s'attend à ce qu'elle ouvre le profil organisateur. La carte location (ligne 664) a `activeOpacity={0.7}` mais pas d'`onPress` → false affordance.
9. **Banner cliquable mais pas annoncé** (ligne 387) : le `Pressable` absoluteFill ouvre le viewer, mais visuellement rien ne le dit hors la mini-pilule "1/N" en bas à droite.
10. **Status `cancelled` / `completed`** affichés en lecture seule (lignes 980-989) : si je suis déjà inscrit à un event annulé, où est le bouton "Demander remboursement" ?
11. **`onlineLockedInfo`** (ligne 618-622) : pour un invité regardant un event en ligne, on voit "Les informations seront disponibles après votre inscription" → mais le CTA principal en bas dit "S'inscrire" / "Acheter" sans mentionner explicitement qu'il faudra payer. Friction.
12. **Eyebrow titre** (ligne 478-480) : `ÉVÉNEMENT · {CATÉGORIE}` ou fallback `FEATURED` (en anglais) si pas de catégorie. Mélange FR/EN gênant.
13. **Stats "Inscrits/Vues/Favoris"** (ligne 678-694) : afficher "Vues" peut être contre-productif si le compteur est très bas (ex. 12 vues) → impression d'événement peu populaire.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Renommer "Suivre"** → "Contacter" ou "Message" sur le bouton organizer, et déplacer le vrai "Suivre" l'organisateur (favori) ailleurs si la fonctionnalité existe.
2. **Expliciter l'auth** : remplacer le cadenas par un texte *à côté* du CTA pour invité : "🔒 Connecte-toi pour acheter" ou afficher un mini-bandeau au-dessus de la bottom bar : "Vous devez être connecté pour acheter — Se connecter".
3. **Section "Qui y va"** : soit charger les avatars réels via `event.recent_registrants`, soit afficher juste un texte sobre "12 personnes inscrites". Pas de placeholders gris.
4. **Skeleton du prix** : afficher `—` ou un mini squelette pendant que `ticket_types` charge, jamais "Gratuit" par défaut.
5. **Lazy-loading des sections lourdes** : monter Agenda/Reviews/Sponsors uniquement quand elles entrent dans le viewport (`onViewableItemsChanged` ou `react-native-intersection-observer`).
6. **Préserver le scroll après code d'accès** : au lieu de `navigation.replace`, simplement re-fetcher l'event et masquer la gate.
7. **CTAs cohérents** : la carte organizer et la carte location doivent avoir un `onPress` qui navigue vers le profil organizer / la map plein écran, ou ne pas avoir l'air pressables.
8. **Status annulé/terminé** : ajouter des CTA secondaires utiles : "Demander remboursement" (si inscrit), "Voir événements similaires" (sinon).
9. **Eyebrow homogène** : remplacer le fallback `FEATURED` par `À NE PAS RATER` ou simplement `ÉVÉNEMENT` tout court.
10. **Compteur "Vues"** : ne l'afficher que si > X vues (ex. > 50). Sinon le masquer.

---

## ÉTAPE 3 — LoginScreen (déclenché par le CTA "Acheter")

### 🖱 ACTION EFFECTUÉE
J'ai tapé "Acheter des billets" en bas de la page EventDetails. Le `requireAuth()` détecte que je ne suis pas connecté et m'envoie sur l'écran Login *en modal*. Je n'ai aucun message expliquant *pourquoi* je suis là.

### 👁 CE QUE JE VOIS
- Toile éditoriale crème, filigrane "**E**" en arrière-plan.
- Logo EventEz centré (180x58).
- Eyebrow rouge corail "**Connexion / 01**", titre extra-bold "**Bon retour !**", sous-titre "Connecte-toi pour découvrir les meilleurs événements".
- Onglet email actif par défaut. Pas d'onglets visibles en haut, mais un lien "Se connecter avec **mon numéro**" plus bas pour basculer.
- Champs Email + Mot de passe avec icônes à gauche, focus border indigo.
- Lien "Oublié ?" à droite du label "Mot de passe".
- Œil pour montrer/cacher le mot de passe.
- Checkbox "Se souvenir de moi" (cochée par défaut).
- Bouton CTA `EditorialPillCTA` "Entrer / Se connecter".
- Si retry réseau : bandeau jaune "Tentative de connexion 2/3...".
- Diviseur "ou continuer avec".
- Boutons Google + Apple (Apple visible uniquement sur iOS).
- Texte légal CGU + Confidentialité avec liens vers eventez.online.
- "Pas encore de compte ? **Créer un compte**" en bas.

### 🧠 CE QUE JE COMPRENDS
- L'écran est complet : email/mdp, OTP téléphone, Google, Apple. Bonne couverture des méthodes d'auth.
- Le sous-titre "Connecte-toi pour découvrir les meilleurs événements" est **générique** : il ne dit pas "Connecte-toi pour finaliser ton achat" alors que je viens de cliquer sur ce bouton spécifique. Je perds le fil de mon achat.
- L'eyebrow "Connexion / 01" suggère qu'il y a une étape 02, mais c'est juste décoratif.
- L'onglet phone n'est visible qu'**après** avoir cliqué sur le lien "Se connecter avec mon numéro" — pas de toggle visible d'emblée.
- "Se souvenir de moi" coché par défaut sans expliquer ce que ça fait (durée de session étendue ?).

### 😊 RESSENTI UTILISATEUR
**Frustration légère** : je voulais acheter un billet, je me retrouve sur un écran de login générique. Pas de fil rouge, pas de breadcrumb "Tu étais en train d'acheter [Concert XYZ], connecte-toi pour continuer".
**Confiance** : design soigné, options multiples (email, phone, Google, Apple). Mot de passe avec œil = standard moderne.
**Curiosité** : l'OTP téléphone est masqué derrière un lien — je l'aurais peut-être utilisé si visible d'emblée. Au Cameroun, le SMS est plus naturel pour beaucoup d'utilisateurs.
**Anxiété** : "Se souvenir de moi" coché par défaut → si je suis sur un téléphone partagé, c'est risqué. Devrait être opt-in.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Aucun contexte d'arrivée** : pas de bandeau "Connexion requise pour finaliser ton achat" en haut. L'utilisateur a oublié pourquoi il est ici.
2. **Sous-titre générique** (ligne 244) : "Connecte-toi pour découvrir les meilleurs événements" n'a aucun rapport avec le fait que je voulais acheter un billet.
3. **Onglets email/phone non visibles** : le toggle est un lien texte en bas (lignes 489-502) plutôt que deux onglets en haut. Sur un marché où le téléphone est la norme (Cameroun), c'est une friction inutile.
4. **"Se souvenir de moi" coché par défaut** (ligne 54) : risque de session persistante non voulue. Devrait être décoché par défaut.
5. **Pas d'auto-focus** sur le champ email à l'arrivée → l'utilisateur doit taper sur le champ pour commencer à écrire.
6. **`navigation.goBack()` après login** (lignes 160 et 200-202) : on retombe sur EventDetails — bon — mais l'utilisateur doit re-cliquer sur "Acheter des billets". Pas de redirection automatique vers l'action prévue.
7. **OTP `autoFocus` ligne 323** : sur une re-entrée d'écran, ça peut déclencher le clavier de manière intrusive.
8. **Validation `validators.password(password, 6)`** ligne 182 : exige >= 6 caractères. Si le backend exige plus (8+), l'utilisateur est validé côté front mais rejeté côté serveur → friction.
9. **Mélange tutoiement/vouvoiement** : "Connecte-toi" (tu) + "vous acceptez nos Conditions" (vous) ligne 568. Choisir un seul ton.
10. **Numéro de téléphone normalisé** ligne 139 : `raw.startsWith('+') ? raw : `+${raw}`` — l'utilisateur peut taper "237691234567" et ça devient "+237691234567". OK. Mais si il tape "06 12 34 56 78" ça devient "+06 12 34 56 78" qui n'est pas un numéro valide → erreur sans guide clair.
11. **`googleReady` peut être false longtemps** sur Android (init lent) → bouton Google désactivé sans message visible.
12. **Liens CGU/Privacy** : `Linking.openURL(...)` ouvre le navigateur, sortie complète de l'app. WebView in-app serait moins disruptive.
13. **Aucune option "Continuer en invité"** sur cet écran : si l'événement est gratuit, on pourrait permettre l'inscription avec juste email + nom sans créer de compte.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Bandeau de contexte** : ajouter un bandeau soft en haut de l'écran "🎫 Connecte-toi pour réserver tes billets pour [Nom de l'événement]" avec mini-image.
2. **Sous-titre dynamique** : au lieu de "découvrir les meilleurs événements", utiliser "Tes billets t'attendent" ou "Encore une étape avant ton billet 🎫".
3. **Onglets visibles** : Email | Téléphone en haut de la zone form, pas un lien texte caché en bas.
4. **"Se souvenir de moi" décoché par défaut**, et reformuler en "Rester connecté pendant 30 jours" (transparent).
5. **Auto-focus** sur le premier champ visible (email) au mount.
6. **Redirection post-login** : passer la destination en `route.params.returnTo` et y naviguer directement après login. L'utilisateur ne doit pas re-cliquer.
7. **Validation password** : aligner sur la règle backend (probablement >= 8 + complexité). Afficher un compteur de robustesse.
8. **Voix unique** : choisir le tutoiement partout (cohérent avec "Bon retour !", "Connecte-toi"), reformuler le footer légal.
9. **Hint pour numéro local** : "Ex : +237 691 23 45 67" ou ajouter un mini-sélecteur de pays.
10. **Inscription rapide pour events gratuits** : bouton secondaire "Continuer sans compte" si l'event d'origine est gratuit (passer juste email + prénom au backend, créer un compte light auto).

---

## ÉTAPE 4 — TicketPurchaseScreen (sélection des billets)

### 🖱 ACTION EFFECTUÉE
Connexion réussie, je retombe sur EventDetails. Je re-tape "Acheter des billets". J'arrive sur l'écran de sélection. Je choisis 2 billets de catégorie "Standard", j'essaie un code promo "WELCOME10", je remplis le formulaire dynamique (nom, téléphone), puis je tape "Continuer".

### 👁 CE QUE JE VOIS
- Toile éditoriale crème, filigrane "**BUY**" en arrière-plan.
- Header tile : icône retour rond gris + eyebrow corail "**BILLETTERIE • TIX**" + titre "**Choisir tes billets**".
- Carte résumé événement : tuile date indigo (jour/mois) + eyebrow catégorie + titre + ligne meta (date complète · ville).
- Si déjà inscrit : encart jaune "**DÉJÀ INSCRIT.E / Tu participes déjà**" avec rail jaune à gauche, badges "Voir / Modifier ou + Billets / Annuler".
- Section eyebrow "**CHOIX • TIX**" / titre "**Types de billets**".
- Cards de billets en style **carte d'embarquement (boarding pass)** : à gauche pilule "BILLET 01" + nom + description + prix + dispo "X dispo" ; au milieu **perforation pointillée verticale** avec encoches en haut/bas ; à droite zone "QUANTITÉ" avec [-] [n] [+]. Bordure indigo si sélectionné.
- Si épuisé : pilule rouge "ÉPUISÉ" en remplacement de la zone quantité, opacité 0.55.
- Section "**RÉDUCTION • DEAL / Code promo**" (visible seulement si quantité > 0) : input "EX: WELCOME10" + bouton "OK" indigo. Si appliqué, card verte avec icône `pricetag` + "CODE APPLIQUÉ" + value + bouton "×" pour retirer.
- Section formulaire dynamique (si applicable) avec champs auto-pré-remplis depuis le profil.
- Section "**FACTURE • RECAP / Récapitulatif**" en style ticket de caisse : header "EVENTEZ · COMMANDE" + numéro de ref aléatoire (`Date.now().slice(-6)`), pointillés, lignes par billet, sous-total, frais service, total à payer.
- Bottom bar fixe : à gauche "X BILLETS · FRAIS INCL" + total ; à droite gros pilule indigo gradient "Continuer".

### 🧠 CE QUE JE COMPRENDS
- L'écran est très complet : sélection, quantité, code promo, récap, formulaire dynamique. Tout est là.
- Le **boarding pass design** des cards de billets est marquant et cohérent avec l'imagerie événementielle.
- L'absorbtion des frais (`fee_bearer === 'organizer'`) est gérée — joli détail (peut afficher 0 frais).
- Le pré-remplissage automatique du formulaire (`autoPrefillFormData` ligne 47-92) est intelligent : email/phone/prénom/nom détectés par regex sur le label.
- Mais : la **référence de commande "#XXXXXX"** est générée côté client via `Date.now().slice(-6)` ligne 906 — ce n'est PAS le vrai ID de commande. Si l'utilisateur la note, elle ne correspondra à rien dans le système.
- "Code appliqué" affiche `(estimation)` ligne 826/827 — l'utilisateur ne sait pas si le total est définitif.

### 😊 RESSENTI UTILISATEUR
**Très positif** : le design boarding-pass des billets, la pilule "BILLET 01", l'animation des [+]/[-]. C'est tactile et engageant.
**Confiant** : le récap en style ticket de caisse rassure, les pointillés, la ref, le total bold. Pro.
**Léger flottement** : "estimation" sur le code promo me laisse incertain. Vais-je payer ce montant exact ou pas ?
**Embêtement** : si je modifie un billet (mode `isEditMode`), tous les états sont pré-remplis, mais la mention "Modifier billets" est très petite. Pas de récap "Avant : X / Après : Y" → on ne sait pas ce qu'on change.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Référence commande fausse** (ligne 906) : `#${Date.now().toString().slice(-6)}` change à chaque rendu, c'est cosmétique mais trompeur (l'utilisateur peut la photographier comme preuve).
2. **"(estimation)" sur le discount** (lignes 826-827) : terminologie ambiguë. L'utilisateur veut savoir le montant exact.
3. **Limite quantity à 10** ligne 222 : codé en dur. Si l'utilisateur veut acheter 12 billets pour un groupe, blocage silencieux. Aucun message.
4. **"BILLET 01"** ligne 725 : libellé technique sans signification métier. "STANDARD", "VIP", "EARLY BIRD" auraient du sens.
5. **Boutons [-] et [+]** sont gros mais sans feedback haptique → sur mobile, c'est attendu (`Haptics.selectionAsync()`).
6. **Pas de batch update** : ajouter 5 billets requiert 5 taps sur [+]. Pas de saisie directe de quantité.
7. **Validation form en bloc** ligne 207-218 : tous les champs requis sont vérifiés à la soumission. Si erreur, il faut scroller pour voir où elle est. Pas de scroll-to-error.
8. **`existingRegistration` callout** : utilise des couleurs hardcoded `#FEF3C7`, `#F59E0B` (lignes 597-598) — pas thémé pour le dark mode → gros bandeau jaune bizarre en dark.
9. **`handleProceed` validation** lignes 331-346 : checks `registration_deadline` et `end_date` sont fait avant la soumission, mais pas affichés en amont. L'utilisateur peut remplir tout, taper "Continuer", et se voir refusé.
10. **Mode `isAdditionalMode` sans `existingRegistration`** ligne 383-391 : retourne une erreur explicite, mais c'est un état logique impossible si la nav est correcte → mort code défensif.
11. **Frais de service formulés** ligne 962 : "Frais service ({getServiceFeeLabel(...)})" — la parenthèse contient sûrement "5%" ou "fixe 500 XAF". Mais aucune explication contextuelle (à quoi servent ces frais ?).
12. **Auto-prefill silencieux** : on remplit le form sans dire à l'utilisateur "Pré-rempli depuis ton profil — édite si besoin". Devrait être annoncé.
13. **Bouton CTA disabled** (ligne 1029) : opacité 0.5 + texte "Continuer" reste affiché. Pas de message "Sélectionne au moins un billet" → l'utilisateur clique, rien ne se passe.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Vraie ref de commande** : ne pas afficher de ref tant que l'inscription n'est pas créée côté backend, ou afficher juste un placeholder "Sera généré à la confirmation".
2. **Discount sans "estimation"** : le backend doit retourner le montant calculé exact. Si pas possible, dire "Réduction confirmée à la finalisation".
3. **Limite quantity expliquée** : si max 10 atteint, afficher mini-toast "Maximum 10 billets par commande — contacte l'organisateur pour un groupe".
4. **Renommer "BILLET 01"** : utiliser la catégorie ou la rareté (ex. `PASS · 1ÈRE CAT`).
5. **Haptique sur [+]/[-]** : `Haptics.selectionAsync()` à chaque clic.
6. **Saisie directe de quantité** : tap long sur le chiffre → bottom-sheet avec champ numérique.
7. **Scroll-to-error** : `ref` sur chaque champ + scroll au premier en erreur après `validateForm`.
8. **Couleurs thémées** : remplacer les hex `#FEF3C7`, `#F59E0B`, `#10B981` par `colors.warning*` / `colors.success*` pour respecter le dark mode.
9. **Pré-checks deadline/end_date** : afficher un bandeau d'alerte au mount si l'inscription est fermée, plutôt que d'attendre la soumission.
10. **Tooltip sur "Frais service"** : tap → bottom-sheet "Ces frais couvrent X et Y. L'organisateur peut choisir de les absorber.".
11. **Annonce du pré-remplissage** : sous le formulaire, mention discrète "✓ Pré-rempli depuis ton profil".
12. **Bouton CTA actif avec hint** : au lieu de désactiver, garder cliquable et afficher un tooltip "Sélectionne au moins un billet" au tap.

---

## ÉTAPE 5 — PaymentScreen (paiement)

### 🖱 ACTION EFFECTUÉE
J'arrive sur l'écran de paiement après avoir validé mes 2 billets. Je vois le récap, je sélectionne MTN Mobile Money, je vérifie mon numéro pré-rempli, je tape "Payer". Une notification arrive sur mon téléphone, je tape mon code PIN, je reviens sur l'app et le paiement est confirmé.

### 👁 CE QUE JE VOIS

**État formulaire (avant tap "Payer") :**
- Toile éditoriale crème, filigrane "**PAY**".
- Header tile : retour + eyebrow corail "**ÉTAPE 3 / 3 • CHECKOUT**" + titre "**Paiement**" + badge vert "🔒 SÉCURISÉ" à droite.
- Trois barres de progression indigo en dessous (toutes pleines = on est à la dernière étape).
- Section "**FACTURE • RECAP / Ta commande**" : carte avec header "EVENT • 2026" + nom de l'événement + lignes de billets + sous-total + frais service + **TOTAL À PAYER** en bold + équivalent EUR via `ConvertedPrice`.
- Section "**MÉTHODES • PAY / Mode de paiement**" : sélecteur de pays en haut (`CountryBadgeSelector`) + indicateur FX si "International" + cards méthodes avec : index "01", "02"... + icône colorée (jaune MTN, orange OM, bleu carte, etc.) + nom + description courte + radio à droite.
- Si Mobile Money sélectionné : section "**MOBILE MONEY • TEL / Numéro de téléphone**" avec liste des numéros sauvegardés en chips horizontaux + input formaté.
- Bottom CTA pilule indigo "Payer" avec montant.

**État processing (après tap "Payer") :**
- Le formulaire disparaît, remplacé par une page centrée :
- Icône de la méthode dans un cercle de la couleur de la méthode (transparente).
- Spinner large.
- Titre = nom de la méthode (ex. "MTN Mobile Money").
- Sous-titre indigo "**Traitement en cours...**".
- Montant à nouveau affiché.
- Card "**Comment valider :**" avec 3 étapes numérotées : "1. Notification téléphone / 2. Code PIN / 3. Confirmer".
- Note "Cette page se met à jour automatiquement".
- Deux boutons : "**J'ai déjà payé**" (indigo, outline) et "**Annuler le paiement**" (rouge, outline).

**Si carte/PayPal :** WebBrowser in-app s'ouvre vers l'URL d'autorisation NotchPay/Stripe ; au retour, polling.

### 🧠 CE QUE JE COMPRENDS
- Le **status "ÉTAPE 3 / 3"** est satisfaisant — on sait où on est dans le parcours, et la fin est proche.
- Le badge "**SÉCURISÉ**" rassure même si générique.
- Le sélecteur de pays au début de la section méthodes est intelligent : ça permet à un visiteur depuis Lyon (CI) d'utiliser sa propre méthode locale.
- L'indicateur FX clarifie au payeur international que sa banque convertira → conforme à la stratégie "Event mono-devise".
- La validation du numéro MTN/Orange par regex (lignes 537-554) est précise : "67, 68, 77, 78 ou 650-654" → l'utilisateur sait pourquoi son numéro est rejeté.
- L'**idempotency key** (ligne 135-139) protège contre les doubles paiements — bon pattern.
- Le bouton "**J'ai déjà payé**" est précieux : si le polling fail mais que la transaction est OK, l'utilisateur peut forcer une vérification.

### 😊 RESSENTI UTILISATEUR
**Confiance maximale** : tous les bons signaux y sont — chiffrage, étape 3/3, badge sécurisé, instructions claires.
**Patience requise** : pendant le processing, le polling peut durer 36 × 5s = 3 minutes. C'est long mais l'écran est rassurant.
**Anxiété ponctuelle** : si le WebBrowser carte se ferme sans validation, je vois "Paiement interrompu" → bonne récupération.
**Frustration prévisible** : sur réseau instable, le polling peut échouer (`onMaxErrors`). Le message "Vérification interrompue" me laisse penser que mon paiement est dans les limbes.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Détection du pays par locale uniquement** (lignes 116-130) : `Intl.DateTimeFormat().resolvedOptions().locale` est rarement fiable sur Android. Beaucoup d'utilisateurs camerounais ont une locale `en-US` ou `fr-FR` par défaut → détection ratée.
2. **Fallback Cameroun silencieux** (ligne 425) : si l'API `getPaymentMethods` échoue, on retombe sur les méthodes Cameroun même si l'utilisateur est en Côte d'Ivoire. La méthode adéquate est masquée.
3. **Header "ÉTAPE 3 / 3"** ligne 845 : codé en dur. Si le parcours d'inscription gratuite n'a pas de paiement, ce "3 / 3" n'a pas de sens. Et pour un parcours billetterie standard, est-ce vraiment 3 étapes ? (sélection / form / paiement).
4. **`debug console.log`** ligne 505 reste dans le code même hors `__DEV__` — non, c'est gardé `if (__DEV__)`. OK.
5. **`paymentId!` non-null assertions** (ligne 260, 271, 292, 316) : si le paymentId disparaît, crash potentiel. Bon — protégé par les checks `if (paymentId)` un peu plus loin.
6. **Pas d'action "Sauvegarder ce numéro pour la prochaine fois"** explicite : `savePaymentMethodOnSuccess` se fait silencieusement à la réussite (ligne 231-240). L'utilisateur ne sait pas que son numéro est gardé → potentiel problème de privacy/RGPD.
7. **Numéro pré-rempli depuis le profil** (ligne 211-214) sans annonce : pareil que le formulaire dynamique → manque de transparence.
8. **Polling infini possible** : `maxAttempts: 36` × `pollInterval: 5000` = 3 min. Si la transaction est rapide, OK. Si NotchPay tarde, l'utilisateur attend longtemps avant `onTimeout`. Pas de progress bar visible.
9. **Bouton "Annuler le paiement"** : disponible pendant le processing même si la transaction est en train de réussir → l'utilisateur peut annuler par accident un paiement déjà validé. Le risque est mitigé par le fait que `cancelPayment` appelle l'API → mais quel est le comportement backend si le paiement a déjà été completé ? Pas clair.
10. **Mention "Sécurisé"** : vague. Pas de PCI-DSS, pas de mention "via NotchPay" ou "via Stripe". Manque de transparence sur le PSP.
11. **`alreadyPaidButton` toujours visible** ligne 985-1000 : même au début du processing, le bouton est là. Bon réflexe. Mais "J'ai déjà payé" alors que je viens de cliquer "Payer" et n'ai rien fait sur mon téléphone = confusion. Devrait être grisé tant que le user n'a pas eu le temps de répondre à la notif (e.g., 10s minimum).
12. **`PaymentIcons.bank.png` réutilisée** pour Wave/M-Pesa/Airtel/PayPal (lignes 68-71) : icônes génériques, pas de branding spécifique. Visuellement pauvre quand on est habitué aux logos officiels.
13. **`COUNTRY_TO_LOCALE`** incomplet : seuls 6 pays. Si l'utilisateur est sur un device en `pt-BR`, `ar-MA`, etc., détection ratée.
14. **Erreurs API sans détail utilisateur** : `extractErrorMessage` est correct mais "Une erreur est survenue lors du paiement" n'est pas actionnable. Que faire ? Réessayer ? Contacter ?
15. **Pas de "test de la connexion"** avant de lancer un paiement : si l'utilisateur est sur 2G instable, on pourrait afficher un avertissement "Connexion lente détectée — le paiement peut prendre plus de temps".

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Détection pays renforcée** : combiner locale + GeoIP backend (request à l'IP du téléphone) + dernier choix sauvegardé. Présenter un sélecteur visible si pas de certitude.
2. **Erreur API explicite** : si `getPaymentMethods` échoue, afficher un encart "Impossible de charger les méthodes de paiement — Réessayer" au lieu de retomber sur Cameroun.
3. **Step indicator dynamique** : "Sélection / Confirmation / Paiement" en label sous chaque barre, pas juste 3 barres. Et adapter selon parcours (free → 2 étapes).
4. **Annonce "Numéro sauvegardé"** : après un paiement Mobile Money réussi, toast "✓ Numéro sauvegardé pour tes prochains achats — désactive depuis Paramètres".
5. **Pré-remplissage transparent** : sous le champ téléphone, mention "Pré-rempli depuis ton profil — modifie si besoin".
6. **Progress bar pour polling** : barre fine en haut de la page processing qui se remplit au fur et à mesure des tentatives, ou compteur "Tentative 4/36 — vérification en cours".
7. **Confirmation de l'annulation** : lors du tap "Annuler le paiement", `showConfirm` "Es-tu sûr ? Si tu as déjà confirmé sur ton téléphone, ton paiement pourrait être validé après cette annulation."
8. **Mention PSP** : sous le badge "Sécurisé", ajouter "via NotchPay" ou "Stripe" en très petit. Transparence et trust.
9. **Délai minimum avant "J'ai déjà payé"** : disabled les 15 premières secondes, ou garder visible mais grisé avec timer "Disponible dans 12s".
10. **Vraies icônes payment** : MTN, Orange, Wave, M-Pesa, Airtel ont des logos officiels libres d'usage. À mettre dans `assets/payments/`.
11. **Erreur actionnable** : "Échec du paiement — Vérifie ta connexion et réessaye" + bouton "Réessayer" ou "Voir l'historique". Pas juste "Une erreur est survenue".
12. **Détection 2G/3G** : `NetInfo.fetch()` au mount, si effectiveConnectionType = '2g' → mini-bandeau d'avertissement.

---

## ÉTAPE 6 — PaymentSuccessScreen (confirmation)

### 🖱 ACTION EFFECTUÉE
Le polling termine avec succès. `navigation.replace('PaymentSuccess', {...})`. Je vois immédiatement l'écran de réussite. J'écoute le son de confirmation, je regarde les confettis tomber, puis je tape "Voir mes billets".

### 👁 CE QUE JE VOIS
- Toile éditoriale, filigrane "**OK!**" en arrière-plan.
- Confettis qui tombent en plein écran (`ConfettiEffect`).
- Au centre, un grand cercle vert avec une coche blanche (gradient `#10B981` → `#059669`), animé en spring.
- Anneau extérieur qui pulse (scale 1 → 1.4 en boucle, 1.8s) avec opacité diminuante.
- Eyebrow vert "**PAIEMENT VALIDÉ**", titre extra-bold "**Paiement réussi !**" 34px.
- Sous-titre "Votre paiement a été effectué avec succès. / Vous recevrez un email de confirmation."
- Deux cards d'info :
  - **BILLETS / Vos billets** — "Retrouvez vos billets dans 'Mes Billets'".
  - **ENTRÉE / QR Code** — "Présentez votre QR code à l'entrée".
- Son `payment-success` joué via `useSoundEffect` (respecte les préférences).
- En bas, deux boutons :
  - Pilule indigo gradient large : eyebrow blanc "**PROCHAINE ÉTAPE**" + label "**Voir mes billets**" + flèche dans un disque blanc 44x44.
  - Pilule grise secondaire : icône maison + "Retour à l'accueil".

### 🧠 CE QUE JE COMPRENDS
- L'écran se calibre selon le contexte : `inscription pending_approval` → version "WAIT" jaune avec "Inscription soumise" + étapes "01 En attente / 02 Notification". `confirmé` → version verte. **Très bonne contextualisation.**
- Le contraste entre l'icône large animée + confettis + son donne une **vraie célébration** — moment de plaisir utilisateur réussi.
- Le label "PROCHAINE ÉTAPE" sur le CTA principal **orchestre** le parcours : on me dit que ce n'est pas la fin.

### 😊 RESSENTI UTILISATEUR
**Joie** : la combinaison confettis + son + animation icône = vrai pic émotionnel. Le moment de la confirmation est traité comme important.
**Confiance** : "Vous recevrez un email de confirmation" rassure même si l'email tarde à arriver.
**Curiosité** : envie d'aller voir le QR code, l'animation me donne envie de tap.
**Petite frustration possible** : pas d'option "Partager" ou "Inviter un ami à venir" → moment idéal pour de la viralité.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Pas de récapitulatif visible** : on ne voit pas combien on a payé, pour quel événement, ni la date. Si l'utilisateur a payé pour un autre event juste avant, doute possible.
2. **Pas d'option "Partager / Inviter un ami"** : moment haute valeur émotionnelle perdu pour de la viralité.
3. **`navigation.replace`** : empêche le retour en arrière (volontaire, OK), mais bloque aussi le partage par historique.
4. **Confettis sur Android peut être gourmand** sur les anciens devices → vérifier perfs.
5. **Son joué automatiquement** : sans bouton mute visible. Si l'utilisateur est en réunion, gênant — `useSoundEffect` respecte une pref globale, mais aucune indication ici.
6. **Animation `ringScale.value -1 / 0.4`** ligne 96 : la formule d'opacité peut donner des valeurs négatives (entre 1.4 et infini). À vérifier qu'il n'y a pas de glitch visuel à la fin du cycle.
7. **Pas de "Quoi maintenant"** détaillé : combien de temps avant l'event ? Comment se rendre sur place ? Le CTA "Voir mes billets" est bon mais on pourrait pousser plus loin.
8. **Email de confirmation promis** : l'utilisateur va probablement vérifier sa boîte mail dans la minute. Si l'email tarde 5 min, anxiété.
9. **Boutons fixes en bas** mais pas de safe area mentionnée (`paddingBottom: Spacing.xl` ligne 370) — sur iPhone avec home bar, peut être trop près du bord.
10. **Le watermark "OK!"** est joyeux mais informel → ne reflète pas la gravité d'une transaction financière. Choix de ton à valider.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Ajouter un mini-récap** sous le titre : "Tu as payé X FCFA pour [Événement] · 25 mai 2026" — preuve immédiate, pas besoin d'aller dans les billets.
2. **Bouton "Partager mon excitation"** discret en troisième CTA : "Inviter un ami" → ouvre le partage avec un lien deep-link `/events/[id]?ref=user_xxx`.
3. **Countdown dynamique** : "**Plus que 28 jours**" → ancrage temporel qui crée de l'attente.
4. **Lien "Email envoyé à votre@email.com"** : transparence + bouton "Renvoyer" si pas reçu.
5. **Safe area bottom** : utiliser `useSafeAreaInsets()` pour le paddingBottom des boutons.
6. **Mute toggle** ou indicateur visuel "🔊 Son activé — désactive depuis Paramètres".
7. **Bouton "Ajouter à mon calendrier"** : quoi de plus utile que d'enregistrer la date directement après l'achat ?
8. **Confettis plus discrets sur Android < 10** : version dégradée pour les vieux devices.

---

## ÉTAPE 7 — MyTicketsScreen (portefeuille de billets)

### 🖱 ACTION EFFECTUÉE
Je tape "Voir mes billets" depuis l'écran de succès. J'arrive sur l'onglet `MyTickets` de la bottom tab. Je vois ma nouvelle inscription en haut, je tape dessus pour ouvrir le détail (RegistrationDetails).

### 👁 CE QUE JE VOIS
- Toile éditoriale, filigrane "**TIX**".
- Header tile : eyebrow corail "**BILLETTERIE**" + titre extra-bold "**Mes Billets**" + boutons ronds Recherche + Filtres (avec point corail si filtres actifs).
- Onglets chips horizontaux : **À venir** (n) | **Passés** (n) | **Annulés** (n).
- Liste verticale de cards "**ticket stub**" :
  - **Rail vertical coloré** à gauche (indigo pour billetterie, violet pour inscription, jaune si pending).
  - Section principale : pilule type "**🎫 BILLET**" ou "**📄 INSCRIPTION**" + catégorie en eyebrow + titre événement (display extra-bold) + chip date/heure + chip lieu.
  - **Countdown ring SVG** à droite si l'événement est dans 14 jours (cercle qui se remplit selon le compte à rebours, avec "J-N" au centre). Sinon, **tuile date** classique.
  - **Perforation pointillée verticale** au milieu (avec encoches blanches en haut/bas).
  - Section stub à droite (fond teinté de la couleur du type) : label "**TIX**" ou "**PASS**" en haut + **fake QR pattern** 7x7 (pour billet) ou icône document (pour inscription) + badge quantité "×2" + **shimmer band** statut animé en bas.
- Cards qui se **chevauchent légèrement** en stack (effet pile de tickets) : `marginTop: -Spacing.xl - 20` pour les non-premiers.
- État vide : illustration + titre + bouton CTA "Explorer les événements".
- Pull-to-refresh.

### 🧠 CE QUE JE COMPRENDS
- C'est l'écran le plus **artistique** de l'audit. Le design boarding-pass est complet : rail coloré, pilule type, perforation, stub, QR pattern, shimmer band sur le statut.
- Le **countdown ring** sur le premier ticket est un excellent ancrage temporel — incite à revenir.
- Le QR est un **placeholder déterministe** (lignes 281-291) — à priori le vrai QR est dans `RegistrationDetails`. À vérifier qu'il n'y a pas confusion.
- Les chevauchements entre cards créent une vraie sensation de "pile" — joli touche tactile.
- L'état "Annulés" reste filtrable mais n'est pas mis en avant — bon choix.

### 😊 RESSENTI UTILISATEUR
**Fierté** : "j'ai un billet, et il est beau". Le design renforce le sentiment de propriété.
**Confiance** : voir le ticket sous forme physique (avec QR, perforations) ancre psychologiquement la possession.
**Curiosité bénéfique** : le shimmer band qui anime le statut "CONFIRMÉ" attire l'œil sans être agressif.
**Risque de confusion** : le **fake QR** sur l'écran liste peut faire croire que c'est le vrai. Si l'utilisateur tente de le scanner en pensant que c'est valide → impossible.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Fake QR pattern sur la liste** (lignes 281-336) : un agent de sécurité confus ou un utilisateur peut tenter de présenter ce QR à l'entrée. C'est un vrai risque sécurité.
2. **Chevauchement de cards** (`marginTop: -Spacing.xl - 20`) : si la première card est petite et la deuxième a beaucoup de contenu, problème de hit-area possible (taps sur la zone chevauchée).
3. **Pas de tri visible par défaut** : `sortBy: 'event_date'` (ligne 95) mais l'utilisateur ne sait pas comment c'est trié.
4. **Beaucoup d'icônes** : type pill, calendrier, location, ticket badge, status shimmer, countdown ring → richesse visuelle élevée. Sur un petit écran (< 5"), peut paraître saturé.
5. **State `searchOpen`** : au tap recherche, ouvre un `TextInput` — mais où ? Visible plus loin dans le code. À vérifier qu'il y a un blocage UX si filtres actifs + search en même temps.
6. **`activeFilterCount`** : compte simplement les filtres ≠ "all" (ligne 606-613). Si l'utilisateur a 4 filtres = un point sur l'icône, mais pas de visibilité du *nombre*. Souvent les apps montrent "Filtres (3)".
7. **Overlap zIndex** ligne 659 : `100 - index` pour que les premiers passent au-dessus. Si > 100 tickets, comportement indéfini — peu probable mais sale.
8. **Pas de sectionnement par mois** : si j'ai 50 billets, défilement long sans repère. Sectionner par "Mai 2026", "Juin 2026" serait utile.
9. **Pas d'infinite scroll** apparent : tous les tickets sont chargés en une seule requête (probablement paginated côté backend mais ici tout dans `registrations`).
10. **Pas d'export par card** : `ExportButton` est importé (ligne 24) mais où est-il utilisé ? Sûrement pour l'ensemble.
11. **`getDaysUntil`** retourne sûrement null si pas de date → countdown n'apparaît pas, on tombe sur date tile. Bon fallback.
12. **Statut "Pending payment"** affiche "Attente paiement" (ligne 800) mais aucun CTA "Finaliser" → l'utilisateur doit ouvrir le ticket. Bouton inline serait pratique.
13. **Onglets "Annulés"** : si vide, l'utilisateur découvre l'illustration `Empty`. Pas de blocage.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Retirer le fake QR** ou le **flouter avec un overlay "Tap pour voir le QR"** : éviter toute confusion. Le QR fonctionnel ne doit exister QUE dans la page détail.
2. **Sectionnement par mois** au-delà de 10 tickets.
3. **Compteur de filtres actifs** : "Filtres (3)" au lieu d'un point.
4. **CTA inline "Payer"** sur les cards en attente de paiement (button compact dans le stub à la place du QR).
5. **Indicateur de tri** : sous l'onglet, mention "Trié par : Date d'événement ▾" cliquable.
6. **Optimiser la perception sur petit écran** : sur device < 5", masquer la pilule catégorie (eyebrow text uniquement).
7. **Stack visuelle réduite** : `marginTop: -10` au lieu de `-32-20=-52` — moins de chevauchement, plus lisible.
8. **Header sticky** : sur scroll long, garder la barre d'onglets visible pour switcher entre À venir/Passés.
9. **Pull-to-refresh communique** : ajouter un mini-message "Mis à jour il y a X minutes" sous le header.

---

# 🏁 RAPPORT FINAL

## Note globale UX : **7.5 / 10**

EventEz Mobile sur ce parcours de référence est un produit **clairement au-dessus de la moyenne** — design soigné, hiérarchie maîtrisée, identité éditoriale forte et originale. Les frictions identifiées sont essentiellement des **détails de finition et d'instrumentation** (états vides, transparence, libellés trompeurs) plutôt que des défauts structurels. La logique métier (idempotency key, polling de paiement, mono-devise, soft-reservation, autoprefill) est solide. Le ressenti général est positif, mais la conversion **invité → premier achat** souffre d'une friction d'auth mal contextualisée et d'un peu trop de richesse visuelle sur certains écrans.

---

## 🟢 3 POINTS FORTS

### 1. Identité visuelle éditoriale rare et assumée
La toile crème (`#F6F6F9`), les filigranes de mots ("EZ", "BUY", "PAY", "OK!", "TIX"), la typographie display extra-bold avec letter-spacing négatif, les eyebrows en bold uppercase letter-spaced, les pilules `EditorialPillCTA`, les boarding-pass cards avec perforations dashed et encoches → cet ensemble forme un **vocabulaire visuel cohérent et reconnaissable**, très rare sur des apps de billetterie qui se ressemblent toutes (Eventbrite, Yurplan, Weezevent…). C'est un avantage concurrentiel.

### 2. Robustesse technique du paiement
L'idempotency key (`generateIdempotencyKey`), le polling progressif (`maxConsecutiveErrors: 10`, `progressiveBackoff: true`), les fallbacks "J'ai déjà payé" / "Vérifier le statut" / "Annuler", la stratégie mono-devise (`Event.currency` verrouillée + `FXIndicator` purement informatif), le pré-remplissage du téléphone et l'auto-save du moyen de paiement → tout ça est du **plumbing pro qui couvre les cas réels** (réseau instable, double tap, NotchPay lent). C'est rare à ce niveau de polish dans les apps mobiles africaines.

### 3. Moment de célébration du paiement
L'écran `PaymentSuccess` réussi : confettis + son `payment-success` + animation spring de l'icône + ring qui pulse + watermark "OK!" + label "PROCHAINE ÉTAPE". C'est un **vrai pic émotionnel** orchestré, pas juste une checkmark verte plate. La déclinaison contextuelle (inscription pending vs confirmé vs paiement) prouve l'attention au détail.

---

## 🔴 3 POINTS FAIBLES PRIORITAIRES À CORRIGER

### 1. Friction critique au moment de l'auth-guard (Étape 3)
Quand l'invité tape "Acheter des billets", il est éjecté vers `LoginScreen` **sans contexte**, avec un sous-titre générique "Connecte-toi pour découvrir les meilleurs événements". Le retour sur EventDetails l'oblige à re-cliquer le CTA. C'est le **moment le plus à risque de drop-off** du tunnel. Action prioritaire :
- Bandeau de contexte "🎫 Connecte-toi pour réserver tes billets pour [Nom de l'événement]"
- Sous-titre dynamique
- Redirection automatique vers `TicketPurchase` après login (passer `returnTo` dans les params)
- Onglets email/téléphone visibles d'emblée (pas un lien texte caché)
- **Optionnel mais fort :** "Continuer en invité" pour les events gratuits

### 2. Confusion sur le QR fake (Étape 7)
Sur `MyTicketsScreen`, chaque card de billet affiche un **QR code factice** (pattern 7x7 déterministe). Risque réel : un utilisateur ou un agent de sécurité peut tenter de scanner ce QR. C'est un **risque de sécurité d'image** (perte de confiance si quelqu'un raconte avoir été refusé à l'entrée parce qu'il a montré ce QR). Action :
- Soit le retirer et utiliser une icône `qr-code-outline` neutre
- Soit l'estomper avec un overlay "**Voir le QR**" cliquable
- Le vrai QR ne doit exister QUE dans `RegistrationDetails` ou `QRCodeScreen`

### 3. Erreurs silencieuses et états vides absents (Étape 1, 2, 5)
Plusieurs écrans (Discover, EventDetails, Payment) ont des `.catch(err => __DEV__ && console.error())` partout. Si l'API tombe, l'utilisateur voit des sections vides ou un fallback Cameroun sans aucune explication. Aucun toast, aucun bandeau, aucun retry visible. Action :
- Remplacer les `__DEV__ && console.error` par un toast/bandeau utilisateur si > 1 fetch échoue
- Empty state honnête sur Discover ("Aucun événement disponible — Reviens bientôt")
- Ne jamais retomber silencieusement sur un fallback géographiquement faux (méthodes de paiement)

---

## 🎯 RECOMMANDATION GÉNÉRALE

EventEz Mobile est **prêt à shipper en production sur le golden path** — le tunnel d'achat fonctionne, est joli, et le code est instrumenté pour les cas réels. Les **3 corrections prioritaires** ci-dessus sont du polish à faible coût (1-2 jours dev chacune) et auraient un **fort impact sur la conversion invité→acheteur** (auth-guard contextualisée) et sur la **confiance produit** (QR fake, erreurs silencieuses). En parallèle, prévoir un **chantier de "cosmétique honnête"** pour câbler les fonctionnalités qui *ressemblent* à des features mais n'en sont pas (bookmark icons sans onPress sur Discover, "Suivre" qui contacte, "Qui y va ?" avec avatars gris). La crédibilité produit dépend de l'élimination de ces faux affordances.

> **Verdict** : un produit avec une vraie patte, qui mérite mieux que ses petits défauts de finition. Avec 1 sprint focus UX, on passe à 8.5/10.

---

## 📊 RÉSUMÉ DES PROBLÈMES PAR SÉVÉRITÉ

| Sévérité | Étape | Problème |
|---|---|---|
| 🔴 Critique | 3 | Login sans contexte, drop-off probable |
| 🔴 Critique | 7 | Fake QR confondable avec un vrai |
| 🔴 Critique | 5 | Méthodes de paiement fallback Cameroun silencieux |
| 🟠 Élevé | 1 | "DOUALA" hardcoded dans l'eyebrow Discover |
| 🟠 Élevé | 2 | "Suivre" l'organizer ouvre une conversation (label trompeur) |
| 🟠 Élevé | 4 | "(estimation)" sur le code promo, ref de commande fausse |
| 🟠 Élevé | 1, 2, 5 | Erreurs API silencieuses, états vides absents |
| 🟡 Moyen | 1 | Bookmarks décoratifs non câblés |
| 🟡 Moyen | 2 | "Qui y va ?" avec avatars gris génériques |
| 🟡 Moyen | 3 | "Se souvenir de moi" coché par défaut |
| 🟡 Moyen | 5 | Pas de progress bar sur le polling 3min |
| 🟡 Moyen | 6 | Pas de mini-récap (montant, event) sur l'écran de succès |
| 🟢 Mineur | 1 | Animation cascade trop longue au mount |
| 🟢 Mineur | 1, 5 | Code mort (style `headerDot`, etc.) |
| 🟢 Mineur | Tous | Mélange tutoiement/vouvoiement à harmoniser |
| 🟢 Mineur | 7 | Pas de sectionnement par mois pour > 10 tickets |

---

*Audit réalisé par lecture de code — 2026-04-28. Pour valider sur device réel : lancer `npm start`, scanner avec Expo Go, et reproduire le parcours.*

