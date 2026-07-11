import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { registrationsAPI, messagesAPI } from '../../api';
import { findExistingDirectConversation, getDisplayName } from '../../lib/utils/messagingHelpers';
import { RootStackParamList, User } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EventAttendees'>;

interface Attendee extends User {
  is_connected?: boolean;
}

export default function EventAttendeesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, registrationId } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [youVisible, setYouVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await registrationsAPI.getEventDirectory(eventId);
      const data: any = res.data || {};
      setAttendees((data.attendees ?? []) as Attendee[]);
      setYouVisible(!!data.you_are_visible);
    } catch {
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleVisibility = useCallback(async (next: boolean) => {
    setToggling(true);
    setYouVisible(next); // optimiste
    try {
      await registrationsAPI.setNetworkingOptIn(registrationId, next);
    } catch {
      setYouVisible(!next); // rollback
    } finally {
      setToggling(false);
    }
  }, [registrationId]);

  const message = useCallback(async (attendee: Attendee) => {
    const existing = await findExistingDirectConversation(messagesAPI, user?.id, attendee.id);
    if (existing) {
      navigation.navigate('Conversation', { conversationId: String(existing.id) });
      return;
    }
    navigation.navigate('Conversation', {
      userId: String(attendee.id),
      userName: getDisplayName(attendee),
    });
  }, [navigation, user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('attendees.title')}</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Carte opt-in */}
          <View style={[styles.optInCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.optInRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optInTitle, { color: colors.text }]}>{t('attendees.optInTitle')}</Text>
                <Text style={[styles.optInSubtitle, { color: colors.gray500 }]}>{t('attendees.optInSubtitle')}</Text>
              </View>
              <Switch
                value={youVisible}
                onValueChange={toggleVisibility}
                disabled={toggling}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            {!youVisible && (
              <View style={[styles.invisibleBanner, { backgroundColor: `${colors.warning}14` }]}>
                <Ionicons name="eye-off-outline" size={14} color={colors.warning} />
                <Text style={[styles.invisibleText, { color: colors.warning }]}>{t('attendees.invisibleHint')}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('attendees.eyebrow')}</Text>
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {t('attendees.count', { count: attendees.length })}
          </Text>

          {attendees.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={44} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('attendees.empty')}</Text>
            </View>
          ) : (
            attendees.map((a) => (
              <View key={String(a.id)} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {a.profile_picture ? (
                  <ExpoImage source={{ uri: a.profile_picture }} style={styles.avatar} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                      {(getDisplayName(a) || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{getDisplayName(a)}</Text>
                    {a.is_connected && (
                      <View style={[styles.connectedBadge, { backgroundColor: `${colors.success}18` }]}>
                        <Ionicons name="link" size={10} color={colors.success} />
                        <Text style={[styles.connectedText, { color: colors.success }]}>{t('attendees.connected')}</Text>
                      </View>
                    )}
                  </View>
                  {!!(a.bio || a.city) && (
                    <Text style={[styles.meta, { color: colors.gray500 }]} numberOfLines={1}>
                      {a.bio || a.city}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => message(a)}
                  style={[styles.msgBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('attendees.message')}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.msgBtnText}>{t('attendees.message')}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, letterSpacing: -0.3 },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md },

  optInCard: { borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm },
  optInRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  optInTitle: { fontFamily: FontFamily.bold, fontSize: 15, letterSpacing: -0.2 },
  optInSubtitle: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16, marginTop: 2 },
  invisibleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: BorderRadius.lg,
  },
  invisibleText: { fontFamily: FontFamily.medium, fontSize: 12, flex: 1 },

  eyebrow: { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.6, marginTop: 4 },
  subtitle: { fontFamily: FontFamily.medium, fontSize: 13, marginTop: -6 },

  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: Spacing.xl * 1.5 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.sm + 2,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: FontFamily.displayExtraBold, fontSize: 18 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: FontFamily.semiBold, fontSize: 15, flexShrink: 1 },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.full,
  },
  connectedText: { fontFamily: FontFamily.bold, fontSize: 9, letterSpacing: 0.5 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, marginTop: 2 },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full,
  },
  msgBtnText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: 12 },
});
