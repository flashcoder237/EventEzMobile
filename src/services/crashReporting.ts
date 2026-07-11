// ============================================
// Crash reporting — wrapper Sentry tolérant
// ============================================
//
// Wrapper minimal autour de @sentry/react-native :
// - le module natif n'est pas dispo en Expo Go (require crash) → on lazy-load
//   dans un try/catch et on no-op si absent.
// - DSN lue depuis EXPO_PUBLIC_SENTRY_DSN. Si vide, init silencieuse → utile
//   en local dev où on ne veut pas polluer le projet Sentry de prod.
// - Le reste de l'app appelle les helpers ici (pas Sentry directement) pour
//   pouvoir évoluer sans tout casser.

let Sentry: any = null;
let initialized = false;

function tryLoadSentry() {
  if (Sentry) return Sentry;
  try {
    Sentry = require('@sentry/react-native');
  } catch {
    Sentry = null;
  }
  return Sentry;
}

interface InitOptions {
  /** DSN Sentry — fallback EXPO_PUBLIC_SENTRY_DSN si non fourni. */
  dsn?: string;
  /** Environnement (production / staging / development) — par défaut __DEV__ → development. */
  environment?: string;
  /** Release / version pour grouping — fallback expo-constants version. */
  release?: string;
}

export function initCrashReporting(opts: InitOptions = {}): void {
  if (initialized) return;
  const sentry = tryLoadSentry();
  if (!sentry) {
    if (__DEV__) console.log('[CrashReporting] Sentry native module unavailable (Expo Go?)');
    return;
  }

  const dsn = opts.dsn || process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // ⚠️ PROD : sans DSN, aucun crash n'est reporté (on vole à l'aveugle).
    // Provisionner via `eas secret:create --name EXPO_PUBLIC_SENTRY_DSN`.
    // Cf. docs/MOBILE_PROD_READINESS.md.
    if (__DEV__) console.log('[CrashReporting] No DSN configured — Sentry not initialized');
    return;
  }

  // Release/dist : sans ça, Sentry ne peut pas grouper par version ni relier
  // les sourcemaps (stacks illisibles). On dérive de expo-constants. Le mapping
  // sourcemaps complet nécessite en plus le plugin @sentry/react-native/expo
  // (cf. docs/MOBILE_PROD_READINESS.md).
  let Constants: any = null;
  try {
    Constants = require('expo-constants').default;
  } catch {
    Constants = null;
  }
  const appVersion: string | undefined = Constants?.expoConfig?.version;
  const derivedRelease = appVersion ? `net.overbrand.eventez@${appVersion}` : undefined;
  const environment =
    opts.environment ||
    process.env.EXPO_PUBLIC_ENV ||
    (__DEV__ ? 'development' : 'production');

  try {
    sentry.init({
      dsn,
      environment,
      release: opts.release || derivedRelease,
      // PII filtering : on retire les corps de requête pour ne pas balancer
      // mots de passe / tokens à Sentry. Les breadcrumbs restent utiles
      // (chemins, codes HTTP) pour debug.
      sendDefaultPii: false,
      // En dev on n'envoie pas — utile pour ne pas polluer Sentry en local
      enabled: !__DEV__,
      beforeBreadcrumb(breadcrumb: any) {
        if (breadcrumb?.category === 'console') {
          // Évite de renvoyer tous les console.log en breadcrumbs
          return null;
        }
        if (breadcrumb?.data?.body) {
          // Strip body pour les breadcrumbs HTTP (peut contenir secrets)
          breadcrumb.data.body = '[redacted]';
        }
        return breadcrumb;
      },
    });
    initialized = true;
    if (__DEV__) console.log('[CrashReporting] Sentry initialized');
  } catch (error) {
    if (__DEV__) console.warn('[CrashReporting] Sentry init failed:', error);
  }
}

/**
 * Capture une exception non gérée. Appelée par ErrorBoundary.componentDidCatch
 * et par les chemins d'erreur API critiques.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized || !Sentry) return;
  try {
    if (context) {
      Sentry.withScope((scope: any) => {
        scope.setContext('extra', context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // Best effort
  }
}

/**
 * Message arbitraire (info/warning/error). À utiliser pour les anomalies
 * non-throwantes — ex: refresh token a échoué silencieusement, idempotency
 * key manquante, etc.
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
  context?: Record<string, unknown>,
): void {
  if (!initialized || !Sentry) return;
  try {
    if (context) {
      Sentry.withScope((scope: any) => {
        scope.setContext('extra', context);
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  } catch {
    // Best effort
  }
}

/**
 * Associe le user courant à toutes les futures captures (jusqu'au prochain
 * setUser ou clearUser). À appeler après login/checkAuth réussi.
 */
export function setUser(user: { id: number | string; email?: string; role?: string }): void {
  if (!initialized || !Sentry) return;
  try {
    Sentry.setUser({
      id: String(user.id),
      // L'email peut être considéré PII selon les juridictions — on le garde
      // pour faciliter le support, mais sendDefaultPii=false côté init veille
      // à ne pas exposer plus de PII que nécessaire.
      email: user.email,
      role: user.role,
    });
  } catch {
    // Best effort
  }
}

export function clearUser(): void {
  if (!initialized || !Sentry) return;
  try {
    Sentry.setUser(null);
  } catch {
    // Best effort
  }
}

/**
 * Wrapper React pour l'auto-capture des erreurs depuis ErrorBoundary
 * (alternative au manual captureException). Retourne le HOC Sentry ou null
 * si Sentry n'est pas chargé — le caller doit gérer le null.
 */
export function getSentryErrorBoundaryWrap(): ((Component: any) => any) | null {
  const sentry = tryLoadSentry();
  if (!sentry?.wrap) return null;
  return sentry.wrap;
}
