/**
 * AdminAdsScreen — liste des publicités, accessible aux admins/modérateurs.
 *
 * Affiche tous les ads (actifs + inactifs + expirés) triés par priority puis
 * created_at. Tap → AdminAdFormScreen (édition). FAB "+" → AdminAdFormScreen
 * (création). Long-press → confirmation suppression.
 *
 * Stats légères par card : view_count, click_count, état (actif/expiré/inactif).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { advertisementsAPI, AdvertisementAdmin } from '../../api';
import { RootStackParamList } from '../../types';
import RoleGuard from '../../components/auth/RoleGuard';
import Badge from '../../components/ui/Badge';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminAdsScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin', 'moderator']} watermark={t('admin.ads.list.watermark')} title={t('admin.ads.list.guardTitle')}>
      <AdminAdsContent />
    </RoleGuard>
  );
}

function AdminAdsContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const biometric = useBiometricConfirm();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [ads, setAds] = useState<AdvertisementAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAds = useCallback(async () => {
    try {
      const res = await advertisementsAPI.list();
      const data = (res.data?.results || res.data || []) as AdvertisementAdmin[];
      setAds(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur ads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Refetch au focus pour récupérer les modifs faites dans AdminAdFormScreen.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (!loading) fetchAds();
    });
    return unsub;
  }, [navigation, fetchAds, loading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAds();
  };

  const handleDelete = (ad: AdvertisementAdmin) => {
    showConfirm(
      t('admin.ads.list.deleteTitle'),
      t('admin.ads.list.deleteConfirm', { title: ad.title }),
      async () => {
        const okBio = await biometric.confirm({
          promptMessage: t('admin.ads.list.deleteBio'),
          category: 'admin',
        });
        if (!okBio) return;
        try {
          await advertisementsAPI.delete(ad.id);
          setAds((prev) => prev.filter((a) => a.id !== ad.id));
          showSuccess(t('common.success'), t('admin.ads.list.deleted'));
        } catch (error: any) {
          showError(t('common.error'), error?.response?.data?.detail || t('admin.ads.list.deleteError'));
        }
      },
    );
  };

  const renderAd = ({ item }: { item: AdvertisementAdmin }) => {
    const stateLabel = item.is_currently_active
      ? t('admin.ads.list.stateOnline')
      : !item.is_active
        ? t('admin.ads.list.stateDeactivated')
        : item.ends_at && new Date(item.ends_at) < new Date()
          ? t('admin.ads.list.stateExpired')
          : t('admin.ads.list.stateScheduled');
    const stateVariant: 'success' | 'secondary' | 'warning' | 'info' = item.is_currently_active
      ? 'success'
      : !item.is_active
        ? 'secondary'
        : item.ends_at && new Date(item.ends_at) < new Date()
          ? 'warning'
          : 'info';

    const geoLabel = [
      item.city,
      item.country,
      item.radius_km ? `${item.radius_km}km` : null,
    ].filter(Boolean).join(' · ') || t('admin.ads.list.geoWorld');

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('AdminAdForm', { adId: item.id })}
        onLongPress={() => handleDelete(item)}
        delayLongPress={400}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="image-outline" size={24} color={colors.gray400} />
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Badge label={stateLabel} variant={stateVariant} size="sm" />
          </View>
          <Text style={[styles.meta, { color: colors.gray500 }]} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} color={colors.gray500} /> {geoLabel}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={11} color={colors.gray400} />
              <Text style={[styles.statText, { color: colors.gray500 }]}>{item.view_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="hand-left-outline" size={11} color={colors.gray400} />
              <Text style={[styles.statText, { color: colors.gray500 }]}>{item.click_count}</Text>
            </View>
            <Text style={[styles.statText, { color: colors.gray400 }]}>· P{item.priority}</Text>
          </View>
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
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.ads.list.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.ads.list.title')}</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{ads.length}</Text>
        </View>
      </View>

      <FlatList
        data={ads}
        renderItem={renderAd}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('admin.ads.list.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('admin.ads.list.emptyText')}
              </Text>
            </View>
          )
        }
      />

      {/* FAB de création */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }, Shadows.lg]}
        onPress={() => navigation.navigate('AdminAdForm', {})}
        accessibilityLabel={t('admin.ads.list.createFab')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold, fontSize: FontSizes.xl, letterSpacing: -0.4,
  },
  countPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full,
  },
  countText: {
    fontFamily: FontFamily.bold, fontSize: 13,
  },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  card: {
    flexDirection: 'row', gap: Spacing.md,
    padding: Spacing.sm, borderRadius: BorderRadius.xl, borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: 72, height: 72, borderRadius: BorderRadius.lg,
  },
  info: { flex: 1, gap: 4, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'space-between' },
  title: { fontFamily: FontFamily.displayBold, fontSize: 14, letterSpacing: -0.2, flex: 1 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginTop: 2 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statText: { fontFamily: FontFamily.medium, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle: { fontFamily: FontFamily.displayBold, fontSize: 18, letterSpacing: -0.3 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
});
