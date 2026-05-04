# Plan d'audit UX — EventEz Mobile

Date : 2026-04-29
Auditeur : Claude (lecture de code, simulation utilisateur)

## Audits réalisés

### ✅ Parcours invité → premier billet
- **Doc** : [UX_AUDIT_PARCOURS_INVITE.md](./UX_AUDIT_PARCOURS_INVITE.md)
- **Statut** : Clos. 15/16 items du tableau de sévérité résolus + 8 bonus livrés (Continuer en invité, NetInfo, Add to calendar, Inviter un ami, etc.).
- **Phases livrées** : 8 commits successifs (P1 → P8), backend + mobile.

## Audits planifiés

### 🟢 Parcours organisateur — créer son premier événement
- **Pourquoi** : parcours le plus long, le moins défriché, fort impact business.
- **Écrans cibles** : `EventCreateScreen`, `MyEventsScreen`, `EventEditScreen` (consolidé), `OrganizerProfileScreen`, `OrganizerDashboardScreen`, `WalletScreen`, `AnalyticsScreen`, `RegistrationsListScreen`.
- **Profil simulé** : nouveau créateur d'événement (compte fraîchement promu organisateur), crée son premier event de A à Z et reçoit ses premières inscriptions.
- **Doc** : [UX_AUDIT_PARCOURS_ORGANIZER.md](./UX_AUDIT_PARCOURS_ORGANIZER.md)

### 🟢 Parcours check-in — scanner QR à l'entrée
- **Pourquoi** : sécurité-critique. Erreurs = personnes refusées à tort à un event payant. Stress sous pression (file d'attente).
- **Écrans cibles** : `QRScannerScreen`, validation succès/échec, gestion offline, doublons.
- **Profil simulé** : staff de l'organisateur à l'entrée d'un event, scanne 100+ billets en 30 minutes avec connexion irrégulière.
- **Doc** : [UX_AUDIT_PARCOURS_CHECKIN.md](./UX_AUDIT_PARCOURS_CHECKIN.md)

### 🟡 Parcours modérateur — valider/rejeter un event
- **Pourquoi** : impact sur confiance produit. Modération mauvaise = events légitimes refusés OU contenus douteux validés.
- **Écrans cibles** : `ModerationScreen`, action de validation, action de rejet avec raison.
- **Profil simulé** : modérateur connecté, traite une file d'attente de 20 événements soumis.
- **Doc** : [UX_AUDIT_PARCOURS_MODERATOR.md](./UX_AUDIT_PARCOURS_MODERATOR.md)

### 🟡 Parcours remboursement — annuler et obtenir refund
- **Pourquoi** : moment de friction émotionnelle (utilisateur déçu). Mauvais flow = churn + avis négatifs.
- **Écrans cibles** : `RefundRequestScreen`, statut de la demande, communication avec organisateur.
- **Profil simulé** : participant qui ne peut plus venir, demande remboursement 48h avant l'event.
- **Doc** : [UX_AUDIT_PARCOURS_REFUND.md](./UX_AUDIT_PARCOURS_REFUND.md)

### 🟢 Parcours messagerie — chat organizer ↔ participant
- **Pourquoi** : usage récurrent, large surface (WebSocket, attachments, typing, présence, lecture).
- **Écrans cibles** : `MessagesScreen` (liste), `ConversationScreen` (chat), `NewConversationScreen`.
- **Profil simulé** : participant qui pose une question pratique à l'organisateur la veille de l'event.
- **Doc** : [UX_AUDIT_PARCOURS_MESSAGING.md](./UX_AUDIT_PARCOURS_MESSAGING.md)

## Méthodologie commune

Pour chaque parcours :
1. Lecture des écrans et hooks concernés.
2. Pour chaque étape : structure standardisée (Action / Vois / Comprends / Ressenti / Problèmes / Suggestions).
3. Tableau de sévérité final (🔴 / 🟠 / 🟡 / 🟢).
4. Note globale /10, 3 forces, 3 faiblesses, recommandation.
5. Implémentation progressive des correctifs par phase, avec commits granulaires.

## Périmètre exclu (volontairement)

- **Onboarding multi-écrans** : déjà traité dans le redesign mobile récent.
- **Profil utilisateur / paramètres** : déjà bien structuré, pas de friction reportée.
- **Speakers / Sessions / Agenda** : surface complexe mais cas d'usage de niche, à différer.
- **Transferts de billets** : feature avancée, audit séparé si demande.

---

*Ce plan est vivant : si un parcours révèle des dépendances vers un autre, on insère un audit transversal.*
