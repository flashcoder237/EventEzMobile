# Audit UX — Parcours Messagerie (Mobile)

**Date** : 2026-04-29
**Auditeur** : Claude (lecture de code)
**Profil simulé** : Participant qui pose une question pratique à l'organisateur la veille de l'event ("Y a-t-il un parking ?", "Le code vestimentaire ?"). Veut une réponse rapide et claire.
**Parcours** : `MessagesScreen` (inbox) → `ConversationScreen` (chat temps réel) → ConversationScreen permet attachments, edit, delete, reactions, presence, typing, read receipts.
**Méthodologie** : Lecture du code source, audit synthétique focalisé sur les frictions principales.

## ✅ Statut d'implémentation

- ✅ **Phase 15** (commit 26ebf02) : 
  - Edit time limit 15 min (parité WhatsApp) avec toast clair "Tu peux éditer dans les 15 minutes après l'envoi".
  - `useMutedConversations` hook AsyncStorage local (toggle + isMuted + persist).
  - Long-press sur conversation card ouvre maintenant un menu 4 options : **Mute/Unmute** / **Archiver** / **Supprimer** / **Annuler**.
  - `ConversationCard` accepte `isMuted` prop (UI badge cloche barrée à câbler visuellement si besoin).
- 🔁 Pas livré : blocage utilisateur backend (nécessite User.blocked_users field + hook côté WebSocket pour filtrer), opt-out global des read receipts dans Settings, indicateur réseau "Reconnexion..." dans le header conversation, queue offline pour messages envoyés (existe déjà via useOfflineQueue mémoire), statuts livraison à 3 niveaux (envoyé/livré/lu).

---

## ÉTAPE 1 — MessagesScreen (Inbox)

### 🖱 ACTION EFFECTUÉE
J'ouvre l'onglet Messages depuis le tab bar. Je vois la liste de mes conversations avec organisateurs et autres participants.

### 👁 CE QUE JE VOIS
- Header tile éditorial : titre "Messages" + bouton "+" pour nouvelle conversation.
- Onglets : Tous / Événements / Archivés.
- Search bar pour filtrer.
- Liste de `ConversationCard` :
  - Avatar rond (photo ou initiales colorées).
  - Badge non-lus si `unread_count > 0`.
  - Nom + preview dernier message + temps relatif ("il y a 2h").
  - Badge "ORGANIZER" si l'autre est organizer.
- Pull-to-refresh, skeleton au chargement.
- Empty state avec illustration `NewMessage` + CTA "Démarrer une conversation".

### 🧠 CE QUE JE COMPRENDS
- Inbox classique style WhatsApp/Messenger.
- Onglet "Événements" = conversations liées à un event spécifique (groupes ou DM organizer-participant).
- Long press = actions contextuelles (archive, mute, delete probablement).

### ⚠ PROBLÈMES PRÉSUMÉS
1. **Pas d'indicateur "en ligne"** sur les avatars — la présence est dispo via WebSocket mais pas affichée dans l'inbox.
2. **Pas de filtre "Non lus"** — pour aller directement aux messages à traiter.
3. **Search basique** — par nom seulement ? Devrait aussi chercher dans le contenu.
4. **`getDisplayName` fallback `participants?.[0]`** : si je suis dans un groupe, le nom affiché est aléatoire.

### 💡 SUGGESTIONS
1. Pastille verte sur l'avatar si l'autre est en ligne (présence déjà streamée).
2. Filtre "Non lus" en chip.
3. Search full-text dans les messages.
4. Pour les groupes : afficher 2-3 noms ou "Tu, Alice +5 autres".

---

## ÉTAPE 2 — ConversationScreen (Chat)

### 🖱 ACTION EFFECTUÉE
Je tape une conversation. J'envoie un message texte, puis une image en attachment, j'édite mon dernier message (typo), puis je supprime un autre. Je vois l'autre taper en temps réel ("typing..."), puis lire mon message (double check).

### 👁 CE QUE JE VOIS *(d'après l'archi documentée)*
- Header : avatar + nom + indicateur présence ("En ligne" / "Vu il y a 5 min").
- FlatList **inversée** des messages (les plus récents en bas).
- Bulles de messages : différenciées (mes msgs à droite indigo, leurs msgs à gauche gris).
- Group consecutive de messages (grouping logic dans la mémoire).
- Indicateurs : envoyé (✓), lu (double ✓ bleu).
- Système messages (entrée/sortie de groupe, etc.) en italique gris centré.
- Edit indicator : "(modifié)" sous le message.
- Soft delete : "Ce message a été supprimé" en italique.
- Typing indicator en bas avec 3 dots animés.
- Bottom : input de texte + boutons attachment / emoji / send.
- Drag & drop d'images sur la conversation.
- Long press sur message → menu (Edit, Delete, React, Reply, Copy).

### 🧠 CE QUE JE COMPRENDS
- C'est une **vraie messagerie temps réel** : WebSocket, edit, delete, reactions, présence, typing, read receipts.
- L'archi est solide (noté dans la mémoire : "Phase 1/2/3 messaging refactor done").
- L'inverted FlatList est la bonne approche pour le chat.

### ⚠ PROBLÈMES PRÉSUMÉS

1. **WebSocket reconnection silencieuse** : si la connexion tombe, les messages envoyés pendant l'offline → où vont-ils ? Queue locale ? Perdus ? (À vérifier dans `useOfflineQueue` mentionné en mémoire.)
2. **Présence trompeuse** : "Vu il y a 5 min" peut être vrai mais l'utilisateur peut être hors-ligne sans le savoir (push notif l'a réveillé brièvement). Le statut peut induire en erreur sur la disponibilité réelle.
3. **Pas de mute par conversation** : si un organizer t'inonde de messages d'event, pas évident de couper.
4. **Édition sans limite de temps** : tu peux éditer un message envoyé il y a 2 jours. Sur les autres apps (WhatsApp), il y a une fenêtre limitée (15min).
5. **Soft delete = "Ce message a été supprimé"** : OK mais visible par tous. Peut être stigmatisant ("qu'est-ce qu'il a dit qu'il a regretté ?").
6. **Pas de blocage** d'utilisateur visible (blocking flow standard messaging).
7. **Attachments** : taille max ? Format accepté ? Pas de feedback explicite.
8. **Typing indicator visible même quand l'autre est hors écran** : bizarre — mais c'est typique des apps mobiles.
9. **Read receipts opt-in/opt-out absent** : les autres apps permettent de désactiver les ✓✓ pour la privacy.
10. **Messages non livrés** (si destinataire offline) : pas d'indicateur "non livré" distinct de "envoyé".

### 💡 SUGGESTIONS

1. **Indicateur réseau dans le header** : badge "Reconnexion..." quand WebSocket down. Queue les envois et flush au retour.
2. **Présence plus précise** : "En ligne" / "Récemment actif" / "Hors ligne". Pas de timestamp précis sauf opt-in.
3. **Mute conversation** : icône cloche dans le menu long-press header.
4. **Limite édition** : 15 min après envoi. Au-delà, impossible — comme WhatsApp.
5. **Soft delete UX** : "Tu as supprimé ce message" pour l'auteur, "Ce message a été supprimé" pour l'autre. Différentiel pédagogique.
6. **Bloquer un utilisateur** : option dans les actions de header.
7. **Limite attachment** : 10 MB max, formats `image/*` `application/pdf` autorisés. Toast clair si rejet.
8. **Read receipts opt-out** : toggle dans Paramètres Confidentialité.
9. **Statuts livraison** : ✓ envoyé / ✓ livré / ✓✓ lu (3 niveaux distincts).

---

# 🏁 RAPPORT FINAL — Parcours messagerie

## Note globale UX : **7.5 / 10**

La messagerie est **techniquement la pièce la plus aboutie** du produit : WebSocket, edit, delete, reactions, présence, typing, read receipts — tout y est. La couche fonctionnelle rivalise avec WhatsApp/Messenger sur le périmètre essentiel. Les frictions résiduelles sont toutes des **détails de privacy et de garde-fous** (limite d'édition, mute, opt-out read receipts, blocage). Pour un produit B2C, c'est une base très solide qui **mérite quelques polish privacy/UX** pour passer à l'excellence.

## 🟢 3 POINTS FORTS

1. **Messagerie temps réel complète** — features parité avec les majors (typing, présence, read receipts, edit, delete, reactions).
2. **Inverted FlatList + grouping** — comportement chat moderne et fluide.
3. **Drag & drop images + soft delete** — détails qui montrent le soin apporté.

## 🔴 3 POINTS FAIBLES PRIORITAIRES

1. **Pas de gestion offline visible** — si la connexion saute, comportement incertain (queue ? perdu ?). Frustrant en zone faible signal.
2. **Pas d'options de privacy** — read receipts forcés, pas de mute, pas de blocage. Manque les protections de base.
3. **Edit sans limite de temps** — ouvre la porte à des manipulations a posteriori (changer un message lu il y a 1 semaine).

## 🎯 RECOMMANDATION GÉNÉRALE

La messagerie est **prête pour la prod** sur le golden path. Pour passer en mode "premium B2C", investir 2-3 jours sur (a) la queue offline + indicateur reconnexion, (b) les options de privacy (mute, blocage, opt-out receipts), (c) la limite d'édition. Le reste est polish marginal.

---

# 🔚 SYNTHÈSE GLOBALE — Tous parcours audités

| Parcours | Note | Statut |
|---|---|---|
| Invité → premier billet | 7.5 → ~9 après corrections | ✅ Implémenté |
| Organisateur → créer event | 7 / 10 | 📋 Audit fait, corrections à planifier |
| Check-in scanner QR | 6.5 / 10 | 📋 Audit fait, urgences offline + manuel |
| Modérateur → valider | 6 / 10 | 📋 Audit fait, "demander modifs" prioritaire |
| Remboursement | 5.5 / 10 | 📋 Audit fait, transparence + suivi prioritaires |
| Messagerie | 7.5 / 10 | 📋 Audit fait, privacy à renforcer |

**Note moyenne audits non-implémentés : 6.5 / 10.** Aucun parcours n'est cassé, mais tous portent des frictions identifiables. Le check-in et le refund sont les plus à risque (impact sécurité et confiance).

