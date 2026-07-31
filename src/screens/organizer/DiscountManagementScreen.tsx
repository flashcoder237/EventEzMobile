import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { discountsAPI, ticketTypesAPI, eventsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { SkeletonList, DiscountCardSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem } from '../../components/ui/Animations';
import { displayCurrency } from '../../lib/utils/priceFormatters';
import { centeredContent, CARD_MAX } from '../../constants/layout';

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DiscountManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { eventId } = route.params;
  const { t } = useTranslation();
  const { showAlert, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [eventCurrency, setEventCurrency] = useState<string>('XAF');
  const platformCurrency = displayCurrency(eventCurrency);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [discountsRes, ticketTypesRes, eventRes] = await Promise.all([
        discountsAPI.getDiscounts({ event: eventId }),
        ticketTypesAPI.getTicketTypes({ event: eventId }),
        eventsAPI.getEvent(eventId).catch(() => null),
      ]);
      setDiscounts(discountsRes.data?.results || discountsRes.data || []);
      const ev: any = eventRes?.data;
      if (ev?.currency) setEventCurrency(String(ev.currency).toUpperCase());
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
      t('organizer.discountManagement.deleteTitle'),
      t('organizer.discountManagement.deleteMessage', { code: discount.code }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await discountsAPI.deleteDiscount(String(discount.id));
              setDiscounts(prev => prev.filter(d => d.id !== discount.id));
            } catch (error) {
              if (__DEV__) console.error('Erreur suppression:', error);
              showError(t('organizer.discountManagement.deleteError'));
            }
          },
        },
      ],
      'warning'
    );
  };

  const getThemedDiscountStatus = (d: Discount): { status: DiscountStatus; label: string; eyebrow: string; color: string } => {
    const now = new Date();
    const from = new Date(d.valid_from);
    const until = new Date(d.valid_until);

    if (d.times_used >= d.max_uses) {
      return { status: 'exhausted', label: t('organizer.discountManagement.statusExhausted'), eyebrow: t('organizer.discountManagement.eyebrowOut'), color: colors.gray600 };
    }
    if (now > until) {
      return { status: 'expired', label: t('organizer.discountManagement.statusExpired'), eyebrow: t('organizer.discountManagement.eyebrowExp'), color: '#EF4444' };
    }
    if (now < from) {
      return { status: 'upcoming', label: t('organizer.discountManagement.statusUpcoming'), eyebrow: t('organizer.discountManagement.eyebrowSoon'), color: '#3B82F6' };
    }
    return { status: 'active', label: t('organizer.discountManagement.statusActive'), eyebrow: t('organizer.discountManagement.eyebrowLive'), color: '#10B981' };
  };

  const renderDiscount = ({ item, index }: { item: Discount; index: number }) => {
    const { label, eyebrow, color } = getThemedDiscountStatus(item);
    const usagePercent = item.max_uses > 0 ? (item.times_used / item.max_uses) * 100 : 0;
    const isPercentage = item.discount_type === 'percentage';

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.discountCard,
            {
              backgroundColor: colors.card,
              borderColor: hairline,
            },
            Shadows.sm,
          ]}
          onPress={() => navigation.navigate('DiscountForm', { eventId, discountId: item.id })}
          activeOpacity={0.85}
        >
          {/* === HERO BLOCK with HUGE % numeral (touche unique) === */}
          <View style={styles.heroBlock}>
            <View style={[styles.heroLeft, { backgroundColor: `${color}10` }]}>
              <Text style={[styles.heroValue, { color }]}>
                {isPercentage ? `${item.value}` : `${(item.value).toLocaleString()}`}
              </Text>
              <Text style={[styles.heroSign, { color }]}>
                {isPercentage ? '%' : platformCurrency}
              </Text>
              <Text style={[styles.heroLabel, { color }]}>
                {isPercentage ? t('organizer.discountManagement.labelPercent') : t('organizer.discountManagement.labelFixed')}
              </Text>
            </View>

            <View style={styles.heroRight}>
              <View style={styles.heroTopRow}>
                <View style={[styles.statusPill, { backgroundColor: `${color}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusText, { color }]}>{eyebrow}</Text>
                </View>
                <Text style={[styles.heroPeriod, { color: colors.gray400 }]}>
                  {item.times_used}/{item.max_uses}
                </Text>
              </View>
              <View style={[styles.codeBlock, { backgroundColor: colors.text }]}>
                <Text style={styles.codeBlockText}>{item.code}</Text>
              </View>
              <Text style={[styles.heroSub, { color: colors.gray500 }]}>
                {t('organizer.discountManagement.shareCode')}
              </Text>
            </View>
          </View>

          {/* === META ROW === */}
          <View style={[styles.metaRow, { borderTopColor: hairline }]}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={11} color={colors.gray500} />
              <Text style={[styles.metaText, { color: colors.gray600 }]} numberOfLines={1}>
                {formatDate(item.valid_from)} → {formatDate(item.valid_until)}
              </Text>
            </View>
          </View>

          {/* === USAGE BAR === */}
          <View style={styles.usageRow}>
            <View style={styles.usageHeader}>
              <Text style={[styles.usageLabel, { color: colors.gray500 }]}>{t('organizer.discountManagement.usage')}</Text>
              <Text style={[styles.usagePercent, { color: colors.text }]}>{Math.round(usagePercent)}%</Text>
            </View>
            <View style={[styles.usageBarBg, { backgroundColor: colors.gray100 }]}>
              <LinearGradient
                colors={
                  usagePercent >= 90
                    ? ['#EF4444', '#DC2626']
                    : usagePercent >= 50
                    ? ['#F59E0B', '#D97706']
                    : [colors.primary, colors.primaryDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.usageBarFill, { width: `${Math.min(usagePercent, 100)}%` }]}
              />
            </View>
          </View>

          {/* === ACTIONS === */}
          <View style={[styles.cardActions, { borderTopColor: hairline }]}>
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.gray100 }]}
              onPress={() => navigation.navigate('DiscountForm', { eventId, discountId: item.id })}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={13} color={colors.gray700} />
              <Text style={[styles.actionPillText, { color: colors.gray700 }]}>{t('organizer.discountManagement.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionPillDanger, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={13} color="#DC2626" />
              <Text style={styles.actionPillDangerText}>{t('organizer.discountManagement.delete')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
        <Text style={[styles.emptyIconBig, { color: colors.primary }]}>%</Text>
      </View>
      <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{t('organizer.discountManagement.emptyEyebrow')}</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.discountManagement.emptyTitle')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        {t('organizer.discountManagement.emptySubtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyCta, Shadows.buttonPrimary]}
        onPress={() => navigation.navigate('DiscountForm', { eventId })}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyCtaEyebrow}>{t('organizer.discountManagement.emptyCtaEyebrow')}</Text>
          <Text style={styles.emptyCtaLabel}>{t('organizer.discountManagement.emptyCtaLabel')}</Text>
        </View>
        <View style={styles.emptyCtaArrow}>
          <Ionicons name="add" size={18} color={Colors.white} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderListHeader = () => (
    <View style={styles.statStrip}>
      <View
        style={[
          styles.statStripCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={[styles.statCell, { borderRightColor: hairline }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.discountManagement.statTotal')}</Text>
        </View>
        <View style={[styles.statCell, { borderRightColor: hairline }]}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.active}</Text>
            {stats.active > 0 && <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />}
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.discountManagement.statActive')}</Text>
        </View>
        <View style={[styles.statCell, { borderRightColor: hairline }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.expired}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.discountManagement.statExpired')}</Text>
        </View>
        <View style={styles.statCellLast}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalUsages}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.discountManagement.statUsages')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>-%</WatermarkNumeral>

      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('organizer.discountManagement.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.discountManagement.headerTitle')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('DiscountForm', { eventId })}
            style={[styles.headerCreateBtn, Shadows.buttonPrimary]}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
          <SkeletonList count={4} Component={DiscountCardSkeleton} />
        </View>
      ) : (
        <FlatList
          data={discounts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDiscount}
          ListHeaderComponent={discounts.length > 0 ? renderListHeader : null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === HEADER ===
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
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCreateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },

  // === STAT STRIP ===
  statStrip: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statStripCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
    alignItems: 'flex-start',
  },
  statCellLast: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 24,
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // === LIST ===
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 140,
    ...centeredContent(CARD_MAX),
  },

  // === DISCOUNT CARD ===
  discountCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  heroBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 110,
  },
  heroLeft: {
    width: 120,
    paddingVertical: Spacing.md,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 48,
    letterSpacing: -2.5,
    lineHeight: 50,
  },
  heroSign: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.5,
    marginTop: -4,
  },
  heroLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  heroRight: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  heroPeriod: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  codeBlock: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeBlockText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  heroSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // === META ===
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },

  // === USAGE BAR ===
  usageRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usageLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  usagePercent: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 12,
    letterSpacing: -0.2,
  },
  usageBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // === ACTIONS ===
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  actionPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  actionPillDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionPillDangerText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#DC2626',
    letterSpacing: 0.2,
  },

  // === EMPTY ===
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyIconBig: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 56,
    letterSpacing: -2,
    lineHeight: 56,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.xl,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minWidth: 280,
  },
  emptyCtaEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  emptyCtaLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  emptyCtaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
});
