import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { analyticsAPI, eventsAPI } from '../../api';
import { RootStackParamList, Event } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { SkeletonList, StatCardSkeleton } from '../../components/ui/Skeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EventAnalytics'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, color, subtitle }: StatCardProps) => {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View
      style={[styles.statCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
      accessibilityRole="summary"
      accessibilityLabel={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.gray500 }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.gray400 }]}>{subtitle}</Text>}
    </View>
  );
};

export default function EventAnalyticsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [event, setEvent] = useState<Event | null>(null);
  const eventCurrencyCode = (event?.currency || 'XAF').toUpperCase();
  const platformCurrency = eventCurrencyCode === 'XAF' || eventCurrencyCode === 'XOF' ? 'FCFA' : eventCurrencyCode;
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, analyticsRes] = await Promise.all([
        eventsAPI.getEvent(eventId),
        analyticsAPI.getEventAnalytics({ event_id: eventId }).catch(() => ({ data: null })),
      ]);

      setEvent(eventRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: number) => amount.toLocaleString() + ' ' + platformCurrency;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <SkeletonList count={4} Component={StatCardSkeleton} />
        </View>
      </SafeAreaView>
    );
  }

  const registrations = event?.registration_count || event?.registrations_count || 0;
  const views = event?.view_count || 0;
  const conversionRate = views > 0 ? ((registrations / views) * 100).toFixed(1) : '0';
  const revenue = analytics?.revenue || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TON IMPACT</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analytiques</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Event Title Card */}
        <View
          style={[
            styles.eventHeader,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <Text style={[styles.eventEyebrow, { color: colors.gray500 }]}>ÉVÉNEMENT</Text>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
            {event?.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.statusText, { color: colors.primary }]}>{event?.status}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Vues" value={formatNumber(views)} icon="eye-outline" color={colors.primary} />
          <StatCard title="Inscriptions" value={formatNumber(registrations)} icon="people-outline" color="#10B981" />
          <StatCard title="Conversion" value={`${conversionRate}%`} icon="trending-up-outline" color="#F59E0B" />
          <StatCard title="Revenus" value={formatCurrency(revenue)} icon="wallet-outline" color="#6366F1" />
        </View>

        {/* Performance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
          <View
            style={[
              styles.performanceCard,
              { backgroundColor: colors.card, borderColor: hairline },
              Shadows.sm,
            ]}
          >
            <Text style={[styles.performanceLabel, { color: colors.gray500 }]}>Capacité utilisée</Text>
            <View style={[styles.progressContainer, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(100, (registrations / (event?.max_participants || 100)) * 100)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.performanceValue, { color: colors.gray500 }]}>
              {registrations} / {event?.max_participants || '∞'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions rapides</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
              onPress={() => navigation.navigate('EventRegistrations', { eventId })}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="list-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Inscriptions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
              onPress={() => navigation.navigate('QRScanner', { eventId })}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Scanner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
              onPress={() => navigation.navigate('EventEdit', { eventId })}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aperçu</Text>
          <View
            style={[
              styles.insightCard,
              { backgroundColor: colors.card, borderColor: hairline },
              Shadows.sm,
            ]}
          >
            <View style={styles.insightRow}>
              <View style={[styles.insightIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name="trending-up" size={18} color="#10B981" />
              </View>
              <Text style={[styles.insightText, { color: colors.text }]}>
                {views > 0
                  ? `Votre événement a été vu ${views} fois`
                  : 'Partagez votre événement pour obtenir plus de vues'}
              </Text>
            </View>
            {registrations > 0 && (
              <View style={styles.insightRow}>
                <View style={[styles.insightIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="people" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.insightText, { color: colors.text }]}>
                  {registrations} personne{registrations > 1 ? 's' : ''} inscrite
                  {registrations > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  eventHeader: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  eventEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  eventTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
  },
  statTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    marginBottom: Spacing.md,
  },
  performanceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  performanceLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  performanceValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  insightCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
