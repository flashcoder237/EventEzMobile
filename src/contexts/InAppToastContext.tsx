/**
 * InAppToastContext — gestionnaire de toasts in-app pour les notifications
 * reçues quand l'app est en foreground.
 *
 * Pourquoi ? Quand un message arrive et que l'app est ouverte (sur HomeScreen
 * ou autre écran), iOS et Android n'affichent PAS de banner par défaut. Sans
 * ce système, l'user ne voit rien sauf le badge sur l'icône Messages.
 *
 * Ce contexte expose `showToast(...)` à appeler depuis pushNotificationService
 * quand une notif arrive en foreground et qu'on n'est pas déjà sur la
 * conversation correspondante (cf. logique dans pushNotificationService).
 *
 * API :
 *   const { showToast, dismiss } = useInAppToast();
 *   showToast({ title: 'Alice', body: 'Salut !', icon: 'message', onPress: ... });
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { InAppToast, InAppToastIcon, InAppToastAnchor } from '../components/common/InAppToast';

interface ToastInput {
  title: string;
  body?: string;
  icon?: InAppToastIcon;
  avatarUrl?: string | null;
  onPress?: () => void;
  /** Clé de dédoublonnage. Si déjà présent, le toast est skip. */
  dedupKey?: string;
  /** Durée d'affichage en ms (défaut : selon la gravité). */
  duration?: number;
  /** Ancrage vertical : `top` (push entrant) ou `bottom` (retour d'action). */
  anchor?: InAppToastAnchor;
}

interface ToastInternal extends ToastInput {
  id: string;
}

interface InAppToastContextType {
  showToast: (input: ToastInput) => string | null;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const InAppToastContext = createContext<InAppToastContextType | undefined>(undefined);

// Un seul toast VISIBLE à la fois : au-delà ça encombre. Mais les suivants sont
// MIS EN FILE, pas détruits — avant, un `slice()` écrasait le toast en cours
// sans animation de sortie, donc sur deux erreurs rapprochées la première
// n'était jamais lue.
const MAX_VISIBLE = 1;

export function InAppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  // Tracker des dedupKeys actifs pour skip les doublons rapides (ex: 5 messages
  // de la même conv en 2s → un seul toast affiché).
  const dedupSeenRef = useRef<Map<string, number>>(new Map());
  const idCounterRef = useRef(0);
  /** File d'attente des toasts quand la scène est déjà occupée. */
  const queueRef = useRef<ToastInternal[]>([]);

  const showToast = useCallback((input: ToastInput): string | null => {
    // Dédoublonnage : si la même clé a été vue dans les 3 dernières secondes, skip.
    if (input.dedupKey) {
      const now = Date.now();
      const last = dedupSeenRef.current.get(input.dedupKey);
      if (last && now - last < 3000) {
        return null;
      }
      dedupSeenRef.current.set(input.dedupKey, now);
      // Cleanup périodique (garde la map petite)
      if (dedupSeenRef.current.size > 50) {
        const cutoff = now - 30000;
        for (const [k, t] of dedupSeenRef.current.entries()) {
          if (t < cutoff) dedupSeenRef.current.delete(k);
        }
      }
    }

    const id = `toast_${++idCounterRef.current}`;
    const entry: ToastInternal = { ...input, id };

    setToasts((prev) => {
      if (prev.length < MAX_VISIBLE) return [...prev, entry];
      // Plein → on met en attente au lieu d'écraser.
      queueRef.current.push(entry);
      return prev;
    });
    return id;
  }, []);

  /** Dépile le toast suivant, s'il y en a un. */
  const drainQueue = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) return;
    // Court battement pour que la sortie du précédent soit perçue : deux toasts
    // qui se succèdent sans respiration se lisent comme un scintillement.
    setTimeout(() => setToasts((prev) => (prev.length ? prev : [next])), 150);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      // On ne dépile que si le retrait a bien eu lieu et que la scène est libre.
      if (next.length !== prev.length && next.length === 0) drainQueue();
      return next;
    });
  }, [drainQueue]);

  const dismissAll = useCallback(() => {
    queueRef.current = [];
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({ showToast, dismiss, dismissAll }),
    [showToast, dismiss, dismissAll],
  );

  // Register le bridge module-level pour que pushNotificationService (non-hook)
  // puisse déclencher des toasts. Désinscrit au unmount.
  useEffect(() => {
    registerToastEmitter(showToast);
    return () => registerToastEmitter(() => null);
  }, [showToast]);

  return (
    <InAppToastContext.Provider value={value}>
      {children}
      <View style={styles.host} pointerEvents="box-none">
        {toasts.map((t) => (
          <InAppToast
            key={t.id}
            id={t.id}
            title={t.title}
            body={t.body}
            icon={t.icon}
            avatarUrl={t.avatarUrl}
            duration={t.duration}
            anchor={t.anchor}
            onPress={t.onPress}
            onDismiss={dismiss}
          />
        ))}
      </View>
    </InAppToastContext.Provider>
  );
}

export function useInAppToast(): InAppToastContextType {
  const ctx = useContext(InAppToastContext);
  if (!ctx) {
    // Fallback no-op : si le provider n'est pas monté (ex: tests), on ne crash
    // pas — l'appelant peut continuer comme si le toast n'avait pas été affiché.
    return {
      showToast: () => null,
      dismiss: () => {},
      dismissAll: () => {},
    };
  }
  return ctx;
}

/**
 * Bridge module-level pour que pushNotificationService (qui n'est pas un hook)
 * puisse déclencher un toast. Le provider s'enregistre au mount et le service
 * appelle `_emitToast()` quand une notif arrive en foreground.
 *
 * Pourquoi pas un EventEmitter ? Parce qu'on veut une seule source de vérité
 * et que les hooks React-natifs sont plus simples ici.
 */
let _emitter: ((input: ToastInput) => string | null) | null = null;

export function registerToastEmitter(fn: (input: ToastInput) => string | null) {
  _emitter = fn;
}

export function emitInAppToast(input: ToastInput): string | null {
  if (!_emitter) return null;
  return _emitter(input);
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
});
