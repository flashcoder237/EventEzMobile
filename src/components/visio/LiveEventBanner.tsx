import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVisioCall } from '../../contexts/VisioCallContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveRegistrations, LiveReg } from '../../contexts/LiveRegistrationsContext';
import { useStatus } from '../../contexts/StatusContext';
import { RootStackParamList } from '../../types';
import { FontFamily, Spacing } from '../../constants/theme';

/**
 * Bannière globale « En direct » — montée à la racine (sibling de RootNavigator),
 * visible sur TOUS les écrans dès qu'un événement inscrit est EN COURS. Filet de
 * secours quand la push `event_live` est ratée/désactivée. Tap = rejoindre 1 tap.
 *
 * Données : useLiveRegistrations (source partagée, 1 seul poll pour bannière +
 * cartes MyTickets). Se masque si : rien de live, non connecté, un appel déjà en
 * cours (l'overlay/bulle prend le relais), OU un incident service est affiché
 * (IncidentBanner occupe le même slot top et est prioritaire).
 */
export default function LiveEventBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { call } = useVisioCall();
  const { live, joinLive, joiningId } = useLiveRegistrations();
  const { lastServiceIncident } = useStatus();
  const pulse = useRef(new Animated.Value(0)).current;

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

  const goDetail = useCallback((idOrSlug: string) => {
    navigation.navigate('EventDetails', { eventId: idOrSlug });
  }, [navigation]);

  const handleJoin = useCallback((reg: LiveReg) => {
    joinLive(reg, goDetail);
  }, [joinLive, goDetail]);

  // Masquée : rien de live / non connecté / appel déjà en cours / incident affiché.
  if (!isAuthenticated || live.length === 0 || call || lastServiceIncident) return null;

  const first = live[0];
  const extra = live.length - 1;
  const isJoiningFirst = joiningId === first.event_id;
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleJoin(first)}
      disabled={isJoiningFirst}
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
        {isJoiningFirst ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <>
            <Ionicons name={first.is_online ? 'videocam' : 'arrow-forward'} size={14} color="#EF4444" />
            <Text style={styles.joinText}>
              {first.is_online
                ? t('visio.join', { defaultValue: 'Rejoindre' })
                : t('visio.view', { defaultValue: 'Voir' })}
            </Text>
          </>
        )}
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
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  label: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 10, letterSpacing: 1 },
  title: { color: '#fff', fontFamily: FontFamily.semiBold, fontSize: 13 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 88,
    justifyContent: 'center',
  },
  joinText: { color: '#EF4444', fontFamily: FontFamily.bold, fontSize: 12 },
});
