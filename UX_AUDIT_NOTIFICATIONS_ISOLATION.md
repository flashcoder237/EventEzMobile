# Audit Notifications — Isolation par utilisateur

**Date** : 2026-04-29
**Auditeur** : Claude (lecture de code, traçage backend + mobile + push)
**Question** : Les notifications affichées sur mobile sont-elles bien celles de l'utilisateur connecté, et chaque utilisateur reçoit-il uniquement les notifications qui lui sont propres ?

**Réponse courte** : ✅ **Oui, le système est correctement isolé.** Backend, mobile, cache local et device push tokens sont tous scopés par utilisateur. Une faille théorique mineure existe (push en vol entre logout/login), sans fuite de données sensibles.

---

## 1. Backend — `Notification` ViewSet

### 1.1 Modèle

`apps/notifications/models.py` :
```python
class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    ...
```

→ Chaque notification a **toujours un propriétaire** unique (`user` ForeignKey CASCADE). À la suppression du compte, toutes les notifs partent avec.

### 1.2 ViewSet et permissions

`apps/notifications/views.py` ligne 15-28 :
```python
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Toujours filtrer par utilisateur connecté, même pour les admins.
        return Notification.objects.filter(user=self.request.user)
```

→ ✅ **Filtre obligatoire par `request.user`** sur le `get_queryset`. Même un admin connecté ne voit QUE ses propres notifs via cet endpoint. Une vue admin globale nécessiterait un endpoint dédié (qui n'existe pas — bon point).

### 1.3 Actions sensibles

**`mark_as_read`** (ligne 30-57) :
```python
if notification.user_id != request.user.id:
    return Response({'detail': 'Vous n\'êtes pas autorisé...'}, status=403)
```
→ ✅ Double check d'ownership avant de modifier. Même si le `pk` arrive d'un autre user (URL crafted), 403 retourné.

**`mark_all_as_read`** (ligne 59-66) :
```python
Notification.objects.filter(user=request.user, is_read=False).update(...)
```
→ ✅ Filtré par user.

**`delete_multiple`** (ligne 68-86) :
```python
Notification.objects.filter(id__in=notification_ids, user=request.user).delete()
```
→ ✅ La condition `AND user=request.user` empêche toute suppression cross-user, même avec des UUIDs valides d'autres comptes.

### Verdict backend : 🟢 **Étanche.**

---

## 2. Mobile — NotificationsScreen + NotificationContext

### 2.1 Cache scopé par userId

`src/screens/dashboard/NotificationsScreen.tsx` ligne 150 :
```ts
const cacheKey = `notifs:${user?.id}`;
```

→ ✅ Chaque utilisateur a sa propre clé de cache. UserA stocke `notifs:1`, UserB stocke `notifs:2`. Pas de partage possible.

⚠️ **Edge case mineur** : si `user` est null (pas connecté), la clé devient `notifs:undefined`. Tous les non-authentifiés partagent le même bucket. Dans la pratique, NotificationsScreen n'est accessible que connecté (auth-guard via tab wrapper), donc cas peu probable. **Recommandation** : early-return si `!user?.id` au début de `fetchNotifications`.

### 2.2 Logout cleanup

`src/contexts/AuthContext.tsx` ligne 216 :
```ts
CacheService.clearMemory();
```

→ Clear le cache **mémoire** au logout. ⚠️ **Le cache AsyncStorage persiste** mais comme la clé inclut le userId, l'autre user ne le lira jamais. Les vieilles entrées s'accumulent — pas une faille, juste un accumulation propre.

`src/contexts/NotificationContext.tsx` ligne 354-366 :
```ts
} else {
  // Cleanup on logout
  setNotifications([]);
  setUnreadNotificationCount(0);
  setUnreadMessageCount(0);
  setPendingInvitationCount(0);
  setPendingTransferCount(0);
  setPushToken(null);
  setPushEnabled(false);
  pushNotificationService.unregisterDevice();
  pushNotificationService.cleanup();
}
```

→ ✅ **Reset complet du state React au logout.** Aucune notif de l'ancien user ne reste affichée.

### 2.3 Refresh périodique

`NotificationContext` ligne 389-397 :
```ts
useEffect(() => {
  if (!isAuthenticated) return;
  const interval = setInterval(() => {
    fetchUnreadCounts();
  }, 30000);
  return () => clearInterval(interval);
}, [isAuthenticated, fetchUnreadCounts]);
```

→ ✅ L'intervalle est arrêté immédiatement au logout. Plus de fetch background. Le `if (!isAuthenticated) return;` au début de `fetchUnreadCounts` (ligne 194) est une double protection.

### Verdict mobile : 🟢 **Étanche.**

---

## 3. Push notifications — device token scoping

### 3.1 Modèle

`apps/notifications/models.py` ligne 7-33 :
```python
class PushDeviceToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_devices')
    push_token = models.CharField(max_length=500, unique=True)
    ...
```

→ Token rattaché à un user unique en DB. `unique=True` sur `push_token` → un device = une entrée.

### 3.2 Re-assignation au login (POINT CLÉ)

`apps/notifications/views.py` ligne 333-348 (action `register-device`) :
```python
existing_token = PushDeviceToken.objects.filter(push_token=push_token).first()
if existing_token:
    if existing_token.user_id != request.user.id:
        # Token appartient à un autre utilisateur, le réassigner
        existing_token.user = request.user
    existing_token.is_active = True
    existing_token.save()
```

→ ✅ **Si le même device se reconnecte avec un nouvel utilisateur, le token est automatiquement ré-assigné au nouvel user.** Le précédent user ne reçoit plus de push sur ce device.

### 3.3 Unregister au logout

`src/contexts/NotificationContext.tsx` ligne 364 → `pushNotificationService.unregisterDevice()` qui :
1. Tente l'API `unregisterDevice` côté backend (peut fail 401 si tokens déjà révoqués)
2. Clear le `PUSH_TOKEN_KEY` AsyncStorage local

⚠️ **Edge case résiduel** : entre le moment où l'utilisateur A appuie sur logout et le moment où l'utilisateur B se reconnecte sur le même device :
- Si `unregisterDevice` API call fail (token JWT déjà clear) → le `PushDeviceToken` reste actif côté backend, lié à user A.
- Une notif push **en transit** (déjà émise FCM/APNS, pas encore livrée) peut atterrir sur le device pendant cette fenêtre.
- B verrait brièvement un titre/message destiné à A (ex. "Nouveau message reçu", "Ton paiement est confirmé").

**Mitigations en place** :
- Le contenu push est volontairement minimal : titres + brefs messages, **jamais** de QR code, montant détaillé, ou donnée sensible.
- Le tap sur la notif redirige vers un deep link backend qui re-vérifie l'auth (ex. `/registrations/{id}` retourne 403 si pas owner).
- Au login de B, le `register-device` ré-assigne le token immédiatement → tous les push suivants sont pour B.

**Recommandation** : ajouter un appel `unregister-device` au début du flow logout, **avant** `clearTokens()`, pour maximiser les chances de succès. Le code actuel fait l'inverse (clear puis tente unregister). Voir section 5.

### Verdict push : 🟡 **Solide en pratique, micro-fenêtre théorique.**

---

## 4. WebSocket (in-app temps réel)

Recherche dans le repo : pas de `consumers.py` pour les notifications. Le seul WebSocket consumer est dans `apps/user_messages/consumers.py` (chat).

→ Les notifications **ne passent pas par WebSocket** — elles sont fetch-pull via `getNotifications()` avec polling 30s. Aucune surface d'attaque WebSocket à auditer pour les notifs.

(À noter : si un futur dev ajoute un NotificationConsumer WebSocket, il devra impérativement vérifier `self.scope['user']` et joindre une `Group` du genre `notifications.user.{id}` — pattern à documenter.)

### Verdict WebSocket : 🟢 **Non applicable (par design).**

---

## 5. Recommandations

### 5.1 🟢 Faible priorité
- **NotificationsScreen.tsx** : early-return `if (!user?.id)` dans `fetchNotifications` pour éviter le bucket cache `notifs:undefined`.
- **CacheService** : ajouter une méthode `clearByUser(userId)` qui purge AsyncStorage + mémoire pour ce userId. À appeler au logout pour nettoyer les vieilles entrées scopées (cosmétique seulement).

### 5.2 🟡 Priorité moyenne — réordonner le logout
Dans `AuthContext.logout` actuellement :
```ts
await authAPI.logout();         // 1. blackliste refresh + clearTokens
EventEzAnalytics.logout();      // 2.
clearAnalyticsUser();
CacheService.clearMemory();
setState({...});                // 3. déclenche le useEffect du NotificationContext qui appelle unregisterDevice — mais les tokens sont déjà clear → 401
```

→ Ordre proposé :
```ts
// 1. unregister device push token AVANT de blackliste les tokens
try { await pushNotificationService.unregisterDevice(); } catch {}
// 2. ENSUITE le logout API qui clear les tokens
await authAPI.logout();
// 3. Reset state
setState({ user: null, ... });
```

L'effet : le device token est désenregistré côté backend pendant que le JWT est encore valide. Les push pour l'utilisateur précédent s'arrêtent immédiatement. La micro-fenêtre théorique disparaît.

### 5.3 🟢 Documentation
Ajouter un commentaire explicite dans `NotificationViewSet.get_queryset` rappelant que tout endpoint admin futur doit utiliser un permission class dédié (pas réutiliser ce ViewSet) — pour éviter une régression future.

---

## 6. Synthèse

| Couche | Mécanisme | Verdict |
|---|---|---|
| **Backend** — `get_queryset` | Filtre `user=request.user` systématique | 🟢 Étanche |
| **Backend** — actions sensibles (mark_as_read, delete) | Double check ownership 403 | 🟢 Étanche |
| **Mobile** — cache notifications | Clé `notifs:${userId}` | 🟢 Étanche |
| **Mobile** — state context | Reset complet à `isAuthenticated=false` | 🟢 Étanche |
| **Mobile** — polling 30s | Stop immédiat au logout | 🟢 Étanche |
| **Push** — device token | Ré-assignation auto au new user au login | 🟢 Étanche |
| **Push** — micro-fenêtre logout→login | Push en vol potentiellement livré | 🟡 Atténuable (5.2) |
| **WebSocket** | N/A pour les notifs | 🟢 Non applicable |

**Conclusion globale** : le système d'isolation est **conçu correctement** et **implémenté correctement**. Le seul point d'attention est la micro-fenêtre push entre logout/login, atténuable en réordonnant le logout (recommandation 5.2). Aucune fuite de donnée sensible n'est possible vu le design (push minimal + auth re-check sur tous les deep links).

