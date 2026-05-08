# 🧪 Tests EventEz Mobile

Documentation complète de la suite de tests : procédure, inventaire, patterns.

> Mise à jour : 2026-05-08 · Total : **1210 tests Jest** + 53 flows Maestro · CI/CD actif

---

## 📊 Vue d'ensemble — 7 niveaux de défense

```
┌──────────────────────────────────────────────────────────────────┐
│  E2E Maestro              53 flows YAML       UX réelle, device  │
├──────────────────────────────────────────────────────────────────┤
│  Performance              19 tests            Mount/render time   │
├──────────────────────────────────────────────────────────────────┤
│  UI Snapshots             69 snapshots        Régressions visuelles│
├──────────────────────────────────────────────────────────────────┤
│  Integration MSW          21 tests            Vrais flows axios   │
├──────────────────────────────────────────────────────────────────┤
│  OpenAPI Contracts        4 tests             Sync mobile↔backend │
├──────────────────────────────────────────────────────────────────┤
│  Hooks isolés             65 tests            Logique métier hooks│
├──────────────────────────────────────────────────────────────────┤
│  Smoke API + Forms        ~1100 tests         Régression structurelle│
└──────────────────────────────────────────────────────────────────┘

+ Mutation testing : qualifie les smoke tests (16 modules @ 100%)
```

---

## 🚀 Commandes (cheat-sheet)

```bash
# === Tests rapides ===
yarn test                        # 1210 smoke tests (~13s)
yarn typecheck                   # tsc --noEmit

# === Update snapshots après refactor visuel intentionnel ===
yarn test -u                                                     # tous
npx jest src/components/events/__tests__/EventCard.snap.test.tsx -u  # un seul

# === Tests niveaux avancés ===
yarn test:integration            # MSW (~5s, vrais flows axios)
yarn test:contracts              # OpenAPI mobile↔backend (soft-warn)
yarn test:contracts:strict       # OpenAPI strict (fail si mismatch) — utilisé en CI
yarn test:contracts:debug        # Dump détails mismatches

# === Mutation testing (qualifier les tests) ===
yarn test:mutation                                  # tous modules
yarn test:mutation:critical                         # 5 modules clés (auth, events, registrations, payments, messages)
node scripts/mutation-test.js --module auth --max 5 --verbose  # un module précis

# === Ensemble ===
yarn test:all                    # smoke + integration + contracts

# === E2E Maestro (sur device/émulateur) ===
yarn test:e2e                    # tous les 53 flows
yarn test:e2e:auth               # par catégorie (4 flows)
yarn test:e2e:events             # 5 flows
yarn test:e2e:purchase           # 3 flows
yarn test:e2e:profile            # 7 flows
yarn test:e2e:dashboard          # 7 flows
yarn test:e2e:messages           # 3 flows
yarn test:e2e:organizer          # 9 flows
yarn test:e2e:admin              # 7 flows
yarn test:e2e:flow_complete      # 4 nouveaux flows multi-écrans
yarn test:e2e:edge               # 4 flows cas limites
```

---

## 📂 Structure des fichiers

```
EventEzMobile/
├── jest.config.js                # Config principale (smoke + snapshots + perf)
├── jest.integration.config.js    # Config dédiée MSW (Node env)
├── jest.setup.js                 # Mocks globaux (AsyncStorage, Reanimated, expo-*, i18n)
├── scripts/
│   └── mutation-test.js          # Script mutation testing
├── .github/workflows/
│   └── tests.yml                 # CI GitHub Actions
├── .maestro/                     # 53 flows E2E
│   ├── 01_auth_login.yaml
│   ├── ...
│   └── 53_save_unsave_event_flow.yaml
└── src/
    ├── __tests__/
    │   ├── README.md             # Documentation interne
    │   ├── __helpers__/
    │   │   ├── apiMock.ts        # Mock axios partagé
    │   │   ├── fixtures.ts       # fakeUser, fakeEvent, etc.
    │   │   ├── mswServer.ts      # MSW setupServer
    │   │   ├── mswFixtures.ts    # Handlers MSW par défaut
    │   │   ├── mswSetup.ts       # Hooks MSW + polyfills
    │   │   └── nodeEnv.js        # testEnvironment Node pour MSW
    │   ├── __fixtures__/
    │   │   └── openapi-schema.json  # Schéma backend (optionnel)
    │   ├── integration/          # Tests MSW (21 tests / 7 suites)
    │   │   ├── auth.flow.test.ts
    │   │   ├── events.flow.test.ts
    │   │   ├── messages.flow.test.ts
    │   │   ├── payment.flow.test.ts
    │   │   ├── sessions.flow.test.ts
    │   │   ├── edgeCases.test.ts
    │   │   └── msw-smoke.test.ts
    │   ├── contracts/            # OpenAPI contract tests
    │   │   ├── README.md
    │   │   ├── endpointsCollector.ts
    │   │   ├── schemaExtractor.ts
    │   │   └── openapi.test.ts
    │   └── performance/          # Mount time tests (19)
    │       ├── README.md
    │       ├── EventDetailsScreen.perf.test.tsx
    │       ├── DiscoverScreen.perf.test.tsx
    │       ├── ConversationScreen.perf.test.tsx
    │       ├── MessagesScreen.perf.test.tsx
    │       ├── MyTicketsScreen.perf.test.tsx
    │       ├── WalletScreen.perf.test.tsx
    │       ├── PaymentScreen.perf.test.tsx
    │       └── components.perf.test.tsx
    ├── api/__tests__/            # Smoke API (45 modules consolidés)
    ├── screens/**/__tests__/     # Smoke forms (28 écrans)
    ├── hooks/__tests__/          # Hooks isolés (3 hooks)
    └── components/**/__tests__/  # Snapshots UI (11 composants)
```

---

## 🧬 Inventaire complet des tests

### Niveau 1 — Smoke API tests (45 modules, ~700 tests)

> Vérifient URL + verbe HTTP + body shape pour chaque fonction API.

| Module | Tests | Source |
|---|---|---|
| `authAPI` | 18 | `src/api/auth.ts` |
| `usersAPI` | 31 | `src/api/auth.ts` |
| `verificationAPI` | 5 | `src/api/auth.ts` |
| `eventsAPI` | 43 | `src/api/events.ts` |
| `eventTemplatesAPI` | 2 | `src/api/events.ts` |
| `categoriesAPI` | 9 | `src/api/events.ts` |
| `tagsAPI` | 2 | `src/api/events.ts` |
| `registrationsAPI` | 31 | `src/api/registrations.ts` |
| `ticketTypesAPI` | 6 | `src/api/tickets.ts` |
| `ticketPurchasesAPI` | 7 | `src/api/tickets.ts` |
| `discountsAPI` | 7 | `src/api/tickets.ts` |
| `ticketTransfersAPI` | 11 | `src/api/tickets.ts` |
| `paymentsAPI` | 13 | `src/api/payments.ts` |
| `refundsAPI` | 4 | `src/api/payments.ts` |
| `invoicesAPI` | 3 | `src/api/payments.ts` |
| `subscriptionsAPI` | 9 | `src/api/payments.ts` |
| `walletAPI` | 5 | `src/api/payments.ts` |
| `payoutsAPI` | 6 | `src/api/payments.ts` |
| `commissionsAPI` | 5 | `src/api/payments.ts` |
| `messagesAPI` | 37 | `src/api/messages.ts` |
| `notificationsAPI` | 15 | `src/api/notifications.ts` |
| `notificationTemplatesAPI` | 5 | `src/api/notifications.ts` |
| `sessionsAPI` | 18 | `src/api/sessions.ts` |
| `sessionRegistrationsAPI` | 5 | `src/api/sessions.ts` |
| `sessionResourcesAPI` | 6 | `src/api/sessions.ts` |
| `speakersAPI` | 8 | `src/api/sessions.ts` |
| `tracksAPI` | 5 | `src/api/sessions.ts` |
| `feedbacksAPI` | 7 | `src/api/feedback.ts` |
| `flagsAPI` | 5 | `src/api/feedback.ts` |
| `validationsAPI` | 5 | `src/api/feedback.ts` |
| `analyticsAPI` | 24 | `src/api/analytics.ts` |
| `socialAPI` | 10 | `src/api/social.ts` |
| `invitationsAPI` | 9 | `src/api/social.ts` |
| `referralsAPI` | 7 | `src/api/social.ts` |
| `gamificationAPI` | 7 | `src/api/social.ts` |
| `recommendationsAPI` | 3 | `src/api/social.ts` |
| `advertisementsAPI` | 9 | `src/api/social.ts` |
| `newslettersAPI` | 10 | `src/api/content.ts` |
| `sponsorsAPI` | 6 | `src/api/content.ts` |
| `liveAPI` | 6 | `src/api/content.ts` |
| `cfpAPI` | 5 | `src/api/content.ts` |
| `virtualRoomsAPI` | 7 | `src/api/content.ts` |
| `recordingsAPI` | 3 | `src/api/content.ts` |
| `auditAPI` | 4 | `src/api/admin.ts` |
| `treasuryAPI` | 32 | `src/api/admin.ts` |
| `siteSettingsAPI` + `publicSettingsAPI` | 3 | `src/api/admin.ts` |
| `waitlistAPI` | 8 | `src/api/misc.ts` |
| `waitlistSettingsAPI` | 5 | `src/api/misc.ts` |
| `seatingAPI` | 14 | `src/api/misc.ts` |
| `floorPlansAPI` | 2 | `src/api/misc.ts` |
| `volunteersAPI` | 11 | `src/api/misc.ts` |
| `comparisonAPI` | 1 | `src/api/misc.ts` |
| `aiAssistAPI` | 7 | `src/api/misc.ts` |
| `webhooksAPI` | 10 | `src/api/misc.ts` |
| `utmAPI` | 3 | `src/api/misc.ts` |
| `announcementsAPI` | 6 | `src/api/announcements.ts` |
| `clientReleaseAPI` | 2 | `src/api/announcements.ts` |
| `statusAPI` | 13 | `src/api/status.ts` |

### Niveau 2 — Smoke forms (28 écrans, ~190 tests)

| Catégorie | Écrans | Tests |
|---|---|---|
| **Auth** (5) | LoginScreen (10), RegisterScreen (8), RegisterOrganizerScreen (7), ForgotPasswordScreen (7), ResetPasswordScreen (8) | 40 |
| **Profile** (4) | EditProfileScreen (9), BecomeOrganizerScreen (8), VerificationScreen (8), SettingsScreen (8) | 33 |
| **Events / Organizer** (5) | EventCreateScreen (7), DiscountFormScreen (8), NewslettersScreen (6), VolunteerScreen (6), SponsorManagementScreen (5) | 32 |
| **Tickets / Payment / Wallet** (6) | TransferTicketModal (6), PendingTransfersScreen (7), TicketPurchaseScreen (7), PaymentScreen (7), RefundRequestScreen (8), WalletScreen (7) | 42 |
| **Messages / Admin / Autres** (8) | ReportMessageModal (6), ForwardModal (5), AnnouncementFormScreen (5), AdminAdFormScreen (5), AnnouncementsAdminScreen (4), UserEditScreen (5), WebhooksScreen (6), EventSessionsLinkScreen (2) | 38 |
| **ConversationScreen** | smoke render | 1 |

### Niveau 3 — Hooks isolés (3 hooks, 65 tests)

| Hook | Tests | Couverture |
|---|---|---|
| `useEventForm` (+ submit + validation) | 23 | 64% |
| `useMessageState` | 31 | 70% |
| `useOfflineQueue` | 11 | **95%** |

### Niveau 4 — UI Snapshots (11 composants, 69 snapshots)

| Composant | Variantes | Snapshots |
|---|---|---|
| `EventCard` | default/featured/horizontal/compact/grid+online | 7 |
| `Badge` | 7 variants + size | 8 |
| `GradientButton` | primary/outline+icon/secondary/ghost/disabled/loading/fullWidth | 7 |
| `Input` | placeholder/label+icon/error/success/disabled/secure/title | 7 |
| `EmptyState` | title-only/full/withAction/withCard | 4 |
| `ErrorState` | default/custom/+retry/withCard+noRetry | 4 |
| `CategoryCard` | default/noCount/large+image/large-fallback/compact | 5 |
| `MapEventCard` | paid+image/free+placeholder/+distance/no-category | 4 |
| `MenuItem` | title-only/+subtitle/+stat/+badge/badge>99/+alert/danger+isLast/loading | 8 |
| `MessageBubble` | peer/mine/grouped/edited/deleted/+image/+reactions/+reply | 8 |
| `InAppToast` | message/notification/success/warning/info/+avatar/no-body | 7 |

### Niveau 5 — Performance (7 screens + 5 composants × N, 19 tests)

| Cible | Mount (ms observé) | Seuil |
|---|---|---|
| `EventDetailsScreen` (~1900 lignes) | 30-70 | 800 |
| `DiscoverScreen` | 30-50 | 800 |
| `ConversationScreen` (~1900 lignes) | 100-200 | 800 |
| `MessagesScreen` | 90-230 | 600 |
| `MyTicketsScreen` | 120-200 | 600 |
| `WalletScreen` (~2300 lignes) | 100-200 | 800 |
| `PaymentScreen` (~2300 lignes) | 70-110 | 800 |
| `EventCard` × 50 | 250-360 | 1500 |
| `CategoryCard` × 30 | 90-160 | 1000 |
| `MessageBubble` × 50 | 100-160 | 2000 |

### Niveau 6 — Integration MSW (21 tests / 7 suites)

> Vrais flows axios sans mocker l'instance — détecte les bugs sérialisation et multi-appels.

| Suite | Tests | Flows couverts |
|---|---|---|
| `auth.flow` | 6 | login → Bearer auto, register, refresh sur 401, refresh blacklisté, logout, 401 endpoint auth ignoré |
| `events.flow` | 2 | list → details → registration, publishEvent |
| `payment.flow` | 3 | registration → init payment → verify, polling pending → completed, refund |
| `messages.flow` | 2 | sendMessage, createConversation |
| `sessions.flow` | 2 | register 403 sans event reg, 200 si inscrit (vérifie le bug fix backend) |
| `edgeCases` | 4 | 500 sans retry, 503 → service-unavailable event, 403 email_verification_required event, dedup |
| `msw-smoke` | 2 | boot MSW (fetch + axios) |

### Niveau 7 — OpenAPI Contracts (4 tests, 0 mismatch en strict)

> Vérifie que chaque appel mobile match un endpoint backend Django REST.

| Test | Description |
|---|---|
| Sanity counts mobile | 541 endpoints détectés |
| Sanity counts backend | 553 paths extraits |
| Strict mismatch detector | 0 mismatch (CI bloque toute régression) |
| Variants normalisation | `{token}`/`{payment_id}`/`{id}` traités comme équivalents |

### Niveau 8 — Mutation testing (16 modules @ 100%)

> Mutations : URL corruption + HTTP verb swap. Score = mutations détectées / mutations totales.

| Module | Score |
|---|---|
| Tous les 16 modules API consolidés | **100%** (240/240 mutations détectées avec `--max 15`) |

### E2E Maestro (53 flows YAML)

| Catégorie | Flows | Numéros |
|---|---|---|
| Auth | 4 | 01, 02, 11, 12 |
| Events | 5 | 03, 04, 13, 37, 38 |
| Purchase | 3 | 05, 14, 15 |
| Profile | 7 | 06, 18, 27, 28, 33, 34, 40 |
| Dashboard | 7 | 07, 08, 16, 17, 20, 39, 41 |
| Messages | 3 | 10, 19, 52 |
| Organizer | 9 | 09, 21, 22, 23, 24, 25, 26, 35, 36 |
| Admin | 7 | 29, 30, 31, 32, 42, 43, 50 |
| **Flow complet** (nouveau) | 4 | 44, 45, 46, 47 |
| **Edge cases** (nouveau) | 4 | 48, 49, 51, 53 |

---

## 🎨 Patterns à suivre

### Smoke API test
```typescript
jest.mock('../instance', () => {
  const { createTestMock } = require('../../__tests__/__helpers__/apiMock');
  return createTestMock();
});

import { authAPI } from '../auth';
import { getMockedApi, resetMockApi } from '../../__tests__/__helpers__/apiMock';

describe('authAPI', () => {
  const api = getMockedApi();
  beforeEach(() => resetMockApi());

  it('login() POSTs to /token/ with credentials', async () => {
    await authAPI.login('a@b.com', 'pwd');
    expect(api.post).toHaveBeenCalledWith('/token/', {
      email: 'a@b.com',
      password: 'pwd',
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    // Anti-mutation : aucun autre verbe ne doit être appelé
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
```

### Form screen test
```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { authAPI } from '../../../api';

jest.mock('../../../api', () => ({
  authAPI: { login: jest.fn() },
  setTokens: jest.fn(),
}));

it('calls login on submit', async () => {
  (authAPI.login as jest.Mock).mockResolvedValue({ data: { access: 'tok' } });
  const { getByPlaceholderText, getByText } = render(<LoginScreen />);

  fireEvent.changeText(getByPlaceholderText(/email/i), 'a@b.com');
  fireEvent.changeText(getByPlaceholderText(/password/i), 'pwd');
  fireEvent.press(getByText(/se connecter/i));

  await waitFor(() => {
    expect(authAPI.login).toHaveBeenCalledWith('a@b.com', 'pwd');
  });
});
```

### Hook isolé
```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useEventForm } from '../useEventForm';

describe('useEventForm', () => {
  it('updateField changes the field', () => {
    const { result } = renderHook(() => useEventForm());
    act(() => result.current.updateField('title', 'My Event'));
    expect(result.current.formState.title).toBe('My Event');
  });
});
```

### Snapshot UI
```typescript
import { render } from '@testing-library/react-native';
import EventCard from '../EventCard';

describe('EventCard snapshots', () => {
  it('default variant', () => {
    const tree = render(<EventCard {...baseProps} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

### Performance
```typescript
beforeAll(() => render(<Screen />));  // warmup obligatoire (Babel compile ~3s)

it('mounts in less than 800ms after warmup', () => {
  const start = performance.now();
  render(<Screen />);
  const elapsed = performance.now() - start;
  console.log(`[perf] Screen mount: ${elapsed.toFixed(2)}ms`);
  expect(elapsed).toBeLessThan(800);
});
```

### Integration MSW
```typescript
import { server } from '../__helpers__/mswServer';
import { http, HttpResponse } from 'msw';
import { authAPI } from '../../api';

describe('Auth integration flow', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('login stores tokens and authorizes subsequent requests', async () => {
    server.use(
      http.post('http://test.local/api/token/', () =>
        HttpResponse.json({ access: 'access-tok', refresh: 'refresh-tok' }),
      ),
    );
    const res = await authAPI.login('a@b.com', 'pwd');
    expect(res.data.access).toBe('access-tok');
  });
});
```

---

## ➕ Comment contribuer

### Ajouter un test API (smoke)
1. Vérifier qu'il existe un module dans `src/api/<module>.ts`
2. Créer/éditer `src/api/__tests__/<module>.test.ts`
3. Suivre le pattern smoke (URL + verbe + body)
4. Anti-mutation : `not.toHaveBeenCalled()` sur tous les autres verbes
5. `npx jest src/api/__tests__/<module>.test.ts` doit passer
6. `node scripts/mutation-test.js --module <module> --max 5` doit montrer 100%

### Ajouter un test formulaire
1. Screen dans `src/screens/<group>/<Screen>.tsx`
2. Créer `src/screens/<group>/__tests__/<Screen>.test.tsx`
3. **Mocker les APIs**, pas les hooks (sauf hooks complexes — voir `useEventForm`)
4. Couvrir : render, validation, submit OK, submit fail, loading state
5. Si i18n est utilisé, le mock global de `react-i18next` dans `jest.setup.js` résout les clés contre `fr.json`

### Ajouter un test hook isolé
1. Hook dans `src/hooks/<hook>.ts`
2. Créer `src/hooks/__tests__/<hook>.test.ts`
3. Pattern : `renderHook(() => useHook())` + `act(() => ...)` pour les effects
4. Mocker les API que le hook consomme
5. **Tester les cas d'échec** : validation fail, AsyncStorage corrupted, API 500

### Ajouter un test snapshot
1. Composant atomique critique (rendu en boucle, ou UI primitive)
2. Créer `src/components/<group>/__tests__/<Component>.snap.test.tsx`
3. Mocks minimaux : `useTheme` (objet `colors` literal), `expo-image` → `RN.Image`, `expo-linear-gradient` → `RN.View`
4. Couvrir 3-7 variantes/états importants par composant
5. Stabiliser les dates : `jest.setSystemTime()` ou mocker la fonction de formatage
6. Après refactor visuel intentionnel : `npx jest <fichier> -u` pour régénérer

### Ajouter un test integration MSW
1. Identifier un flow critique (multi-appels API)
2. Créer `src/__tests__/integration/<flow>.flow.test.ts`
3. **Setup handlers MSW dans le `it()`** (pas global pour éviter contamination entre tests)
4. Vérifier le flow complet : auth + headers + retries + errors

### Ajouter un test performance
1. Choisir un screen lourd ou un composant rendu en boucle
2. Créer `src/__tests__/performance/<name>.perf.test.tsx`
3. **Warmup obligatoire** : `beforeAll(() => render(...))`  
4. Seuil large (~10x mesure observée) pour CI stable
5. `console.log` du temps mesuré pour traçabilité dans les logs CI

### Ajouter un flow Maestro
1. `.maestro/<NN>_<nom>.yaml`
2. Numérotation continue (54+)
3. Préfixer d'un commentaire `# What this flow tests:`
4. Ajouter à un script npm si la catégorie existe (ex: `test:e2e:auth`)
5. Utiliser `testID` standardisés côté code (`event-card-${id}`, `attach-button`, etc.)

---

## 🚦 CI/CD GitHub Actions

`.github/workflows/tests.yml` — exécuté automatiquement à chaque push/PR sur `master`/`main`/`develop`.

### Workflow

```
typecheck (gate)
    │
    ├──▶ smoke (1210 tests + coverage)
    ├──▶ integration (21 tests MSW)
    ├──▶ contracts (STRICT — bloque si mismatch)
    └──▶ mutation (informatif, push only)
              │
              ▼
          summary (agrège statuts)
```

### Variables d'environnement

| Variable | Effet |
|---|---|
| `CONTRACT_STRICT=1` | Fait échouer le test contract si mismatch |
| `CONTRACT_DEBUG=1` | Affiche les détails des mismatches |
| `BABEL_ENV=production` | Active `transform-remove-console` |

### OpenAPI schema fetch

Le workflow tente de récupérer le schéma OpenAPI du backend production via :
```
curl -fsSL https://api.eventez.online/api/schema/ -o src/__tests__/__fixtures__/openapi-schema.json
```

Si fail (backend down), fallback sur le parsing Python statique des `urls.py` + `@action` decorators.

---

## 🐛 Debug

### Un test échoue, comment investiguer ?

```bash
# Lancer un seul fichier
npx jest src/screens/auth/__tests__/LoginScreen.test.tsx --verbose

# Mode watch (re-run au save)
yarn test --watch

# Avec stack trace complète
npx jest --no-coverage 2>&1 | tail -100

# Coverage sur un fichier précis
npx jest src/api/__tests__/auth.test.ts --coverage --collectCoverageFrom="src/api/auth.ts"
```

### Snapshot obsolète après refactor visuel

```bash
# Si le changement est intentionnel
yarn test -u

# Ou cibler le fichier
npx jest src/components/events/__tests__/EventCard.snap.test.tsx -u
```

### Mutation score baisse (un module < 85%)

```bash
# Voir quelles mutations survivent
node scripts/mutation-test.js --module <name> --verbose

# Renforcer le test concerné (pattern not.toHaveBeenCalled sur autres verbes)
```

### Nouveau mismatch OpenAPI en CI

```bash
# Voir le détail
yarn test:contracts:debug

# Décider :
# - Si le backend a changé l'URL : fixer le mobile
# - Si l'endpoint manque : l'ajouter au backend
# - Si c'est un faux positif : améliorer schemaExtractor.ts
```

### "tsc passe" mais jest échoue

`tsc --noEmit` ne lance PAS les tests, juste valide la syntaxe TypeScript.
**Toujours run `yarn test` pour de vrai** avant de commit.

---

## 📈 Historique

- **2026-04-23** : Infrastructure tests Jest initiale (162 backend + 137 frontend + 81 mobile)
- **2026-05-08** : Refonte complète mobile avec 7 niveaux de défense
  - 1210 tests Jest (smoke + integration + hooks + snapshots + perf)
  - 53 flows Maestro
  - Mutation testing 100% sur 16 modules
  - OpenAPI contracts 0 mismatch (strict)
  - CI GitHub Actions complet

---

## 🎯 Roadmap

### Court terme
- [ ] Run Maestro sur device réel (à faire user)
- [ ] Augmenter couverture `useEventForm` (64% → 80%) — manque AI Assist + image picker
- [ ] Documenter les `testID` standardisés côté composants pour Maestro

### Moyen terme
- [ ] Tests visuels avec `jest-image-snapshot` (pixel-diff) en plus des `toMatchSnapshot()`
- [ ] Tests de charge backend avec `locust` (cf. `EventEzBackend`)
- [ ] Intégrer Sentry source maps + crash reporting dans CI

### Long terme
- [ ] Génération automatique des smoke tests depuis le schéma OpenAPI
- [ ] Tests de migration DB (backend) avec `pytest-django`
- [ ] Performance budget : fail si bundle JS > 12MB ou TTI > 4s
