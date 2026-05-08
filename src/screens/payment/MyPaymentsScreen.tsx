import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  SectionList,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { paymentsAPI } from '../../api';
import { Payment, RootStackParamList } from '../../types';
import { SkeletonList, PaymentCardSkeleton, MyPaymentsScreenSkeleton } from '../../components/ui/Skeleton';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { StaggeredItem } from '../../components/ui/Animations';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'refunded';

interface PaymentWithEvent extends Payment {
  event_title?: string;
}

interface PaymentSection {
  title: string;
  data: PaymentWithEvent[];
}

// statusConfig and methodConfig are computed inside the component to access t()

export default function MyPaymentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const { t } = useTranslation();

  const statusConfig: Record<
    string,
    { color: string; label: string; icon: keyof typeof Ionicons.glyphMap; eyebrow: string }
  > = {
    pending: { color: '#E0A800', label: t('payment.myPaymentsStatusPending'), icon: 'time', eyebrow: 'WAIT' },
    processing: { color: '#3B82F6', label: t('payment.myPaymentsStatusProcessing'), icon: 'sync', eyebrow: 'PROC' },
    completed: { color: '#10B981', label: t('payment.myPaymentsStatusCompleted'), icon: 'checkmark-circle', eyebrow: 'OK' },
    failed: { color: '#EF4444', label: t('payment.myPaymentsStatusFailed'), icon: 'close-circle', eyebrow: 'FAIL' },
    refunded: { color: '#6366F1', label: t('payment.myPaymentsStatusRefunded'), icon: 'refresh-circle', eyebrow: 'BACK' },
    cancelled: { color: '#6B7280', label: t('payment.myPaymentsStatusCancelled'), icon: 'ban', eyebrow: 'CXL' },
  };

  const methodConfig: Record<
    string,
    { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; mark: string }
  > = {
    mtn_money: { label: t('payment.myPaymentsMethodMTN'), icon: 'phone-portrait', color: '#FFCC00', mark: 'MTN' },
    orange_money: { label: t('payment.myPaymentsMethodOrange'), icon: 'phone-portrait', color: '#FF6600', mark: 'OM' },
    credit_card: { label: t('payment.myPaymentsMethodCard'), icon: 'card', color: '#3B82F6', mark: 'VISA' },
    card: { label: t('payment.myPaymentsMethodCard'), icon: 'card', color: '#3B82F6', mark: 'CARD' },
    bank_transfer: { label: t('payment.myPaymentsMethodTransfer'), icon: 'business', color: '#10B981', mark: 'BANK' },
  };
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [payments, setPayments] = useState<PaymentWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await paymentsAPI.getPayments();
      const data = response.data?.results || response.data || [];
      setPayments(data);
    } catch (error) {
      if (__DEV__) console.error('Error fetching payments:', error);
      showError(t('common.error'), t('payment.myPaymentsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const total = payments.reduce(
      (sum, p) => (p.status === 'completed' ? sum + (Number(p.amount) || 0) : sum),
      0,
    );
    const completed = payments.filter((p) => p.status === 'completed').length;
    const pending = payments.filter(
      (p) => p.status === 'pending' || p.status === 'processing',
    ).length;
    const failed = payments.filter((p) => p.status === 'failed').length;
    const refunded = payments.filter((p) => p.status === 'refunded').length;

    const now = new Date();
    const thisMonthTotal = payments
      .filter((p) => {
        const pDate = new Date(p.created_at);
        return (
          p.status === 'completed' &&
          pDate.getMonth() === now.getMonth() &&
          pDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Last month for trend comparison
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTotal = payments
      .filter((p) => {
        const pDate = new Date(p.created_at);
        return (
          p.status === 'completed' &&
          pDate.getMonth() === lastMonth.getMonth() &&
          pDate.getFullYear() === lastMonth.getFullYear()
        );
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const trend =
      lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : thisMonthTotal > 0
        ? 100
        : 0;

    return { total, completed, pending, failed, refunded, thisMonthTotal, lastMonthTotal, trend };
  }, [payments]);

  const sections = useMemo(() => {
    let result = [...payments];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        result = result.filter((p) => p.status === 'pending' || p.status === 'processing');
      } else {
        result = result.filter((p) => p.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const eventTitle = p.event_title || p.registration_details?.event_detail?.title || '';
        return (
          eventTitle.toLowerCase().includes(query) ||
          p.transaction_id?.toLowerCase().includes(query) ||
          p.payment_method?.toLowerCase().includes(query)
        );
      });
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const grouped: Record<string, PaymentWithEvent[]> = {};
    result.forEach((payment) => {
      const date = new Date(payment.created_at);
      const monthKey = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const capitalizedKey = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);

      if (!grouped[capitalizedKey]) grouped[capitalizedKey] = [];
      grouped[capitalizedKey].push(payment);
    });

    return Object.entries(grouped).map(([title, data]) => ({ title, data }));
  }, [payments, statusFilter, searchQuery]);

  const formatAmount = (amount: number | string) => Number(amount).toLocaleString('fr-FR');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatDay = (dateString: string) => {
    const date = new Date(dateString);
    return String(date.getDate()).padStart(2, '0');
  };

  const getEventTitle = (payment: PaymentWithEvent) =>
    payment.event_title || payment.registration_details?.event_detail?.title || t('payment.myPaymentsFallbackTitle');

  const getStatusConfig = (status: string) => statusConfig[status] || statusConfig.pending;

  const getMethodConfig = (method: string) => {
    const key = method?.toLowerCase().replace(/\s+/g, '_');
    return (
      methodConfig[key] || {
        label: method || t('payment.myPaymentsFallbackTitle'),
        icon: 'cash' as keyof typeof Ionicons.glyphMap,
        color: colors.gray500,
        mark: 'PAY',
      }
    );
  };

  // === LEDGER PAYMENT CARD ===
  const renderPayment = ({ item, index }: { item: PaymentWithEvent; index: number }) => {
    const status = getStatusConfig(item.status || 'pending');
    const method = getMethodConfig(item.payment_method);
    const canRefund = item.status === 'completed';
    const isOutgoing = item.status !== 'refunded';

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.ledgerCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${getEventTitle(item)}, ${formatAmount(item.amount)} ${
            item.currency || 'XAF'
          }, ${status.label}`}
        >
          {/* Day tile */}
          <View style={[styles.dayTile, { backgroundColor: `${method.color}12` }]}>
            <Text style={[styles.dayNumber, { color: method.color }]}>
              {formatDay(item.created_at)}
            </Text>
            <Text style={[styles.dayMonth, { color: method.color }]}>
              {new Date(item.created_at)
                .toLocaleDateString('fr-FR', { month: 'short' })
                .replace('.', '')
                .toUpperCase()}
            </Text>
          </View>

          {/* Body */}
          <View style={styles.ledgerBody}>
            <View style={styles.ledgerTopRow}>
              <View style={[styles.eyebrowPill, { backgroundColor: `${status.color}15` }]}>
                <View style={[styles.eyebrowDot, { backgroundColor: status.color }]} />
                <Text style={[styles.eyebrowText, { color: status.color }]}>{status.eyebrow}</Text>
              </View>
              <Text style={[styles.methodMark, { color: colors.gray400 }]}>{method.mark}</Text>
            </View>

            <Text style={[styles.ledgerTitle, { color: colors.text }]} numberOfLines={1}>
              {getEventTitle(item)}
            </Text>

            <View style={styles.ledgerMeta}>
              <Ionicons name={method.icon} size={11} color={colors.gray500} />
              <Text style={[styles.ledgerMetaText, { color: colors.gray500 }]} numberOfLines={1}>
                {method.label}
              </Text>
              {item.transaction_id && (
                <>
                  <View style={[styles.metaDot, { backgroundColor: colors.gray300 }]} />
                  <Text style={[styles.txnText, { color: colors.gray400 }]}>
                    #{item.transaction_id.slice(-6)}
                  </Text>
                </>
              )}
            </View>

            {canRefund && (
              <TouchableOpacity
                style={[styles.refundLink, { borderColor: hairline }]}
                onPress={() => navigation.navigate('RefundRequest', { paymentId: item.id })}
                activeOpacity={0.7}
              >
                <Ionicons name="return-down-back" size={11} color={colors.primary} />
                <Text style={[styles.refundLinkText, { color: colors.primary }]}>
                  Demander remboursement
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Amount column */}
          <View style={styles.ledgerAmountCol}>
            <Text
              style={[
                styles.ledgerSign,
                { color: isOutgoing ? colors.gray400 : colors.success },
              ]}
            >
              {isOutgoing ? '−' : '+'}
            </Text>
            <Text style={[styles.ledgerAmount, { color: colors.text }]}>
              {formatAmount(item.amount)}
            </Text>
            <Text style={[styles.ledgerCurrency, { color: colors.gray500 }]}>
              {item.currency || 'XAF'}
            </Text>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderSectionHeader = ({ section }: { section: PaymentSection }) => {
    const monthTotal = section.data.reduce(
      (sum, p) => (p.status === 'completed' ? sum + (Number(p.amount) || 0) : sum),
      0,
    );
    return (
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
            {section.title.toUpperCase()}
          </Text>
          <Text style={[styles.sectionCount, { color: colors.gray500 }]}>
            {section.data.length} transaction{section.data.length > 1 ? 's' : ''}
          </Text>
        </View>
        {monthTotal > 0 && (
          <View style={[styles.sectionMonthTotal, { backgroundColor: colors.gray100 }]}>
            <Text style={[styles.sectionMonthLabel, { color: colors.gray500 }]}>{t('payment.myPaymentsBalance')}</Text>
            <Text style={[styles.sectionMonthValue, { color: colors.text }]}>
              {formatAmount(monthTotal)} {platformCurrency}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="receipt-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{t('payment.myPaymentsEmptyEyebrow')}</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('payment.myPaymentsEmpty')}</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || statusFilter !== 'all'
          ? 'Aucun paiement ne correspond à tes critères.'
          : "Tu n'as pas encore effectué de paiement.\nTes transactions apparaîtront ici."}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>PAID</WatermarkNumeral>
        <MyPaymentsScreenSkeleton />
      </EditorialCanvas>
    );
  }

  const trendUp = stats.trend > 0;
  const trendFlat = Math.abs(stats.trend) < 1;

  // Status filter chips data
  const statusChips: { key: StatusFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'Tout', count: payments.length, color: colors.text },
    { key: 'completed', label: t('payment.myPaymentsFilterCompleted'), count: stats.completed, color: '#10B981' },
    { key: 'pending', label: t('payment.myPaymentsFilterPending'), count: stats.pending, color: '#E0A800' },
    { key: 'failed', label: t('payment.myPaymentsFilterFailed'), count: stats.failed, color: '#EF4444' },
    { key: 'refunded', label: 'Remb.', count: stats.refunded, color: '#6366F1' },
  ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>PAID</WatermarkNumeral>
      <View style={styles.safeArea}>
        {/* === HEADER (tile) === */}
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
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name="chevron-back" size={18} color={colors.gray600} />
            </TouchableOpacity>

            <View style={styles.headerTextCol}>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
                {t('payment.myPaymentsHeaderEyebrow')}
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('payment.myPaymentsTitle')}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setSearchOpen((v) => !v)}
              style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('payment.myPaymentsSearch')}
            >
              <Ionicons
                name={searchOpen ? 'close' : 'search'}
                size={18}
                color={colors.gray600}
              />
            </TouchableOpacity>
          </View>

          {/* Search collapsible */}
          {searchOpen && (
            <View
              style={[
                styles.searchInputWrapper,
                { backgroundColor: colors.card, borderColor: hairline },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('payment.myPaymentsSearchPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* === HERO BALANCE CARD (gradient) === */}
          <View style={styles.heroWrap}>
            <View style={[styles.heroCard, Shadows.lg]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark, '#312E81']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Decorative circles */}
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />

              <View style={styles.heroTopRow}>
                <Text style={styles.heroEyebrow}>{t('payment.myPaymentsHeroEyebrow')}</Text>
                <View style={styles.heroBadge}>
                  <Ionicons name="lock-closed" size={9} color={Colors.white} />
                  <Text style={styles.heroBadgeText}>{t('payment.myPaymentsHeroBadge')}</Text>
                </View>
              </View>

              <View style={styles.heroAmountRow}>
                <Text style={styles.heroAmount}>{formatAmount(stats.total)}</Text>
                <Text style={styles.heroCurrency}>{platformCurrency}</Text>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroSubEyebrow}>{t('payment.myPaymentsThisMonth')}</Text>
                  <Text style={styles.heroSubAmount}>
                    {formatAmount(stats.thisMonthTotal)} {platformCurrency}
                  </Text>
                </View>

                <View style={styles.trendPill}>
                  <Ionicons
                    name={trendFlat ? 'remove' : trendUp ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={Colors.white}
                  />
                  <Text style={styles.trendText}>
                    {trendFlat ? '—' : `${trendUp ? '+' : ''}${Math.round(stats.trend)}%`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* === STATUS CHIPS === */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {statusChips.map((chip) => {
              const active = statusFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: colors.text}
                      : {
                          backgroundColor: colors.card,
                          borderColor: hairline,
                          borderWidth: 1,
                        },
                  ]}
                  onPress={() => setStatusFilter(chip.key)}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  {chip.key !== 'all' && (
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: active ? Colors.white : chip.color },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? Colors.white : colors.gray700 },
                    ]}
                  >
                    {chip.label}
                  </Text>
                  {chip.count > 0 && (
                    <View
                      style={[
                        styles.chipBadge,
                        {
                          backgroundColor: active
                            ? 'rgba(255,255,255,0.22)'
                            : colors.gray100,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBadgeText,
                          { color: active ? Colors.white : colors.gray600 },
                        ]}
                      >
                        {chip.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* === LEDGER === */}
          {sections.length > 0 ? (
            <View style={styles.listContent}>
              {sections.map((section) => (
                <View key={section.title}>
                  {renderSectionHeader({ section })}
                  {section.data.map((item, index) => (
                    <View key={item.id}>{renderPayment({ item, index })}</View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            renderEmpty()
          )}

          <View style={{ height: 140 }} />
        </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

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
  headerTextCol: { flex: 1 },
  headerEyebrow: {
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
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: 8,
    marginTop: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    paddingVertical: 0,
  },

  // === HERO BALANCE (gradient card) ===
  heroWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    overflow: 'hidden',
    minHeight: 180,
  },
  heroCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  heroEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.white,
    letterSpacing: 1.2,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  heroAmount: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 44,
    color: Colors.white,
    letterSpacing: -2,
    lineHeight: 46,
  },
  heroCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: Spacing.md,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroSubEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroSubAmount: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: -0.4,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  trendText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: -0.1,
  },

  // === CHIPS ===
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },

  // === LEDGER LIST ===
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
  },
  sectionMonthTotal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    alignItems: 'flex-end',
  },
  sectionMonthLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  sectionMonthValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: 12,
    letterSpacing: -0.2,
  },

  // === LEDGER CARD ===
  ledgerCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  dayTile: {
    width: 50,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: -0.6,
  },
  dayMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  ledgerBody: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  ledgerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  methodMark: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  ledgerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  ledgerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ledgerMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  txnText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  refundLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  refundLinkText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  ledgerAmountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 90,
    paddingLeft: Spacing.xs,
  },
  ledgerSign: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: -1,
  },
  ledgerAmount: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.5,
    lineHeight: 18,
    marginTop: 2,
  },
  ledgerCurrency: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },

  // === EMPTY ===
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
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
    fontSize: 24,
    letterSpacing: -0.7,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
