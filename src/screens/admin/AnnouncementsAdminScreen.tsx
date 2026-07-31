/**
 * AnnouncementsAdminScreen — liste + create/edit/delete des annonces broadcast.
 *
 * Couvre le même périmètre que l'admin Django sans avoir à ouvrir un navigateur :
 * CRUD complet, badges sévérité, indicateurs publication / fenêtre de validité.
 *
 * Réservé aux admins (RoleGuard + endpoint /api/admin/announcements/ qui
 * rejette tout user non-staff).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import RoleGuard from '../../components/auth/RoleGuard';
import { announcementsAPI } from '../../api';
import {
  AnnouncementAdmin,
  AnnouncementSeverity,
  RootStackParamList,
} from '../../types';
import {
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SEVERITY_COLOR: Record<AnnouncementSeverity, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  critical: '#EF4444',
};

export default function AnnouncementsAdminScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.announcements.list.watermark')} title={t('admin.announcements.list.guardTitle')}>
      <AnnouncementsAdminContent />
    </RoleGuard>
  );
}

function AnnouncementsAdminContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showError, showConfirm, showSuccess } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [items, setItems] = useState<AnnouncementAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await announcementsAPI.list();
      const data = res.data?.results ?? res.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      showError(t('common.error'), detail || t('admin.announcements.list.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  // Refresh à chaque retour sur l'écran (depuis le form)
  useFocusEffect(
    useCallback(() => {
      fetchItems(items.length === 0);
    }, [fetchItems, items.length]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const handleDelete = (a: AnnouncementAdmin) => {
    showConfirm(
      t('admin.announcements.list.deleteTitle'),
      t('admin.announcements.list.deleteConfirm', { title: a.title }),
      async () => {
        try {
          await announcementsAPI.delete(a.id);
          setItems((prev) => prev.filter((x) => x.id !== a.id));
          showSuccess(t('admin.announcements.list.deleted'));
        } catch (error: any) {
          const detail = error?.response?.data?.detail;
          showError(t('common.error'), detail || t('admin.announcements.list.deleteError'));
        }
      },
    );
  };

  const handleTogglePublish = async (a: AnnouncementAdmin) => {
    const next = !a.is_published;
    try {
      const res = await announcementsAPI.update(a.id, { is_published: next });
      const updated = res.data;
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...updated } : x)));
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      showError(t('common.error'), detail || t('admin.announcements.list.statusUpdateError'));
    }
  };

  const renderItem = ({ item }: { item: AnnouncementAdmin }) => {
    const accent = SEVERITY_COLOR[item.severity] ?? SEVERITY_COLOR.info;
    const statusLabel = !item.is_published
      ? t('admin.announcements.list.statusDraft')
      : item.is_currently_valid
        ? t('admin.announcements.list.statusValid')
        : t('admin.announcements.list.statusOutOfWindow');
    const statusColor = !item.is_published
      ? colors.gray400
      : item.is_currently_valid
        ? '#10B981'
        : colors.gray500;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        onPress={() => navigation.navigate('AnnouncementForm', { announcementId: item.id })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.severityDot, { backgroundColor: accent }]} />
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <Text style={[styles.cardMessage, { color: colors.gray600 }]} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.cardFooter}>
          <View style={[styles.statusPill, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={[styles.metaText, { color: colors.gray400 }]} numberOfLines={1}>
            {item.audience} · {item.platform}
          </Text>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: hairline }]}
            onPress={() => handleTogglePublish(item)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons
              name={item.is_published ? 'eye' : 'eye-off'}
              size={16}
              color={item.is_published ? '#10B981' : colors.gray500}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.announcements.list.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.announcements.list.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.primary, borderColor: 'transparent' }, Shadows.sm]}
          onPress={() => navigation.navigate('AnnouncementForm', undefined)}
          activeOpacity={0.85}
          accessibilityLabel={t('admin.announcements.list.newAnnouncement')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={48} color={colors.gray400} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('admin.announcements.list.emptyTitle')}</Text>
              <Text style={[styles.emptyMessage, { color: colors.gray500 }]}>
                {t('admin.announcements.list.emptyMessage')}
              </Text>
            </View>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, gap: Spacing.md, ...centeredContent(CARD_MAX) },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  cardTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  cardMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: 11 },
  metaText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 11 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    marginTop: Spacing.md,
  },
  emptyMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
