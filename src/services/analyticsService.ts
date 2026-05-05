/**
 * Analytics Service (Expo-compatible, no native modules)
 *
 * Lightweight event tracking for the EventEz mobile app.
 * - Stores events locally (memory queue + AsyncStorage batch)
 * - Logs events in dev mode for debugging
 * - Same API surface as the previous Firebase implementation
 * - Ready to flush to a backend tracking endpoint when available
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@eventez_analytics_queue';
const MAX_QUEUE_SIZE = 500;
const FLUSH_INTERVAL_MS = 60_000; // 1 minute

interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
  timestamp: number;
  userId?: string;
  screen?: string;
}

// In-memory state
let isEnabled = true;
let currentUserId: string | null = null;
let currentUserProperties: Record<string, string> = {};
let currentScreen: string | null = null;
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

// ============================================
// Core functions
// ============================================

export async function initAnalytics(): Promise<void> {
  try {
    // Load queued events from previous sessions
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        eventQueue = parsed;
      }
    }

    // Start periodic flush
    // Fix memory leak : si initAnalytics est appele deux fois (hot reload,
    // re-init explicite), on clear le timer precedent pour eviter d'avoir
    // plusieurs intervals en parallele qui flushent en meme temps.
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL_MS);

    if (__DEV__) console.log(`[Analytics] Initialized (${eventQueue.length} queued events from previous session)`);
  } catch (error) {
    if (__DEV__) console.warn('[Analytics] Init failed:', error);
    isEnabled = false;
  }
}

export async function setAnalyticsUser(
  userId: string | number,
  properties?: Record<string, string>,
): Promise<void> {
  if (!isEnabled) return;
  currentUserId = String(userId);
  if (properties) {
    currentUserProperties = { ...currentUserProperties, ...properties };
  }
  if (__DEV__) console.log('[Analytics] User set:', currentUserId, currentUserProperties);
}

export async function clearAnalyticsUser(): Promise<void> {
  if (!isEnabled) return;
  currentUserId = null;
  currentUserProperties = {};
  if (__DEV__) console.log('[Analytics] User cleared');
}

export async function trackScreenView(
  screenName: string,
  screenClass?: string,
): Promise<void> {
  if (!isEnabled) return;
  currentScreen = screenName;
  await enqueueEvent('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

export async function trackEvent(
  eventName: string,
  params?: Record<string, any>,
): Promise<void> {
  if (!isEnabled) return;
  await enqueueEvent(eventName, params);
}

// ============================================
// Internal queue management
// ============================================

async function enqueueEvent(
  name: string,
  params?: Record<string, any>,
): Promise<void> {
  const event: AnalyticsEvent = {
    name,
    params,
    timestamp: Date.now(),
    userId: currentUserId || undefined,
    screen: currentScreen || undefined,
  };

  if (__DEV__) {
    console.log(`[Analytics] ${name}`, params || '');
  }

  eventQueue.push(event);

  // Cap queue size
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue = eventQueue.slice(-MAX_QUEUE_SIZE);
  }

  // Persist to AsyncStorage (debounced via flush interval)
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueue));
  } catch {
    // Silent fail — memory queue is still intact
  }
}

/**
 * Flush events to backend (stub).
 * Replace the body of this function with an API call when a
 * backend tracking endpoint is available, e.g.:
 *
 *   await api.post('/analytics/track/', { events: batch });
 *   eventQueue = [];
 *   await AsyncStorage.removeItem(STORAGE_KEY);
 */
async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  // TODO: Send eventQueue to backend tracking endpoint
  // For now, just clear old events (keep last session only)
  if (eventQueue.length > 200) {
    eventQueue = eventQueue.slice(-100);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueue));
    } catch {
      // Silent fail
    }
  }
}

/**
 * Get current analytics queue (for debugging or export).
 */
export function getAnalyticsQueue(): AnalyticsEvent[] {
  return [...eventQueue];
}

/**
 * Cleanup (call on app unmount if needed).
 */
export function destroyAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ============================================
// Pre-built EventEz-specific events
// ============================================

export const EventEzAnalytics = {
  // Auth
  login: (method: string) => trackEvent('login', { method }),
  signup: (method: string) => trackEvent('sign_up', { method }),
  logout: () => trackEvent('logout'),

  // Events
  viewEvent: (eventId: string, eventName: string) =>
    trackEvent('view_event', { event_id: eventId, event_name: eventName }),
  shareEvent: (eventId: string) =>
    trackEvent('share_event', { event_id: eventId }),
  followEvent: (eventId: string) =>
    trackEvent('follow_event', { event_id: eventId }),
  unfollowEvent: (eventId: string) =>
    trackEvent('unfollow_event', { event_id: eventId }),
  createEvent: (eventType: string) =>
    trackEvent('create_event', { event_type: eventType }),
  publishEvent: (eventId: string) =>
    trackEvent('publish_event', { event_id: eventId }),

  // Tickets & Payments
  beginCheckout: (eventId: string, amount: number, currency: string) =>
    trackEvent('begin_checkout', { event_id: eventId, value: amount, currency }),
  purchase: (eventId: string, amount: number, currency: string, method: string) =>
    trackEvent('purchase', { event_id: eventId, value: amount, currency, payment_method: method }),
  refundRequest: (eventId: string) =>
    trackEvent('refund_request', { event_id: eventId }),

  // Search
  search: (query: string, resultsCount: number) =>
    trackEvent('search', { search_term: query, results_count: resultsCount }),

  // Messaging
  sendMessage: (conversationId: string) =>
    trackEvent('send_message', { conversation_id: conversationId }),

  // QR
  scanQR: (eventId: string) =>
    trackEvent('scan_qr', { event_id: eventId }),

  // AI
  useAI: (feature: string) =>
    trackEvent('use_ai', { feature }),
};
