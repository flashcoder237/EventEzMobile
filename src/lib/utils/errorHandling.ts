/**
 * Utilitaires de gestion des erreurs API
 * Centralise l'extraction et le formatage des messages d'erreur.
 *
 * Règle d'or : on ne montre JAMAIS à l'utilisateur `error.message` d'axios
 * ("Network Error", "timeout of 30000ms exceeded"), ni l'URL/env du backend,
 * ni du JSON brut. Utiliser `getApiErrorMessage(error, t, { fallbackKey })` qui
 * résout toujours vers une clé i18n propre et actionnable.
 */

import { AxiosError } from 'axios';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

/**
 * Codes backend (champ `code` renvoyé par le DRF exception handler) → clés i18n
 * (errors.codes.*). Étendre au fil de l'eau. Un code absent retombe sur le
 * mapping par status HTTP + fallback.
 */
export const ERROR_CODE_MAP: Record<string, string> = {
  email_taken: 'errors.codes.emailTaken',
  username_taken: 'errors.codes.usernameTaken',
  weak_password: 'errors.codes.weakPassword',
  invalid_credentials: 'errors.codes.invalidCredentials',
  reset_link_expired: 'errors.codes.resetLinkExpired',
  otp_invalid: 'errors.codes.otpInvalid',
  otp_send_failed: 'errors.codes.otpSendFailed',
  notchpay_unsupported: 'errors.codes.paymentMethodUnsupported',
  payment_failed: 'errors.codes.paymentFailed',
  insufficient_balance: 'errors.codes.insufficientBalance',
  payout_already_processing: 'errors.codes.payoutLocked',
  plan_limit_reached: 'errors.codes.planLimitReached',
  country_not_supported: 'errors.codes.countryNotSupported',
};

function httpKey(status: number | undefined): string {
  switch (status) {
    case 400: return 'errors.http.badRequest';
    case 401: return 'errors.http.unauthorized';
    case 403: return 'errors.http.forbidden';
    case 404: return 'errors.http.notFound';
    case 409: return 'errors.http.conflict';
    case 429: return 'errors.http.tooManyRequests';
    case 500:
    case 502:
    case 503: return 'errors.http.server';
    default: return 'errors.generic';
  }
}

export interface ApiErrorResult {
  message: string;
  fieldErrors: Record<string, string> | null;
  code: string | null;
  isNetwork: boolean;
}

/**
 * Résout une erreur API en message TRADUIT + erreurs de champ. À utiliser
 * partout à la place de extractErrorMessage (qui ne prend pas `t`).
 *
 * Ordre : réseau/timeout → code métier mappé → validation de champ (400) →
 * status HTTP → fallback fourni par l'appelant. Jamais error.message brut.
 */
export function getApiErrorMessage(
  error: any,
  t: TFunc,
  opts: { fallbackKey: string; fallbackValues?: Record<string, unknown> },
): ApiErrorResult {
  const noResponse = !error?.response;
  const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
  const isNet = noResponse && (
    error?.code === 'ERR_NETWORK' || /network error/i.test(error?.message || '') || !error?.code
  );
  if (isTimeout) return { message: t('errors.timeout'), fieldErrors: null, code: null, isNetwork: true };
  if (noResponse && isNet) return { message: t('errors.network'), fieldErrors: null, code: null, isNetwork: true };

  const status: number | undefined = error?.response?.status;
  const data = error?.response?.data;
  const code: string | null = (data && typeof data === 'object' ? data.code : null) || null;

  if (code && ERROR_CODE_MAP[code]) {
    return { message: t(ERROR_CODE_MAP[code]), fieldErrors: extractFieldErrors(error), code, isNetwork: false };
  }

  const fieldErrors = status === 400 ? nonEmpty(extractFieldErrors(error)) : null;
  let message: string;
  if (fieldErrors) {
    // `message` reste GÉNÉRIQUE, volontairement : les erreurs de champ sont
    // renvoyées à part dans `fieldErrors`, pour que l'appelant les rattache au
    // champ concerné (bordure rouge + message dessous). Les recracher ici
    // reviendrait à afficher du texte backend brut dans une modale qui, par
    // construction, ne peut pas désigner le champ fautif — exactement ce que ce
    // helper existe pour éviter.
    //
    // Un écran qui veut détailler lit `fieldErrors` (cf. RegisterScreen,
    // ResetPasswordScreen, VerifyEmailScreen) ; il ne doit pas compter sur
    // `message` pour ça.
    message = t('errors.validation');
  } else if (status && status >= 500) {
    message = t('errors.http.server');
  } else if (status === 429) {
    message = t('errors.http.tooManyRequests');
  } else {
    message = t(opts.fallbackKey, opts.fallbackValues) || t(httpKey(status));
  }
  return { message, fieldErrors, code, isNetwork: false };
}

function nonEmpty(o: Record<string, string>): Record<string, string> | null {
  return o && Object.keys(o).length ? o : null;
}

/**
 * Construit un message lisible à partir d'une map d'erreurs de champ, préfixé du
 * label du champ quand connu (« Titre : … »). Réservé aux écrans SANS erreurs
 * inline (ex. formulaires admin en modale) : ailleurs, préférer rattacher
 * `fieldErrors` aux champs. Retourne '' si rien d'exploitable.
 */
export function formatFieldErrors(
  fieldErrors: Record<string, string> | null | undefined,
  t: TFunc,
  max = 3,
): string {
  if (!fieldErrors) return '';
  return Object.entries(fieldErrors)
    .slice(0, max)
    .map(([field, msg]) => {
      const label = fieldLabel(field, t);
      return label ? `${label} : ${msg}` : msg;
    })
    .join('\n');
}

/**
 * Label lisible pour un champ d'erreur (errors.fields.*). Retourne null si aucun
 * label i18n n'existe → l'appelant affiche alors le message seul, jamais la clé
 * technique brute.
 */
function fieldLabel(field: string, t: TFunc): string | null {
  const key = `errors.fields.${field}`;
  const translated = t(key);
  return translated && translated !== key ? translated : null;
}

/**
 * Aplati une valeur d'erreur DRF (string | string[] | objet imbriqué) en une
 * seule string lisible. Évite le « [object Object] » / « {} » qui s'affichait
 * quand une valeur d'erreur était un dict imbriqué. Pour une liste, on garde le
 * PREMIER message (contrat historique : un message par champ, cf. tests).
 */
function flattenErrorValue(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const flat = flattenErrorValue(v);
      if (flat) return flat;
    }
    return '';
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) {
      const flat = flattenErrorValue(v);
      if (flat) return flat;
    }
    return '';
  }
  return String(value);
}

interface ApiErrorData {
  detail?: string;
  email?: string | string[];
  password?: string | string[];
  username?: string | string[];
  phone?: string | string[];
  phone_number?: string | string[];
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
      'email', 'password', 'username', 'phone', 'phone_number',
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

  // Erreur reseau. On NE montre PAS l'URL ni le nom de la variable d'env
  // (fuite de config) — on log en dev, on affiche un message neutre.
  if (error?.message?.includes('Network Error')) {
    if (__DEV__) {
      const url = error?.config?.baseURL || 'unknown';
      console.warn(`[API] Network Error vers ${url} — vérifier EXPO_PUBLIC_API_URL et l'accessibilité du serveur.`);
    }
    return 'Impossible de joindre le serveur. Veuillez reessayer dans quelques instants.';
  }

  // Timeout
  if (error?.code === 'ECONNABORTED') {
    return 'La requete a pris trop de temps. Veuillez reessayer.';
  }

  // Fallback générique. On NE renvoie JAMAIS error.message brut (jargon axios
  // "Network Error"/"timeout of 30000ms"/"Request failed with status 500").
  return 'Une erreur inattendue est survenue. Veuillez reessayer.';
}

/**
 * Extrait les erreurs de validation par champ depuis une erreur API
 * @param error - L'erreur capturee
 * @returns Un objet avec les erreurs par champ
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (error?.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data;

    Object.keys(data).forEach(key => {
      // `code` est injecté par le DRF exception handler (validation_error…), ce
      // n'est pas une erreur de champ. `detail`/`non_field_errors` traités ailleurs.
      if (key !== 'detail' && key !== 'non_field_errors' && key !== 'code') {
        const flat = flattenErrorValue(data[key]);
        if (flat) fieldErrors[key] = flat;
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
