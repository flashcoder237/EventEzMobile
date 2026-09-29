/**
 * Réactions en direct (micro-delight R2, V6).
 *
 * 4 émojis ; un tap envoie `{type:'reaction', topic:'live:{id}', emoji}` sur la
 * socket de notifications. Le serveur agrège par fenêtre de 2 s et diffuse
 * `{"👏":14,…}` : on lance AU PLUS 6 bulles par fenêtre, quel que soit le
 * nombre de spectateurs. Bulles : transform + opacité, timing, sans boucle.
 * « Réduire les animations » : aucune bulle, le tap reste possible.
 */
import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { haptics } from '../../../utils/haptics';
import { sendRealtime } from '../../../lib/realtime/socketBus';
import { REACTION_EMOJIS, bubblesFor } from '../../../lib/realtime/live';
import { useMotionGate } from '../../ui/motion';

const RISE = 140;
const BUBBLE_MS = 1600;

interface BubbleSpec {
  key: number;
  emoji: string;
  x: number;
  drift: number;
  delay: number;
}

const Bubble = memo(function Bubble({ spec, onDone }: { spec: BubbleSpec; onDone: (k: number) => void }) {
  const p = useSharedValue(0);
  React.useEffect(() => {
    p.value = withDelay(spec.delay, withTiming(1, { duration: BUBBLE_MS, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => onDone(spec.key), spec.delay + BUBBLE_MS + 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.15 ? p.value / 0.15 : 1 - (p.value - 0.15) / 0.85,
    transform: [
      { translateY: -RISE * p.value },
      { translateX: spec.drift * p.value },
      { scale: 0.7 + Math.min(1, p.value * 4) * 0.3 },
    ],
  }));
  return (
    <Animated.Text pointerEvents="none" style={[styles.bubble, { left: `${spec.x}%` }, style]}>
      {spec.emoji}
    </Animated.Text>
  );
});

export interface LiveReactionsHandle {
  /** Fenêtre agrégée reçue du serveur (`live.update` kind `reactions`). */
  burst: (counts: Record<string, number>) => void;
}

export const LiveReactions = memo(
  forwardRef<LiveReactionsHandle, { eventId: string | null; enabled?: boolean }>(function LiveReactions(
    { eventId, enabled = true },
    ref,
  ) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { canAnimate } = useMotionGate();
    const [bubbles, setBubbles] = useState<BubbleSpec[]>([]);
    const seq = useRef(0);

    useImperativeHandle(
      ref,
      () => ({
        burst: (counts) => {
          if (!canAnimate) return;
          const list = bubblesFor(counts);
          if (list.length === 0) return;
          const next = list.map((emoji, i) => ({
            key: ++seq.current,
            emoji,
            x: 10 + Math.random() * 70,
            drift: (Math.random() - 0.5) * 40,
            delay: i * 90,
          }));
          // Jamais plus de 6 bulles à l'écran : une nouvelle fenêtre remplace l'ancienne.
          setBubbles(next);
        },
      }),
      [canAnimate],
    );

    const onDone = useCallback((k: number) => {
      setBubbles((prev) => prev.filter((b) => b.key !== k));
    }, []);

    const react = useCallback(
      (emoji: string) => {
        if (!eventId || !enabled) return;
        haptics.selection();
        sendRealtime({ type: 'reaction', topic: `live:${eventId}`, emoji });
      },
      [eventId, enabled],
    );

    if (!eventId || !enabled) return null;
    return (
      <View style={styles.wrap}>
        <View style={styles.bubbleLayer} pointerEvents="none">
          {bubbles.map((b) => (
            <Bubble key={b.key} spec={b} onDone={onDone} />
          ))}
        </View>
        <View style={[styles.bar, { backgroundColor: colors.gray50 }]} accessibilityLabel={t('liveSignals.reactionsTitle')}>
          {REACTION_EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => react(e)}
              style={[styles.btn, { backgroundColor: colors.card }]}
              accessibilityRole="button"
              accessibilityLabel={t('liveSignals.reactionA11y', { emoji: e })}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  bubbleLayer: { position: 'absolute', left: 0, right: 0, bottom: '100%', height: RISE + 30 },
  bubble: { position: 'absolute', bottom: 0, fontSize: 24 },
  bar: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  btn: { width: 46, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
});

