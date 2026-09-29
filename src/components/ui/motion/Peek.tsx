/**
 * Peek — aperçu au toucher long, façon menu contextuel iOS (T6).
 *
 *   - `PeekTrigger` enveloppe une carte : un Pan qui ne s'active qu'après
 *     350 ms immobile (bouger avant = le défilement garde la main) ;
 *   - à l'activation : vibration « medium », la carte se soulève dans un
 *     `PeekHost` monté à la racine (fond flouté + voile), aperçu + actions ;
 *   - appuyer, glisser, relâcher : le doigt glisse sur l'action (vibration
 *     « selection » à chaque changement), le relâcher l'exécute. Relâcher hors
 *     d'une action laisse le menu ouvert (toucher une action ou le fond) ;
 *   - « Ouvrir » enchaîne sur le vol HeroFlight depuis l'image de l'aperçu ;
 *   - les mêmes actions sont exposées en `accessibilityActions` par la carte.
 *
 * Transform + opacité uniquement, ressort `respond` (sans dépassement visible).
 */
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { haptics } from '../../../utils/haptics';
import { Curves, Durations, springConfig } from '../../../constants/motion';
import { FontFamily } from '../../../constants/theme';
import { isReducedMotionCached } from '../../../hooks/useReducedMotion';
import { HeroSlot, captureHero, useHeroToken } from './HeroFlight';

export interface PeekAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  /** Appelé après la fermeture de l'aperçu. `open` reçoit le vol déjà capturé. */
  onSelect: () => void;
  /** Action d'ouverture : capture l'image de l'aperçu avant de naviguer. */
  hero?: boolean;
}

export interface PeekPreview {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  placeholder?: string;
}

interface PeekPayload {
  rect: { x: number; y: number; width: number; height: number };
  preview: PeekPreview;
  actions: PeekAction[];
}

// ---------------------------------------------------------------------------
// Store module (un seul hôte, comme HeroFlight).

let current: PeekPayload | null = null;
let fingerDown = false;
let lastClosed = 0;
const listeners = new Set<() => void>();
const moveListeners = new Set<(x: number, y: number) => void>();
const releaseListeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const peek = {
  open(payload: PeekPayload) {
    current = payload;
    fingerDown = true;
    emit();
  },
  move(x: number, y: number) {
    moveListeners.forEach((l) => l(x, y));
  },
  release() {
    fingerDown = false;
    releaseListeners.forEach((l) => l());
  },
  close() {
    current = null;
    fingerDown = false;
    lastClosed = Date.now();
    emit();
  },
  isOpen() {
    return current !== null;
  },
  /** Un tap arrivant juste après la fermeture appartient au geste d'aperçu. */
  justClosed(ms = 600) {
    return Date.now() - lastClosed < ms;
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => current;

// ---------------------------------------------------------------------------
// Déclencheur

export interface PeekTriggerProps {
  children: React.ReactNode;
  preview: PeekPreview;
  actions: PeekAction[];
  enabled?: boolean;
  /** Appelé à l'ouverture de l'aperçu : la carte doit ignorer le tap qui suit. */
  onPeekStart?: () => void;
}

export function PeekTrigger({ children, preview, actions, enabled = true, onPeekStart }: PeekTriggerProps) {
  const ref = useRef<View>(null);
  const latest = useRef({ preview, actions, onPeekStart });
  latest.current = { preview, actions, onPeekStart };

  const start = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    latest.current.onPeekStart?.();
    node.measureInWindow((x, y, width, height) => {
      if (!width || !height) return;
      haptics.medium();
      peek.open({ rect: { x, y, width, height }, preview: latest.current.preview, actions: latest.current.actions });
    });
  }, []);

  const gesture = Gesture.Pan()
    .enabled(enabled && actions.length > 0)
    .activateAfterLongPress(350)
    .onStart(() => {
      runOnJS(start)();
    })
    .onUpdate((e) => {
      runOnJS(peek.move)(e.absoluteX, e.absoluteY);
    })
    // Toujours relâcher, même si le geste est annulé par le système après
    // l'ouverture (défilement repris, appel entrant…) : sinon `fingerDown`
    // reste vrai et le fond ne ferme plus jamais l'aperçu.
    .onFinalize(() => {
      runOnJS(peek.release)();
    });

  return (
    <GestureDetector gesture={gesture}>
      <View ref={ref} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------
// Hôte (monté une fois, à la racine)

const PREVIEW_MAX_W = 340;
const ROW_H = 48;

export function PeekHost() {
  const payload = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [highlight, setHighlight] = useState<number>(-1);
  const highlightRef = useRef(-1);
  const rowRects = useRef<Array<{ x: number; y: number; w: number; h: number } | null>>([]);
  const rowRefs = useRef<Array<View | null>>([]);
  const previewToken = useHeroToken();

  const dim = useSharedValue(0);
  const lift = useSharedValue(0);

  const reduced = isReducedMotionCached();
  const previewW = Math.min(winW - 48, PREVIEW_MAX_W);
  const imageH = Math.round(previewW * 0.52);
  const previewH = imageH + 72;
  const menuH = (payload?.actions.length ?? 0) * ROW_H;
  const gap = 12;
  const blockH = previewH + gap + menuH;
  const top = Math.max(
    insets.top + 16,
    Math.min(payload ? payload.rect.y : 0, winH - insets.bottom - 16 - blockH),
  );
  const left = (winW - previewW) / 2;

  const close = useCallback(() => {
    const done = () => peek.close();
    if (reduced) {
      done();
      return;
    }
    dim.value = withTiming(0, { duration: Durations.exit, easing: Curves.out });
    lift.value = withTiming(0, { duration: Durations.exit, easing: Curves.out }, (f) => {
      if (f) runOnJS(done)();
    });
  }, [dim, lift, reduced]);

  const run = useCallback(
    (index: number) => {
      const action = payload?.actions[index];
      if (!action) return;
      if (action.hero) {
        // L'aperçu devient l'origine du vol jusqu'à la fiche.
        captureHero(previewToken);
        setTimeout(() => {
          action.onSelect();
          peek.close();
        }, 32);
        return;
      }
      close();
      setTimeout(action.onSelect, reduced ? 0 : Durations.exit);
    },
    [close, payload, previewToken, reduced],
  );

  // Ouverture
  useEffect(() => {
    if (!payload) return;
    highlightRef.current = -1;
    setHighlight(-1);
    rowRects.current = [];
    if (reduced) {
      dim.value = 1;
      lift.value = 1;
    } else {
      dim.value = withTiming(1, { duration: Durations.respond, easing: Curves.out });
      lift.value = withSpring(1, springConfig('respond'));
    }
  }, [payload, dim, lift, reduced]);

  // Appuyer-glisser-relâcher
  useEffect(() => {
    const onMove = (x: number, y: number) => {
      let hit = -1;
      rowRects.current.forEach((r, i) => {
        if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) hit = i;
      });
      if (hit !== highlightRef.current) {
        highlightRef.current = hit;
        setHighlight(hit);
        if (hit >= 0) haptics.selection();
      }
    };
    const onRelease = () => {
      const i = highlightRef.current;
      if (i >= 0) run(i);
    };
    moveListeners.add(onMove);
    releaseListeners.add(onRelease);
    return () => {
      moveListeners.delete(onMove);
      releaseListeners.delete(onRelease);
    };
  }, [run]);

  const measureRow = (i: number) => () => {
    rowRefs.current[i]?.measureInWindow((x, y, w, h) => {
      rowRects.current[i] = { x, y, w, h };
    });
  };

  // FLIP : l'aperçu part du rect de la carte et se pose à sa place finale.
  const rect = payload?.rect;
  const fromScale = rect ? Math.min(1, rect.width / previewW) : 1;
  const fromDx = rect ? rect.x + rect.width / 2 - (left + previewW / 2) : 0;
  const fromDy = rect ? rect.y + rect.height / 2 - (top + previewH / 2) : 0;

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const previewStyle = useAnimatedStyle(() => {
    const p = lift.value;
    const s = fromScale + (1.03 - fromScale) * p;
    return {
      opacity: 0.6 + 0.4 * p,
      transform: [{ translateX: fromDx * (1 - p) }, { translateY: fromDy * (1 - p) }, { scale: s }],
    };
  });
  const menuStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ translateY: 8 * (1 - lift.value) }, { scale: 0.96 + 0.04 * lift.value }],
  }));

  if (!payload) return null;

  const { preview, actions } = payload;
  const hairline = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]}>
        <BlurView intensity={24} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,25,0.28)' }]}
          onPress={() => {
            if (!fingerDown) close();
          }}
          accessibilityRole="button"
          accessibilityLabel={preview.title}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.preview,
          { top, left, width: previewW, backgroundColor: colors.card },
          previewStyle,
        ]}
      >
        <HeroSlot token={previewToken} heroKey={preview.id} radius={20} style={{ height: imageH }}>
          <ExpoImage
            source={preview.imageUrl ? { uri: preview.imageUrl } : undefined}
            placeholder={preview.placeholder ? { uri: preview.placeholder } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
        </HeroSlot>
        <View style={styles.previewText}>
          <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={2}>
            {preview.title}
          </Text>
          {preview.subtitle ? (
            <Text style={[styles.previewSub, { color: colors.gray500 }]} numberOfLines={1}>
              {preview.subtitle}
            </Text>
          ) : null}
          {preview.meta ? (
            <Text style={[styles.previewMeta, { color: colors.primary }]} numberOfLines={1}>
              {preview.meta}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.menu,
          { top: top + previewH + gap, left, width: previewW, backgroundColor: colors.card },
          menuStyle,
        ]}
      >
        {actions.map((a, i) => (
          <Pressable
            key={a.key}
            ref={(r) => {
              rowRefs.current[i] = r;
            }}
            onLayout={measureRow(i)}
            onPress={() => run(i)}
            style={[
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline },
              highlight === i && { backgroundColor: `${colors.primary}14` },
            ]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <Text style={[styles.rowLabel, { color: a.destructive ? colors.error : colors.text }]}>{a.label}</Text>
            <Ionicons name={a.icon} size={18} color={a.destructive ? colors.error : colors.text} />
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  previewText: { paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  previewTitle: { fontFamily: FontFamily.displayBold, fontSize: 16, letterSpacing: -0.2 },
  previewSub: { fontFamily: FontFamily.medium, fontSize: 12 },
  previewMeta: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  menu: {
    position: 'absolute',
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    height: ROW_H,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontFamily: FontFamily.medium, fontSize: 15 },
});

export default PeekHost;
