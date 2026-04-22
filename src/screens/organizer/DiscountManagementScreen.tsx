import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { discountsAPI, ticketTypesAPI } from '../../api';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { SkeletonList, DiscountCardSkeleton } from '../../components/ui/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'DiscountManagement'>;

interface Discount {
  id: number;
  event: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  valid_from: string;
  valid_until: string;
  max_uses: number;
  times_used: number;
  applicable_ticket_types: number[];
}

interface TicketType {
  id: string;
  name: string;
  price: number;
}

type DiscountStatus = 'active' | 'expired' | 'exhausted' | 'upcoming';

function getDiscountStatus(d: Discount): { status: DiscountStatus; label: string; color: string; bgColor: string } {
  const now = new Date();
  const from = new Date(d.valid_from);
  const until = new Date(d.valid_until);

  if (d.times_used >= d.max_uses) {
    return { status: 'exhausted', label: 'Épuisé', color: Colors.gray600, bgColor: Colors.gray200 };
  }
  if (now > until) {
    return { status: 'expired', label: 'Expiré', color: Colors.error, bgColor: Colors.errorLight };
  }
  if (now < from) {
    return { status: 'upcoming', label: 'À venir', color: Colors.info, bgColor: Colors.infoLight };
  }
  return { status: 'active', label: 'Actif', color: Colors.success, bgColor: Colors.successLight };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DiscountManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { eventId } = route.params;
  const { showAlert, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [discountsRes, ticketTypesRes] = await Promise.all([
        discountsAPI.getDiscounts({ event: eventId }),
        ticketTypesAPI.getTicketTypes({ event: eventId }),
      ]);
      setDiscounts(discountsRes.data?.results || discountsRes.data || []);
      setTicketTypes(ticketTypesRes.data?.results || ticketTypesRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement codes promo:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: discounts.length,
      active: discounts.filter(d => {
        const from = new Date(d.valid_from);
        const until = new Date(d.valid_until);
        return now >= from && now <= until && d.times_used < d.max_uses;
      }).length,
      expired: discounts.filter(d => now > new Date(d.valid_until) || d.times_used >= d.max_uses).length,
      totalUsages: discounts.reduce((sum, d) => sum + d.times_used, 0),
    };
  }, [discounts]);

  const handleDelete = (discount: Discount) => {
    showAlert(
      'Supprimer le code promo',
      `Voulez-vous supprimer le code "${discount.code}" ?`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => {} },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await discountsAPI.deleteDiscount(String(discount.id));
              setDiscounts(prev => prev.filter(d => d.id !== discount.id));
            } catch (error) {
              if (__DEV__) console.error('Erreur suppression:', error);
              showError('Échec de la suppression');
            }
          },
        },
      ],
      'warning'
    );
  };

  const formatValue = (discount: Discount): string => {
    if (discount.discount_type === 'percentage') {
      return `${discount.value}%`;
    }
    return `${discount.value.toLocaleString()} ${platformCurrency}`;
  };

  const getThemedDiscountStatus = (d: Discount): { status: DiscountStatus; label: string; color: string; bgColor: string } => {
    const now = new Date();
    const from = new Date(d.valid_from);
    const until = new Date(d.valid_until);

    if (d.times_used >= d.max_uses) {
      return { status: 'exhausted', label: 'Épuisé', color: colors.gray600, bgColor: colors.gray200 };
    }
    if (now > until) {
      return { status: 'expired', label: 'Expiré', color: colors.error, bgColor: colors.errorLight };
    }
    if (now < from) {
      return { status: 'upcoming', label: 'À venir', color: colors.info, bgColor: colors.infoLight };
    }
    return { status: 'active', label: 'Actif', color: colors.success, bgColor: colors.successLight };
  };

  const renderDiscount = ({ item }: { item: Discount }) => {
    const { label, color, bgColor } = getThemedDiscountStatus(item);
    const usagePercent = item.max_uses > 0 ? (item.times_used / item.max_uses) * 100 : 0;

    return (
      <TouchableOpacity
        style={[styles.discountCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('DiscountForm', { eventId, discountId: item.id })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.codeContainer, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{item.code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
        </View>

        {/* Value */}
        <Text style={[styles.valueText, { color: colors.gray900 }]}>{formatValue(item)}</Text>
        <Text style={[styles.valueLabel, { color: colors.gray500 }]}>
          {item.discount_type === 'percentage' ? 'de réduction' : 'de remise'}
        </Text>

        {/* Dates */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.gray500} />
          <Text style={[styles.infoText, { color: colors.gray600 }]}>
            {formatDate(item.valid_from)} → {formatDate(item.valid_until)}
          </Text>
        </View>

        {/* Usage */}
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color={colors.gray500} />
          <Text style={[styles.infoText, { color: colors.gray600 }]}>
            {item.times_used} / {item.max_uses} utilisations
          </Text>
        </View>

        {/* Usage bar */}
        <View style={[styles.usageBarBg, { backgroundColor: colors.gray200 }]}>
          <View
            style={[
              styles.usageBarFill,
              {
                width: `${Math.min(usagePercent, 100)}%`,
                backgroundColor: usagePercent >= 90 ? colors.error : usagePercent >= 50 ? colors.warning : colors.primary,
              },
            ]}
          />
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: colors.gray100 }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gray50 }]}
            onPress={() => navigation.navigate('DiscountForm', { eventId, discountId: item.id })}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.errorLight }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pricetag-outline" size={64} color={colors.gray300} />
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Aucun code promo</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        Créez votre premier code promo pour attirer plus de participants
      </Text>
      <TouchableOpacity
        style={[styles.emptyCta, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('DiscountForm', { eventId })}
      >
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={[styles.emptyCtaText, { color: colors.white }]}>Créer un code promo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsGrid}>
        {[
          { label: 'Total', value: stats.total, icon: 'pricetag-outline' as const, color: colors.primary },
          { label: 'Actifs', value: stats.active, icon: 'checkmark-circle-outline' as const, color: colors.success },
          { label: 'Expirés', value: stats.expired, icon: 'close-circle-outline' as const, color: colors.error },
          { label: 'Utilisations', value: stats.totalUsages, icon: 'bar-chart-outline' as const, color: colors.info },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name={stat.icon} size={20} color={stat.color} />
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>Dope tes ventes</Text>
            <Text style={[styles.headerTitle, { color: colors.white }]}>Codes promo</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('DiscountForm', { eventId })}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <SkeletonList count={4} Component={DiscountCardSkeleton} />
      ) : (
        <FlatList
          data={discounts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDiscount}
          ListHeaderComponent={discounts.length > 0 ? renderHeader : null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  statsContainer: {
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  discountCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  codeContainer: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  codeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
  valueText: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
  },
  valueLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
  },
  usageBarBg: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: 4,
    borderRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray50,
  },
  deleteButton: {
    backgroundColor: Colors.errorLight,
  },
  actionText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  emptyCtaText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
