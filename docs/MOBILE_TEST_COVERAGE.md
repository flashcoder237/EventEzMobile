# Mobile Test Coverage — Audit & Plan

État au 2026-05-26. Couverture actuelle : **134 fichiers, 1230 tests Jest, 69 snapshots, 0 fail**.

## Ce qui est solide

| Catégorie | Fichiers | Note |
|---|---|---|
| API client wrappers (HTTP) | 30+ | Tous les endpoints couverts (events, payments, payouts, wallet, refunds, treasury, ticketTypes, …) |
| Hooks (useEventForm, useMessageState, useOfflineQueue, useCurrencyConversion) | 5+ | Logique métier isolée bien testée |
| Screens unitaires | 50+ | Auth, admin, organizer, payment, tickets, messages |
| Composants UI (snapshots) | 14 | Badge, Input, GradientButton, EmptyState, EventCard, MapEventCard, MenuItem, etc. |
| Intégration paiement | 1 | `src/__tests__/integration/payment.flow.test.ts` (registration → pay → verify, refund, CinetPay) |
| Performance | 3 | PaymentScreen, WalletScreen, DiscoverScreen render time |
| Idempotency (NOUVEAU) | 1 | `paymentIdempotency.test.ts` — 12 tests double-débit |

## Les 7 gaps par ordre d'impact

### 🔴 Critique

#### 1. Tests E2E (Detox / Maestro) — 0 actuellement
**Ce qu'on rate** : flow réel **app → backend → app**, deep links de retour
CinetPay/Stripe via WebBrowser, navigation cross-screen, biometric, push
notifications iOS/Android, permissions runtime.

**Reco** : Maestro (plus simple que Detox). 10-15 flows critiques :
- Onboarding + login email/Google/Apple/phone
- Achat billet (MTN Money + carte)
- Payout (request + tracking)
- Création event (organizer)
- Check-in QR scanner

**Implémentation** : YAML files dans `.maestro/`, runnables localement sur
emulator/device. CI optionnel (coûte un runner Android par run).

#### 2. Tests d'accessibilité (a11y) — couverture minimale
**Ce qu'on rate** : usage par lecteurs d'écran (TalkBack/VoiceOver),
navigation au clavier sur tablette, taille de target tactile (Apple HIG : 44pt
minimum), contrastes WCAG AA.

**Reco** : utiliser systematiquement `@testing-library/react-native` avec
`getByRole`, `getByLabelText` — ça force à coder l'accessibilité. Audit
prioritaire sur les écrans sensibles : paiement, wallet, login.

#### 3. Tests de performance / régression
**Ce qu'on rate** : render time des grandes listes (FlatList tickets,
messages), memory leak sur navigation, scroll performance, re-render count
excessif.

**Reco** : étendre les 3 perf tests existants. Mesurer `getRenderCount` via
React Test Renderer + assertions de plafond. CI peut tracker la régression.

### 🟡 Important

#### 4. Tests deep links + universal links
**Ce qu'on rate** : parsing de `eventez://payment-success/{id}?status=...`
(retour CinetPay/Stripe WebBrowser). Aujourd'hui le mock
`WebBrowser.openAuthSessionAsync` masque cette logique.

**Reco** : tests unitaires sur le parser de deep link + sur la résolution
status → screen target.

#### 5. Tests offline / network failure
**Ce qu'on rate** : queue full, retry avec backoff, conflit avec mutation
serveur (offline edit puis online sync), partial failure d'un batch.

**Reco** : étendre `useOfflineQueue.test.ts` avec ces 4 scénarios adverses.

#### 6. Tests AsyncStorage migration / version bump
**Ce qu'on rate** : Si on change le schéma stocké (auth tokens, cached
events, idempotency keys), aucune migration testée. Les users sur ancienne
version voient leur app planter au démarrage.

**Reco** : tests sur la lecture defensive des stored values (validate, drop
si schéma inconnu, fallback gracieux).

### 🟢 Bonus

#### 7. Tests visuels / snapshot complets
**Ce qu'on rate** : 69 snapshots actuels — surtout sur UI primitives. Manque
sur les **gros écrans** (EventDetails, Discover, WalletScreen complet,
DashboardScreen).

**Reco** : un snapshot par écran principal, mis à jour quand le design change.

---

## Priorité d'implémentation

| # | Item | Effort | Impact | Implémentable sans device ? |
|---|---|---|---|---|
| 1 | A11y tests (payment, wallet, login) | 2-3h | 🔴 | ✅ Oui (Jest pur) |
| 2 | Deep link parser tests | 1h | 🟡 | ✅ Oui |
| 3 | Maestro skeleton + 3 flows | 4-5h | 🔴 | ⚠️ Écrire oui, exécuter non (besoin emulator) |
| 4 | AsyncStorage migration tests | 1h | 🟡 | ✅ Oui |
| 5 | Offline queue adverse cases | 2h | 🟡 | ✅ Oui |
| 6 | Snapshot des gros écrans | 2h | 🟢 | ✅ Oui |
| 7 | Performance extensions | 3h | 🟡 | ✅ Oui |

**Plan** : on attaque dans l'ordre A11y → Deep links → Maestro. Les autres
suivent selon le temps.

## Suivi des commits

| Date | Commit | Couverture après |
|---|---|---|
| 2026-05-26 | initial audit | 1230 tests |
| | (TODO) A11y | |
| | (TODO) Deep links | |
| | (TODO) Maestro skeleton | |
