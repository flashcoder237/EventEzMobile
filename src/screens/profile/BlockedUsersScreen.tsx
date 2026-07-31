/**
 * BlockedUsersScreen — Liste des utilisateurs bloqués avec bouton Débloquer.
 * Source : GET /api/user-messaging-settings/blocked_list/.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { messagesAPI } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, User } from '../../types';
import {
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import {
  getDisplayName,
  getUserInitials,
} from '../../lib/utils/messagingHelpers';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BlockedUsersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | number | null>(null);

  const fetchBlocked = useCallback(async () => {
    try {
      const response = await messagesAPI.getBlockedUsers();
      const data = response.data?.results || response.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      if (__DEV__) console.error('[BlockedUsers] fetch failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlocked();
  };

  const handleUnblock = (target: User) => {
    showConfirm(
      t('profile.unblockAction'),
      t('profile.unblockConfirm', { name: getDisplayName(target) }),
      async () => {
        setUnblockingId(target.id);
        try {
          await messagesAPI.unblockUser(String(target.id));
          setUsers(prev => prev.filter(u => u.id !== target.id));
          showSuccess(t('profile.unblockedSuccess'), '');
        } catch (error) {
          showError(t('common.error'), t('profile.unblockError'));
        } finally {
          setUnblockingId(null);
        }
      },
    );
  };

  const renderItem = ({ item }: { item: User }) => {
    const name = getDisplayName(item);
    const avatar = item.profile_picture || (item as any)?.image;
    const initials = getUserInitials(name);
    const isUnblocking = unblockingId === item.id;

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.05)',
          },
          Shadows.sm,
        ]}
      >
        <View style={styles.avatarWrap}>
          {avatar ? (
            <Image source={avatar} style={styles.avatar} cachePolicy="memory-disk" transition={200} />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: `${colors.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                {initials}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {item.email ? (
            <Text style={[styles.email, { color: colors.gray500 }]} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleUnblock(item)}
          activeOpacity={TOUCH_OPACITY}
          disabled={isUnblocking}
          style={[
            styles.unblockBtn,
            {
              backgroundColor: isUnblocking ? colors.gray200 : `${colors.accent}15`,
              borderColor: colors.accent,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('profile.unblockedAccessibility', { name })}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={[styles.unblockText, { color: colors.accent }]}>{t('profile.unblockAction')}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{t('profile.blockedEmptyEyebrow')}</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('profile.blockedEmptyTitle')}</Text>
      <Text style={[styles.emptyDesc, { color: colors.gray500 }]}>
        {t('profile.blockedEmptyDesc')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: isDark ? colors.border : 'rgba(255,255,255,0.5)',
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backDisc,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
              },
              Shadows.sm,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('profile.blockedHeaderEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.blockedHeaderTitle')}</Text>
          </View>
        </View>
        <Text style={[styles.headerLead, { color: colors.gray500 }]}>
          {t('profile.blockedHeaderLead')}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  headerLead: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: '92%',
    marginTop: 4,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    flexGrow: 1,
    gap: 10,
    ...centeredContent(CARD_MAX),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitials: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -1,
  },
  emptyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    marginTop: 4,
  },
});
