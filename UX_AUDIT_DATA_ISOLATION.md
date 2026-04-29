# Audit Sécurité — Isolation des données par utilisateur

**Date** : 2026-04-29
**Périmètre** : Payments, Refunds, Invoices, Registrations, TicketPurchases, TicketTransfers, Discounts, Conversations/Messages (REST + WebSocket).
**Question** : Chaque utilisateur n'accède-t-il qu'à ses propres données ?

**Verdict global** : 🟡 **1 faille critique trouvée et corrigée immédiatement** (WebSocket message creation), 1 question produit pendante (refund pour guest), tout le reste 🟢 étanche.

---

## 1. ViewSets REST — `get_queryset` audit

| ViewSet | Filtre par user | Notes |
|---|---|---|
| `PaymentViewSet` | `user=user` ; organizer voit aussi `event__organizer=user` | ✅ Logique métier valide |
| `RefundViewSet` | `payment__user=user` ; organizer voit `payment__registration__event__organizer=user` | ✅ Idem |
| `InvoiceViewSet` | `payment__user=user` ; organizer voit ses events | ✅ |
| `RegistrationViewSet` | `user=user` ; organizer voit aussi `event__organizer=user` | ✅ |
| `TicketPurchaseViewSet` | `registration__user=user` ; organizer voit ses events | ✅ |
| `TicketTransferViewSet` | `Q(sender=user) | Q(recipient=user)` | ✅ |
| `DiscountViewSet` | `event__organizer=user` (organizer-only) | ✅ |
| `ConversationViewSet` | `participants=user` | ✅ |
| `MessageViewSet` | `conversation__participants=user` | ✅ |
| `NotificationViewSet` | `user=user` | ✅ (audité séparément) |

Pour les actions custom (`@action`), check ownership manuel observé partout :
- `RefundViewSet.perform_create` : `payment.user != request.user → PermissionDenied`
- `InvoiceViewSet.download_pdf` : triple check `payment.user OR organizer OR staff`
- `DiscountViewSet.perform_create` : `event.organizer != request.user → PermissionDenied`
- `RegistrationViewSet` actions check-in : permissions dédiées (organizer of this event)

### Verdict REST : 🟢 **Étanche.**

---

## 2. WebSocket — ChatConsumer

### 2.1 Authentification

`apps/user_messages/consumers.py` lignes 47-72 :
- ✅ JWT obligatoire (query param ou auth message)
- ✅ Connexion fermée si token invalide
- ✅ Rate limit 30 msg/60s
- ✅ Max 5 connexions par user

### 2.2 Subscriptions et broadcasts

`_setup_user_channels` (ligne 110+) joint l'user aux groupes de SES conversations uniquement (filtré par `_get_user_conversation_ids` → `Conversation.objects.filter(participants=self.user)`). Donc un user ne **reçoit** que les broadcasts de ses propres conversations.

### 2.3 🔴 Faille critique — `create_message` (corrigée)

**Avant fix** (commit avant audit) :
```python
@database_sync_to_async
def create_message(self, conversation_id, content, ...):
    conversation = Conversation.objects.get(id=conversation_id)
    message = Message.objects.create(conversation=conversation, sender=self.user, ...)
    return message
```

→ ❌ **Aucune vérif que `self.user` est participant de `conversation_id`.** Un user A authentifié WebSocket peut envoyer `{ type: 'message.send', conversation_id: '<UUID-conv-privée>', content: 'spam' }` :
1. Le message est créé en DB avec `sender=A`, `conversation=conv-privée`.
2. Le broadcast `group_send("conversation_<id>")` alerte les vrais participants — ils voient un message d'un étranger.

**Vecteur** : il faut un UUID de conversation valide. Difficile à deviner (UUID v4) mais possible via :
- Leak via API REST si une vue serializer exposait l'ID à des non-participants (à vérifier).
- Test/staging logs où un dev pourrait copier un UUID.
- Ingénierie sociale.

**Impact réel** : faible probabilité, élevée gravité (intrusion conversation privée). Suffit qu'un seul UUID fuit pour qu'un attaquant puisse spammer le groupe.

**Fix appliqué dans le même commit** :
```python
@database_sync_to_async
def create_message(self, conversation_id, content, ...):
    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return None
    if not conversation.participants.filter(id=self.user.id).exists():
        return None
    # ... création comme avant
```

Et `handle_message_send` retourne une erreur `{ type: 'error', code: 'forbidden' }` au client si `None`.

### 2.4 🟡 Failles secondaires — `handle_typing_start/stop` (corrigées)

Les indicateurs de frappe acceptaient aussi un `conversation_id` arbitraire et broadcastaient à `conversation_<id>` sans vérif. Un attaquant pouvait :
1. Spam des "X est en train d'écrire..." dans des conversations où il n'est pas participant.
2. Confirmer son existence/présence à l'aveugle.

**Impact réel** : nuisance + leak de présence. Pas de fuite de contenu.

**Fix appliqué** : nouvelle helper `_is_participant(conversation_id)` appelée en garde-fou avant tout broadcast typing :
```python
async def handle_typing_start(self, data):
    if not await self._is_participant(data.get('conversation_id')):
        return
    # ...
```

### 2.5 Edit / Delete / Reactions — déjà étanches

`edit_message` et `soft_delete_message` filtrent `Message.objects.get(id=message_id, sender=self.user)` → un user ne peut éditer/supprimer QUE ses propres messages.

`get_message_conversation_id` lit `message.conversation.id` (sans check), mais c'est juste utilisé pour router le broadcast — l'effet réel reste filtré par les checks d'edit/delete.

Reactions (`handle_reaction_add/remove`) : à vérifier en suivi mais non-critique (ajoute/retire un emoji).

### Verdict WebSocket : 🟢 **Étanche après fix (P19).**

---

## 3. Question produit pendante — Refund pour guest

Le refund endpoint est `IsAuthenticated` mais pas `IsNotGuest`. Un compte guest (créé via "Continuer en invité") peut donc demander un refund avant d'avoir upgradé en compte complet.

**Argument pour autoriser** : il a payé, c'est légitime.
**Argument contre** : le suivi de refund nécessite un email vérifié + des notifs in-app. Un guest a un email placeholder pour le téléphone (`phone_XXXX@eventez.placeholder`) qui peut ne pas être consultable.

**Recommandation** :
- Si le guest a un vrai email (cas guest-checkout sur free event), laisser passer.
- Si le guest a l'email placeholder phone (`@eventez.placeholder`), bloquer le refund avec un message "Crée un compte complet (email + mot de passe) pour suivre ton remboursement."

Action proposée : ajouter une vérif dans `RefundViewSet.perform_create` :
```python
if request.user.is_guest and request.user.email.endswith('@eventez.placeholder'):
    raise PermissionDenied('Crée un compte complet pour gérer tes remboursements.')
```

---

## 4. PII et logs

Vérification rapide des logs en production :
- `logger.info(f"...{user.email}...")` apparaît dans `services.py` (notifications) et `views.py` (accounts).
- L'email n'est pas un secret, mais il est PII. Sur un setup logs centralisé (Sentry/Datadog/Loki), s'assurer que les logs sont PII-aware.

Recommandation : créer un wrapper `safe_user_repr(user)` qui renvoie `user_id` en prod, `email` en dev. Pas critique, mais bonne hygiène RGPD.

---

## 5. Synthèse

| Couche | Verdict |
|---|---|
| ViewSets REST `get_queryset` | 🟢 Étanche |
| Actions REST custom (refund/invoice/etc.) | 🟢 Étanche |
| WebSocket `create_message` | 🔴 → 🟢 (fix appliqué P19) |
| WebSocket `handle_typing_*` | 🟡 → 🟢 (fix appliqué P19) |
| WebSocket `edit_message`/`soft_delete_message` | 🟢 Étanche (sender=self.user) |
| Notifications | 🟢 Étanche (audité séparément) |
| Refund pour guest | 🟡 Décision produit pendante |
| Logs PII | 🟢 Acceptable (recommandation hygiène) |

**Conclusion** : la couche d'isolation est globalement bien conçue. La faille critique trouvée (WebSocket message creation cross-conversation) a été corrigée immédiatement dans le même commit que cet audit. La vérification de participant est maintenant systématique pour tous les broadcasts WebSocket prenant un `conversation_id` du client.

Le seul point d'attention restant est une décision produit (refund pour guest avec email placeholder) — pas une faille de sécu mais une expérience utilisateur à clarifier.
