/**
 * MessageRequestsScreen — Boite des demandes de messages (style LinkedIn).
 *
 * Accessible depuis MessagesScreen via un bouton "Demandes (N)" dans le
 * header. Les demandes sont des conversations 'direct' avec
 * request_status='pending_request' et un autre user (qui n'est pas
 * l'initiator) comme destinataire.
 *
 * Actions :
 *  - Accepter → la conv passe en 'accepted' et bascule dans l'inbox normale
 *  - Refuser  → la conv passe en 'declined' + read-only, disparait d'ici
 *  - Tap sur la card → ouvre la conversation en lecture seule (preview avant
 *    decision). L'user peut accepter depuis ConversationScreen aussi.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { messagesAPI, getMediaUrl } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows, TOUCH_OPACITY,
} from '../../constants/theme';
import {
  getDisplayName, getUserInitials, formatRelativeTime,
} from '../../lib/utils/messagingHelpers';
import { RootStackParamList, Conversation, User } from '../../types';
import { centeredContent, CARD_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MessageRequestsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { width: winW } = useWindowDimensions();
  const listMaxWidth = winW >= 700 ? CARD_MAX : undefined;
  const { t } = useTranslation();

  const [requests, setRequests] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());

  const fetchRequests = useCallback(async () => {
    try {
      const response = await messagesAPI.getMessageRequests();
      const data = response.data?.results || response.data || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      if (__DEV__) console.error('[MessageRequests] fetch failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, [fetchRequests]));

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const markActioning = (id: string, active: boolean) => {
    setActioningIds(prev => {
      const next = new Set(prev);
      if (active) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleAccept = useCallback(async (conv: Conversation) => {
    const id = String(conv.id);
    markActioning(id, true);
    try {
      await messagesAPI.acceptMessageRequest(id);
      // Retirer de la liste + naviguer vers la conv
      setRequests(prev => prev.filter(c => String(c.id) !== id));
      navigation.navigate('Conversation', { conversationId: id });
    } catch (error: any) {
      if (__DEV__) console.error('[MessageRequests] accept failed:', error);
      const detail = error?.response?.data?.error || error?.response?.data?.detail;
      showError(t('common.error'), String(detail || t('messageRequests.acceptFailed')));
    } finally {
      markActioning(id, false);
    }
  }, [navigation, showError, t]);

  const handleDecline = useCallback(async (conv: Conversation) => {
    const id = String(conv.id);
    markActioning(id, true);
    try {
      await messagesAPI.declineMessageRequest(id);
      setRequests(prev => prev.filter(c => String(c.id) !== id));
    } catch (error: any) {
      if (__DEV__) console.error('[MessageRequests] decline failed:', error);
      const detail = error?.response?.data?.error || error?.response?.data?.detail;
      showError(t('common.error'), String(detail || t('messageRequests.declineFailed')));
    } finally {
      markActioning(id, false);
    }
  }, [showError, t]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const id = String(item.id);
    const acting = actioningIds.has(id);
    const initiator = (item as any).request_initiator;
    // Pour un DM, l'autre user = l'initiator (puisque c'est lui qui m'a contacté)
    const otherUser: User | undefined = item.participants?.find(
      (p: any) => p.id === initiator,
    ) || item.participants?.find((p: any) => p.id !== user?.id);
    const displayName = getDisplayName(otherUser || null);
    const avatar = getMediaUrl(otherUser?.profile_picture || (otherUser as any)?.image);
    const initials = getUserInitials(displayName);
    const preview =
      (typeof item.last_message === 'object' ? item.last_message?.content : item.last_message)
      || t('messageRequests.noPreview');

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.cardHeader}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Conversation', { conversationId: id })}
        >
          {avatar ? (
            <Image source={avatar} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.preview, { color: colors.gray500 }]} numberOfLines={2}>{preview}</Text>
            <Text style={[styles.time, { color: colors.gray400 }]}>
              {item.last_message_at ? formatRelativeTime(item.last_message_at) : formatRelativeTime(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.gray200 }]}
            onPress={() => handleDecline(item)}
            disabled={acting}
            activeOpacity={TOUCH_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={t('messageRequests.decline')}
          >
            {acting ? (
              <ActivityIndicator size="small" color={colors.gray500} />
            ) : (
              <Text style={[styles.declineText, { color: colors.gray700 }]}>{t('messageRequests.decline')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleAccept(item)}
            disabled={acting}
            activeOpacity={TOUCH_OPACITY}
            accessibilityRole="button"
            accessibilityLabel={t('messageRequests.accept')}
          >
            {acting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.acceptText}>{t('messageRequests.accept')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="mail-open-outline" size={56} color={colors.gray300} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('messageRequests.emptyTitle')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>{t('messageRequests.emptySubtitle')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('messageRequests.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messageRequests.title')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Connections')}
          style={[styles.networkBtn, { backgroundColor: colors.card }, Shadows.sm]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('connections.title')}
        >
          <Ionicons name="people-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            requests.length === 0
              ? { flex: 1 }
              : [styles.list, listMaxWidth ? centeredContent(listMaxWidth) : null]
          }
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  networkBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold, fontSize: 11,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 22,
    letterSpacing: -0.5, marginTop: 2,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.md, gap: Spacing.md },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: FontFamily.bold, fontSize: 16 },
  cardBody: { flex: 1, minWidth: 0 },
  name: { fontFamily: FontFamily.bold, fontSize: FontSizes.md },
  preview: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 2, lineHeight: 18 },
  time: { fontFamily: FontFamily.regular, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  declineText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  acceptBtn: {},
  acceptText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm, color: Colors.white },
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 20,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular, fontSize: FontSizes.sm,
    textAlign: 'center', marginTop: Spacing.xs,
    lineHeight: 20,
  },
});
