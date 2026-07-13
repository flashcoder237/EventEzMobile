/**
 * Charge TOUTES les pages d'un endpoint DRF paginé (PageNumberPagination) et
 * renvoie la liste complète concaténée.
 *
 * Miroir du helper web (eventez-frontend/src/lib/utils/fetchAllPages.ts).
 * Les écrans admin (users, staff, dépenses…) affichent/filtrent la liste
 * entière côté client : ils ont besoin de tout le dataset, pas seulement de la
 * 1re page (le backend pagine à 20). On suit `next` avec le page_size max
 * autorisé (StandardPagination.max_page_size = 100).
 *
 * ⚠️ Réservé aux datasets BORNÉS. Pour un flux potentiellement énorme (audit
 * logs), préférer un scroll infini (onEndReached) page par page.
 */
export async function fetchAllPages<T = any>(
  fetcher: (params: { page: number; page_size: number }) => Promise<{ data: any }>,
  pageSize = 100,
  maxPages = 1000,
): Promise<T[]> {
  let all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await fetcher({ page, page_size: pageSize });
    if (Array.isArray(data)) return data as T[];
    const results = (data?.results ?? []) as T[];
    all = all.concat(results);
    if (!data?.next || results.length === 0) break;
  }
  return all;
}
