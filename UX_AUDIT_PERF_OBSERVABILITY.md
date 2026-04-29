# Audit Performance & Observabilité

**Date** : 2026-04-29
**Périmètre** : Backend Django (queries, logs, monitoring) + Mobile RN (logs, instrumentation, perf rendering).

**Verdict global** : 🟡 **Sain mais sous-instrumenté.** Les optimisations de queries existent mais ne sont pas systématiques. Il **manque un monitoring d'exceptions en production** (Sentry) côté backend ET mobile — toute exception en prod est invisible.

---

## 1. Backend — queries

### 1.1 Optimisations existantes

`grep "select_related\|prefetch_related"` retourne 24 occurrences dans `apps/events/`, `apps/registrations/`, `apps/notifications/`. Bons exemples :
- `EventDetailSerializer.get_recent_registrants` utilise `select_related('user')` → évite N+1 sur 5 inscrits.
- `PaymentViewSet.get_queryset` filtre via `Q(user=user) | Q(registration__event__organizer=user)` — la jointure est inévitable, OK.

### 1.2 Risques résiduels

#### A. EventListSerializer charge des relations à chaque event

```python
class EventListSerializer(serializers.ModelSerializer):
    category = EventCategorySerializer(read_only=True)
    tags = EventTagSerializer(many=True, read_only=True)
    ticket_price_range = serializers.SerializerMethodField()
    ...
```

Si `EventViewSet.list` retourne 50 events, chaque event fait une requête pour `category`, `tags` (M2M), `ticket_price_range` (probablement aggregate sur ticket_types). **Risque N+1 sur la liste publique** des events.

**Recommandation** : `get_queryset` du `EventViewSet.list` doit faire :
```python
queryset.select_related('category').prefetch_related('tags', 'ticket_types')
```

À vérifier ligne par ligne.

#### B. EventDetailSerializer.get_visible_attendees_count

Récemment livré (P8) :
```python
def get_visible_attendees_count(self, obj):
    return Registration.objects.filter(
        event=obj,
        status__in=['confirmed', 'checked_in'],
        user__show_in_attendees=True,
    ).count()
```

→ 1 requête par event chargé. Sur la page détail c'est OK (1 event), mais si jamais utilisé dans une liste, ce serait du N+1. À surveiller.

#### C. NotificationViewSet — pagination

`/notifications/` retourne tout par défaut. `notif_response.data?.count` côté mobile suggère DRF pagination active. À confirmer dans settings.

### 1.3 Monitoring de slow queries

🔴 **Pas configuré.** En prod, les queries > 1s ne sont pas loguées. Recommandation :
```python
# settings.py
LOGGING['loggers']['django.db.backends'] = {
    'level': 'DEBUG',  # capturer toutes les queries
    'filters': ['require_debug_false'],  # mais seulement quand DEBUG=False (paranoia)
    'handlers': ['file_slow_queries'],
}
```
Ou utiliser `django-silk` / `django-debug-toolbar` en staging.

---

## 2. Backend — logs et observabilité

### 2.1 Logging actuel

`config/settings.py` lignes 648-720 définit un `LOGGING` Django standard avec :
- Console handler (DEBUG en dev)
- File handlers (`logs/django.log`, `logs/errors.log`)
- Loggers `apps`, `django`, `celery`

✅ Couvre les besoins de dev. Les `logger.error/warning/info` pleuvent dans le code (~50+ occurrences).

### 2.2 🔴 Pas de Sentry en production

**Pas de `sentry_sdk` dans settings.py.** Conséquence : en prod, toute exception non-catchée est juste écrite dans `logs/errors.log` sur le serveur. Personne ne le voit en temps réel, pas d'alertes, pas de breadcrumbs, pas de session replay.

**Recommandation prioritaire** :
```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

if not DEBUG:
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,  # 10% des requests pour APM
        send_default_pii=False,  # RGPD : pas d'email/IP par défaut
        environment=os.environ.get('ENV', 'production'),
        release=os.environ.get('GIT_SHA'),
    )
```

Dépendance : `pip install sentry-sdk[django,celery]`. Configurer la DSN via env. Effort : 30 min.

### 2.3 PII dans les logs

Plusieurs `logger.info(f"...{user.email}...")` (notamment dans `apps/notifications/services.py` lignes 103, 142, 172, 176). En soi, l'email n'est pas un secret, mais c'est une donnée à caractère personnel. Pour conformité RGPD stricte, masquer :

```python
def safe_user_repr(user):
    return f"user_id={user.id}" if not settings.DEBUG else user.email
```

Effort : 1h pour sweep + remplacement.

### 2.4 Healthchecks

`HealthCheckView` existe (`/api/health/`). À enrichir éventuellement avec :
- Status DB (ping)
- Status Redis (ping)
- Status Celery (last heartbeat)
- Backlog de tâches Celery

---

## 3. Backend — throttling et rate limiting

✅ Bien couvert :
- `LoginThrottle`, `RegistrationThrottle` (auth)
- `PaymentCreateThrottle`, `PaymentProcessThrottle` (paiements)
- `PhoneOTPSendThrottle`, `PhoneOTPVerifyThrottle` (OTP)
- `RegistrationCreateThrottle` (inscriptions)
- WebSocket : 30 msg/60s par user, max 5 connexions/user

Couvre les vecteurs d'abus standards. Aucune recommandation supplémentaire.

---

## 4. Mobile — instrumentation

### 4.1 🔴 Pas de Sentry mobile

`__DEV__ && console.error(...)` est utilisé dans tous les `.catch()` du mobile. En prod (`__DEV__ === false`), **aucune erreur n'est remontée**. Ni l'utilisateur ni l'équipe ne voit les crashs / API errors.

**Recommandation** :
```bash
npx expo install @sentry/react-native
```
Puis dans `App.tsx` :
```tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: __DEV__,
  tracesSampleRate: 0.1,
});

export default Sentry.wrap(App);
```

Effort : 1h (install + DSN + smoke test). Mémoire interne note "Sentry retiré" dans un commit antérieur — il a peut-être été désinstallé volontairement, à reconfirmer avec l'équipe.

### 4.2 Logs analytics

`EventEzAnalytics` est utilisé pour `login`, `signup`, `logout` (cf `AuthContext.tsx`). Bonne base. Étendre éventuellement à des événements business (publication event, paiement réussi, refund demandé).

### 4.3 Performance rendering

Pas d'audit en profondeur (nécessite profiler React Native). Hypothèses raisonnables :
- ✅ Lazy-load EventDetails sections (P6) limite les fetches initiaux.
- ✅ Skeleton léger Discover (P7) limite la profondeur visuelle.
- ✅ Inverted FlatList ConversationScreen + grouping (mémoire).
- ⚠️ `useReducer` partout dans MyTickets → ok, pas de bottleneck noté.
- ⚠️ Confettis 150 particules (60 sur Android < 11 grâce P6) → pas de jank reporté.

### 4.4 Crash analytics

Couplé à Sentry mobile (4.1). En attendant, Expo Application Services (EAS) peut faire le minimum.

---

## 5. Mobile — patterns de fetch

### 5.1 Polling 30s sur unreadCounts

`NotificationContext` ligne 389-397 : interval 30s. Sur un device en background, l'AppState handler (ligne 369-386) refresh aussi au passage à `active`. Bonne couverture.

⚠️ **Attention** : 30s sur 4 endpoints (notifs, conversations, invitations, transfers) en parallèle = 8 requests/min. Multiplié par tous les users actifs = charge significative. Mitigations possibles :
- Backend : exposer `/dashboard/counts/` qui retourne les 4 counts en 1 requête.
- Mobile : extender l'interval à 60s, faire confiance au push pour le real-time.

### 5.2 Cache stale-while-revalidate

`CacheService` mémoire + AsyncStorage. Pattern bien pensé. Cache scope par userId déjà vérifié dans audit notifs.

---

## 6. Synthèse

| Domaine | État | Priorité fix |
|---|---|---|
| **Backend** N+1 prevention | 🟡 Partiel | 🟢 Améliorer EventListSerializer |
| **Backend** Sentry production | 🔴 Absent | 🔴 **Priorité haute** |
| **Backend** Slow query monitoring | 🔴 Absent | 🟡 Moyen |
| **Backend** PII in logs | 🟡 Email loggé | 🟡 Moyen (RGPD) |
| **Backend** Throttling | 🟢 Bien couvert | — |
| **Backend** Healthcheck | 🟢 Présent (peut être enrichi) | 🟢 Faible |
| **Mobile** Sentry | 🔴 Absent | 🔴 **Priorité haute** |
| **Mobile** Crash analytics | 🔴 Absent | 🔴 (couplé Sentry) |
| **Mobile** Perf rendering | 🟢 Optimisations livrées | — |
| **Mobile** Polling pattern | 🟡 4 endpoints/30s | 🟢 Endpoint dashboard agrégé |

## 7. Top 3 actions recommandées

1. **Installer Sentry backend + mobile** (1h chacun). Sans ça, on est aveugle aux exceptions en prod. C'est de loin le ROI le plus élevé.
2. **Endpoint `/api/dashboard/counts/`** pour réduire le polling 4×30s à 1×30s. Effort 1h backend + 30min mobile.
3. **Sweep PII logs** : remplacer `user.email` par `user.id` dans les 50+ occurrences logger.* du backend (script sed possible). Effort 1h.

Le reste est nice-to-have et peut attendre une phase d'optimisation dédiée (profiler RN, EXPLAIN ANALYZE des queries lentes, etc.).
