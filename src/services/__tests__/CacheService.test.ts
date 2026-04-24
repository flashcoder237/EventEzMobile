/**
 * Tests du CacheService — vérifie le comportement mémoire/AsyncStorage + TTL.
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
      multiRemove: jest.fn((keys: string[]) => {
        keys.forEach((k) => store.delete(k));
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      __store: store,
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import CacheService from '../CacheService';

const STORE = (AsyncStorage as any).__store as Map<string, string>;

describe('CacheService', () => {
  beforeEach(() => {
    STORE.clear();
    CacheService.clearMemory();
    jest.clearAllMocks();
  });

  it('returns null when key does not exist', async () => {
    const result = await CacheService.get<string>('missing');
    expect(result).toBeNull();
  });

  it('stores and retrieves from memory first', async () => {
    await CacheService.set('key1', { foo: 'bar' }, 60_000);
    const result = await CacheService.get<{ foo: string }>('key1');

    expect(result).not.toBeNull();
    expect(result!.data).toEqual({ foo: 'bar' });
    expect(result!.isStale).toBe(false);
  });

  it('marks data as stale when TTL exceeded', async () => {
    const now = 1_000_000_000_000;
    const dateSpy = jest.spyOn(Date, 'now');
    dateSpy.mockReturnValueOnce(now); // set()
    await CacheService.set('stale-key', 'value', 1000);

    dateSpy.mockReturnValue(now + 5000); // get() 5s later
    const result = await CacheService.get<string>('stale-key');

    expect(result).not.toBeNull();
    expect(result!.data).toBe('value');
    expect(result!.isStale).toBe(true);

    dateSpy.mockRestore();
  });

  it('persists to AsyncStorage and reads back after memory clear', async () => {
    await CacheService.set('persist', [1, 2, 3]);
    CacheService.clearMemory();

    expect(AsyncStorage.getItem).not.toHaveBeenCalled(); // Not yet, just after clear
    const result = await CacheService.get<number[]>('persist');
    expect(result!.data).toEqual([1, 2, 3]);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@ez:cache:persist');
  });

  it('invalidate removes a single key', async () => {
    await CacheService.set('a', 1);
    await CacheService.set('b', 2);
    await CacheService.invalidate('a');

    expect(await CacheService.get('a')).toBeNull();
    expect((await CacheService.get('b'))!.data).toBe(2);
  });

  it('invalidate removes multiple keys', async () => {
    await CacheService.set('a', 1);
    await CacheService.set('b', 2);
    await CacheService.set('c', 3);
    await CacheService.invalidate(['a', 'c']);

    expect(await CacheService.get('a')).toBeNull();
    expect(await CacheService.get('c')).toBeNull();
    expect((await CacheService.get('b'))!.data).toBe(2);
  });

  it('clearByPrefix removes keys matching prefix', async () => {
    await CacheService.set('user:1:notif', 'a');
    await CacheService.set('user:1:msgs', 'b');
    await CacheService.set('user:2:notif', 'c');
    await CacheService.clearByPrefix('user:1:');

    expect(await CacheService.get('user:1:notif')).toBeNull();
    expect(await CacheService.get('user:1:msgs')).toBeNull();
    expect((await CacheService.get('user:2:notif'))!.data).toBe('c');
  });

  it('clearMemory does not touch AsyncStorage', async () => {
    await CacheService.set('k', 'v');
    CacheService.clearMemory();

    // get() should now read from AsyncStorage
    const result = await CacheService.get<string>('k');
    expect(result!.data).toBe('v');
  });

  it('evicts oldest entries when memory limit reached (LRU)', async () => {
    // Fill beyond MAX_MEM_ENTRIES (50) — verifies eviction doesn't crash
    for (let i = 0; i < 55; i++) {
      await CacheService.set(`evict:${i}`, i);
    }
    // Oldest keys (0..4) should still be retrievable from AsyncStorage
    const result = await CacheService.get<number>('evict:0');
    expect(result).not.toBeNull();
  });
});
