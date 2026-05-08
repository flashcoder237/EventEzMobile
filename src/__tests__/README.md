# Tests EventEz Mobile

Suite de tests **multi-niveaux** pour détecter les bugs à différentes profondeurs.

```
┌─────────────────────────────────────────────────────────┐
│  E2E Maestro (53 flows) — UX réelle, sur device         │
├─────────────────────────────────────────────────────────┤
│  Integration MSW (21 tests) — flows axios complets       │
├─────────────────────────────────────────────────────────┤
│  OpenAPI contracts (4 tests) — sync mobile↔backend       │
├─────────────────────────────────────────────────────────┤
│  Smoke Jest (904 tests) — modules API + formulaires      │
├─────────────────────────────────────────────────────────┤
│  Mutation testing (script) — qualifie les smoke tests    │
└─────────────────────────────────────────────────────────┘
```

## Commandes

```bash
# Smoke tests Jest (~10s, 904 tests)
yarn test

# Integration MSW (~5s, vrais flows)
yarn test:integration

# Contracts OpenAPI (mobile ↔ backend)
yarn test:contracts          # soft-warn (par défaut)
yarn test:contracts:strict   # fail si mismatches
yarn test:contracts:debug    # dump détails

# Mutation testing (qualité des tests)
yarn test:mutation:critical  # 5 modules clés
node scripts/mutation-test.js --module auth --verbose

# Tout (smoke + integration + contracts)
yarn test:all

# E2E Maestro (sur device/émulateur)
yarn test:e2e                # tous les 53 flows
yarn test:e2e:auth           # par catégorie
yarn test:e2e:flow_complete  # nouveaux flows multi-écrans
yarn test:e2e:edge           # cas limites
```

## Structure

```
src/
├── api/__tests__/              # Smoke API tests (45 modules)
│   ├── auth.test.ts
│   ├── events.test.ts
│   └── ...
├── screens/**/__tests__/       # Smoke form tests (28 écrans)
│   ├── auth/__tests__/
│   ├── profile/__tests__/
│   └── ...
├── hooks/__tests__/            # Tests de hooks isolés
│   ├── useEventForm.test.ts
│   ├── useMessageState.test.ts
│   └── useOfflineQueue.test.ts
└── __tests__/
    ├── __helpers__/
    │   ├── apiMock.ts          # Mock axios partagé
    │   ├── fixtures.ts         # fakeUser, fakeEvent, etc.
    │   ├── mswServer.ts        # MSW setupServer
    │   ├── mswFixtures.ts      # Handlers MSW par défaut
    │   └── mswSetup.ts         # Hooks MSW + polyfills
    ├── __fixtures__/
    │   └── openapi-schema.json # Schéma backend (optionnel)
    ├── integration/            # Tests MSW (vrais flows)
    │   ├── auth.flow.test.ts
    │   ├── events.flow.test.ts
    │   └── ...
    └── contracts/              # OpenAPI contract tests
        ├── endpointsCollector.ts
        ├── schemaExtractor.ts
        └── openapi.test.ts
```

## Patterns

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

  it('login() POSTs to /token/', async () => {
    await authAPI.login('a@b.com', 'pwd');
    expect(api.post).toHaveBeenCalledWith('/token/', { email: 'a@b.com', password: 'pwd' });
    // Anti-mutation : vérifier qu'aucun autre verbe n'a été appelé
    expect(api.get).not.toHaveBeenCalled();
  });
});
```

### Integration MSW test
```typescript
import { server } from '../__helpers__/mswServer';
import { http, HttpResponse } from 'msw';
import { authAPI } from '../../api';

describe('Auth flow', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('login flow', async () => {
    server.use(
      http.post('http://test.local/api/token/', () =>
        HttpResponse.json({ access: 'tok', refresh: 'r' }),
      ),
    );

    const res = await authAPI.login('a@b.com', 'pwd');
    expect(res.data.access).toBe('tok');
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

## CI/CD

Workflow `.github/workflows/tests.yml` exécute automatiquement à chaque push :
1. **typecheck** — gate, doit passer pour le reste
2. **smoke** — 904 tests Jest + coverage upload
3. **integration** — 21 tests MSW
4. **contracts** — OpenAPI mismatches (soft-warn)
5. **mutation** — qualité des tests (informatif, push only)
6. **summary** — agrège les statuts

## Contribuer

### Ajouter un test API
1. Module API dans `src/api/<module>.ts` ?
2. Créer/éditer `src/api/__tests__/<module>.test.ts`
3. Pattern smoke : URL + verbe + body
4. Anti-mutation : `not.toHaveBeenCalled()` sur autres verbes

### Ajouter un test formulaire
1. Screen dans `src/screens/<group>/<Screen>.tsx`
2. Créer `src/screens/<group>/__tests__/<Screen>.test.tsx`
3. Mocker les **APIs**, pas les hooks (sauf hooks complexes — voir `useEventForm`)
4. Couvrir : render, validation, submit OK, submit fail, loading

### Ajouter un test integration MSW
1. Identifier un flow critique (multi-appels API)
2. Créer `src/__tests__/integration/<flow>.flow.test.ts`
3. Setup handlers MSW dans le `it()` (pas global pour éviter contamination)
4. Vérifier le flow complet (auth + headers + retries + errors)

### Ajouter un flow Maestro
1. `.maestro/<NN>_<nom>.yaml`
2. Numérotation continue (54+)
3. Ajouter à un script npm si la catégorie existe
4. testID standardisés côté code (`event-card-${id}`, etc.)
