import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { subscriptionsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
import RoleGuard from '../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SubscriptionPlan {
  id: string;
  name: string;
  slug?: string;
  price_monthly: number;
  price_yearly?: number;
  max_events?: number;
  max_registrations_per_event?: number;
  commission_rate?: number;
  features?: string[];
  is_active?: boolean;
}

export default function SubscriptionManagementScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.subscriptions.watermark')} title={t('admin.subscriptions.guardTitle')}>
      <SubscriptionManagementContent />
    </RoleGuard>
  );
}

function SubscriptionManagementContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await subscriptionsAPI.getPlans();
      const data = res.data?.results || res.data || [];
      setPlans(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlans();
    setRefreshing(false);
  };

  const renderPlan = ({ item }: { item: SubscriptionPlan }) => (
    <View
      style={[
        styles.planCard,
        { backgroundColor: colors.card, borderColor: hairline },
        Shadows.sm,
      ]}
    >
      <View style={styles.planHeader}>
        <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="diamond-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.planInfo}>
          <Text style={[styles.planEyebrow, { color: colors.gray500 }]}>{t('admin.subscriptions.planEyebrow')}</Text>
          <Text style={[styles.planName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>
            {(item.price_monthly ?? 0).toLocaleString()} {platformCurrency}
            <Text style={[styles.planPriceUnit, { color: colors.gray500 }]}> {t('admin.subscriptions.perMonth')}</Text>
          </Text>
        </View>
        <Badge
          label={item.is_active !== false ? t('admin.subscriptions.active') : t('admin.subscriptions.inactive')}
          variant={item.is_active !== false ? 'success' : 'secondary'}
          size="sm"
        />
      </View>

      <View style={[styles.planDetails, { borderTopColor: hairline }]}>
        {item.max_events !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.gray500} />
            <Text style={[styles.detailText, { color: colors.gray600 }]}>
              {item.max_events === 0 ? t('admin.subscriptions.eventsUnlimited') : t('admin.subscriptions.eventsMax', { count: item.max_events })}
            </Text>
          </View>
        )}
        {item.commission_rate !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color={colors.gray500} />
            <Text style={[styles.detailText, { color: colors.gray600 }]}>
              {t('admin.subscriptions.commission', { rate: item.commission_rate })}
            </Text>
          </View>
        )}
        {item.max_registrations_per_event !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color={colors.gray500} />
            <Text style={[styles.detailText, { color: colors.gray600 }]}>
              {item.max_registrations_per_event === 0 ? t('admin.subscriptions.registrationsUnlimited') : t('admin.subscriptions.registrationsMax', { count: item.max_registrations_per_event })}
            </Text>
          </View>
        )}
      </View>

      {item.features && item.features.length > 0 && (
        <View style={[styles.featuresSection, { borderTopColor: hairline }]}>
          {item.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={[styles.checkWell, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="checkmark" size={12} color="#10B981" />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.subscriptions.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.subscriptions.title')}</Text>
        </View>
      </View>

      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="diamond-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('admin.subscriptions.empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  planCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: { flex: 1 },
  planEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  planName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  planPrice: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  planPriceUnit: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  planDetails: {
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  featuresSection: {
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkWell: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },
});
