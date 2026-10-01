/**
 * Réactions en direct (micro-delight R2, V6).
 *
 * 4 émojis ; un tap envoie `{type:'reaction', topic:'live:{id}', emoji}` sur la
 * socket de notifications. Le serveur agrège par fenêtre de 2 s et diffuse
 * `{"👏":14,…}` : on lance AU PLUS 6 bulles par fenêtre, quel que soit le
 * nombre de spectateurs. Bulles : transform + opacité, timing, sans boucle.
 * « Réduire les animations » : aucune bulle, le tap reste possible.
 */
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { haptics } from '../../../utils/haptics';
import { sendRealtime } from '../../../lib/realtime/socketBus';
import { REACTION_EMOJIS, bubblesFor } from '../../../lib/realtime/live';
import { useMotionGate } from '../../ui/motion';
import {
  APPLAUSE_A11Y_COUNT,
  clampApplause,
  isApplauseEmoji,
  nextApplauseDelay,
  pushCapped,
  shouldTickHaptic,
} from '../../../lib/gestures/applause';

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

    // G12 — maintenir 👏 / 🔥 : rafale croissante de bulles locales et
    // d'haptiques légères, UN seul envoi `{emoji, count}` au relâcher.
    const hold = useRef<{ emoji: string; count: number; timer: ReturnType<typeof setTimeout> | null } | null>(null);
    const addLocalBubble = useCallback(
      (emoji: string) => {
        if (!canAnimate) return;
        const spec = {
          key: ++seq.current,
          emoji,
          x: 10 + Math.random() * 70,
          drift: (Math.random() - 0.5) * 40,
          delay: 0,
        };
        setBubbles((prev) => pushCapped(prev, spec));
      },
      [canAnimate],
    );
    const tick = useCallback(() => {
      const h = hold.current;
      if (!h) return;
      h.count = clampApplause(h.count + 1);
      if (shouldTickHaptic(h.count)) haptics.light();
      addLocalBubble(h.emoji);
      if (h.count >= 30) {
        h.timer = null;
        return;
      }
      h.timer = setTimeout(tick, nextApplauseDelay(h.count));
    }, [addLocalBubble]);
    const startHold = useCallback(
      (emoji: string) => {
        if (!eventId || !enabled || !isApplauseEmoji(emoji)) return;
        hold.current = { emoji, count: 0, timer: null };
        tick();
      },
      [enabled, eventId, tick],
    );
    const endHold = useCallback(() => {
      const h = hold.current;
      hold.current = null;
      if (!h) return;
      if (h.timer) clearTimeout(h.timer);
      if (!eventId || h.count < 1) return;
      sendRealtime({ type: 'reaction', topic: `live:${eventId}`, emoji: h.emoji, count: clampApplause(h.count) });
    }, [eventId]);
    useEffect(
      () => () => {
        if (hold.current?.timer) clearTimeout(hold.current.timer);
        hold.current = null;
      },
      [],
    );
    const longApplause = useCallback(
      (emoji: string) => {
        if (!eventId || !enabled) return;
        haptics.light();
        for (let i = 0; i < 6; i++) addLocalBubble(emoji);
        sendRealtime({ type: 'reaction', topic: `live:${eventId}`, emoji, count: APPLAUSE_A11Y_COUNT });
      },
      [addLocalBubble, enabled, eventId],
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
          {REACTION_EMOJIS.map((e) => {
            const applause = isApplauseEmoji(e);
            return (
              <Pressable
                key={e}
                onPress={() => react(e)}
                onLongPress={applause ? () => startHold(e) : undefined}
                delayLongPress={350}
                onPressOut={applause ? endHold : undefined}
                style={({ pressed }) => [styles.btn, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={t('liveSignals.reactionA11y', { emoji: e })}
                accessibilityHint={applause ? t('gestures.applause.hint') : undefined}
                accessibilityActions={applause ? [{ name: 'longApplause', label: t('gestures.applause.a11y') }] : undefined}
                onAccessibilityAction={
                  applause
                    ? (ev) => {
                        if (ev.nativeEvent.actionName === 'longApplause') longApplause(e);
                      }
                    : undefined
                }
              >
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            );
          })}
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

