/**
 * Utilitaires pour la manipulation des reponses API
 * Standardise l'extraction des donnees paginées
 */

import { AxiosResponse } from 'axios';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Extrait les resultats d'une reponse API (paginee ou non)
 * @param response - La reponse Axios
 * @returns Un tableau de resultats
 */
export function getApiResults<T>(response: AxiosResponse<PaginatedResponse<T> | T[]>): T[] {
  if (!response?.data) return [];

  // Reponse paginee Django REST Framework
  if ('results' in response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }

  // Reponse tableau direct
  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

/**
 * Extrait le nombre total d'elements d'une reponse paginee
 * @param response - La reponse Axios
 * @returns Le nombre total ou la longueur des resultats
 */
export function getApiCount(response: AxiosResponse<any>): number {
  if (!response?.data) return 0;

  // Reponse paginee avec count
  if (typeof response.data.count === 'number') {
    return response.data.count;
  }

  // Reponse avec results
  if (Array.isArray(response.data.results)) {
    return response.data.results.length;
  }

  // Reponse tableau direct
  if (Array.isArray(response.data)) {
    return response.data.length;
  }

  return 0;
}

/**
 * Verifie s'il y a une page suivante
 * @param response - La reponse Axios
 * @returns true s'il y a une page suivante
 */
export function hasNextPage(response: AxiosResponse<any>): boolean {
  return !!response?.data?.next;
}

/**
 * Verifie s'il y a une page precedente
 * @param response - La reponse Axios
 * @returns true s'il y a une page precedente
 */
export function hasPreviousPage(response: AxiosResponse<any>): boolean {
  return !!response?.data?.previous;
}

/**
 * Extrait l'URL de la page suivante
 * @param response - La reponse Axios
 * @returns L'URL de la page suivante ou null
 */
export function getNextPageUrl(response: AxiosResponse<any>): string | null {
  return response?.data?.next || null;
}

/**
 * Extrait le numero de page depuis une URL
 * @param url - L'URL contenant le parametre page
 * @returns Le numero de page ou 1 par defaut
 */
export function extractPageNumber(url: string | null): number {
  if (!url) return 1;

  const match = url.match(/[?&]page=(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Fusionne les resultats de plusieurs pages
 * @param existingData - Donnees existantes
 * @param newData - Nouvelles donnees a ajouter
 * @param idField - Champ utilise comme identifiant unique
 * @returns Donnees fusionnees sans doublons
 */
export function mergeResults<T extends Record<string, any>>(
  existingData: T[],
  newData: T[],
  idField: keyof T = 'id'
): T[] {
  const existingIds = new Set(existingData.map(item => item[idField]));
  const uniqueNewData = newData.filter(item => !existingIds.has(item[idField]));
  return [...existingData, ...uniqueNewData];
}

/**
 * Extract data from Django REST Framework paginated responses.
 * Handles both paginated ({ results: T[] }) and non-paginated (T[]) responses.
 */
export function extractPaginatedData<T>(response: any): T[] {
  if (!response) return [];
  const data = response.data ?? response;
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Extract pagination metadata from a Django REST Framework response.
 */
export function extractPaginationMeta(response: any): { count: number; next: string | null; previous: string | null } {
  const data = response?.data ?? response;
  return {
    count: data?.count ?? 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
}
