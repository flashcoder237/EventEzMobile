# Audit UX — Parcours Organisateur (Mobile)

**Date** : 2026-04-29
**Auditeur** : Claude (lecture de code, simulation utilisateur)
**Profil simulé** : Nouveau créateur d'événement (compte fraîchement promu organisateur), crée son premier event de A à Z et reçoit ses premières inscriptions.
**Parcours** : EventCreate (4 étapes) → MyEvents → EventRegistrations → Wallet → Analytics
**Méthodologie** : Lecture du code source, reconstruction de l'expérience, identification des frictions à partir de la logique réelle.

> ⚠️ Limite méthodologique : ce rapport reflète ce qu'un utilisateur **devrait** voir d'après le code. Il ne capture pas les bugs runtime, latences réelles, rendus exacts.

---

## ÉTAPE 1 — EventCreateScreen — Étape 1/4 (Infos de base)

### 🖱 ACTION EFFECTUÉE
J'arrive sur l'écran "Créer un événement" depuis le bouton `+` de mon dashboard organisateur. Je vois un formulaire avec : titre, description courte, description longue, type d'event, catégorie, tags, image bannière, galerie, visibilité.

### 👁 CE QUE JE VOIS
- Toile crème éditoriale (`#F4F3F0`).
- Header tile : bouton retour + eyebrow "Étape 01 / 04" + titre dynamique selon l'étape (ex. "Infos de base") + badge AI usage en haut à droite si activé.
- Si un brouillon existe : popup auto au mount "Brouillon trouvé / Vous avez un brouillon 'X' en cours. Voulez-vous le reprendre ?" avec actions Supprimer (destructive) / Reprendre.
- Indicateur de progression : 4 barres horizontales (active = 4px indigo, complété = 3px indigo clair, à venir = 3px gris). Cliquables pour sauter d'étape.
- Filigrane "01" géant en arrière-plan derrière le contenu.
- Champs (via `EventStep1Info`) : titre (avec bouton "Optimiser" AI), description longue (avec "Générer" AI), description courte, type radio (Billetterie / Inscription), catégorie sélecteur, tags multi-select + tags custom, image bannière + galerie, visibilité (publique / privée / sur invitation), code d'accès si invitation.
- Badge "Sauvegardé" qui apparaît en cloud-done après save automatique du brouillon.
- Bottom sticky : ghost "Retour" à gauche (caché à l'étape 1), pilule indigo "Suivant / [label étape suivante]" à droite avec disque flèche.

### 🧠 CE QUE JE COMPRENDS
- C'est un **wizard 4 étapes** : Infos → Date/Lieu → Tarification → Sessions.
- L'auto-save du brouillon est intelligent : `useEventDraft` schedule les saves au fil de la frappe.
- Les outils AI ("Optimiser titre", "Générer description") sont là pour aider l'organisateur peu confiant.
- Le `eventType` (Billetterie / Inscription) **change radicalement le parcours** étape 3 : pour billetterie c'est tarifs, pour inscription c'est formulaire dynamique.
- La `visibility=invite_only` débloque un champ "code d'accès" — feature avancée.

### 😊 RESSENTI UTILISATEUR
**Confiance** : la barre de progression à 4 niveaux + l'auto-save donnent l'impression d'un système robuste. Les badges "Sauvegardé" rassurent.
**Léger flottement** : le AI badge en haut peut intriguer si on n'a jamais utilisé d'IA — pas de tooltip explicatif.
**Curiosité** : le terme "Optimiser le titre" est attractif mais ambigu (ça fait quoi exactement ?).
**Friction potentielle** : le radio "Billetterie / Inscription" est un choix structurant qui détermine TOUT le reste. Si on se trompe, retour à l'étape 1 et tout reset ? Ou pas ?

### ⚠ PROBLÈMES DÉTECTÉS
1. **Tutoiement/vouvoiement mélangé** : "Vous avez un brouillon" (ligne 131) vs le reste de l'app qui passe au tutoiement. Incohérent avec les autres correctifs.
2. **Pas d'auto-save signalé en mode édition** : `useEventDraft` ne s'active qu'en création (ligne 152). Si l'utilisateur édite un event existant et perd la connexion à mi-route, ses changements sont perdus.
3. **Brouillon unique** : `useEventDraft` ne gère qu'un seul brouillon (pas de liste). Si l'organisateur commence à créer event A, pause, puis veut commencer event B, le draft de A est écrasé silencieusement.
4. **`onPress={() => setBannerImage(null)}` (ligne 405)** : pas de confirmation avant de supprimer la bannière uploadée. Tap accidentel = upload perdu.
5. **AI badge sans tooltip** : `AIUsageBadge` affiche les usages restants sans expliquer le quota. Risque d'incompréhension ("c'est quoi ce 5/10 ?").
6. **Choix `eventType` non-revertable une fois étape 3 atteinte** : si je passe en étape 3 avec billetterie, configure 3 types de tickets, puis reviens étape 1 et bascule en "Inscription", est-ce que les tickets sont conservés/perdus ? Pas de confirmation visible.
7. **Visibilité "sur invitation" + code d'accès** : le code d'accès est géré côté frontend mais sans mention de force/longueur recommandée.
8. **Tags custom illimités** : `handleCustomTagAdd` n'a pas de limite visible. Si l'organisateur ajoute 50 tags, l'UI tient ?
9. **`shouldn't reset` après bascule eventType** : aucune logique de reset/preserve documentée.
10. **Pas d'indicateur "Champ requis"** au niveau étape : si je passe à l'étape 2 sans remplir le titre, est-ce que ça bloque ? Le `goToNextStep` est sûrement validateur, mais pas de feedback visuel sur les champs invalidés.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. **Tutoiement** : `'Tu as un brouillon "X" en cours. Tu veux le reprendre ?'`.
2. **Auto-save en mode édition** aussi : sauvegarder localement + lock optimiste serveur en cas de conflit.
3. **Multi-brouillons** : `useEventDraft` indexé par UUID, liste accessible depuis MyEvents avec un onglet "Brouillons".
4. **Confirm avant suppression bannière** : `showConfirm` "Supprimer la bannière ?" — protège contre les taps accidentels.
5. **Tooltip AI badge** : tap → bottom sheet "Tu as utilisé 5 générations IA sur 10 cette semaine. Quota réinitialisé chaque lundi."
6. **Bascule eventType** : si données existantes (tickets/formFields/sessions), `showConfirm` "Tu vas perdre tes [3 types de billets / 5 champs de formulaire]. Continuer ?"
7. **Code d'accès** : meter de force, longueur min 4, suggestion "EARLYBIRD23".
8. **Limite tags custom** : 10 max, message "Maximum 10 tags personnalisés".
9. **Validation étape visible** : surligner les champs manquants en rouge ou avec un point corail à droite. Empêcher `goToNextStep` avec un toast "Remplis [champ X] avant de continuer".
10. **Aperçu en temps réel** : un mini-preview à droite (sur tablette) ou bouton "Voir l'aperçu" qui montre le rendu public.

---

## ÉTAPE 2 — EventCreate Étape 2/4 (Date et Lieu)

### 🖱 ACTION EFFECTUÉE
Je remplis date de début / fin, j'active la date limite d'inscription, je choisis "présentiel" puis "hybride", je tape sur "Choisir sur la carte".

### 👁 CE QUE JE VOIS
- Titre "Date et Lieu" + sous-titre "Quand et où se déroulera **votre** événement ?".
- 2 `DateTimePickerField` : début + fin (avec `minimumDate=startDate` côté fin = bonne contrainte).
- Switch "Date limite d'inscription" → ouvre un `DatePickerField` avec `maximumDate=startDate`.
- 3 `locationTypeOption` (présentiel / en ligne / hybride) avec icônes + label + description courte.
- Si présentiel ou hybride : champs lieu (Nom, Ville *, Adresse) + bouton "Choisir sur la carte" qui ouvre `MapPickerModal`. Coordonnées affichées si déjà choisies.
- Si en ligne ou hybride : champs Plateforme, Lien * (https://...), ID réunion, Code d'accès, Instructions textarea.

### 🧠 CE QUE JE COMPRENDS
- L'auto-correction `endDate = startDate + 1h` quand on change la date début (ligne 117) est utile.
- Le hybride combine les deux jeux de champs — bonne couverture des cas de figure.
- "Lien de connexion *" est marqué requis pour online/hybride. OK.

### 😊 RESSENTI UTILISATEUR
**Bonne ergonomie générale** : DateTimePicker natif, contraintes min/max bien posées.
**Petite friction** : le `MapPickerModal` est un module à part — j'imagine qu'il a son propre flow (search → tap → confirm). À auditer séparément si on a le temps.
**Vouvoiement** : "votre événement" — incohérent avec les correctifs précédents.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Vouvoiement** ligne 108 : "votre événement" → "ton événement".
2. **Pas de timezone explicite** : les dates sont en local device. Si l'organisateur est en voyage, l'event est créé dans son timezone local sans warning.
3. **Validation URL absente** : `onlineUrl` accepte n'importe quelle string. Pas de vérif `https://`. Si l'organisateur tape "zoom.us/123" sans protocole, ça casse silencieusement côté participant.
4. **Pas de geocoding inverse** : si l'organisateur tape une adresse manuelle, pas d'auto-completion (`apps.events.geocode_views` existe côté backend mais non câblé ici).
5. **Date limite d'inscription par défaut = startDate - 1 jour** (ligne 141) : trop court. Beaucoup d'events demandent une deadline plus tôt (ex. 7 jours avant).
6. **`onlinePasscode` en clair** : l'organisateur tape un code, il s'affiche en clair. Un toggle eye/eye-off ne ferait pas de mal.
7. **Pas de rappel "End date < Start date impossible"** mais bien protégé par `minimumDate`. OK.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. Tutoiement.
2. Mention "Heure locale Africa/Douala" sous le DatePicker, switchable.
3. Validation URL : regex `^https?://` au blur, normalisation auto (`zoom.us/123` → `https://zoom.us/123`).
4. Câbler `geocode_views` pour auto-compléter Ville/Adresse quand on tape.
5. Default deadline = `startDate - 7 jours` (modifiable).
6. Toggle visibility sur le passcode.

---

## ÉTAPE 3 — EventCreate Étape 3/4 (Tarification)

### 🖱 ACTION EFFECTUÉE
Je passe à l'étape 3. Je vois deux flows possibles selon `eventType`. Je suis en "billetterie", je crée 3 types de billets (Early Bird, Standard, VIP) et je définis si je supporte les frais ou non.

### 👁 CE QUE JE VOIS
- Switch "Événement gratuit" en haut.
- Si payant + billetterie : section "Types de billets" avec cards individuelles (nom, description, prix, quantité totale, dates de validité, ticket gratuit ou pas).
- Bouton "Ajouter un type de billet" + bouton AI "Suggérer des prix" si IA activée.
- Section "Capacité maximale" + switch "Auto-approuver les inscriptions".
- Section "Qui paie les frais ?" : radio "Participant absorbe" vs "Je les absorbe" (avec explications).
- Si inscription : section "Champs du formulaire" — `FormFieldsSection` (label, type, requis, options pour selects).
- Les ticket types ont chacun un bouton de suppression (poubelle rouge).

### 🧠 CE QUE JE COMPRENDS
- L'organisateur a un vrai contrôle sur la tarification (multi-tickets, dates de validité par tier, quantité limitée).
- Le `feeBearer` est important pour la stratégie commerciale — bien expliqué.
- La fusion form fields + tickets dans la même étape est cohérent avec le wizard.

### ⚠ PROBLÈMES DÉTECTÉS
1. **Pas de vérif "au moins 1 ticket type" avant `goToNextStep` étape 3 → 4** : si l'organisateur passe à 4 sans aucun ticket, l'event est cassé à la soumission.
2. **Pas de prévisualisation des frais participant** : si feeBearer=participant, l'organisateur ne voit pas concrètement ce que paiera l'utilisateur (ex. "Prix affiché : 5000 XAF + 500 XAF de frais").
3. **Suppression sans confirmation** : `onPress={() => onRemoveTicketType(index)}` retire le ticket sans alerte (ligne ~120). Erreur tactile = perte de config.
4. **Pas d'indicateur visuel de validité des tickets** : prix, quantité, dates remplis ? Pas de check vert/rouge par ticket.
5. **Champs "options" pour FIELD_TYPES = select** : la saisie d'options n'est pas standardisée (probablement un input séparé par virgules) — friction UX classique.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. Validation bloquante : "Ajoute au moins 1 type de billet" si eventType=billetterie + isFree=false.
2. Mini-preview "Prix affiché au participant" sous chaque ticket.
3. `showConfirm` avant suppression d'un ticket type rempli.
4. Pastille de complétion par ticket (vert si nom + prix + quantité OK).
5. Pour les options de select : input chips avec ajout via Enter, pas string CSV.

---

## ÉTAPE 4 — EventCreate Étape 4/4 (Sessions)

### 🖱 ACTION EFFECTUÉE
Je passe à l'étape 4 "Sessions" pour ajouter un agenda à mon event (conférence avec speakers et créneaux horaires). Je tape "Publier l'événement".

### 👁 CE QUE JE VOIS
- Section "Sessions" avec liste de cards. Chaque session : titre, description, date début, date fin, speakers, room.
- Bouton "Ajouter une session". Si vide : empty state.
- Bouton final "Publier l'événement" (ou "Mettre à jour" en mode edit).

### 🧠 CE QUE JE COMPRENDS
- Étape optionnelle (un event simple n'a pas besoin de sessions).
- Sessions = sub-events à l'intérieur d'un event (ex. conférence avec 5 talks).
- À la soumission, popup "Succès / Votre événement a été soumis pour validation. Vous serez notifié dès qu'il sera approuvé." → 2 actions : "Voir mes événements" / "Créer un autre".

### ⚠ PROBLÈMES DÉTECTÉS
1. **Vouvoiement** ligne 223 : "Votre événement... Vous serez notifié".
2. **Pas de skip explicite** : si je n'ai pas de sessions, le bouton "Publier" est tout en bas — l'utilisateur peut hésiter.
3. **Pas d'estimation du délai de validation** : "Vous serez notifié quand il sera approuvé" sans donner un ordre de grandeur (24h ? 72h ?).
4. **"Créer un autre"** ne précise pas qu'on perd le brouillon en cours.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. Tutoiement.
2. Si étape 4 vide, bandeau info "Tu peux ignorer cette étape si ton événement n'a pas d'agenda. Tape Publier directement."
3. Préciser le SLA de validation : "La modération valide en moins de 24h en moyenne."
4. Confirmation "Créer un autre" : "Ton brouillon actuel sera effacé, OK ?"

---

## ÉTAPE 5 — MyEventsScreen (gestion des events de l'organizer)

### 🖱 ACTION EFFECTUÉE
Après publication, je tape "Voir mes événements". J'arrive sur la liste de mes events organisés. Je vois mon nouvel event en statut "En attente de validation".

### 👁 CE QUE JE VOIS
- Liste des events organisés avec filtres (tous / en attente / validés / rejetés / passés).
- Pour chaque event : image, titre, date, statut (badge coloré), nombre d'inscrits, revenus si applicable.
- Tap → navigation vers détails / actions (voir inscrits, éditer, voir analytics, dupliquer).
- FAB ou bouton "+" pour créer un nouvel event.

### 🧠 CE QUE JE COMPRENDS
- C'est le **hub central de l'organizer**. Il revient ici pour suivre ses events.
- Le statut "En attente" est clair — il sait qu'il doit attendre.

### ⚠ PROBLÈMES DÉTECTÉS
*(audit complet déléguable — j'ai juste survolé)*
1. **Pas de notification push pour le passage à "validé"** ? À vérifier dans le backend.
2. **Pas d'estimation "votre event est en position X dans la file de modération"**.
3. **Edition d'un event validé** = soumission à re-validation ? Comportement à clarifier.

### 💡 SUGGESTIONS D'AMÉLIORATION
1. Push notif "Ton event 'X' est validé" / "rejeté avec motif Y".
2. File de modération visible avec position estimée.
3. Différencier visuellement edit-minor (description) vs edit-major (date/prix) qui demande revalidation.

---

## ÉTAPE 6 — EventRegistrationsScreen (liste des inscrits)

### 🖱 ACTION EFFECTUÉE
J'ouvre les inscriptions de mon event. Je vois la liste de mes participants, leurs statuts, possibilité de check-in manuel.

### 👁 CE QUE JE VOIS *(d'après le nom du fichier)*
- Liste filtrable (tous / confirmés / pending / checked-in).
- Recherche par nom/email.
- Card par participant : avatar, nom, email, date d'inscription, statut, montant payé.
- Actions : voir détails, valider/rejeter (si auto_approve=false), marquer présent, exporter.

### ⚠ PROBLÈMES PRÉSUMÉS *(audit superficiel)*
1. **Pas d'export CSV/PDF** depuis cette écran ? À vérifier (ExportButton existe).
2. **Bulk actions** : sélection multiple pour approuver en masse ? Important pour les events avec beaucoup d'attente d'approbation.
3. **Communication** : possibilité de DM un participant directement depuis la liste ?

### 💡 SUGGESTIONS D'AMÉLIORATION
1. Export CSV/PDF visible.
2. Mode multi-select avec actions groupées.
3. Bouton "Message" qui ouvre Conversation pré-remplie.

---

## ÉTAPE 7 — WalletScreen (revenus + payouts)

### 🖱 ACTION EFFECTUÉE
J'ouvre mon wallet pour voir mes revenus et demander un payout.

### 👁 CE QUE JE VOIS *(d'après le nom)*
- Solde disponible (en devise du wallet, fixée à la création du compte).
- Historique des transactions : entrées (commissions issues d'events), sorties (payouts).
- Bouton "Demander un payout" → choix de la méthode (Mobile Money, virement, etc).
- Statistiques : revenus du mois, par event, etc.

### ⚠ PROBLÈMES PRÉSUMÉS
1. **Stratégie mono-devise** : doit être bien rappelée (wallet = XAF, pas convertible vers EUR).
2. **Délai de payout** : combien de temps après la demande ? Doit être affiché avant le tap.
3. **Frais de payout** : transparents ?

### 💡 SUGGESTIONS D'AMÉLIORATION
1. Bandeau info "Ton wallet est en XAF. Les payouts sont versés sur ton MTN MoMo / virement bancaire local."
2. Annoncer le délai : "Délai de virement : 24-72h ouvrables."
3. Frais clairs avant confirmation.

---

## ÉTAPE 8 — AnalyticsDashboardScreen (statistiques)

### 🖱 ACTION EFFECTUÉE
J'ouvre les analytics de mon event après son déroulé.

### 👁 CE QUE JE VOIS *(présumé)*
- Métriques clés : inscrits, présents (check-in), revenus, taux de conversion vues→inscriptions.
- Graphiques : courbe des inscriptions sur le temps, sources de trafic, démographie.
- Comparatif vs autres events.

### 💡 SUGGESTIONS D'AMÉLIORATION GÉNÉRALES
1. Métriques actionnables uniquement (pas du data dump).
2. Insights AI : "Ton event a converti 12% des vues, c'est 2x mieux que la médiane catégorie."
3. Export PDF "Bilan post-event" prêt à partager.

---

# 🏁 RAPPORT FINAL — Parcours organisateur

## Note globale UX : **7 / 10**

Le wizard 4 étapes pour créer un event est **structurellement bon** : barre de progression claire, brouillon auto-saved, AI assist, contrôle granulaire des tickets et formulaires. Mais il porte plusieurs frictions résiduelles : tutoiement/vouvoiement non harmonisé (legacy avant les correctifs récents), suppressions sans confirmation (perte de données accidentelle), peu d'aperçu temps réel, pas de validation visible par étape, et plusieurs sliders non câblés (geocoding, multi-brouillons, validation deadline). Le post-création (MyEvents, Registrations, Wallet, Analytics) est moins audité ici mais semble moins risqué que la création elle-même.

## 🟢 3 POINTS FORTS

1. **Auto-save brouillon avec badge visuel** — réduit l'angoisse de perdre son travail.
2. **AI assist intégré** (titre, description, prix) — abaisse la barrière pour les organisateurs néophytes.
3. **Wizard 4 étapes avec progression cliquable** — l'utilisateur peut sauter d'étape, pas linéaire.

## 🔴 3 POINTS FAIBLES PRIORITAIRES

1. **Tutoiement/vouvoiement incohérent** — passe à harmoniser sur les copies du wizard (au moins 4 occurrences "votre/vous").
2. **Suppressions sans confirmation** — bannière, ticket type, form field, brouillon écrasé : autant de pertes silencieuses.
3. **Pas de validation visible par étape** — l'utilisateur peut passer en étape suivante avec des champs vides, et l'erreur n'apparaît qu'à la soumission finale (étape 4).

## 🎯 RECOMMANDATION GÉNÉRALE

Le parcours organisateur est **fonctionnel mais peu protecteur** vis-à-vis des erreurs de l'utilisateur. Une passe de 1-2 jours pour ajouter des `showConfirm` avant les actions destructrices, harmoniser le tutoiement, et afficher la validation par étape changerait significativement le ressenti. La création elle-même est solide ; les écrans post-création méritent un audit dédié plus tard.

