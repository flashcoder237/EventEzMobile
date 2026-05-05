/**
 * Tests du module de persistance d'état de navigation.
 *
 * Couvre les trois garde-fous critiques :
 * - TTL (état trop vieux → undefined)
 * - Blacklist (top du stack interdit → undefined)
 * - Round-trip save / load
 *
 * AsyncStorage est mocké via le mock par défaut de jest-expo.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      __store: store,
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationState } from '@react-navigation/native';
import {
  loadNavigationState,
  saveNavigationState,
  clearNavigationState,
} from '../navigationPersistence';

const PERSISTENCE_KEY = '@eventez_nav_state_v1';
const PERSISTENCE_TIMESTAMP_KEY = '@eventez_nav_state_ts_v1';

function makeState(topRouteName: string): NavigationState {
  return {
    key: 'stack-1',
    index: 1,
    routeNames: ['Main', topRouteName],
    routes: [
      { key: 'main-1', name: 'Main' },
      { key: `${topRouteName}-1`, name: topRouteName },
    ],
    type: 'stack',
    stale: false,
  } as NavigationState;
}

function makeNestedState(deepLeafName: string): NavigationState {
  // Simule un nested navigator (Main contient des tabs, dont l'un pousse une route).
  return {
    key: 'stack-1',
    index: 0,
    routeNames: ['Main'],
    routes: [
      {
        key: 'main-1',
        name: 'Main',
        state: {
          key: 'tabs-1',
          index: 0,
          routeNames: ['Discover'],
          routes: [{ key: `${deepLeafName}-1`, name: deepLeafName }],
          type: 'tab',
          stale: false,
        } as any,
      },
    ],
    type: 'stack',
    stale: false,
  } as NavigationState;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('saveNavigationState / loadNavigationState', () => {
  it('round-trip : sauvegarde puis recharge un état non-blacklisté', async () => {
    const state = makeState('Payment');
    await saveNavigationState(state);

    const restored = await loadNavigationState();
    expect(restored).toBeDefined();
    expect(restored?.routes[restored!.index ?? 0].name).toBe('Payment');
  });

  it('renvoie undefined quand rien n\'est persisté', async () => {
    const restored = await loadNavigationState();
    expect(restored).toBeUndefined();
  });

  it('saveNavigationState n\'écrit rien si l\'état est undefined', async () => {
    await saveNavigationState(undefined);
    const raw = await AsyncStorage.getItem(PERSISTENCE_KEY);
    expect(raw).toBeNull();
  });
});

describe('TTL', () => {
  it('drop l\'état persisté il y a plus de 30 minutes', async () => {
    const state = makeState('Payment');
    await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    // Timestamp 31 min dans le passé
    await AsyncStorage.setItem(
      PERSISTENCE_TIMESTAMP_KEY,
      String(Date.now() - 31 * 60 * 1000),
    );

    const restored = await loadNavigationState();
    expect(restored).toBeUndefined();
    // Et l'état stale a été nettoyé
    expect(await AsyncStorage.getItem(PERSISTENCE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(PERSISTENCE_TIMESTAMP_KEY)).toBeNull();
  });

  it('garde l\'état persisté il y a moins de 30 minutes', async () => {
    const state = makeState('EventDetails');
    await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    await AsyncStorage.setItem(
      PERSISTENCE_TIMESTAMP_KEY,
      String(Date.now() - 5 * 60 * 1000),
    );

    const restored = await loadNavigationState();
    expect(restored).toBeDefined();
    expect(restored?.routes[restored!.index ?? 0].name).toBe('EventDetails');
  });

  it('drop si timestamp manquant', async () => {
    const state = makeState('Payment');
    await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    // Pas de timestamp → considéré comme stale

    const restored = await loadNavigationState();
    expect(restored).toBeUndefined();
  });
});

describe('Blacklist', () => {
  const blacklistedTopRoutes = [
    'Login',
    'Register',
    'RegisterOrganizer',
    'ForgotPassword',
    'ResetPassword',
    'VerifyEmail',
    'VerifyEmailToken',
    'Scan',
    'QRScanner',
    'PaymentSuccess',
    'PaymentFailed',
    'Maintenance',
  ];

  it.each(blacklistedTopRoutes)(
    'drop l\'état si le top du stack est %s',
    async (routeName) => {
      await saveNavigationState(makeState(routeName));
      const restored = await loadNavigationState();
      expect(restored).toBeUndefined();
    },
  );

  it('Payment N\'EST PAS blacklisté (l\'utilisateur veut reprendre)', async () => {
    await saveNavigationState(makeState('Payment'));
    const restored = await loadNavigationState();
    expect(restored).toBeDefined();
  });

  it('descend dans les nested navigators pour trouver le top réel', async () => {
    // Si le top est un nested Login, on doit aussi blacklister
    const state: NavigationState = {
      key: 'stack-1',
      index: 0,
      routeNames: ['Main'],
      routes: [
        {
          key: 'main-1',
          name: 'Main',
          state: {
            key: 'inner-1',
            index: 0,
            routeNames: ['Login'],
            routes: [{ key: 'login-1', name: 'Login' }],
            type: 'stack',
            stale: false,
          } as any,
        },
      ],
      type: 'stack',
      stale: false,
    } as NavigationState;
    await saveNavigationState(state);
    const restored = await loadNavigationState();
    expect(restored).toBeUndefined();
  });

  it('garde l\'état si le top nested est une route ordinaire', async () => {
    await saveNavigationState(makeNestedState('Discover'));
    const restored = await loadNavigationState();
    expect(restored).toBeDefined();
  });
});

describe('clearNavigationState', () => {
  it('supprime les deux clés', async () => {
    await saveNavigationState(makeState('Payment'));
    expect(await AsyncStorage.getItem(PERSISTENCE_KEY)).not.toBeNull();

    await clearNavigationState();
    expect(await AsyncStorage.getItem(PERSISTENCE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(PERSISTENCE_TIMESTAMP_KEY)).toBeNull();
  });
});

describe('Robustesse', () => {
  it('renvoie undefined si JSON corrompu', async () => {
    await AsyncStorage.setItem(PERSISTENCE_KEY, '{not valid json');
    await AsyncStorage.setItem(PERSISTENCE_TIMESTAMP_KEY, String(Date.now()));

    const restored = await loadNavigationState();
    expect(restored).toBeUndefined();
  });
});
