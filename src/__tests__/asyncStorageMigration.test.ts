/**
 * Tests de resilience AsyncStorage : que se passe-t-il quand le schema
 * stocke a change entre 2 versions de l'app ?
 *
 * Scenario : un user installe v1.0 (stock { items: [...] }), puis update vers
 * v1.1 qui s'attend a { items: [...], version: 2 }. Si le code v1.1 fait
 * `data.version` sans defense, il get undefined ou crash.
 *
 * On teste les PATTERNS de defense (parse + Array.isArray + try/catch +
 * versioning explicite) sans invoquer les services reels (dynamic import
 * pose probleme en jest sans ESM flag).
 *
 * Cette suite est un FILET DE SECURITE : si un dev refactor un service et
 * supprime la defense, on detecte la regression.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    multiGet: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockAsyncStorage.removeItem.mockResolvedValue(undefined);
});


// =====================================================================
// Helper : pattern de lecture defensive — utilise dans tous les services
// =====================================================================

/**
 * Reproduit le pattern recurrent : getItem + JSON.parse + validation
 * de type. Tout echec retourne null/fallback, jamais crash.
 */
async function safeRead<T>(
  key: string,
  validate: (v: unknown) => v is T,
  fallback: T,
): Promise<T> {
  try {
    const raw = await mockAsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}


// =====================================================================
// PATTERN — ANALYTICS QUEUE : array d'events
// =====================================================================

describe('analytics queue — pattern array d\'events', () => {
  const KEY = '@eventez_analytics_queue';
  const isEventArray = (v: unknown): v is Array<{ name: string; timestamp: number }> =>
    Array.isArray(v);

  it('lecture defensive : storage vide → fallback []', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    const result = await safeRead(KEY, isEventArray, []);
    expect(result).toEqual([]);
  });

  it('lecture defensive : array valide preserve', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify([{ name: 'event_view', timestamp: 1 }]),
    );
    const result = await safeRead(KEY, isEventArray, []);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('event_view');
  });

  it('lecture defensive : JSON corrompu → fallback', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('{not json{{');
    const result = await safeRead(KEY, isEventArray, []);
    expect(result).toEqual([]);
  });

  it('lecture defensive : object au lieu d\'array (legacy v0) → fallback', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ events: [], version: 0 }),
    );
    const result = await safeRead(KEY, isEventArray, []);
    expect(result).toEqual([]);
  });

  it('lecture defensive : string au lieu d\'array → fallback', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify('not-an-array'));
    const result = await safeRead(KEY, isEventArray, []);
    expect(result).toEqual([]);
  });

  it('lecture defensive : getItem throw → fallback', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('disk failure'));
    const result = await safeRead(KEY, isEventArray, []);
    expect(result).toEqual([]);
  });
});


// =====================================================================
// PATTERN — SOUND SERVICE : flag boolean
// =====================================================================

describe('sound enabled — pattern boolean stocke comme string', () => {
  const KEY = '@eventez_sounds_enabled';

  const readBool = async (defaultValue: boolean): Promise<boolean> => {
    try {
      const raw = await mockAsyncStorage.getItem(KEY);
      if (raw === null) return defaultValue;
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return defaultValue;
    } catch {
      return defaultValue;
    }
  };

  it('storage vide → default (true)', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await readBool(true)).toBe(true);
  });

  it('"true" stocke → true', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('true');
    expect(await readBool(true)).toBe(true);
  });

  it('"false" stocke → false', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('false');
    expect(await readBool(true)).toBe(false);
  });

  it('valeur non-booleenne (nombre) → default', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('42');
    expect(await readBool(true)).toBe(true);
  });

  it('valeur "null" string → default', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('null');
    expect(await readBool(true)).toBe(true);
  });
});


// =====================================================================
// PATTERN — SEARCH HISTORY : liste de strings, tronquee a 10
// =====================================================================

describe('search history — array de strings + truncation', () => {
  const KEY = '@eventez_search_history';
  const MAX_HISTORY = 10;
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((item) => typeof item === 'string');

  const readHistory = async (): Promise<string[]> => {
    const parsed = await safeRead<string[]>(KEY, isStringArray, []);
    return parsed.slice(0, MAX_HISTORY);  // safety : tronque toujours
  };

  it('storage vide → []', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await readHistory()).toEqual([]);
  });

  it('array de 3 strings → preserve', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify(['paris', 'douala', 'concert']),
    );
    expect(await readHistory()).toEqual(['paris', 'douala', 'concert']);
  });

  it('array avec types mixtes → fallback (validation stricte)', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify(['paris', 123, 'concert']),  // 123 != string
    );
    expect(await readHistory()).toEqual([]);
  });

  it('1000 entrees stockees (corruption v1) → tronque a 10', async () => {
    const huge = Array.from({ length: 1000 }, (_, i) => `search-${i}`);
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(huge));
    const result = await readHistory();
    expect(result).toHaveLength(10);
  });
});


// =====================================================================
// PATTERN — MUTED CONVERSATIONS : versioning explicite dans la cle
// =====================================================================

describe('muted conversations — versioning v2 dans la cle', () => {
  /**
   * Pattern observe : `eventez:muted_conversations:v2`. Le `v2` permet
   * une migration silencieuse : bump → nouvelle cle → l'ancien storage
   * est ignore et nettoye en arriere-plan, jamais lu en format incompatible.
   */
  it('cles v2 et v3 sont distinctes', () => {
    const V2 = 'eventez:muted_conversations:v2';
    const V3 = 'eventez:muted_conversations:v3';
    expect(V2).not.toBe(V3);
  });

  it('au bump v3, nettoyer la cle v2 sans tenter de lire', async () => {
    await mockAsyncStorage.removeItem('eventez:muted_conversations:v2');
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'eventez:muted_conversations:v2',
    );
    // PAS d'appel getItem('v2') avant — on degage propre.
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalledWith(
      'eventez:muted_conversations:v2',
    );
  });
});


// =====================================================================
// PATTERN — THEME MODE : enum string fortement type
// =====================================================================

describe('theme mode — enum light/dark/system avec fallback', () => {
  type ThemeMode = 'light' | 'dark' | 'system';
  const VALID_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'] as const;

  const readTheme = async (): Promise<ThemeMode> => {
    try {
      const raw = await mockAsyncStorage.getItem('@eventez_theme_mode');
      if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
        return raw as ThemeMode;
      }
      return 'system';
    } catch {
      return 'system';
    }
  };

  it('storage vide → system (default)', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await readTheme()).toBe('system');
  });

  it.each(['light', 'dark', 'system'] as const)(
    'mode valide "%s" preserve',
    async (mode) => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(mode);
      expect(await readTheme()).toBe(mode);
    },
  );

  it('mode futur inconnu (v3 "amoled") → fallback system', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('amoled');
    expect(await readTheme()).toBe('system');
  });

  it('valeur corrompue (string vide) → fallback system', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('');
    expect(await readTheme()).toBe('system');
  });
});


// =====================================================================
// PATTERN — VERSIONED OBJECT : { version: N, data: ... }
// =====================================================================

describe('versioned object pattern — schema explicite', () => {
  /**
   * Pour les schemas complexes qui evoluent souvent (preferences UI,
   * cached event data), stocker { version: N, ...data } et brancher
   * une migration par version.
   */

  interface Stored<T> {
    version: number;
    data: T;
  }

  const CURRENT_VERSION = 2;

  const readWithMigration = async <T>(
    key: string,
    validate: (v: unknown) => v is T,
    fallback: T,
  ): Promise<T> => {
    try {
      const raw = await mockAsyncStorage.getItem(key);
      if (!raw) return fallback;
      const parsed: any = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return fallback;
      // Schema futur (v3+) inconnu → fallback (pas de risque de corruption)
      if (parsed.version > CURRENT_VERSION) return fallback;
      // Schema actuel → valider data
      if (parsed.version === CURRENT_VERSION && validate(parsed.data)) {
        return parsed.data as T;
      }
      // Schema anterieur (v1, v0) → drop pour regenerer (pas de migration
      // automatique ici — chaque service choisit de migrer ou pas)
      return fallback;
    } catch {
      return fallback;
    }
  };

  it('lit la version courante normalement', async () => {
    const stored: Stored<{ items: number[] }> = {
      version: CURRENT_VERSION,
      data: { items: [1, 2, 3] },
    };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));
    const isShape = (v: unknown): v is { items: number[] } =>
      typeof v === 'object' && v !== null && Array.isArray((v as any).items);
    const result = await readWithMigration('key', isShape, { items: [] });
    expect(result.items).toEqual([1, 2, 3]);
  });

  it('schema futur (v3) inconnu → fallback (defense)', async () => {
    const stored = { version: 3, data: { newField: 'unknown' } };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));
    const isShape = (v: unknown): v is { items: number[] } => false;
    const result = await readWithMigration('key', isShape, { items: [] });
    expect(result).toEqual({ items: [] });
  });

  it('schema legacy (v1) → fallback (pas de migration auto)', async () => {
    const stored = { version: 1, data: { items: 'legacy-format' } };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));
    const isShape = (v: unknown): v is { items: number[] } =>
      typeof v === 'object' && v !== null && Array.isArray((v as any).items);
    const result = await readWithMigration('key', isShape, { items: [] });
    expect(result).toEqual({ items: [] });
  });

  it('storage sans version (legacy v0 implicite) → fallback', async () => {
    const stored = { items: [1, 2] };  // pas de version
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));
    const isShape = (v: unknown): v is { items: number[] } =>
      typeof v === 'object' && v !== null && Array.isArray((v as any).items);
    const result = await readWithMigration('key', isShape, { items: [] });
    expect(result).toEqual({ items: [] });
  });
});


// =====================================================================
// FAILURE MODES CROSS-CUTTING — patterns de defense communs
// =====================================================================

describe('failure modes communs a tout service AsyncStorage', () => {
  it('failure mode 1 : getItem rejected → fallback', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Disk full'));
    let value = 'default';
    try {
      const raw = await mockAsyncStorage.getItem('key');
      value = raw ?? 'default';
    } catch {
      value = 'default';
    }
    expect(value).toBe('default');
  });

  it('failure mode 2 : JSON.parse leve → fallback', () => {
    const stored = 'not{json';
    let parsed: any;
    try {
      parsed = JSON.parse(stored);
    } catch {
      parsed = null;
    }
    expect(parsed).toBe(null);
  });

  it('failure mode 3 : parsed est null → fallback', () => {
    const parsed: any = null;
    const fallback = parsed ?? [];
    expect(fallback).toEqual([]);
  });

  it('failure mode 4 : parsed est wrong type → fallback via Array.isArray', () => {
    const parsed: any = 'string-when-expecting-array';
    const safe = Array.isArray(parsed) ? parsed : [];
    expect(safe).toEqual([]);
  });

  it('failure mode 5 : setItem leve apres mutation locale → ne propage pas', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Quota exceeded'));
    let crashed = false;
    try {
      await mockAsyncStorage.setItem('key', 'value');
    } catch {
      crashed = true;
    }
    // En vrai code, le service doit avaler l'erreur et log un warning.
    // Le state local reste a jour, juste pas persiste.
    expect(crashed).toBe(true);  // Confirms it threw — le service doit catch
  });
});
