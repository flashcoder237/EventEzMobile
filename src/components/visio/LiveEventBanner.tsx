import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing,
  Modal, Pressable, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVisioCall } from '../../contexts/VisioCallContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveRegistrations, LiveReg } from '../../contexts/LiveRegistrationsContext';
import { useStatus } from '../../contexts/StatusContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { RootStackParamList } from '../../types';
import { FontFamily, Spacing } from '../../constants/theme';

/**
 * Bannière globale « En direct » — montée à la racine, POUSSE le contenu des
 * écrans vers le bas (elle reporte sa hauteur au contexte ; App.tsx applique un
 * padding-top au navigator). Ne coupe donc AUCUN header.
 *
 * - 1 seul direct : tap = rejoindre directement.
 * - Plusieurs : tap = feuille listant tous les directs (Rejoindre par event).
 * - Masquable via le réglage bannerEnabled (Paramètres).
 * - Se masque si appel en cours (overlay/bulle) ou incident service affiché.
 */
export default function LiveEventBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { call } = useVisioCall();
  const { live, joinLive, joiningId, bannerEnabled, setBannerHeight } = useLiveRegistrations();
  const { lastServiceIncident } = useStatus();
  const { toastInfo } = useFeedback();
  const pulse = useRef(new Animated.Value(0)).current;
  const [listOpen, setListOpen] = useState(false);

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

  const visible = isAuthenticated && bannerEnabled && live.length > 0 && !call && !lastServiceIncident;

  // Quand la bannière disparaît, remettre la hauteur poussée à 0.
  useEffect(() => {
    if (!visible) setBannerHeight(0);
  }, [visible, setBannerHeight]);

  const goDetail = useCallback((idOrSlug: string) => {
    navigation.navigate('EventDetails', { eventId: idOrSlug });
  }, [navigation]);

  // Salle pas encore ouverte par l'organisateur (#16297) : toast d'attente,
  // au lieu de renvoyer silencieusement au détail de l'event.
  const notifyIfWaitingHost = useCallback((result: string) => {
    if (result === 'host_not_present') {
      toastInfo(
        t('componentsEvents.virtualWaitingHostTitle', { defaultValue: 'Direct pas encore démarré' }),
        {
          body: t('componentsEvents.virtualWaitingHostNote', {
            defaultValue: "Vous pourrez rejoindre dès que l'organisateur aura ouvert la salle.",
          }),
          dedupKey: 'live_host_not_present',
        },
      );
    }
  }, [toastInfo, t]);

  const handleTapBanner = useCallback(async () => {
    if (live.length === 1) {
      notifyIfWaitingHost(await joinLive(live[0], goDetail));
    } else {
      setListOpen(true); // plusieurs directs → liste, accès à TOUS
    }
  }, [live, joinLive, goDetail, notifyIfWaitingHost]);

  const handleJoinFromList = useCallback(async (reg: LiveReg) => {
    setListOpen(false);
    notifyIfWaitingHost(await joinLive(reg, goDetail));
  }, [joinLive, goDetail, notifyIfWaitingHost]);

  if (!visible) return null;

  const first = live[0];
  const extra = live.length - 1;
  const isJoiningFirst = joiningId === first.event_id;
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTapBanner}
        disabled={isJoiningFirst}
        onLayout={(e) => setBannerHeight(e.nativeEvent.layout.height)}
        style={[styles.banner, { paddingTop: insets.top + 6 }]}
        accessibilityRole="button"
        accessibilityLabel={
          extra > 0
            ? t('visio.liveBannerMultiA11y', { count: live.length, defaultValue: '{{count}} événements en direct, appuyer pour la liste' })
            : t('visio.liveBannerA11y', { title: first.event_title, defaultValue: '{{title}} est en direct, appuyer pour rejoindre' })
        }
      >
        <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label} numberOfLines={1}>
            {t('visio.liveNow', { defaultValue: 'EN DIRECT' })}
            {extra > 0 ? ` · +${extra}` : ''}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {extra > 0
              ? t('visio.liveMultiTitle', { count: live.length, defaultValue: '{{count}} événements en cours' })
              : first.event_title}
          </Text>
        </View>
        <View style={styles.joinBtn}>
          {isJoiningFirst ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <Ionicons
                name={extra > 0 ? 'list' : (first.is_online ? 'videocam' : 'arrow-forward')}
                size={14}
                color="#EF4444"
              />
              <Text style={styles.joinText}>
                {extra > 0
                  ? t('visio.seeAll', { defaultValue: 'Voir' })
                  : (first.is_online ? t('visio.join', { defaultValue: 'Rejoindre' }) : t('visio.view', { defaultValue: 'Voir' }))}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Feuille « directs en cours » (multi) */}
      <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setListOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('visio.liveNow', { defaultValue: 'EN DIRECT' })}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {live.map((reg) => {
                const busy = joiningId === reg.event_id;
                return (
                  <TouchableOpacity
                    key={reg.registration_id}
                    style={styles.sheetRow}
                    onPress={() => handleJoinFromList(reg)}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <View style={styles.sheetDot} />
                    <Text style={styles.sheetRowTitle} numberOfLines={1}>{reg.event_title}</Text>
                    {busy ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <View style={styles.sheetJoin}>
                        <Ionicons name={reg.is_online ? 'videocam' : 'arrow-forward'} size={13} color="#fff" />
                        <Text style={styles.sheetJoinText}>
                          {reg.is_online ? t('visio.join', { defaultValue: 'Rejoindre' }) : t('visio.view', { defaultValue: 'Voir' })}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
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
  // Feuille multi-directs
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 1,
    color: '#EF4444',
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  sheetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  sheetRowTitle: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 14, color: '#111827' },
  sheetJoin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sheetJoinText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 12 },
});
