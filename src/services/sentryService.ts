/**
 * Sentry Error Monitoring Service
 *
 * Centralizes error tracking configuration.
 * Wraps @sentry/react-native for the EventEz mobile app.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

let isInitialized = false;

export function initSentry(): void {
  if (isInitialized || !SENTRY_DSN) {
    if (__DEV__ && !SENTRY_DSN) {
      console.log('[Sentry] No DSN configured — skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version ?? '1.0.0',
    dist: Constants.expoConfig?.extra?.eas?.projectId ?? undefined,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
    beforeSend(event) {
      // Strip sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (bc.data?.url && typeof bc.data.url === 'string') {
            // Remove tokens from URLs
            bc.data.url = bc.data.url.replace(/token=[^&]+/g, 'token=***');
          }
          return bc;
        });
      }
      return event;
    },
  });

  isInitialized = true;
}

export function setUser(user: { id: string | number; email?: string; role?: string }): void {
  Sentry.setUser({
    id: String(user.id),
    email: user.email,
    role: user.role,
  });
}

export function clearUser(): void {
  Sentry.setUser(null);
}

export function captureError(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

export const SentryWrapper = Sentry.wrap;
