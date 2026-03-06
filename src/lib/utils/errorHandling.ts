/**
 * Utilitaires de gestion des erreurs API
 * Centralise l'extraction et le formatage des messages d'erreur
 */

import { AxiosError } from 'axios';

interface ApiErrorData {
  detail?: string;
  email?: string | string[];
  password?: string | string[];
  username?: string | string[];
  phone?: string | string[];
  first_name?: string | string[];
  last_name?: string | string[];
  non_field_errors?: string[];
  [key: string]: any;
}

/**
 * Extrait un message d'erreur lisible depuis une erreur API
 * @param error - L'erreur capturee (AxiosError ou autre)
 * @returns Un message d'erreur lisible pour l'utilisateur
 */
export function extractErrorMessage(error: any): string {
  // Erreur Axios avec reponse
  if (error?.response?.data) {
    const data: ApiErrorData = error.response.data;

    // Message detail direct
    if (data.detail) {
      return data.detail;
    }

    // Erreurs de champs specifiques
    const fieldErrors = [
      'email', 'password', 'username', 'phone',
      'first_name', 'last_name', 'content', 'title'
    ];

    for (const field of fieldErrors) {
      if (data[field]) {
        const value = data[field];
        return Array.isArray(value) ? value[0] : value;
      }
    }

    // Erreurs non liees a un champ
    if (data.non_field_errors?.length) {
      return data.non_field_errors[0];
    }

    // Premiere erreur trouvee dans l'objet
    const firstKey = Object.keys(data)[0];
    if (firstKey && data[firstKey]) {
      const value = data[firstKey];
      return Array.isArray(value) ? value[0] : String(value);
    }
  }

  // Codes de statut HTTP specifiques
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Donnees invalides. Verifiez les informations saisies.';
      case 401:
        return 'Session expiree. Veuillez vous reconnecter.';
      case 403:
        return 'Vous n\'avez pas les permissions necessaires.';
      case 404:
        return 'La ressource demandee n\'existe pas.';
      case 429:
        return 'Trop de requetes. Veuillez patienter.';
      case 500:
        return 'Erreur serveur. Veuillez reessayer plus tard.';
    }
  }

  // Erreur reseau
  if (error?.message?.includes('Network Error')) {
    if (__DEV__) {
      const url = error?.config?.baseURL || 'unknown';
      return `Erreur de connexion vers ${url}. Verifiez EXPO_PUBLIC_API_URL et que le serveur est accessible.`;
    }
    return 'Impossible de joindre le serveur. Veuillez reessayer dans quelques instants.';
  }

  // Timeout
  if (error?.code === 'ECONNABORTED') {
    return 'La requete a pris trop de temps. Veuillez reessayer.';
  }

  // Message d'erreur generique
  if (error?.message) {
    return error.message;
  }

  return 'Une erreur inattendue est survenue. Veuillez reessayer.';
}

/**
 * Extrait les erreurs de validation par champ depuis une erreur API
 * @param error - L'erreur capturee
 * @returns Un objet avec les erreurs par champ
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (error?.response?.data) {
    const data = error.response.data;

    Object.keys(data).forEach(key => {
      if (key !== 'detail' && key !== 'non_field_errors') {
        const value = data[key];
        fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
      }
    });
  }

  return fieldErrors;
}

/**
 * Verifie si l'erreur est une erreur d'authentification
 */
export function isAuthError(error: any): boolean {
  return error?.response?.status === 401;
}

/**
 * Verifie si l'erreur est une erreur reseau
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('Network Error') ||
    error?.code === 'ECONNABORTED' ||
    !error?.response
  );
}

/**
 * Verifie si l'erreur est une erreur de validation
 */
export function isValidationError(error: any): boolean {
  return error?.response?.status === 400;
}
