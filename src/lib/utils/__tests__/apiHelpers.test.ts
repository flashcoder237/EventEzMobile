/**
 * Tests de apiHelpers.ts — extraction des réponses DRF (paginées ou non).
 * Couvre getApiResults/getApiCount, has/getNext/Previous, extractPageNumber,
 * mergeResults (dédup), extractPaginatedData, extractPaginationMeta.
 */
import {
  getApiResults, getApiCount, hasNextPage, hasPreviousPage,
  getNextPageUrl, extractPageNumber, mergeResults,
  extractPaginatedData, extractPaginationMeta,
} from '../apiHelpers';

const paginated = (results: any[], extra: any = {}) => ({
  data: { count: extra.count ?? results.length, next: extra.next ?? null, previous: extra.previous ?? null, results },
} as any);
const arrayResp = (arr: any[]) => ({ data: arr } as any);

describe('getApiResults', () => {
  it('extrait results d\'une réponse paginée', () => {
    expect(getApiResults(paginated([1, 2, 3]))).toEqual([1, 2, 3]);
  });
  it('renvoie le tableau direct', () => {
    expect(getApiResults(arrayResp([4, 5]))).toEqual([4, 5]);
  });
  it('renvoie [] pour data absent ou forme inconnue', () => {
    expect(getApiResults({ data: null } as any)).toEqual([]);
    expect(getApiResults({ data: { foo: 'bar' } } as any)).toEqual([]);
  });
});

describe('getApiCount', () => {
  it('utilise count si présent', () => {
    expect(getApiCount(paginated([1], { count: 57 }))).toBe(57);
  });
  it('retombe sur results.length', () => {
    expect(getApiCount({ data: { results: [1, 2] } } as any)).toBe(2);
  });
  it('retombe sur la longueur du tableau direct', () => {
    expect(getApiCount(arrayResp([1, 2, 3]))).toBe(3);
  });
  it('0 si rien', () => {
    expect(getApiCount({ data: null } as any)).toBe(0);
  });
});

describe('pagination flags + urls', () => {
  it('hasNextPage / hasPreviousPage', () => {
    expect(hasNextPage(paginated([], { next: 'http://x?page=2' }))).toBe(true);
    expect(hasNextPage(paginated([]))).toBe(false);
    expect(hasPreviousPage(paginated([], { previous: 'http://x?page=1' }))).toBe(true);
    expect(hasPreviousPage(paginated([]))).toBe(false);
  });
  it('getNextPageUrl', () => {
    expect(getNextPageUrl(paginated([], { next: 'http://x?page=3' }))).toBe('http://x?page=3');
    expect(getNextPageUrl(paginated([]))).toBeNull();
  });
});

describe('extractPageNumber', () => {
  it('extrait ?page=N', () => {
    expect(extractPageNumber('http://x/api/?page=5')).toBe(5);
    expect(extractPageNumber('http://x/api/?foo=1&page=12')).toBe(12);
  });
  it('1 par défaut si absent ou null', () => {
    expect(extractPageNumber('http://x/api/')).toBe(1);
    expect(extractPageNumber(null)).toBe(1);
  });
});

describe('mergeResults', () => {
  it('fusionne sans doublon (par id)', () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 2 }, { id: 3 }];
    expect(mergeResults(a, b)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
  it('supporte un champ id custom', () => {
    const a = [{ uuid: 'x' }];
    const b = [{ uuid: 'x' }, { uuid: 'y' }];
    expect(mergeResults(a, b, 'uuid')).toEqual([{ uuid: 'x' }, { uuid: 'y' }]);
  });
});

describe('extractPaginatedData / extractPaginationMeta', () => {
  it('extractPaginatedData gère data.results, tableau, response nu', () => {
    expect(extractPaginatedData({ data: { results: [1] } })).toEqual([1]);
    expect(extractPaginatedData({ data: [2, 3] })).toEqual([2, 3]);
    expect(extractPaginatedData([4])).toEqual([4]);
    expect(extractPaginatedData(null)).toEqual([]);
  });
  it('extractPaginationMeta retourne count/next/previous', () => {
    expect(extractPaginationMeta(paginated([1], { count: 9, next: 'n', previous: 'p' })))
      .toEqual({ count: 9, next: 'n', previous: 'p' });
    expect(extractPaginationMeta(null)).toEqual({ count: 0, next: null, previous: null });
  });
});
