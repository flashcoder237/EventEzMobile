# Audit UX — Parcours Modérateur (Mobile)

**Date** : 2026-04-29
**Auditeur** : Claude (lecture de code)
**Profil simulé** : Modérateur connecté (rôle `moderator` ou `admin`), traite une file d'événements soumis pour validation.
**Parcours** : `ModerationScreen` (liste filtrable + actions valider/rejeter avec raison)
**Méthodologie** : Lecture du code source, simulation d'une session de modération.

---

## ÉTAPE UNIQUE — ModerationScreen

### 🖱 ACTION EFFECTUÉE
J'ouvre la modération depuis le dashboard. Liste des events en attente. Je tape sur un event pour le détailler, je tape "Valider" pour un cas simple, "Rejeter" pour un cas problématique → modal raison → soumission.

### 👁 CE QUE JE VOIS
- **Si non-modérateur** : screen "Accès refusé" avec illustration `AccessDenied`.
- **Si modérateur** :
  - Header : titre "Modération" + stats (total / billetterie / inscription).
  - Search bar pour filtrer par titre / organisateur / ville.
  - 3 chips de filtre : Tous / Billetterie / Inscription.
  - FlatList des `PendingEvent` :
    - Card : image bannière + titre + dates + ville + chip type (billetterie indigo / inscription violet) + nom organizer + temps écoulé depuis soumission ("il y a 2 j").
    - Boutons d'action : "Valider" (vert) / "Rejeter" (rouge outline). Tap "Rejeter" → modal raison.
  - Pull-to-refresh.
  - Si liste vide : illustration `WellDone` + "Tout est à jour" / "Aucun événement en attente".
- **Modal rejet** : event details + textarea "Raison du rejet" + 2 boutons "Annuler" / "Confirmer le rejet".

### 🧠 CE QUE JE COMPRENDS
- C'est une **file de modération minimaliste** : actions binaires (valider / rejeter avec raison).
- Pas de "Demander des modifications" intermédiaire — c'est binaire.
- `actionLoading` sur l'event en cours de traitement = bonne protection contre double-tap.
- Le modérateur voit l'organisateur et peut juger du contexte (prolifique vs nouveau).

### 😊 RESSENTI UTILISATEUR
**Efficace** : la file est claire, les actions immédiates, le filter par type aide à se concentrer.
**Frustration potentielle** : pas de "demander des modifs". Si l'event a un détail manquant (image floue), le modérateur doit soit valider (laxiste) soit rejeter (drastique).
**Lourdeur sur les rejets** : taper la raison à chaque rejet = friction. Sur une file de 50 events douteux, c'est 50 saisies textuelles.
**Pas de contexte de jugement** : l'event est jugé sur sa carte de liste — il faudrait pouvoir voir le rendu complet (description longue, galerie photos, etc.) avant de décider.

### ⚠ PROBLÈMES DÉTECTÉS

1. **Pas d'action "Demander des modifications"** : seulement valider OU rejeter. Pour des soucis mineurs (image manquante, faute de frappe), c'est trop drastique de rejeter.
2. **Vouvoiement** ligne 124 : "Veuillez indiquer une raison de rejet" → `'Indique une raison de rejet'`.
3. **Pas de raisons pré-définies** : le modérateur tape la raison à chaque rejet. Devrait y avoir des templates ("Image inappropriée", "Description trop courte", "Tarification suspecte", "Date incohérente") + champ libre optionnel.
4. **Pas de prévisualisation détaillée** : la card de liste montre titre + ville + dates, mais pas la description complète, la galerie, le formulaire d'inscription. Le modérateur doit-il taper l'event pour voir tout ? Le code ne le montre pas.
5. **Pas de bulk actions** : rejection en masse impossible. Si 5 events du même organizer-spammeur arrivent en série, pas de "Tout rejeter avec la même raison".
6. **Pas d'historique de modération** : si je valide un event puis je veux le re-vérifier 1h plus tard (par doute), il a disparu de la liste. Pas de "Mes 10 dernières actions".
7. **Pas de notes internes pour les modérateurs** : pour les events limites, pas de moyen de laisser un commentaire à un autre modérateur ("Cet organisateur a déjà eu 2 rejets cette semaine").
8. **Pas de classement par priorité** : tous les events ont le même poids visuel. Devrait y avoir un tri "Plus ancien d'abord" pour respecter le SLA (24h annoncé sur l'organisateur audit).
9. **Stats minimales** : juste total / billetterie / inscription. Pas de "X events en attente depuis > 24h" qui alerte sur le SLA.
10. **Recherche trop limitée** : titre + organizer + ville. Pas par catégorie, par date, par flag suspect.
11. **`isModerator` check côté frontend uniquement** : si quelqu'un bypass et hit l'API directement, le backend doit avoir le check côté permission (probablement OK mais à vérifier).
12. **Pas de pagination visible** : `getPendingValidation` retourne `results || data`. Si > 100 events en attente, l'UX dégrade. Pas de loadMore.

### 💡 SUGGESTIONS D'AMÉLIORATION

1. **3 actions au lieu de 2** : Valider / Demander modifs / Rejeter. "Demander modifs" → modal "Quoi modifier ?" → notification à l'organizer + event reste en `pending` avec note du modérateur.
2. **Tutoiement** sur tous les copies.
3. **Raisons templates + custom** : sur l'écran de rejet, 6-8 chips de raisons fréquentes ("Image inappropriée", "Description trop courte", "Date passée", "Lieu invalide", "Suspect spam", "Doublon"). Tap sélectionne, génère un texte par défaut éditable.
4. **Bouton "Voir détails"** : ouvre `EventDetailsScreen` en mode preview-modérateur (avec overlay "EN MODÉRATION" pour ne pas confondre avec une vraie page).
5. **Multi-select** : long press sur une card → mode sélection → "Rejeter X events sélectionnés avec la même raison".
6. **Onglet "Historique"** : mes 50 dernières actions, filtrables, avec annulation possible dans une fenêtre de 5 min.
7. **Notes internes** : champ "Note privée" sur l'event, visible uniquement par les modérateurs.
8. **Tri automatique par ancienneté** + badge "URGENT" ou "🚨" sur les events > 24h en attente.
9. **Stats SLA** : "12 events en attente, dont 2 > 24h" en haut de la screen.
10. **Filtres avancés** : catégorie, date événement (futur proche urgent), nombre de tickets, organisateur prolifique vs nouveau.
11. **Pagination + infinite scroll** : `loadMore` à 80% de scroll.
12. **Mode "Triage rapide"** : full-screen swipe gauche=rejeter / droite=valider façon Tinder, pour les profils ultra-clairs. Le modérateur abat 30 events en 2 minutes.

---

# 🏁 RAPPORT FINAL — Parcours modérateur

## Note globale UX : **6 / 10**

L'écran de modération **fait le job basique** (lister, filtrer, valider/rejeter avec raison) mais reste **très binaire** dans son approche. Manque les outils qui rendent la modération **scalable** : pas de "demander modifs", pas de raisons templates, pas de bulk action, pas d'historique, pas de tri par SLA. Sur un volume de modération à venir, ce sera un goulot d'étranglement.

## 🟢 3 POINTS FORTS

1. **Action immédiate** — valider/rejeter en 2 taps, le modérateur avance vite sur les cas évidents.
2. **Statistiques visibles** — total + split par type aide à comprendre la charge.
3. **Filtre par recherche + type** — trouve rapidement un event spécifique dans une grosse file.

## 🔴 3 POINTS FAIBLES PRIORITAIRES

1. **Pas de "Demander des modifications"** — limite l'outil à validation/rejet binaire, alors que la majorité des problèmes sont mineurs (image, description).
2. **Pas de raisons pré-définies** — le modérateur tape la même raison 50 fois par session. Templates obligatoires.
3. **Pas de tri par ancienneté/SLA** — les events > 24h se perdent dans la file, friction directe sur l'engagement organizer.

## 🎯 RECOMMANDATION GÉNÉRALE

L'écran couvre les **cas d'école** mais pas le volume. Pour scaler à plusieurs centaines d'events/semaine, ajouter (en priorité) : action "Demander modifs", raisons templates, tri par ancienneté, et bulk multi-select. C'est ~2 jours de dev qui rendront la modération **agréable au lieu de pénible** et amélioreront le SLA pour les organizers.

