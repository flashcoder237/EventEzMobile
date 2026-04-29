# 🔍 UX AUDIT — PARCOURS ANALYTICS

**Date** : 2026-04-29
**Périmètre** : `apps/analytics/{views,services/*}.py` côté backend + `EventEzMobile/src/screens/organizer/{AnalyticsDashboardScreen,EventAnalyticsScreen}.tsx` + `EventEzMobile/src/api/analytics.ts`.

---

## 🟢 POINTS FORTS

1. **Découpage backend propre** — services séparés par domaine (`event_analytics`, `payment_analytics`, `registration_analytics`, `user_analytics`, `report_generator`). Chaque service expose des `staticmethod` réutilisables.
2. **Permissions** — `IsAdminOrOrganizer` au niveau ViewSet bloque les `user` simples ; les organisateurs sont scopés par `organizer_id` sur les actions `summary`.
3. **UX éditoriale** — AnalyticsDashboardScreen : hero card gradient (revenus totaux), KPI grid 2x2, time range chips (7d/30d/90d/1y), barres chartées en gradient indigo/vert. Cohérent avec le style guide.
4. **Export** — backend expose `/analytics/export/?format=csv|xlsx|pdf` (cf. `apps/core/export_service.py`) et `/analytics/reports/{id}/export/` pour les rapports persistés.

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **CRITIQUE** — Le dashboard mobile affiche 0/0/0 (response shape mismatch)
**Fichiers** : `AnalyticsDashboardScreen.tsx:83-89` vs `apps/analytics/services/payment_analytics.py:110` + `registration_analytics.py:87`.

Mobile lit :
```typescript
const totalRevenue = summary?.total_revenue || revenueData?.total || 0;
const totalRegistrations = summary?.total_registrations || registrationData?.total || 0;
const totalEvents = summary?.total_events || 0;
const avgAttendance = summary?.avg_attendance_rate || 0;
const revenueTrend = summary?.revenue_trend || 0;
const registrationTrend = summary?.registration_trend || 0;
```

Mais le backend `dashboard_summary` retourne :
```json
{
  "event_summary": {"total_events": ..., "avg_fill_rate": ...},
  "revenue_summary": {"total_revenue": ..., "payment_count": ...},
  "registration_summary": {"summary": {"total_registrations": ...}}
}
```

Aucune clé `total_revenue` à la racine. Aucune clé `total_registrations`. **Aucun trend** n'est calculé côté backend.

Et `revenueData?.total` / `registrationData?.total` n'existent pas non plus dans `revenue_summary` / `registration_summary` — le backend retourne `total_revenue` et `summary.total_registrations`.

**Conséquence** : depuis le déploiement, **tous les organisateurs voient un dashboard à zéro**, sauf que le backend a les bonnes données. C'est un bug fonctionnel total qui passe inaperçu parce que l'écran "marche" (pas de crash).

**Action** :
1. Mapper côté mobile : `summary?.revenue_summary?.total_revenue`, `summary?.registration_summary?.summary?.total_registrations`, `summary?.event_summary?.total_events`, `summary?.event_summary?.avg_fill_rate`.
2. Ajouter au backend `dashboard_summary` un calcul de `revenue_trend` et `registration_trend` (compare période courante vs période précédente) — sinon les trend pills mobile sont des données mortes.
3. **Tests d'intégration** sur le contrat `dashboard_summary` pour empêcher la régression.

### 2. **CRITIQUE** — Data isolation : organisateur peut voir les analytics des events des autres
**Fichier** : `apps/analytics/views.py`

Cinq actions acceptent un `event_id` query param **sans vérifier que l'event appartient à l'organisateur connecté** :
- `events` (ligne 96-98) : `EventAnalyticsService.get_event_performance(event_id)` — pas de check.
- `event_registrations` (ligne 121-126) : `get_registration_timeline(event_id, ...)` — pas de check.
- `predict_attendance` (ligne 138-141) : `predict_attendance(event_id)` — pas de check.
- `revenue` avec `event_id` (ligne 178-184) : `get_revenue_summary(event_id, ...)` — pas de check.
- `registrations` avec `event_id` (ligne 240-256) : `get_*` — pas de check.

L'`organizer_id = str(request.user.id)` est extrait **mais jamais combiné avec `event_id`**. Un organisateur Bob peut envoyer `?event_id=<id-event-Alice>` et obtenir le revenu, le timeline d'inscriptions, la prédiction de remplissage d'un event qui ne lui appartient pas.

**Conséquence sécurité** : fuite de business intelligence concurrent (revenus, taux de conversion, audience). Même classe de bug que le bug WebSocket fixé en P19 (cross-conversation message posting).

**Action** : créer un helper `_assert_event_owned(request, event_id)` qui :
- charge `Event.objects.get(id=event_id)`,
- si `request.user.role == 'organizer'`, vérifie `event.organizer_id == request.user.id` et raise 403 sinon,
- si `is_staff` ou `role == 'admin'`, laisse passer.
Appeler ce helper en tête des 5 actions concernées.

### 3. **CRITIQUE** — Erreurs API totalement silencieuses (3 niveaux)
**Fichier** : `AnalyticsDashboardScreen.tsx:54-67`

```typescript
const [summaryRes, revenueRes, registrationRes] = await Promise.all([
  analyticsAPI.getDashboardSummary(params).catch(() => ({ data: null })),
  analyticsAPI.getRevenueAnalytics(params).catch(() => ({ data: null })),
  analyticsAPI.getRegistrationAnalytics(params).catch(() => ({ data: null })),
]);
...
} catch (error) {
  if (__DEV__) console.error('Erreur analytics:', error);
}
```

Trois niveaux d'absorption d'erreurs :
1. `.catch(() => ({ data: null }))` par appel — silencieux.
2. `try/catch` global — silencieux en prod (`__DEV__`).
3. Aucune indication utilisateur.

Si l'utilisateur est offline ou si le token expire, le dashboard reste figé à 0/0/0 sans message. Combiné au bug #1, c'est invisible — exactement le contre-exemple à éviter.

**Action** :
- Remplacer les `.catch(() => null)` par un compteur d'erreurs et un toast unifié si > 1 fetch échoue.
- Empty state honnête si tous les calls reviennent vides.
- Bandeau "Réessayer" si offline (déjà détectable via `useNetworkStatus`).

---

## 🟠 PROBLÈMES SÉVÉRITÉ ÉLEVÉE

### 4. "FCFA" hardcodé pour XAF/XOF dans tout le screen
**Fichiers** : `AnalyticsDashboardScreen.tsx:38`, `EventAnalyticsScreen.tsx:69`

```typescript
const platformCurrency = walletCurrency === 'XAF' || walletCurrency === 'XOF' ? 'FCFA' : walletCurrency;
```

Même incohérence que dans WalletScreen (déjà documentée dans `UX_AUDIT_PARCOURS_WALLET.md`). XAF et XOF sont des **devises distinctes** (Cemac vs Uemoa), pas le même franc CFA pour les marchés financiers. Les agréger sous "FCFA" est une commodité grand public mais qui cache la devise réelle dans les exports/reports.

**Action** : exposer un helper `formatCurrencyLabel(code, locale)` central qui peut afficher "FCFA" en UI grand public mais qui garde le code ISO en interne (export CSV, prop `accessibilityLabel`).

### 5. `formatNumber` masque les vraies valeurs (`1.5K`, `2.3M`)
**Fichier** : `EventAnalyticsScreen.tsx:101-104`

```typescript
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};
```

Pour un dashboard analytics, les organisateurs **veulent** les chiffres exacts. "1.5K" peut signifier 1452 ou 1499 — sur 100 events de 1500 places, ce flou rend l'analyse impossible. Acceptable sur une card de header décorative, pas sur un KPI.

**Action** : afficher le chiffre brut (`Intl.NumberFormat`) + une variante compacte en accessibility label, pas l'inverse.

### 6. Charts sont des stubs (max 7 barres, hauteur relative)
**Fichier** : `AnalyticsDashboardScreen.tsx:351-371` et `405-425`

```typescript
{(registrationData.timeline as any[]).slice(-7).map(...)}
```

Le backend peut retourner 12 mois pour `timeRange='1y'`, mais le mobile n'affiche jamais que les 7 derniers points → graphique annuel coupé à 7 mois. Sans axe Y, sans tooltip, sans grille. Si toutes les valeurs sont zéro sauf une (le pic d'un event), seule cette barre se voit, les autres font 0% de hauteur → illusion d'absence d'historique.

**Action** : intégrer `react-native-svg-charts` ou `victory-native` (déjà compatible Expo SDK 52+). À défaut, au moins :
- afficher tous les points retournés (pas slice -7),
- afficher un mini-axe Y avec min/max,
- empty state "Trop peu de données pour un graphique" si < 3 points.

### 7. `predict_attendance` exposé backend mais inutilisé mobile
Backend a `@action predict_attendance` (line 128) — utile pour aider un organisateur à doser sa promo. Aucun appel côté mobile.

**Action** : ajouter un bandeau "Prédiction de remplissage" sur EventAnalyticsScreen quand `event.start_date > now` — ML output non exploité.

### 8. `IsAdminOrOrganizer` permet à tout staff de voir TOUTE analytics
**Fichier** : `apps/analytics/views.py:26`

`is_staff=True` → bypasse le filtre `organizer_id`. Acceptable pour admins, mais des comptes "modérateur" pourraient être créés `is_staff=True` par mégarde et hériter de l'accès analytics complet (alors que la modération devrait être bornée à la validation/suspension).

**Action** : exiger explicitement `role == 'admin'` (et non pas seulement `is_staff`) pour le bypass organizer_id.

---

## 🟡 PROBLÈMES MOYENS

### 9. `dashboard_summary` ne calcule pas de trends
Backend ne retourne ni `revenue_trend` ni `registration_trend`. Mobile affiche systématiquement "—" (flat). Soit on le calcule (compare période précédente), soit on retire les trend pills.

### 10. Filtres date `start_date`/`end_date` non passés depuis mobile
Mobile envoie `period: '7d' | '30d' | '90d' | '1y'`, mais backend attend `start_date` et `end_date` (strict ISO `'%Y-%m-%d'`). Les filtres mobile **n'ont aucun effet** côté backend → toutes les périodes affichent les mêmes chiffres (totaux all-time).

**Action** : convertir `period` en `(start_date, end_date)` côté mobile avant l'appel, ou ajouter un champ `period` côté backend.

### 11. `getEventAnalytics` mobile passe `event_id` mais l'action `events` retourne `get_event_performance` qui ignore les filtres date
EventAnalyticsScreen affiche les analytics globales d'un event, pas une période. Pas un bug mais un manque de pertinence si l'orga veut voir "les inscriptions du dernier mois sur cet event".

### 12. Aucun cache mobile sur analytics
Pas d'utilisation de `useQuery` (le hook custom du projet). Chaque retour à l'écran refetche tout. Pour des données qui changent peu (revenus daily), c'est gaspillage de réseau. Cf. memory `Cache & Offline (2026-03-04)` — pattern stale-while-revalidate à appliquer.

### 13. `report_generator` produit des PDF mais l'écran "Reports" mobile n'est pas câblé
`navigation.navigate('Reports')` au pillule "Rapports" et au quick link → l'écran existe mais le générateur est sous-utilisé (vérifier).

---

## 🟢 PROBLÈMES MINEURS

### 14. `IsOwnerOrReadOnly` sur `DashboardWidgetViewSet` mais pas sur `DashboardViewSet.widgets` action
La sub-action `widgets/{id}/widgets` retourne tous les widgets du `dashboard.owner` sans filtrer par permission du requester. Si Bob partage son dashboard avec Alice, Alice voit ses widgets — c'est OK — mais s'il y a un widget privé non-shared, il fuite quand même.

### 15. Mobile `analyticsAPI` typé `any` partout
Aucune définition TS pour les retours `dashboard_summary`, `events`, etc. → on perd l'autocomplétion et les bugs de shape (cf. #1) ne sont pas détectés au compile.

---

## 📊 RÉSUMÉ PAR SÉVÉRITÉ

| # | Sévérité | Couche | Problème |
|---|---|---|---|
| 1 | 🔴 Critique | Mobile | Dashboard affiche 0/0/0 (mismatch shape) |
| 2 | 🔴 Critique | Backend | Data isolation : organizer voit analytics d'autres events |
| 3 | 🔴 Critique | Mobile | Erreurs API silencieuses sur 3 niveaux |
| 4 | 🟠 Élevé | Mobile | "FCFA" hardcodé pour XAF/XOF |
| 5 | 🟠 Élevé | Mobile | `formatNumber` (1.5K) masque les vraies valeurs |
| 6 | 🟠 Élevé | Mobile | Charts stubs (slice -7, pas d'axe Y) |
| 7 | 🟠 Élevé | Mobile | `predict_attendance` non utilisé |
| 8 | 🟠 Élevé | Backend | `is_staff=True` bypasse organizer scope |
| 9 | 🟡 Moyen | Backend | Pas de calcul de trends |
| 10 | 🟡 Moyen | Mobile | `period` non converti en dates côté front |
| 11 | 🟡 Moyen | Backend | `events?event_id=X` ignore les filtres date |
| 12 | 🟡 Moyen | Mobile | Pas de cache stale-while-revalidate |
| 13 | 🟡 Moyen | Mobile | Reports écran pas vérifié (potentiellement orphelin) |
| 14 | 🟢 Mineur | Backend | Widgets privés peuvent fuiter via `dashboard.widgets` |
| 15 | 🟢 Mineur | Mobile | `analyticsAPI` typé `any` partout |

---

## 🎯 PRIORISATION POUR IMPLÉMENTATION

**Round 1 — Critiques (à faire MAINTENANT)** :
- ✅ Fix #1 : Mapper la bonne shape côté mobile (le dashboard fonctionne enfin)
- ✅ Fix #2 : `_assert_event_owned` helper + appel dans les 5 actions
- ✅ Fix #3 : Toast erreur unifié sur dashboard
- ✅ Fix #10 : Conversion `period` → `start_date`/`end_date` côté mobile
- ✅ Fix #8 : `role == 'admin'` au lieu de `is_staff` pour bypass

**Round 2 — Élevé (faisable rapidement)** :
- Fix #4 : helper `formatCurrencyLabel` partagé
- Fix #5 : `formatNumber` brut + variant compacte en a11y
- Fix #9 : Compute trends côté backend

**Round 3 — Polish/refactor** :
- Fix #6 : librairie graphique
- Fix #7 : ajout predict_attendance
- Fix #12 : `useQuery` sur dashboard
- Fix #13 : audit screen Reports

---

> **Verdict** : la couche backend est riche (5 services, predict_attendance, retention cohort) mais **mal câblée côté mobile** — l'utilisateur final voit un dashboard vide alors que le backend a la donnée. Combiné à un bug de data isolation côté organizer, c'est le parcours le plus dégradé du produit. Round 1 doit passer avant tout pitch commercial sur "EventEz fournit des analytics aux organisateurs".

*Audit réalisé par lecture de code — 2026-04-29.*
