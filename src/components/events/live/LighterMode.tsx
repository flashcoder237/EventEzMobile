/**
 * G11 — mode briquet sur un direct « nuit ».
 *
 * Écran noir, flamme qui penche avec le téléphone (`useTilt`), luminosité max
 * via le compteur partagé des billets. Tant que le mode est ouvert et le
 * téléphone levé (pas face contre table), heartbeat WS `lighter on` toutes les
 * 10 s ; `on:false` à la fermeture ou quand on le pose. « N briquets levés »
 * vient de `live.update kind=lighters`. Extinction automatique après 3 min.
 * Réduire les animations : flamme fixe.
 */
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTilt } from '../../ui/motion/useTilt';
import { usePhonePosture } from '../../ui/motion/usePhonePosture';
import { holdMaxBrightness } from '../../../hooks/useTicketDisplayGuard';
import { sendRealtime } from '../../../lib/realtime/socketBus';
import { LIGHTER_HEARTBEAT_MS, LIGHTER_MAX_MS, flameAngle, lighterMessage } from '../../../lib/gestures/lighter';
import { haptics } from '../../../utils/haptics';

const KEEP_AWAKE_TAG = 'live-lighter';
let ignitedOnce = false;

export default function LighterMode({
  visible,
  eventId,
  lighters,
  onClose,
}: {
  visible: boolean;
  eventId: string;
  lighters: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tilt = useTilt({ enabled: visible });
  const [lowered, setLowered] = React.useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Luminosité + écran éveillé + extinction après 3 min.
  useEffect(() => {
    if (!visible) return;
    const release = holdMaxBrightness();
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    if (!ignitedOnce) {
      ignitedOnce = true;
      haptics.light();
    }
    const off = setTimeout(() => onCloseRef.current(), LIGHTER_MAX_MS);
    return () => {
      clearTimeout(off);
      release();
      try {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        /* no-op */
      }
    };
  }, [visible]);

  // Heartbeat tant que le téléphone est levé.
  const raised = visible && !lowered;
  useEffect(() => {
    if (!raised) return;
    sendRealtime(lighterMessage(eventId, true));
    const beat = setInterval(() => sendRealtime(lighterMessage(eventId, true)), LIGHTER_HEARTBEAT_MS);
    return () => {
      clearInterval(beat);
      sendRealtime(lighterMessage(eventId, false));
    };
  }, [eventId, raised]);

  useEffect(() => {
    if (!visible) setLowered(false);
  }, [visible]);

  const posture = usePhonePosture(
    { faceDown: () => setLowered(true), faceUp: () => setLowered(false) },
    { enabled: visible },
  );

  const flame = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flameAngle(tilt.tiltX.value)}deg` }],
  }));

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        {tilt.sensorElement}
        {posture.sensorElement}
        <View style={styles.center}>
          <View style={styles.glow} />
          <Animated.View style={[styles.flameWrap, flame]}>
            <Ionicons name="flame" size={150} color="#FF9F43" />
          </Animated.View>
          <View style={styles.wick} />
        </View>
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {lighters > 0
            ? t('gestures.lighter.count', { count: lighters })
            : t('gestures.lighter.alone')}
        </Text>
        <Pressable
          onPress={onClose}
          style={[styles.close, { marginBottom: insets.bottom + 24 }]}
          accessibilityRole="button"
          accessibilityLabel={t('gestures.lighter.off')}
        >
          <Text style={styles.closeText}>{t('gestures.lighter.off')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'flex-end' },
  center: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,159,67,0.12)' },
  flameWrap: { transformOrigin: 'bottom', alignItems: 'center' },
  wick: { width: 6, height: 40, borderRadius: 3, backgroundColor: '#3F3F46', marginTop: -8 },
  count: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 24 },
  close: { paddingHorizontal: 28, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFFFFF', fontSize: 16 },
});
