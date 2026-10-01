/**
 * Pont natif EventEz (round 3, lot natif).
 *
 * Module OPTIONNEL : absent dans Expo Go, sur le web et dans les tests →
 * `requireOptionalNativeModule` renvoie null et chaque fonction devient un
 * no-op qui répond « non disponible ». Aucun appelant ne doit planter faute
 * de module : toutes les fonctions avalent les erreurs natives.
 *
 * Ce que le module expose (selon la plateforme) :
 *  - widgets « Prochain billet » (iOS WidgetKit via App Group, Android AppWidget
 *    + tuile Réglages rapides via SharedPreferences) — X3 / X11 ;
 *  - Live Activities iOS 16.2+ (participant X1, organisateur X14) ;
 *  - Handoff iOS (NSUserActivity) — X13 ;
 *  - capteur de proximité (écran éteint contre l'oreille) — G10 ;
 *  - motifs Core Haptics iOS — H6 ;
 *  - texte reçu par « Partager vers EventEz » sur Android — X12.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Subscription = { remove(): void };

interface EventezNativeModuleType {
  appGroupAvailable(): boolean;
  setWidgetData(json: string | null): boolean;
  liveActivitiesEnabled(): boolean;
  startLiveActivity(attributesJson: string, stateJson: string, staleDateMs: number | null): Promise<string | null>;
  updateLiveActivity(key: string, stateJson: string, staleDateMs: number | null): Promise<boolean>;
  endLiveActivity(key: string, dismissImmediately: boolean): Promise<boolean>;
  listLiveActivities(): string[];
  setHandoff(url: string, title: string | null): void;
  clearHandoff(): void;
  setProximityMonitoring(enabled: boolean): Promise<boolean>;
  supportsRichHaptics(): boolean;
  playHaptic(name: string): Promise<boolean>;
  consumeSharedText(): string | null;
  addListener(event: string, listener: (payload: any) => void): Subscription;
}

const Native = requireOptionalNativeModule<EventezNativeModuleType>('EventezNative');

function attempt<T>(fallback: T, run: (m: EventezNativeModuleType) => T): T {
  if (!Native) return fallback;
  try {
    return run(Native);
  } catch (e) {
    if (__DEV__) console.warn('[EventezNative]', e);
    return fallback;
  }
}

async function attemptAsync<T>(fallback: T, run: (m: EventezNativeModuleType) => Promise<T>): Promise<T> {
  if (!Native) return fallback;
  try {
    return await run(Native);
  } catch (e) {
    if (__DEV__) console.warn('[EventezNative]', e);
    return fallback;
  }
}

export const isNativeBridgeAvailable = (): boolean => Native != null;

// ── Widgets (X3) + tuile Réglages rapides (X11) ─────────────────────────────
/** Vrai si les widgets peuvent recevoir des données (App Group iOS configuré, ou Android). */
export function widgetsAvailable(): boolean {
  return attempt(false, (m) => m.appGroupAvailable());
}

/** Écrit (ou efface avec `null`) le billet affiché par les widgets et la tuile. */
export function setWidgetData(payload: object | null): boolean {
  return attempt(false, (m) => m.setWidgetData(payload ? JSON.stringify(payload) : null));
}

// ── Live Activities (X1 / X14) ──────────────────────────────────────────────
export function liveActivitiesEnabled(): boolean {
  if (Platform.OS !== 'ios') return false;
  return attempt(false, (m) => m.liveActivitiesEnabled());
}

/**
 * Démarre l'activité identifiée par `attributes.key`, ou met à jour celle qui
 * existe déjà avec cette clé (jamais deux activités pour le même billet).
 */
export function startLiveActivity(attributes: object, state: object, staleDate?: number | null): Promise<string | null> {
  if (Platform.OS !== 'ios') return Promise.resolve(null);
  return attemptAsync(null, (m) =>
    m.startLiveActivity(JSON.stringify(attributes), JSON.stringify(state), staleDate ?? null),
  );
}

export function updateLiveActivity(key: string, state: object, staleDate?: number | null): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(false);
  return attemptAsync(false, (m) => m.updateLiveActivity(key, JSON.stringify(state), staleDate ?? null));
}

export function endLiveActivity(key: string, dismissImmediately = false): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(false);
  return attemptAsync(false, (m) => m.endLiveActivity(key, dismissImmediately));
}

/** Clés (`attributes.key`) des activités en cours. */
export function listLiveActivities(): string[] {
  if (Platform.OS !== 'ios') return [];
  return attempt<string[]>([], (m) => m.listLiveActivities());
}

// ── Handoff (X13) ───────────────────────────────────────────────────────────
export function setHandoff(url: string, title?: string | null): void {
  if (Platform.OS !== 'ios') return;
  attempt(undefined, (m) => m.setHandoff(url, title ?? null));
}

export function clearHandoff(): void {
  if (Platform.OS !== 'ios') return;
  attempt(undefined, (m) => m.clearHandoff());
}

// ── Proximité (G10) ─────────────────────────────────────────────────────────
/** Active la surveillance : l'écran s'éteint quand le téléphone est contre l'oreille. */
export function setProximityMonitoring(enabled: boolean): Promise<boolean> {
  return attemptAsync(false, (m) => m.setProximityMonitoring(enabled));
}

export function addProximityListener(listener: (near: boolean) => void): Subscription {
  return attempt<Subscription>({ remove() {} }, (m) =>
    m.addListener('onProximityChange', (e: { near?: boolean }) => listener(!!e?.near)),
  );
}

// ── Core Haptics (H6) ───────────────────────────────────────────────────────
export type RichHapticName = 'heartbeat' | 'doors' | 'rise' | 'celebrate' | 'tick' | 'wall';

export function supportsRichHaptics(): boolean {
  if (Platform.OS !== 'ios') return false;
  return attempt(false, (m) => m.supportsRichHaptics());
}

export function playRichHaptic(name: RichHapticName): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(false);
  return attemptAsync(false, (m) => m.playHaptic(name));
}

// ── Partage entrant Android (X12) ───────────────────────────────────────────
/** Texte reçu par l'intent de partage qui a lancé l'app (consommé une seule fois). */
export function consumeSharedText(): string | null {
  if (Platform.OS !== 'android') return null;
  return attempt<string | null>(null, (m) => m.consumeSharedText());
}

export function addShareListener(listener: (text: string) => void): Subscription {
  if (Platform.OS !== 'android') return { remove() {} };
  return attempt<Subscription>({ remove() {} }, (m) =>
    m.addListener('onShareIntent', (e: { text?: string }) => {
      if (e?.text) listener(e.text);
    }),
  );
}
