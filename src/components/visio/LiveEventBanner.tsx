import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { registrationsAPI } from '../../api/registrations';
import { virtualRoomsAPI } from '../../api/content';
import { withJwt } from '../../lib/utils/visioUrl';
import { useVisioCall } from '../../contexts/VisioCallContext';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types';
import { FontFamily, Spacing } from '../../constants/theme';

/**
 * Bannière globale « En direct » — montée à la racine (sibling de RootNavigator),
 * visible sur TOUS les écrans dès qu'un événement auquel l'utilisateur est
 * inscrit est EN COURS. C'est le FILET DE SECOURS quand la push `event_live` est
 * ratée/désactivée : sans ça, l'inscrit ouvrant l'app n'a aucun moyen de savoir
 * qu'un event est en cours (audit UX). Tap = rejoindre en 1 geste.
 */

interface LiveReg {
  registration_id: string;
  event_id: string;
  event_slug?: string;
  event_title: string;
  is_online: boolean;
}

const POLL_MS = 60_000; // 1 min — l'info « live » ne change pas à la seconde.

export default function LiveEventBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { call, startCall } = useVisioCall();
  const [live, setLive] = useState<LiveReg[]>([]);
  const [joining, setJoining] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const fetchLive = useCallback(async () => {
    if (!isAuthenticated) { setLive([]); return; }
    try {
      const res = await registrationsAPI.getMyLiveRegistrations();
      setLive(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silencieux — la bannière est un bonus, jamais bloquante.
    }
  }, [isAuthenticated]);

  // Fetch au montage + au retour au premier plan + polling léger.
  useEffect(() => {
    fetchLive();
    const timer = setInterval(fetchLive, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') fetchLive();
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, [fetchLive]);

  // Point rouge pulsant.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const handleJoin = useCallback(async (reg: LiveReg) => {
    // Présentiel : pas de visio → on ouvre le détail de l'event.
    if (!reg.is_online) {
      navigation.navigate('EventDetails', { eventId: reg.event_slug || reg.event_id });
      return;
    }
    if (joining) return;
    setJoining(true);
    try {
      const res = await virtualRoomsAPI.eventJoin(reg.event_id);
      const data = res.data;
      if (!data?.url) {
        // Pas encore joignable (fenêtre pas ouverte, quota…) → détail event.
        navigation.navigate('EventDetails', { eventId: reg.event_slug || reg.event_id });
        return;
      }
      const finalUrl = data.provider === 'jaas' && data.token ? withJwt(data.url, data.token) : data.url;
      startCall({
        url: finalUrl,
        roomId: data.room_id,
        title: reg.event_title,
        recordingNotice: data.recording_notice ?? null,
      });
    } catch {
      navigation.navigate('EventDetails', { eventId: reg.event_slug || reg.event_id });
    } finally {
      setJoining(false);
    }
  }, [joining, navigation, startCall]);

  // Masquée si : rien de live, non connecté, OU un appel visio est DÉJÀ en cours
  // (l'overlay/bulle prend le relais → pas de doublon d'invitation).
  if (!isAuthenticated || live.length === 0 || call) return null;

  const first = live[0];
  const extra = live.length - 1;
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleJoin(first)}
      style={[styles.banner, { paddingTop: insets.top + 6 }]}
      accessibilityRole="button"
      accessibilityLabel={t('visio.liveBannerA11y', {
        title: first.event_title,
        defaultValue: '{{title}} est en direct, appuyer pour rejoindre',
      })}
    >
      <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label} numberOfLines={1}>
          {t('visio.liveNow', { defaultValue: 'EN DIRECT' })}
          {extra > 0 ? ` · +${extra}` : ''}
        </Text>
        <Text style={styles.title} numberOfLines={1}>{first.event_title}</Text>
      </View>
      <View style={styles.joinBtn}>
        <Ionicons name={first.is_online ? 'videocam' : 'arrow-forward'} size={14} color="#EF4444" />
        <Text style={styles.joinText}>
          {first.is_online
            ? t('visio.join', { defaultValue: 'Rejoindre' })
            : t('visio.view', { defaultValue: 'Voir' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998, // sous l'overlay visio plein écran (9999), au-dessus du reste.
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
    backgroundColor: '#EF4444',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  label: {
    color: '#fff',
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  joinText: {
    color: '#EF4444',
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
});
