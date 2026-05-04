# 🔍 UX AUDIT — PARCOURS TRANSFERTS DE BILLETS

**Date** : 2026-04-29
**Périmètre** : `apps/registrations/{models,views,serializers,signals}.py` (TicketTransfer) côté backend + `EventEzMobile/src/components/tickets/TransferTicketModal.tsx`, `src/screens/tickets/PendingTransfersScreen.tsx`, `src/api/tickets.ts:103-153` (ticketTransfersAPI).

---

## 🟢 POINTS FORTS

1. **Modèle complet** : status (5 états : pending/accepted/declined/cancelled/expired), `transfer_token` unique 64 chars, `expires_at` 48h, `recipient_email` + `recipient_user` séparés (le destinataire peut ne pas avoir de compte).
2. **Validation ownership stricte** au create (`TicketTransferCreateSerializer.validate_ticket_purchase`) : propriétaire, payé, non-checked-in, pas de transfert en cours, quantité dispo, pas de self-transfer.
3. **Email notification** automatique au destinataire avec lien `accept_url`/`decline_url` web.
4. **Audit log** sur `accept` (ligne 1940) — utile RGPD.
5. **Decline notification** : `_notify_sender_declined` envoie un email à l'expéditeur.
6. **Token-based accept/decline** sans auth → permet à un destinataire sans compte de répondre via lien email (UX "anti-friction").
7. **QR regénéré** pour le nouveau billet (`_generate_qr_code`) → le QR du billet original n'existe plus puisque le `TicketPurchase` source est delete (ou décrémenté).

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **CRITIQUE** — Le billet peut être détruit si destinataire sans compte
**Fichier** : `apps/registrations/models.py:355-407`

```python
def accept(self, recipient_user=None):
    if not self.can_accept():
        raise ValueError("...")

    if recipient_user:
        self.recipient_user = recipient_user

    original_registration = self.ticket_purchase.registration
    event = original_registration.event

    # Chercher ou créer une inscription pour le destinataire
    if self.recipient_user:           # ← if False, skip
        new_registration, created = Registration.objects.get_or_create(...)
        new_ticket = TicketPurchase.objects.create(...)
        self._generate_qr_code(new_ticket)

    # Réduire la quantité du billet original ou le supprimer
    if self.ticket_purchase.quantity <= self.quantity:
        self.ticket_purchase.delete()  # ← exécuté toujours
    else:
        self.ticket_purchase.quantity -= self.quantity
        self.ticket_purchase.save()

    self.status = 'accepted'
    self.accepted_at = timezone.now()
    self.save()
```

**Scénario** : Bob transfère un billet à `alice@new.com`. Alice n'a pas de compte. Au save de `TicketTransfer`, `recipient_user` reste `None` (lookup par email échoue). Alice reçoit le mail, clique le lien `accept_url`, atterit sur `/transfer/{token}/accept` web → backend `accept_by_token` est appelé sans auth → `recipient_user=None` est passé à `transfer.accept()`.

Le if `if self.recipient_user` est faux → le `new_ticket` n'est **jamais créé**. Mais la suite du code **delete le `ticket_purchase` original**.

**Résultat** : Bob a perdu son billet. Alice n'a rien. Le billet est dans le néant. La response retourne `'requires_account': true` mais c'est trop tard, les données sont déjà détruites.

C'est le bug le plus grave que j'ai trouvé sur tout le produit. L'utilisateur perd un bien financier (le billet payé) sans recours.

**Action** :
1. Dans `TicketTransfer.accept()`, refuser explicitement si `recipient_user is None` AND `not recipient_user_arg` : raise `ValueError("Le destinataire doit avoir un compte EventEz pour accepter ce transfert")`.
2. Dans `accept_by_token`, si `recipient_user` non auth, retourner 200 avec `requires_account: true` SANS appeler `transfer.accept()` — informer l'utilisateur qu'il doit créer un compte d'abord.
3. Une fois le compte créé, l'utilisateur revient avec auth → le flow normal.
4. Audit log : tracer toutes les tentatives d'accept_by_token sans auth pour détecter les fraudes potentielles.

### 2. **CRITIQUE** — Race condition sur `accept` (double-acceptance possible)
**Fichier** : `apps/registrations/models.py:355-407`

Deux requêtes concurrentes (Alice clique 2 fois rapidement) peuvent :
1. Lire `status='pending'` toutes les deux
2. Passer `can_accept()` toutes les deux
3. Créer 2 nouveaux tickets sur Alice
4. Décrémenter la quantité 2 fois sur Bob

Aucune `select_for_update` ni `transaction.atomic` autour de la séquence accept.

**Action** : entourer `transfer.accept()` dans un `transaction.atomic()` + `TicketTransfer.objects.select_for_update().get(pk=transfer.pk)` au début. Ne re-checke `can_accept()` qu'une fois sous lock.

### 3. **CRITIQUE** — `accept_by_token` sans rate-limit ni détection de bruteforce
**Fichier** : `apps/registrations/views.py:2032-2085`

L'endpoint accepte un transfert sans authentification, en se basant sur un token de 64 caractères. Pas de throttle (`@throttle_classes` absent). Théorique mais mathématiquement difficile à bruteforce (64⁶⁴ tokens), reste **bonne pratique de mettre un rate-limit** strict (5 tentatives/minute/IP).

Plus problématique : pas d'audit log sur `accept_by_token` (l'audit log est seulement sur `accept` authentifié). Un attaquant qui devine un token (via leak email forwardé) peut accepter le transfert sur un autre compte, et personne ne s'en rend compte côté serveur.

**Action** : ajouter `throttle_classes = [AnonRateThrottle]` + audit log même côté `accept_by_token` avec IP + user-agent.

---

## 🟠 PROBLÈMES SÉVÉRITÉ ÉLEVÉE

### 4. Pas de notification expéditeur quand transfert ACCEPTÉ
**Fichier** : `apps/registrations/views.py:1936-1964`

`accept` action ne notifie PAS l'expéditeur. Bob n'apprend pas qu'Alice a accepté son billet (il faut qu'il aille manuellement vérifier `/ticket-transfers/sent/`). Inverse de `decline` qui notifie. Asymétrie injustifiée.

**Action** : ajouter `_notify_sender_accepted` dans le viewset, appelé après `transfer.accept(...)`. Email + push notification.

### 5. ~~Pas de UX cancel côté mobile~~ — DÉJÀ FAIT
**Fichier** : `PendingTransfersScreen.tsx:370-381` câble `handleCancelTransfer` sur le tab "Envoyés". L'audit était faux ; le bouton existe déjà. À garder en lieu de mémoire pour ne pas le re-flag.

### 6. `recipient_user` lookup par email casse en cas de changement d'email
**Fichier** : `apps/registrations/models.py:340-344`

```python
try:
    self.recipient_user = User.objects.get(email=self.recipient_email)
except User.DoesNotExist:
    pass
```

Lookup une seule fois au save. Si Alice n'a pas de compte au moment où Bob l'invite, mais qu'elle en crée un APRÈS (avec ce même email), `recipient_user` reste `None` → le bug critique #1 se manifeste.

**Action** : refaire le lookup dans `accept()` si `recipient_user is None` mais que `recipient_email` correspond à un user maintenant existant. Idéalement le lookup devrait être à `accept` time, pas au create.

### 7. `expires_at` calculé au save initial, pas re-vérifié
Si le système est down 48h+, un transfert pending à expirer passe `is_expired() == True` mais le `status` reste `'pending'`. Pas de tâche Celery cleanup pour passer en `'expired'` automatiquement. La logique se fait au runtime (`can_accept`), donc l'expéditeur voit son transfert "pending" à vie côté UI.

**Action** : Celery beat task `clean_expired_transfers` qui passe `status='pending' && expires_at < now` en `'expired'`. Re-crédite optionnellement (le billet original n'a pas été touché donc rien à re-créditer), mais notifie sender.

### 8. `quantity` paramètre permet d'éclater les billets de manière chaotique
Si Bob a un `TicketPurchase quantity=5`, il peut créer 5 transferts de quantity=1 pendant 1 minute. Chaque transfert va checker `pending_transfer = filter(ticket_purchase=value, status='pending').exists()` → bloque le 2e... non, attendez.

```python
pending_transfer = TicketTransfer.objects.filter(
    ticket_purchase=value, status='pending'
).exists()
if pending_transfer:
    raise serializers.ValidationError("Un transfert est déjà en cours pour ce billet")
```

OK donc 1 seul transfert pending par `ticket_purchase` à la fois. Bob doit attendre que le 1er soit accepté/refusé avant le 2e. Acceptable pour un MVP, frustrant pour un orga corporate qui veut transférer 50 billets séquentiellement.

**Action** : permettre N transferts pending tant que `sum(transfer.quantity for pending) <= ticket_purchase.quantity`. Plus complexe mais débloque les usages corporate.

---

## 🟡 PROBLÈMES MOYENS

### 9. `_send_transfer_notification` peut crasher silencieusement
**Fichier** : `apps/registrations/serializers.py:666+`

L'email est envoyé dans le `create()`. Si SMTP est down → exception → le transfert n'est PAS créé (`create()` raise). Mais si on veut juste créer le transfert même sans email, on perd cette logique. Mieux vaut envoyer l'email en async (Celery task).

**Action** : `send_transfer_notification.delay(transfer.id)` Celery task — survient même si SMTP plante au moment du create.

### 10. Pas de limite sur le nombre de transferts par utilisateur
Bob peut créer 1000 `TicketTransfer` pending vers 1000 emails différents (tous expirent à 48h, mais bon — le DB grossit, et le compteur de transferts pending sur le ticket original bloque déjà).

Actually non, ça bloque parce que 1 pending par ticket. OK. Mais si Bob a 100 tickets différents → 100 transferts simultanés → c'est OK en pratique.

### 11. PendingTransfersScreen : pas de cache stale-while-revalidate
Sur fetch initial de la liste pending, refetch à chaque navigation. Pas grave mais pattern à appliquer (cf. memory `Cache & Offline`).

### 12. `recipient_email` case-sensitive dans certains spots
- Save : `User.objects.get(email=self.recipient_email)` — pas de `iexact`. Si le user a `Alice@example.com` mais Bob tape `alice@example.com`, le lookup échoue → recipient_user = None → bug #1.
- Accept : `transfer.recipient_email.lower() != request.user.email.lower()` — comparaison case-insensitive ✓.

**Action** : normaliser à `email.lower().strip()` au save ET au lookup pour cohérence.

### 13. Pas de transfer history côté event organizer
Bob transfère 5 billets à 5 personnes différentes. L'organisateur de l'event n'a aucune visibilité sur ces changements de propriété. Pour le check-in, c'est OK car le QR du billet appartient au destinataire. Mais pour les analytics et les communications event ("envoie un email à tous les inscrits"), l'organizer pense parler à Bob alors qu'il devrait parler à Alice.

**Action** : la `Registration` originale de Bob est-elle mise à jour ? Lecture du model accept :
```python
new_registration, created = Registration.objects.get_or_create(
    user=self.recipient_user, event=event, defaults={...}
)
```
Crée une nouvelle Registration pour Alice. La Registration de Bob n'est **pas supprimée** (seul le TicketPurchase l'est). Donc Bob reste comme inscrit fantôme. Pour les analytics, il y a une duplicata de Registration (Bob + Alice) avec un seul TicketPurchase (Alice). L'organizer va voir 2 inscrits pour 1 billet payé.

**Action** : si après le transfert le ticket original a `quantity == 0` (deleted), supprimer/mettre à jour la `Registration` de Bob aussi (sauf s'il a d'autres tickets sur le même event).

---

## 🟢 PROBLÈMES MINEURS

### 14. `Registration.payment_required: False` au transfert
Légitime (le destinataire ne paye pas), mais sémantiquement un peu louche : l'event reste payant mais cette registration en particulier non. Un audit financier verra des `Registration.payment_required=False` pour des events `event_type='billetterie'` — friction analytique.

### 15. Pas d'export ICS auto pour le destinataire
Quand Alice accepte le transfert, elle reçoit un nouveau ticket mais aucun mail "Voici ton billet + ICS pour ajouter à ton calendrier".

### 16. Le sender peut transférer un billet déjà inscrit à des sessions
Si Bob s'est inscrit à des sessions de l'event avec son ticket, et qu'il transfère ensuite à Alice, **les `SessionRegistration` de Bob restent**. Alice doit re-s'inscrire aux sessions. UX confusion.

**Action** : optionnellement transférer aussi les SessionRegistration au moment du `accept` — flag `transfer_session_registrations: bool` côté create (default False, opt-in).

---

## 📊 RÉSUMÉ PAR SÉVÉRITÉ

| # | Sévérité | Couche | Problème |
|---|---|---|---|
| 1 | 🔴 Critique | Backend | `accept` détruit le billet si destinataire sans compte |
| 2 | 🔴 Critique | Backend | Race condition sur `accept` (double acceptance) |
| 3 | 🔴 Critique | Backend | `accept_by_token` sans rate-limit ni audit |
| 4 | 🟠 Élevé | Backend | Pas de notif sender quand accepté |
| 5 | 🟠 Élevé | Mobile | Bouton "Annuler" du sender absent |
| 6 | 🟠 Élevé | Backend | `recipient_user` lookup uniquement au create |
| 7 | 🟠 Élevé | Backend | Pas de cleanup Celery des transfers expirés |
| 8 | 🟠 Élevé | Backend | 1 seul transfer pending par ticket_purchase |
| 9 | 🟡 Moyen | Backend | Email transfer sync (peut bloquer le create si SMTP down) |
| 10 | 🟡 Moyen | Backend | Pas de limite globale par utilisateur (théorique) |
| 11 | 🟡 Moyen | Mobile | Pas de cache stale-while-revalidate |
| 12 | 🟡 Moyen | Backend | `recipient_email` case-sensitive au lookup |
| 13 | 🟡 Moyen | Backend | Registration originale persistée → duplicata analytics |
| 14 | 🟢 Mineur | Backend | `Registration.payment_required=False` au transfert |
| 15 | 🟢 Mineur | Mobile | Pas d'ICS auto au accept |
| 16 | 🟢 Mineur | Backend | SessionRegistration ne suit pas le transfer |

---

## 🎯 PRIORISATION POUR IMPLÉMENTATION

**Round 1 — Critiques (à faire MAINTENANT)** :
- ✅ Fix #1 : Refuser `accept` si pas de `recipient_user` (modèle)
- ✅ Fix #2 : Atomic transaction sur `accept`
- ✅ Fix #5 : Bouton "Annuler" sender côté mobile
- ✅ Fix #6 : Re-lookup `recipient_user` dans `accept` si None
- ✅ Fix #12 : Normaliser email lower/strip au save

**Round 2 — Élevé** :
- Fix #3 : Rate-limit + audit log sur `accept_by_token`
- Fix #4 : Notif sender accepted
- Fix #7 : Celery task cleanup expired

**Round 3 — Polish** :
- Fix #8, #9, #11, #13, #15, #16

---

> **Verdict** : le système de transfert est sérieux côté validation au create (ownership, paid, checked-in, no concurrent), mais un bug logique critique dans le `accept()` peut **détruire des billets payés** si le destinataire n'a pas encore de compte. C'est inacceptable pour un produit billetterie. Round 1 est non-négociable avant ouverture de la fonctionnalité aux utilisateurs hors test.

*Audit réalisé par lecture de code — 2026-04-29.*
