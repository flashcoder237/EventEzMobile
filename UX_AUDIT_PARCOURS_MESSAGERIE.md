# 🔍 AUDIT MESSAGERIE EventEz

**Date** : 2026-04-30
**Périmètre** : `apps/user_messages/{consumers,views,serializers,signals,models,tasks}.py` (3393 lignes), `eventez-frontend/src/{contexts/MessagingContext,hooks/useWebSocket,app/dashboard/messages/page}.tsx` (2799 lignes), `EventEzMobile/src/hooks/useMessagingWebSocket.ts` (558 lignes).

Total surface : **~7000 lignes** de code messagerie.

---

## 🟢 POINTS FORTS

1. **Sécurité données** : `create_message` du consumer a un check `participant_ids` strict (P19, audit data isolation 2026-04-29). Le bug WebSocket cross-conversation posting est fixé.
2. **Modèle riche** : `Conversation` avec types (direct/group/event), `posting_mode` (all/organizer_only/admins_only), `muted_users`, `creator`, `auto_delete_at`, `is_read_only`, `total_attachment_bytes`.
3. **Privacy** : `Message.read_by` respecte `User.show_read_receipts` (P19). Block list actif sur `create_message` (filtre les messages quand tous les participants ont bloqué).
4. **Soft delete** : `is_deleted=True` + `deleted_at` + content vidé. Le message reste en DB pour audit, le contenu est purgé.
5. **Edit tracking** : `is_edited`, `edited_at`. Pas de versioning historique mais flag visible.
6. **Connection limits** : `MAX_CONNECTIONS_PER_USER = 5` avec compteur Redis atomique (`_atomic_incr`/`_atomic_decr`).
7. **Rate limit WS** : `30 messages / 60s` côté consumer.
8. **Quota attachments** : `total_attachment_bytes` cumulé via signaux + F-update atomique pour éviter race au cumul.
9. **Cycle de vie événement** : `auto_delete_at` calculé à `event.end_date + 30 jours`, Celery task de nettoyage.

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **CRITIQUE** — `_setup_user_channels()` appelé AVANT `accept()` (RÉSOLU côté code, push fait)
**Fichier** : `apps/user_messages/consumers.py:71` (avant fix)

Le flow auth via query param appelait `await self._setup_user_channels()` avant `await self.accept()`. Or `_setup_user_channels` peut faire `self.send(...)` (cas max_connections dépassé), ce qui plantait avec `ValueError("Socket has not been accepted")`. Toutes les connexions WS via query param échouaient en silence.

**Status** : ✅ Fix poussé dans commit `007a1d6`. Restart serveur requis pour appliquer.

### 2. **CRITIQUE** — Pas de `group_add` pour la conversation lors d'un `message.send`
**Fichier** : `consumers.py:267-273`

`handle_message_send` fait `group_send` à `conversation_{id}` mais aucun consumer n'est dans ce groupe — `join_user_conversations` (`consumers.py:481`) ajoute le user au groupe `conversation_{id}` POUR SES CONVERSATIONS au moment du connect, mais quand un nouveau participant rejoint une conversation EXISTANTE en cours de session WS, il n'est pas auto-ajouté au groupe → il ne reçoit jamais les nouveaux messages temps réel.

**Conséquence UX** : un user créé une nouvelle conversation pendant que l'autre user est déjà connecté en WS. L'autre user ne reçoit pas les messages tant qu'il ne rafraîchit pas la page (qui re-trigger `connect()`).

**Action** : sur `message.send`, après création, faire `group_add` automatique pour tous les participants connectés en WS de cette conv. Ou alors s'abonner à un signal `Message.post_save` qui broadcaste à un groupe `user_{id}` pour chaque participant.

### 3. **CRITIQUE** — Le frontend reste bloqué sur "Connexion..." indéfiniment
**Fichier** : `eventez-frontend/src/hooks/useWebSocket.ts:79-86`

```typescript
ws.onopen = () => {
    setIsConnected(true);
    ...
};
```

`isConnected` est mis à `true` au moment de `onopen`. **MAIS** si la session JWT n'a pas `accessToken` (oubli de propagation, session NextAuth pas hydratée), `connect()` retourne early sans même essayer la connexion :

```typescript
if (!session?.accessToken) {
    return;  // ← isConnected reste false → "Connexion..." figé
}
```

Et il n'y a **aucun retry automatique** quand la session arrive APRÈS le mount. Le useEffect dépend de `[session?.accessToken]` (line 156) donc il devrait re-fire, mais si l'accessToken est temporairement undefined puis devient string, l'effect re-run et tente de connect. OK.

**Mais** si le serveur Django est down ou si le token est expiré, `ws.onerror` fire → on log un warning et on attend le `onclose` qui déclenche le retry exponentiel jusqu'à `MAX_RECONNECT_ATTEMPTS` (probablement 5). Au-delà : silence total. L'UI reste sur "Connexion...".

**Action** : exposer un état `connectionError` (déjà fait) + afficher un bouton "Réessayer" dans l'UI Messages quand `connectionError !== null` ET `!isConnected`. Actuellement, après MAX_RECONNECT_ATTEMPTS, l'utilisateur n'a aucun moyen de relancer manuellement sans hard refresh.

---

## 🟠 PROBLÈMES SÉVÉRITÉ ÉLEVÉE

### 4. Race condition sur `update_presence`
**Fichier** : `consumers.py:608-622`

`update_presence` itère les conversations du user et fait un `group_send` pour chacune. En cas de dizaines de conversations, c'est N envois séquentiels. Si l'user a 100 conversations, ça ralentit le `connect()` (présence broadcast à chaque conversation). Mieux : un seul `group_send` à `user_presence_{id}` que tous les contacts auraient rejoint.

### 5. `join_user_conversations` est O(N) DB queries au connect
**Fichier** : `consumers.py:481-488`

```python
async def join_user_conversations(self):
    conversation_ids = await self._get_user_conversation_ids()
    for conv_id in conversation_ids:
        await self.channel_layer.group_add(...)
```

`group_add` est async I/O à Redis. Pour un user avec 100 conversations, c'est 100 round-trips Redis sériels. Sur un serveur lent, ça peut prendre plusieurs secondes pendant lesquelles le WS est connecté mais "incomplet".

**Action** : `asyncio.gather(*[group_add(...) for conv_id in conversation_ids])` pour paralléliser. Réduit le temps de N×latency à 1×latency.

### 6. Typing indicators jamais nettoyés
**Fichier** : `consumers.py:632-644`

`create_typing_indicator` fait `get_or_create`. Si un user start typing puis sa connexion drop sans envoyer `typing.stop`, l'indicator reste en DB indéfiniment. Pas de TTL, pas de Celery cleanup.

**Action** : ajout d'un Celery beat task qui purge les `TypingIndicator` plus vieux que 60s. Ou `last_typed_at` avec auto-expiration.

### 7. Rate limit `_check_rate_limit` est local au consumer
**Fichier** : `consumers.py:185-196`

Le rate limit `30 msg / 60s` utilise `self._message_timestamps` — variable d'instance. Si un user a 5 connexions WS simultanées (depuis web + mobile + desktop app), chaque consumer compte indépendamment → rate limit total = 5×30 = 150 msg/60s. Le user peut spammer.

**Action** : déplacer le rate limit dans Redis (`SETEX` + `INCR` avec sliding window). Compter par user_id, pas par connexion.

### 8. `serialize_message` ne masque pas les attachments aux users qui n'ont pas accès
**Fichier** : `consumers.py:580-606`

```python
attachments = list(message.attachments.values('id', 'file', 'file_name', 'attachment_type', 'file_size'))
```

Quand un message est broadcast via WebSocket, tous les participants reçoivent les URLs d'attachments. Mais le check de permission n'est pas re-fait à ce niveau — si un user a été retiré de la conv entre l'envoi et le broadcast, il pourrait recevoir l'URL. Edge case rare mais possible.

**Action** : avant broadcast, re-vérifier `conversation.participants.filter(id=recipient.id).exists()` côté handler `message_new` du consumer destinataire.

### 9. Mobile WS reconnect pas adapté au background app
**Fichier** : `EventEzMobile/src/hooks/useMessagingWebSocket.ts`

À vérifier mais typiquement : sur iOS, l'app en background suspend les sockets après ~30s. Le mobile devrait écouter `AppState` et reconnecter quand `active`. Si pas câblé, l'utilisateur revient sur l'app après 1 min et voit `Connexion...` sans reconnect auto.

---

## 🟡 PROBLÈMES MOYENS

### 10. `_authenticated` flag race
**Fichier** : `consumers.py:30, 150`

`self._authenticated = True` est set après `get_user`. Mais entre `accept()` et `_authenticated=True`, un message peut arriver (improbable mais possible) et passer le check `if not self._authenticated` (ligne 216). Pas critique car la fenêtre est de quelques ms.

### 11. `disconnect` ne gère pas le cas `connect()` qui fail
**Fichier** : `consumers.py:166-183`

```python
if hasattr(self, 'user') and self._counter_incremented:
    await sync_to_async(self._atomic_decr)(...)
```

Le `_atomic_decr` ne fire que si `_counter_incremented`. OK. Mais `hasattr(self, 'user')` peut être False si l'auth a fail très tôt → on ne décrémente jamais. Heureusement `_counter_incremented` n'est True que si `_setup_user_channels` a fini → check redondant mais correct.

### 12. Pas de pagination sur les conversations dans le consumer
**Fichier** : `consumers.py:500-505`

`_get_user_conversation_ids` retourne TOUTES les conversations de l'user. Pour un user avec 1000+ conversations (rare mais possible pour un organizer actif), `join_user_conversations` fait 1000 group_adds. Solution : limiter aux N conversations actives récentes (dernier `last_message_at < 30 jours` par exemple).

### 13. Présence broadcast non-debouncé
**Fichier** : `consumers.py:608-622`

`update_presence('online')` est appelé à chaque connect. Si un user a un WS qui flap (mauvaise connexion), il broadcaste online/offline en boucle → spam de messages WS sur tous ses contacts.

**Action** : debounce de 30s sur les broadcasts presence (cache lock Redis).

### 14. `ws_protocol DisallowedHost` en local dev
Le test `python test_conv.py` a montré que l'APIClient utilise `testserver` qui n'est pas dans `ALLOWED_HOSTS`. Pas un bug runtime mais entrave les tests.

**Action** : `if DEBUG: ALLOWED_HOSTS += ['testserver']` dans settings.

---

## 🟢 PROBLÈMES MINEURS

### 15. `console.warn` partout au lieu d'un système de log centralisé
**Fichier** : `useWebSocket.ts:108-138`

Plusieurs `console.warn` en dev. En prod ils ne sont pas envoyés à Sentry. Visibilité opérationnelle limitée.

### 16. Pas de `heartbeat` / ping côté serveur
Daphne ne ping pas les clients WS. Sur un proxy avec idle timeout, la connexion peut être fermée silencieusement. Ajout d'un ping toutes les 30s côté consumer.

### 17. Pas de versioning du protocole WS
Si on change le format des messages (`message.new` → `message.created`), tous les clients déployés breakent. Un champ `protocol_version` dans le handshake serait robuste.

---

## 📊 RÉSUMÉ PAR SÉVÉRITÉ

| # | Sévérité | Couche | Problème | Status |
|---|---|---|---|---|
| 1 | 🔴 | Backend | `accept` après `setup_user_channels` | ✅ FIX commit 007a1d6 |
| 2 | 🔴 | Backend | Nouveau participant ne reçoit pas les messages WS | OUVERT |
| 3 | 🔴 | Frontend | UI bloquée sur "Connexion..." (pas de retry manuel) | OUVERT |
| 4 | 🟠 | Backend | Presence broadcast O(N conversations) | OUVERT |
| 5 | 🟠 | Backend | join_user_conversations sériel O(N) | OUVERT |
| 6 | 🟠 | Backend | Typing indicators jamais purgés | OUVERT |
| 7 | 🟠 | Backend | Rate limit local par WS, contournable | OUVERT |
| 8 | 🟠 | Backend | serialize_message ne re-check pas permission | OUVERT |
| 9 | 🟠 | Mobile | WS reconnect pas câblé sur AppState | À VÉRIFIER |
| 10 | 🟡 | Backend | `_authenticated` race window | OUVERT |
| 11 | 🟡 | Backend | disconnect cleanup robuste | OK |
| 12 | 🟡 | Backend | Pas de pagination conversations connect | OUVERT |
| 13 | 🟡 | Backend | Présence flap non-debouncé | OUVERT |
| 14 | 🟡 | Tests | testserver pas dans ALLOWED_HOSTS | OUVERT |
| 15 | 🟢 | Frontend | console.warn pas Sentry | OUVERT |
| 16 | 🟢 | Backend | Pas de heartbeat WS | OUVERT |
| 17 | 🟢 | Tous | Pas de protocole versioning | OUVERT |

---

## 🎯 PRIORISATION POUR IMPLÉMENTATION

**Round 1 — Critiques (à faire MAINTENANT)** :
- ✅ Fix #1 : Accept avant setup (DÉJÀ FAIT)
- 🔴 Fix #2 : Auto-join groupe conversation pour nouveaux participants (signal post_save Conversation.participants M2M)
- 🔴 Fix #3 : Bouton "Réessayer la connexion" dans UI Messages quand connectionError + !isConnected

**Round 2 — Élevé** :
- Fix #5 : `asyncio.gather` pour `join_user_conversations`
- Fix #6 : Celery cleanup des typing indicators
- Fix #7 : Rate limit Redis cross-connection
- Fix #9 : AppState handler mobile

**Round 3 — Polish** :
- Fix #16 : heartbeat Daphne
- Fix #14 : ALLOWED_HOSTS testserver en DEV
- Fix #17 : protocol versioning

---

> **Verdict immédiat** : le bug critique #1 (accept order) est ce qui bloquait les WS. Push fait. Restart Django et l'UI Messages devrait passer de "Connexion..." à "Connecté".
>
> **Verdict global** : la messagerie a une bonne fondation (sécurité conv-isolation, soft delete, edit tracking, block list, quota attachments) mais souffre de **race conditions sur les groupes WS** et d'**absence de feedback UX en cas d'échec connexion**. Les bugs #2 et #3 doivent être attaqués pour avoir une expérience messagerie fiable.

*Audit réalisé par lecture de code — 2026-04-30.*
