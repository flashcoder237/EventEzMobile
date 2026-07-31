import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { referralsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { ReferralScreenSkeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ReferralCode {
  id: string;
  code: string;
  code_type?: string;
  event_name?: string;
  event_title?: string;
  commission_percentage?: number;
  usage_limit?: number;
  usage_count?: number;
  total_clicks?: number;
  total_conversions?: number;
  total_earnings?: number;
  is_active?: boolean;
  valid_until?: string;
  created_at: string;
}

interface ReferralStats {
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  conversion_rate?: number;
}

export default function ReferralScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const numberLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
  const { currency: platformCurrency } = useCommissionConfig();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const codesRes = await referralsAPI.getCodes();
      const codesData: ReferralCode[] = codesRes.data.results || codesRes.data || [];
      setCodes(codesData);

      if (codesData.length > 0) {
        try {
          const statsRes = await referralsAPI.getStats(codesData[0].id);
          setStats(statsRes.data);
        } catch {
          const aggregated: ReferralStats = {
            total_clicks: codesData.reduce((sum, c) => sum + (c.total_clicks || 0), 0),
            total_conversions: codesData.reduce((sum, c) => sum + (c.total_conversions || 0), 0),
            total_earnings: codesData.reduce((sum, c) => sum + (c.total_earnings || 0), 0),
          };
          setStats(aggregated);
        }
      } else {
        setStats({ total_clicks: 0, total_conversions: 0, total_earnings: 0 });
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur referrals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCopy = async (code: string, id: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      if (__DEV__) console.error('Erreur copie:', error);
      Alert.alert(t('common.error'), t('referralForm.copyError'));
    }
  };

  const handleShare = async (code: string, eventName?: string) => {
    try {
      const message = eventName
        ? t('referralForm.shareMessageWithEvent', { event: eventName, code })
        : t('referralForm.shareMessageGeneric', { code });

      await Share.share({
        message,
        title: t('referralForm.shareTitle'),
      });
    } catch (error) {
      if (__DEV__) console.error('Erreur partage:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: platformCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderCodeCard = ({ item, index }: { item: ReferralCode; index: number }) => {
    const isCopied = copiedId === item.id;
    const eventName = item.event_title || item.event_name;
    const conversionRate = item.total_clicks ? ((item.total_conversions || 0) / item.total_clicks) * 100 : 0;

    return (
      <StaggeredItem index={index}>
        <View
          style={[
            styles.codeCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          {eventName && (
            <View style={styles.codeEventRow}>
              <Ionicons name="calendar-outline" size={11} color={colors.gray500} />
              <Text style={[styles.codeEventName, { color: colors.gray500 }]} numberOfLines={1}>
                {eventName.toUpperCase()}
              </Text>
            </View>
          )}

          {/* === HUGE CODE BLOCK (touche unique : ticket-stub style) === */}
          <View style={styles.codeMainBlock}>
            <View style={[styles.codeStubLeft, { backgroundColor: Colors.gray900 }]}>
              <Text style={styles.codeStubLabel}>{t('referralForm.codeLabel')}</Text>
              <Text style={styles.codeStubValue}>{item.code}</Text>
              <Text style={styles.codeStubSub}>EventEz</Text>
            </View>
            <View style={styles.codeStubRight}>
              <View style={[styles.codeStubNotchTop, { backgroundColor: colors.background }]} />
              <View style={[styles.codeStubDashed, { borderColor: hairline }]} />
              <View style={[styles.codeStubNotchBottom, { backgroundColor: colors.background }]} />
            </View>
            <View style={styles.codeActionsCol}>
              <TouchableOpacity
                style={[
                  styles.copyBtnE,
                  {
                    backgroundColor: isCopied ? '#10B98115' : colors.gray100,
                  },
                ]}
                onPress={() => handleCopy(item.code, item.id)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isCopied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={isCopied ? '#10B981' : colors.gray700}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: isCopied ? '#10B981' : colors.gray700 },
                  ]}
                >
                  {isCopied ? t('referralForm.copied') : t('referralForm.copy')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtnE, Shadows.buttonPrimary]}
                onPress={() => handleShare(item.code, eventName)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="share-outline" size={14} color={Colors.white} />
                <Text style={styles.shareBtnText}>{t('referralForm.share')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* === STATS GRID === */}
          <View style={[styles.codeStatsGrid, { borderTopColor: hairline }]}>
            <View style={[styles.codeStatCell, { borderRightColor: hairline }]}>
              <Text style={[styles.codeStatValue, { color: colors.text }]}>
                {item.total_clicks || 0}
              </Text>
              <Text style={[styles.codeStatLabel, { color: colors.gray500 }]}>{t('referralForm.cellClicks')}</Text>
            </View>
            <View style={[styles.codeStatCell, { borderRightColor: hairline }]}>
              <Text style={[styles.codeStatValue, { color: colors.text }]}>
                {item.total_conversions || 0}
              </Text>
              <Text style={[styles.codeStatLabel, { color: colors.gray500 }]}>{t('referralForm.cellConversions')}</Text>
            </View>
            <View style={[styles.codeStatCell, { borderRightColor: hairline }]}>
              <Text style={[styles.codeStatValue, { color: colors.text }]}>
                {Math.round(conversionRate)}%
              </Text>
              <Text style={[styles.codeStatLabel, { color: colors.gray500 }]}>{t('referralForm.cellRate')}</Text>
            </View>
            <View style={styles.codeStatCellLast}>
              <Text style={[styles.codeStatValue, { color: '#10B981' }]} numberOfLines={1}>
                {formatCurrency(item.total_earnings || 0)}
              </Text>
              <Text style={[styles.codeStatLabel, { color: colors.gray500 }]}>{t('referralForm.cellEarnings')}</Text>
            </View>
          </View>

          {/* === DETAILS === */}
          <View style={styles.codeDetailsRow}>
            {item.commission_percentage != null && (
              <View style={[styles.detailChipE, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="trending-up" size={10} color={colors.primary} />
                <Text style={[styles.detailChipTextE, { color: colors.primary }]}>
                  {t('referralForm.commissionChip', { percent: item.commission_percentage })}
                </Text>
              </View>
            )}
            {item.usage_limit != null && (
              <View style={[styles.detailChipE, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.detailChipTextE, { color: colors.gray700 }]}>
                  {item.usage_count || 0}/{item.usage_limit}
                </Text>
              </View>
            )}
            {item.valid_until && (
              <View style={[styles.detailChipE, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="time-outline" size={10} color={colors.gray700} />
                <Text style={[styles.detailChipTextE, { color: colors.gray700 }]}>
                  {new Date(item.valid_until).toLocaleDateString(numberLocale, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </StaggeredItem>
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>+1</WatermarkNumeral>
        <ReferralScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>+1</WatermarkNumeral>

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
        <View style={[styles.headerTopRow, styles.headerInner]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('referralForm.eyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('referralForm.title')}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={codes}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* === EARNINGS HERO === */}
            <View style={[styles.heroCard, Shadows.lg]}>
              <LinearGradient
                colors={['#0F172A', '#1E1B4B', colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
              <Text style={styles.heroWatermark}>$</Text>

              <View style={styles.heroTopRow}>
                <Text style={styles.heroEyebrow}>{t('referralForm.totalEarnings')}</Text>
                <View style={styles.heroBadge}>
                  <Ionicons name="gift" size={10} color={Colors.white} />
                  <Text style={styles.heroBadgeText}>{t('referralForm.badgeProgram')}</Text>
                </View>
              </View>

              <View style={styles.heroAmountRow}>
                <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(stats?.total_earnings || 0)}
                </Text>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroBottomRow}>
                <View style={styles.heroBottomCell}>
                  <Text style={styles.heroBottomEyebrow}>{t('referralForm.clicksLabel')}</Text>
                  <Text style={styles.heroBottomValue}>{stats?.total_clicks || 0}</Text>
                </View>
                <View style={styles.heroBottomDivider} />
                <View style={styles.heroBottomCell}>
                  <Text style={styles.heroBottomEyebrow}>{t('referralForm.conversionsLabel')}</Text>
                  <Text style={styles.heroBottomValue}>{stats?.total_conversions || 0}</Text>
                </View>
                <View style={styles.heroBottomDivider} />
                <View style={styles.heroBottomCell}>
                  <Text style={styles.heroBottomEyebrow}>{t('referralForm.rateLabel')}</Text>
                  <Text style={styles.heroBottomValue}>
                    {stats?.total_clicks ? Math.round((stats.total_conversions / stats.total_clicks) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>

            {/* === HOW IT WORKS === */}
            <View style={styles.howItWorks}>
              <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>{t('referralForm.howItWorksEyebrow')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('referralForm.howItWorksTitle')}</Text>
              <View style={styles.stepsRow}>
                {[
                  { n: '01', label: t('referralForm.step1'), icon: 'share-social' as const },
                  { n: '02', label: t('referralForm.step2'), icon: 'cursor-default-click' as const },
                  { n: '03', label: t('referralForm.step3'), icon: 'cash' as const },
                ].map((step, idx) => (
                  <View key={idx} style={[styles.stepCard, { backgroundColor: colors.card, borderColor: hairline }]}>
                    <Text style={[styles.stepNumber, { color: colors.primary }]}>{step.n}</Text>
                    <Text style={[styles.stepLabel, { color: colors.text }]}>{step.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {codes.length > 0 && (
              <Text style={[styles.codesListEyebrow, { color: colors.accent }]}>
                {t('referralForm.myCodes', { count: codes.length })}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="link-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{t('referralForm.emptyEyebrow')}</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>{t('referralForm.emptyTitle')}</Text>
            <Text style={[styles.emptySubtext, { color: colors.gray500 }]}>
              {t('referralForm.emptySubtitle')}
            </Text>
          </View>
        }
        renderItem={renderCodeCard}
      />
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

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 140,
    ...centeredContent(CARD_MAX),
  },
  headerInner: { ...centeredContent(CARD_MAX) },

  // === HERO CARD ===
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 200,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  heroCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(190,255,90,0.12)',
  },
  heroWatermark: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 80,
    letterSpacing: -3,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 80,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  heroAmountRow: {
    marginBottom: Spacing.md,
  },
  heroAmount: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: -1.7,
    lineHeight: 42,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.md,
  },
  heroBottomRow: {
    flexDirection: 'row',
  },
  heroBottomCell: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroBottomDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: Spacing.sm,
  },
  heroBottomEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroBottomValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  // === HOW IT WORKS ===
  howItWorks: {
    marginBottom: Spacing.xl,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    marginBottom: 4,
  },
  stepLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
  },

  codesListEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },

  // === CODE CARD ===
  codeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  codeEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  codeEventName: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  // === CODE STUB STYLE (boarding pass-like) ===
  codeMainBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 110,
    marginBottom: Spacing.md,
  },
  codeStubLeft: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    justifyContent: 'center',
  },
  codeStubLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  codeStubValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  codeStubSub: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    marginTop: 6,
  },
  codeStubRight: {
    width: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  codeStubNotchTop: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: -7,
    marginLeft: -7,
  },
  codeStubDashed: {
    flex: 1,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  codeStubNotchBottom: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: -7,
    marginLeft: -7,
  },
  codeActionsCol: {
    width: 100,
    gap: 6,
    justifyContent: 'center',
  },
  copyBtnE: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  shareBtnE: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // === STATS GRID ===
  codeStatsGrid: {
    flexDirection: 'row',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  codeStatCell: {
    flex: 1,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    alignItems: 'flex-start',
  },
  codeStatCellLast: {
    flex: 1.3,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
  },
  codeStatValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.5,
    lineHeight: 18,
  },
  codeStatLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 4,
  },

  // === DETAILS ===
  codeDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  detailChipE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailChipTextE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
  },

  // === EMPTY ===
  emptyState: {
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
  emptyText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});
