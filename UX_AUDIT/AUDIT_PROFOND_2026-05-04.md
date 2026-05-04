# 🎯 AUDIT PROFOND — EventEz Mobile

**Date :** 2026-05-04
**Périmètre :** `EventEzMobile/` complet vs backend Django (`EventEzBackend/`)
**Méthode :** 5 agents spécialisés (auth/paiements, messaging, organizer/admin, events/billets, infra) + cartographie endpoints backend × mobile

---

## 0. Verdict global

L'app est **en avance sur la maturité du frontend web** sur plusieurs aspects (offline, hooks bien architecturés, refresh-token mutex robuste, deep links propres, AI assist event creation, scan offline-queue). **Mais elle traîne 3 dettes critiques** :

1. **Pas de crash reporting** (Sentry/Bugsnag absents) → tout crash en prod = silencieux.
2. **Idempotency key paiement libérée trop tôt** → risque double débit sur retry réseau.
3. **Une douzaine de features backend complètes sont totalement invisibles ou en stub UI** — le backend est plus riche que ce que le mobile expose.

Score subjectif par domaine :
- Auth : **9/10**
- Paiements : **7/10**
- Events spectateur : **8/10**
- Organizer : **7/10**
- Messagerie : **8/10**
- Admin / Treasury : **4/10**
- Gamification / Referrals : **5/10**
- Infra non-fonctionnelle (Sentry, i18n, tests) : **5/10**

---

## 1. Forces réelles (à préserver)

| Domaine | Force | Référence |
|---|---|---|
| Auth | Mutex `ensureFreshAccessToken` + `sessionVersion` qui invalide les refreshes en vol au logout | `src/api/instance.ts:96-158` |
| Auth | Mode mémoire-seule pour rememberMe=false (pas de SecureStore) | `instance.ts:365-396` |
| Auth | Détection FormData polyfill RN + bypass Axios + fallback `fetch` natif | `instance.ts:34-45`, `config.ts:47-104` |
| Paiements | Polling avec backoff progressif + distinction erreurs transitoires / définitives | `hooks/usePaymentVerification.ts` |
| Paiements | Fallback `fetch` natif si Axios `ERR_NETWORK` sur `verify_payment` | `api/payments.ts:28-55` |
| Devises | Stratégie mono-currency respectée — `FXIndicator` purement informatif | `components/payment/FXIndicator.tsx`, `useCurrencyConversion.ts` |
| Scan | `useCheckinQueue` : queue offline persistée, parse multi-format (`/verify/t/{id}` ET `/verify/{id}`), retry intelligent | `hooks/useCheckinQueue.ts`, `screens/organizer/QRScannerScreen.tsx` |
| Messaging | WebSocket avec watchdog handshake 15s, refresh JWT inline, queue messages avant `auth.success`, codes permanents non-reconnectés | `hooks/useMessagingWebSocket.ts:76-330` |
| Messaging | State reducer avec dédup tempMessage par contenu+timestamp <60s | `hooks/useMessageState.ts:173-195` |
| Caching | `useQuery` SWR + `CacheService` 2-niveaux (mémoire LRU 50 + AsyncStorage) | `hooks/useQuery.ts`, `services/CacheService.ts` |
| Drafts | Auto-save 3s debounced + drafts nommés via `useNamedDrafts` | `screens/organizer/EventCreateScreen.tsx:120-197` |
| AI | Quick-create event entièrement branché (génération + tracking quota daily) | `hooks/useEventFormAI.ts`, `api/misc.ts:174-195` |
| Onglets event | **TOUS les 12 onglets implémentés** (About, Agenda, Tickets, Location, Reviews, Sponsors, Venue, CFP, Volunteers, Newsletter, Virtual, Social) — pas de stubs marketing | `components/events/*Tab.tsx` |
| UX foundation | Font scaling clamp 1.3x (a11y sans casser layouts), Montserrat patché en defaultProps | `App.tsx:5-35` |
| E2E | 43 scénarios Maestro couvrant tous les parcours majeurs | `.maestro/` |

---

## 2. Problèmes CRITIQUES (P0 — à corriger avant prod)

### 2.1 — Idempotency key paiement libérée prématurément

- `screens/payment/PaymentScreen.tsx:680` : `idempotencyKeyRef.current = null` après création paiement, AVANT que la vérification soit terminale.
- **Scénario casse :** réseau drop entre `createPayment` (200) et `processMobileMoney` → user retape → nouvelle clé → **double paiement** côté NotchPay.
- **Fix :** persister la clé en AsyncStorage jusqu'à `verify_payment === 'completed' | 'failed'` ou TTL 24h, ou rendre l'endpoint backend strict-idempotent (clé en DB + 409 si rejouée).

### 2.2 — Aucun crash reporting (Sentry / Bugsnag absent)

- `package.json` ne contient aucune dépendance crash reporting.
- `ErrorBoundary.tsx` console.log seulement en `__DEV__`.
- **Fix :** intégrer `@sentry/react-native`, brancher dans `componentDidCatch`, instrumenter `ensureFreshAccessToken` et `eventBus.emit('api-server-error')`.

### 2.3 — Cache AsyncStorage non purgé au logout

- `AuthContext.tsx:230` : `CacheService.clearMemory()` seulement → l'AsyncStorage garde les données du user précédent.
- **Scénario casse :** user A logout, user B login → user B voit brièvement des events cachés de A pendant la première frame.
- **Fix :** ajouter `CacheService.clearAll()` (mémoire + storage par préfixe) et l'appeler dans `logout()`.

### 2.4 — Token mémoire jamais validé contre le user actuel

- `instance.ts:365-367` : `memoryAccessToken` global, jamais comparé au `userId` courant.
- **Scénario casse :** restore iCloud d'un autre user → SecureStore change, mémoire est stale → premiers appels avec mauvais token.
- **Fix :** au boot, décoder le JWT et comparer `sub` avec le user hydraté ; si mismatch → `clearTokens()`.

### 2.5 — Pas d'offline queue générique pour mutations

- `useOfflineQueue` existe mais **ne gère QUE les messages**.
- Création événement, paiement, transfer ticket en offline → perte silencieuse.
- **Fix :** étendre en `useOfflineSync` générique (méthode/path/data/retryCount/timestamp).

### 2.6 — Validation signature QR absente côté mobile

- `QRScannerScreen.tsx:172-196` : parse l'ID mais ne vérifie pas la signature HMAC du QR.
- **Scénario casse :** QR forgé → mobile envoie au backend qui rejette, mais sur scan offline → ajouté à la queue → resync rejeté en bulk avec UX dégradée.
- **Fix :** vérifier la signature côté mobile avant d'ajouter à la queue offline (clé publique partagée), ou refuser tout QR sans signature valide.

### 2.7 — `PlatformSettingsScreen` est purement read-only

- `screens/admin/PlatformSettingsScreen.tsx:73-102` affiche les paramètres mais aucun `onPress` modifiable.
- L'admin doit aller sur Django web pour toucher commission, JWT TTL, gateway.
- **Fix :** brancher les routes `/api/admin/commission-configs/`, `/api/admin/subscription-plans/`, `/api/admin/country-prices/` (endpoints existent).

### 2.8 — Treasury sub-screens vides

- `screens/admin/treasury/TreasuryStaffScreen.tsx`, `TreasuryExpensesScreen.tsx`, `TreasuryReportsScreen.tsx`, `TreasuryShareholdersScreen.tsx` : **stubs**.
- L'API `treasuryAPI` (admin.ts) est complète (staff, expenses, payroll, dividends), aucun écran ne l'utilise.
- **Fix :** implémenter au moins Expenses (CRUD) et Reports (génération mensuelle).

---

## 3. Manquements MAJEURS (P1)

### 3.1 — Backend complet, mobile aveugle

Endpoints/features backend **non exposés** sur mobile (vérifié file-by-file) :

| Backend | Endpoints | État mobile |
|---|---|---|
| `events/{id}/duplicate/` | `eventsAPI.duplicateEvent` existe | ❌ Aucun bouton UI |
| `events/{id}/create_recurrence/` + `instances/` | `eventsAPI.createRecurrence` existe | ❌ Pas d'UI multi-occurrences |
| `events/{id}/upload_images/` | API existe | ❌ Galerie ajoutable seulement à la création |
| `events/{id}/request_feature/` | API existe | ❌ Aucun bouton "demander mise en avant" |
| `events/{id}/cancel/` | API existe | ⚠️ Pas d'UI organizer pour annuler avec raison |
| `events/{id}/group-chat/` | conversation auto-créée | ❌ Jamais consommé |
| `sessions/{id}/register/` & `unregister/` | `sessionsAPI.registerToSession` existe | ❌ Aucun bouton "S'inscrire" sur AgendaTab |
| `sessions/{id}/join_waitlist/` & `leave_waitlist/` & `waitlist_status/` | API existe | ❌ Aucun bouton waitlist sur sessions pleines |
| `sessions/{id}/scan_attendance/` | API existe | ⚠️ Branché dans QRScanner mais session picker rebuild à chaque focus |
| `sessions/calendar/` (agenda perso) | API existe | ❌ Pas de "Mon agenda" cross-events |
| `events/templates` (`event-templates/`) | EventTemplateViewSet existe | ❌ Pas de "Créer depuis modèle" |
| `cfp/toggle_open`, `accept`, `reject` | cfpAPI existe | ❌ Workflow organizer absent côté mobile (CfpTab user-side OK) |
| `gamification/badges/` (catalogue), `points/summary/` | Existent | ⚠️ `GamificationScreen` n'utilise que partiellement |
| `gamification/leaderboard/my_rank/` | Existe | ❌ Pas affiché |
| `referrals/codes/` POST/PATCH/DELETE | API existe (`referralsAPI.createCode`) | ❌ Pas de bouton "Créer code" |
| `referrals/track/` | Existe | ❌ Aucun deep link `?ref=XXX` capturé au démarrage de l'app |
| `social/connections/` send/accept/decline | API existe | ❌ Aucune UI (que la liste avec mes followers via users/followers) |
| `users/{id}/followers_count/`, `following_users/` | API existe | ❌ Pas d'écran "mes followers / following" |
| `notifications/preferences/` | API existe | ⚠️ Préférences globales on/off seulement, pas par catégorie |
| `notifications/vapid_public_key/` | API existe | ❌ Web push (non pertinent mobile, OK) |
| `live-questions`, `live-polls` | liveAPI existe | ❌ **Aucun écran live Q&A ni polls** branché côté spectateur (LiveEventScreen existe mais non audité — probablement coquille vide) |
| `feedback/event_stats/`, `flags/resolve/`, `unresolved/` | API existe | ❌ ModerationScreen ne traite pas les flags (que les events) |
| `audit/logs/export/` | Existe | ❌ Pas de bouton export CSV depuis AuditLogsScreen |
| `payments/transactions/export/` | Existe | ❌ Pas branché dans Wallet |
| `payments/{id}/calculate_usage_fees/` | API existe | ⚠️ Branchée mais jamais déclenchée par l'UI |
| `analytics/predict_attendance/` | Existe | ❌ Pas exposé (feature ML inutilisée) |
| `analytics/events/`, `analytics/users/`, `analytics/registrations/` | Existent | ⚠️ AnalyticsDashboardScreen ne consomme que `dashboard_summary` |
| `dashboard-widgets/`, `dashboards/` | CRUD exists | ❌ Pas de dashboard custom builder |
| `webhooks/` (integrations) | API existe | ❌ Pas d'UI organizer Zapier/webhook |
| `treasury/dividends/distribute/`, `preview/` | API existe | ❌ Stubs |
| `volunteer-roles/` CRUD organizer | API existe | ❌ `VolunteerScreen` user-side OK, mais pas d'UI organizer pour créer rôles |
| `volunteer-tasks/{id}/assign/`, `complete/` | Existent | ❌ Branchés partiellement |
| `seating-plans/` création, `floor-plans/` création | API existent | ❌ VenueTab affichage-only, organizer ne peut pas dessiner |
| `recommendations/record_interaction/` | Existe | ⚠️ Appelée nulle part — recos affichées mais pas trackées |
| `recommendations/similar/` (events similaires) | Existe | ❌ Pas affiché sur EventDetails |
| `recommendations/preferences/` | Existe | ❌ Pas d'écran préférences contenu |
| `system_status/incidents/{id}/add_update/` | Admin only | ❌ IncidentDetails read-only |
| `events/cities/` | AllowAny | ❌ Filtre par ville non utilisé dans Explore |
| `event-sponsors/{id}/confirm/` | Admin/organizer | ❌ Workflow confirm sponsor absent |

### 3.2 — Stubs / écrans avec logique manquante

- **`SendEmailModal`** importé dans `EventRegistrationsScreen.tsx:38` → composant existe mais ne fait pas d'appel API. `registrationsAPI.sendEmail()` existe et est inutilisé.
- **`DiscountFormScreen.tsx`** : navigation vers cet écran existe (`MyEventsScreen`, `DiscountManagementScreen`) mais l'écran lui-même n'a pas de logique create/update fonctionnelle.
- **`ReportsScreen.tsx`** : route déclarée, écran probablement vide/stub.
- **`LiveEventScreen.tsx`** : route déclarée, contenu absent (pas de live Q&A, polls).
- **`AdminDashboardScreen`** : aucun guard `user.role === 'admin'` (à comparer à `ModerationScreen.tsx:96` qui le fait correctement).

### 3.3 — Inconsistances mobile↔backend

- `eventsAPI.updateProfile` (auth.ts:128) : commentaire dit "backend n'accepte que PUT" — vérifier la cohérence avec `usersAPI.updateCurrentUser` (PATCH `/users/me/`). Risque de divergence.
- `currencyAPI.getAll()` appelle `/currencies/` mais **cet endpoint n'existe pas** dans `config/urls.py` (router DRF). À vérifier — possiblement 404.
- `comparisonAPI.compare(eventIds)` appelle `/events/compare/` mais l'@action est `compare` sur EventViewSet → URL réelle `/events/compare/` ✅ OK.
- `cfpAPI.getAll()` appelle `/call-for-papers/` mais le router backend ne l'enregistre pas (vérifié dans `config/urls.py`) — endpoint absent ou monté ailleurs. **À investiguer**.
- `recordingsAPI` : `/recordings/by_event/` — vérifier que le ViewSet est bien sous `/api/` (apps.virtual.urls).
- `messagesAPI.markMessageAsRead` (POST) vs backend WS `message.read` event : **double mécanisme**, possible désync (état lu marqué REST mais pas WS, autres clients ne sont pas notifiés).
- `notificationsAPI.preferences` : utilisé par `NotificationContext.tsx:63` (commentaire "existé mais pas utilisé") → préférences granulaires perdues.
- `usersAPI.updateProfile` (PUT `/users/update_profile/`) vs `updateCurrentUser` (PATCH `/users/me/`) : **deux chemins parallèles** pour la même opération, risque de désynchronisation des champs.
- Mobile envoie `participants` ET `participant_ids` dans `messagesAPI.createConversation` (messages.ts:19) — un des deux est probablement ignoré côté backend.
- `eventsAPI.exportIcal` retourne `ArrayBuffer` via Axios — le commentaire `misc.ts:153-156` lui-même rappelle qu'Axios+RN+Hermes corrompt parfois les binaires. `useExport` utilise `expo-file-system` correctement, mais `exportIcal` n'a pas migré → potentiellement buggé sur Hermes.

### 3.4 — Bugs latents identifiés

- **ConvertedPrice mute pour locale `en-FR`** : `useCurrencyConversion` ne reconnaît pas → `userCurrency=null` → utilisateur en France ne voit pas la conversion EUR.
- **`useCommissionConfig` sans countryCode dans TicketPurchaseScreen** (`screens/tickets/TicketPurchaseScreen.tsx:104`) → frais affichés en commission XAF par défaut, faux si event en XOF/KES.
- **Onboarding race** (`RootNavigator.tsx:130-144`) : flash possible de MainTabNavigator avant switch sur OnboardingScreen.
- **Deep link tokens jamais effacés du stack** (`verify-email/:token`, `reset-password/:token`) → token persiste en navigation state → fuite sur device volé.
- **Shadows bug dark mode** (`ThemeContext.tsx:68`) : `useMemo(() => ({ ...Shadows }), [isDark])` mais `Shadows` est statique → shadows light en mode sombre (visuel uniquement).
- **`ConnectionContext` health check trop agressif** : HEAD `/categories/` à chaque transition réseau → faux positifs "server down" sur WiFi instable.
- **MainTabNavigator non mémoïsé** : Reanimated shared values recréés à chaque render parent.
- **`useOfflineTickets`** retélécharge le QR à chaque cache, pas de check "déjà en cache".
- **`pushNotificationService`** : token Expo jamais ré-enregistré (peut expirer après mois). Backend `notifications.unregister_device` jamais appelé au logout.
- **Strings hardcodées partout** : `ErrorBoundary.tsx:112-118`, `RootNavigator.tsx`, etc. Les fichiers `i18n/fr.json` et `en.json` ne couvrent que ~100 clés sur ~400 attendues.
- **`fetchUpload`** et l'instance Axios ont des timeouts différents (60s vs 30s) → comportement imprévisible si upload lent.
- **`searchMessages`** (messages.ts:138) appelée par `ConversationScreen` mais utilisée comme filtre local — pas de pagination serveur.

---

## 4. Risques sécurité spécifiques

| # | Risque | Sévérité | Référence |
|---|---|---|---|
| 1 | Double paiement via retry après idempotency reset | 🔴 Critique | `PaymentScreen.tsx:680` |
| 2 | Token mémoire stale après iCloud restore → mauvais user authorise | 🔴 Critique | `instance.ts:365-470` |
| 3 | Cache AsyncStorage du user A visible 1 frame après login user B | 🟠 Élevé | `AuthContext.tsx:230` |
| 4 | Deep link token persistant en nav stack | 🟠 Élevé | `App.tsx:101-131` |
| 5 | Pas de signature QR vérifiée mobile-side | 🟠 Élevé | `QRScannerScreen.tsx:172-196` |
| 6 | PII en logs `__DEV__` (request data, headers) sur device réel | 🟡 Moyen | `instance.ts:48-54` |
| 7 | Pas de certificate pinning | 🟡 Moyen | `instance.ts:11-18` |
| 8 | Pas de biométrie / app lock sur cold start | 🟡 Moyen | `LoginScreen.tsx` |
| 9 | Push token Expo jamais ré-enregistré (expire ≥6 mois) | 🟡 Moyen | `services/pushNotificationService.ts` |
| 10 | `AdminDashboardScreen` sans guard role | 🟡 Moyen | `screens/admin/AdminDashboardScreen.tsx` |

---

## 5. Recommandations priorisées

### P0 — bloquants production (sprint immédiat)
1. **Sentry** : `@sentry/react-native` + `componentDidCatch` + bus events `api-server-error`/`api-auth-error`.
2. **Idempotency** : persister la clé jusqu'à statut terminal.
3. **Cache logout** : `CacheService.clearAll()` (mémoire + AsyncStorage par préfixe).
4. **Token validation au boot** : décoder JWT, comparer `sub` au user hydraté.
5. **Permission guard `AdminDashboardScreen`** (recopier le pattern de `ModerationScreen.tsx:96`).

### P1 — importants (2-3 sprints)
6. **Offline mutation queue générique** (renommer `useOfflineQueue` en `useOfflineSync`, ne plus le limiter aux messages).
7. **Brancher le `PlatformSettingsScreen`** sur les routes admin existantes.
8. **Implémenter `DiscountFormScreen`** (CRUD).
9. **`SendEmailModal` → `registrationsAPI.sendEmail`** + bulk variant.
10. **Implémenter Treasury Expenses + Reports** sub-screens.
11. **Ajouter "S'inscrire à la session" dans `AgendaTab`** (+ waitlist sessions).
12. **Refunds polling** sur `RefundRequestScreen` après création.
13. **Invoice PDF download** sur `PaymentSuccessScreen` (`invoicesAPI.downloadPdf` existe).
14. **Pousser `useCommissionConfig` à la `country_code` de l'event** dans `TicketPurchaseScreen`.
15. **Compresser les images** côté client avant upload (`expo-image-manipulator`).
16. **Vérifier endpoint `/currencies/` et `/call-for-papers/`** (404 probable, mobile appelle sans backend route).
17. **Refresh feature flags** sur `AppState=active` au lieu de mount-only.
18. **i18n complet** (extraire les ~400 strings hardcodées).

### P2 — qualité long terme
19. Biométrie / app lock sur cold start.
20. Certificate pinning sur les endpoints critiques (paiement, auth).
21. Charts dans Analytics (ChartWrapper existe mais n'est utilisé par aucun écran).
22. Comparison de périodes dans Analytics (vs N-1).
23. Référentiel d'invitations + parcours de découverte ("suggested users").
24. Listes followers / following / blocked unifiées.
25. Recurring events UI + duplicate event button.
26. Live Q&A + Polls (`LiveEventScreen` à compléter).
27. CI sur les Maestro E2E (actuellement manuels).
28. Tests unitaires sur `AuthContext`, `usePaymentVerification`, `useMessagingWebSocket` (couverture critique manquante).
29. Sponsor confirm/track-click admin workflow.
30. Recommendations: brancher `record_interaction` dans `EventCard` et `EventDetailsScreen`.

---

## 6. Fichiers où les corrections P0/P1 atterrissent

```
src/contexts/AuthContext.tsx              ← cache clear logout + JWT validation
src/api/instance.ts                       ← Sentry hooks + token validation
src/screens/payment/PaymentScreen.tsx     ← idempotency persist
src/services/CacheService.ts              ← clearAll() méthode
src/screens/admin/AdminDashboardScreen.tsx ← guard role
src/screens/admin/PlatformSettingsScreen.tsx ← brancher API admin
src/screens/admin/treasury/*.tsx          ← implémenter sub-screens
src/screens/organizer/DiscountFormScreen.tsx ← CRUD
src/components/organizer/SendEmailModal.tsx ← brancher API
src/components/events/AgendaTab.tsx       ← bouton register session
src/screens/payment/RefundRequestScreen.tsx ← polling
src/screens/payment/PaymentSuccessScreen.tsx ← invoice PDF
src/hooks/useOfflineQueue.ts → useOfflineSync.ts ← générique
src/hooks/useCommissionConfig.ts          ← propager countryCode
src/i18n/locales/fr.json + en.json        ← compléter ~400 clés
App.tsx                                   ← Sentry init
package.json                              ← @sentry/react-native
```

---

## Conclusion

L'app a une **excellente fondation technique** (auth, paiements, scan, messaging, drafts, AI) mais souffre d'un **delta backend↔frontend** : ~30 endpoints/features backend prêts ne sont pas utilisés, et plusieurs écrans (Treasury, Reports, DiscountForm, LiveEvent, PlatformSettings) sont des coquilles.

Trois bugs critiques (idempotency, cache logout, token validation) doivent être corrigés avant toute mise en prod sérieuse, et l'absence de Sentry rend toute investigation post-déploiement impossible.

---

## Annexe — Méthodologie

**Agents lancés en parallèle (5) :**
1. `Audit auth, payments, currency` — flow JWT, NotchPay/Stripe, FX strategy
2. `Audit messaging, notifications, social` — WebSocket, push, follow/invitations/gamification/referrals
3. `Audit organizer, admin, analytics` — MyEvents, Wallet, Scanner, Moderation, Treasury, Audit
4. `Audit events, sessions, registrations` — Discover, EventDetails (12 onglets), EventCreate, Agenda, Tickets
5. `Audit infra, hooks, navigation, UX` — App.tsx, providers, RootNavigator, theming, i18n, tests

**Cartographie endpoints faite manuellement** par lecture de :
- `EventEzBackend/config/urls.py`
- 16 fichiers `apps/*/urls.py` (analytics, audit, gamification, referrals, social, treasury, sponsors, live, virtual, volunteers, invitations, newsletters, system_status, integrations, recommendations + system_status admin/public)
- Extraction `@action` de tous les ViewSets via `grep`
- Cross-référence avec les 17 fichiers `EventEzMobile/src/api/*.ts`
