/**
 * OrganizeTabScreen — l'onglet « Organiser ».
 *
 * Pourquoi cet écran existe : les tâches faites DEBOUT, pendant l'événement,
 * étaient les plus enfouies de l'app. Scanner un billet demandait 4 taps
 * (Profil → scroll dans un menu de 36 entrées → Mes événements → l'événement
 * → « Scanner »), et le guichet 5. Les écrans concernés exigent tous un
 * `eventId` en paramètre : aucun ne peut servir de point d'entrée direct.
 *
 * La réponse n'est pas un menu de plus, c'est un CONTEXTE : l'événement en
 * cours en premier, ses deux actions de terrain sous le pouce. Le reste
 * (portefeuille, liste complète) vient après.
 *
 * L'onglet remplace « Favoris » pour ceux qui ont du travail d'organisation —
 * Favoris reste accessible depuis Profil, et le dock est dimensionné pour
 * cinq slots (un sixième casserait les écrans < 360px).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { CountUpText, LiveDot } from '../../components/ui/motion';
import { SinceChip, useSinceLabel } from '../../components/organizer/SinceChip';
import { SaleLiveCard } from '../../components/organizer/SaleLiveCard';
import { useSinceLastVisit } from '../../hooks/useSinceLastVisit';
import { useEventMilestone } from '../../lib/organizerMilestones';
import { useOrganizerRole } from '../../hooks/useOrganizerRole';
import { eventsAPI, eventTeamAPI, walletAPI } from '../../api';
import { Event, RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, WIDE_MAX } from '../../constants/layout';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { ErrorState } from '../../components/ui/ErrorState';
import { MyEventsScreenSkeleton } from '../../components/ui/Skeleton';
import { formatPriceAmount, displayCurrency } from '../../lib/utils/priceFormatters';
import { pickActiveEvent, isScannable } from '../../lib/utils/activeEvent';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Un événement staffé, tel que renvoyé par `/event-team/my_events/`. */
interface TeamEvent {
  event: Event;
  role?: string;
  permissions?: string[];
}

export default function OrganizeTabScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isOrganizer, isStaff } = useOrganizerRole();

  const [ownedEvents, setOwnedEvents] = useState<Event[]>([]);
  const [teamEvents, setTeamEvents] = useState<TeamEvent[]>([]);
  const [balance, setBalance] = useState<{ amount: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Comme pour MyEventsScreen : un échec réseau ne doit pas se déguiser en
  // « vous n'avez aucun événement ».
  const [loadFailed, setLoadFailed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const requests: Promise<any>[] = [];
      requests.push(
        isOrganizer
          ? eventsAPI.getMyEvents()
          : Promise.resolve({ data: [] }),
      );
      requests.push(
        isStaff ? eventTeamAPI.getMyTeamEvents() : Promise.resolve({ data: [] }),
      );
      requests.push(
        isOrganizer ? walletAPI.getMyWallet() : Promise.resolve({ data: null }),
      );

      const [ownedRes, teamRes, walletRes] = await Promise.all(requests);

      const owned = ownedRes.data?.results || ownedRes.data || [];
      const team = teamRes.data?.results || teamRes.data || [];
      setOwnedEvents(Array.isArray(owned) ? owned : []);
      setTeamEvents(Array.isArray(team) ? team : []);

      const wallet = walletRes?.data;
      setBalance(
        wallet
          ? {
              amount: Number(wallet.available_balance ?? 0),
              currency: wallet.currency || 'XAF',
            }
          : null,
      );
      setLoadFailed(false);
    } catch (error) {
      if (__DEV__) console.error('[OrganizeTab] chargement échoué:', error);
      setOwnedEvents((prev) => {
        setLoadFailed(prev.length === 0);
        return prev;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOrganizer, isStaff]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Les événements staffés comptent autant que les siens : un bénévole n'a
  // que ceux-là, et c'est précisément lui qui est à la porte.
  const allEvents = useMemo(
    () => [...ownedEvents, ...teamEvents.map((te) => te.event).filter(Boolean)],
    [ownedEvents, teamEvents],
  );

  const active = useMemo(() => pickActiveEvent(allEvents), [allEvents]);

  // O5 — « depuis votre dernière visite » : l'événement actif et le solde
  // roulent depuis leur ancienne valeur, avec une puce qui s'efface.
  const sinceLabel = useSinceLabel();
  const activeId = active?.event?.id ? String(active.event.id) : null;
  const regSince = useSinceLastVisit(
    activeId ? `organize:reg:${activeId}` : null,
    loading ? null : active?.event?.registration_count ?? null,
  );
  const balanceSince = useSinceLastVisit(
    isOrganizer ? 'organize:balance' : null,
    loading || !balance ? null : Math.round(balance.amount),
  );
  // O2 — palier atteint en direct pour l'événement actif.
  const activeMilestone = useEventMilestone(activeId);

  const renderActiveEvent = () => {
    if (!active) return null;
    const { event, isLive } = active;
    const scannable = isScannable(event);

    return (
      <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.gray100 }, Shadows.card]}>
        <View style={styles.activeHeader}>
          {isLive ? (
            <View style={[styles.liveBadge, { backgroundColor: colors.errorLight }]}>
              <LiveDot size={7} color={colors.error} />
              <Text style={[styles.liveText, { color: colors.error }]}>
                {t('organize.liveNow')}
              </Text>
            </View>
          ) : (
            <Text style={[styles.upcomingEyebrow, { color: colors.gray500 }]}>
              {t('organize.nextEvent')}
            </Text>
          )}
        </View>

        <Text style={[styles.activeTitle, { color: colors.text }]} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.activeStats}>
          {regSince.ready ? (
            <CountUpText
              value={event.registration_count ?? 0}
              from={regSince.from ?? undefined}
              countKey={`organize-reg:${event.id}`}
              group
              style={[styles.activeStatValue, { color: colors.text }]}
            />
          ) : (
            <Text style={[styles.activeStatValue, { color: colors.text }]}>
              {formatPriceAmount(event.registration_count ?? 0)}
            </Text>
          )}
          <Text style={[styles.activeStatLabel, { color: colors.gray500 }]}>
            {t('organize.registered')}
          </Text>
        </View>
        {regSince.delta != null && regSince.since != null && (
          <SinceChip label={sinceLabel(`${regSince.delta}`, regSince.since)} delay={250} />
        )}
        {activeMilestone?.kind === 'count' && activeMilestone.count ? (
          <Text style={[styles.milestoneChip, { color: colors.primary, backgroundColor: `${colors.primary}14` }]}>
            {t('organizerMoments.chip.count', { count: activeMilestone.count })}
          </Text>
        ) : null}

        {/* Les deux actions de terrain. 56pt de haut : on les vise avec le
            pouce, parfois avec les mains occupées ou mouillées. */}
        <View style={styles.actionRow}>
          {scannable && (
            <TouchableOpacity
              style={[styles.primaryAction, Shadows.buttonPrimary]}
              onPress={() => navigation.navigate('QRScanner', { eventId: event.id })}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('organize.scanA11y')}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="qr-code" size={22} color="#FFFFFF" />
              <Text style={styles.primaryActionLabel}>{t('organize.scan')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.secondaryAction,
              { backgroundColor: colors.primaryBg, borderColor: colors.primary },
              // Seul bouton présent sur un événement en ligne : il prend
              // toute la largeur plutôt que de laisser un vide.
              !scannable && styles.actionFullWidth,
            ]}
            onPress={() => navigation.navigate('BoxOffice', { eventId: event.id })}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('organize.boxOfficeA11y')}
          >
            <Ionicons name="cash-outline" size={22} color={colors.primary} />
            <Text style={[styles.secondaryActionLabel, { color: colors.primary }]}>
              {t('organize.boxOffice')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.activeLink}
          onPress={() => navigation.navigate('EventAnalytics', { eventId: event.id })}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.activeLinkText, { color: colors.primary }]}>
            {t('organize.viewStats')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderBalance = () => {
    if (!isOrganizer || !balance) return null;
    return (
      <TouchableOpacity
        style={[styles.balanceRow, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
        onPress={() => navigation.navigate('Wallet')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('organize.walletA11y')}
      >
        <View style={[styles.balanceIcon, { backgroundColor: colors.successLight }]}>
          <Ionicons name="wallet-outline" size={20} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.balanceLabel, { color: colors.gray500 }]}>
            {t('organize.availableBalance')}
          </Text>
          <View style={styles.balanceValueRow}>
            {balanceSince.ready ? (
              <CountUpText
                value={Math.round(balance.amount)}
                from={balanceSince.from ?? undefined}
                countKey="organize-balance"
                group
                style={[styles.balanceValue, { color: colors.text }]}
              />
            ) : (
              <Text style={[styles.balanceValue, { color: colors.text }]}>{formatPriceAmount(balance.amount)}</Text>
            )}
            <Text style={[styles.balanceValue, { color: colors.text }]}> {displayCurrency(balance.currency)}</Text>
          </View>
          {balanceSince.delta != null && balanceSince.since != null && (
            <SinceChip label={sinceLabel(formatPriceAmount(balanceSince.delta), balanceSince.since)} delay={400} />
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
      </TouchableOpacity>
    );
  };

  const shortcuts = useMemo(() => {
    const items: Array<{
      key: string;
      icon: keyof typeof Ionicons.glyphMap;
      label: string;
      onPress: () => void;
    }> = [];

    if (isOrganizer) {
      items.push({
        key: 'create',
        icon: 'add-circle-outline',
        label: t('organize.createEvent'),
        onPress: () => navigation.navigate('EventCreate'),
      });
      items.push({
        key: 'my-events',
        icon: 'calendar-outline',
        label: t('organize.myEvents'),
        onPress: () => navigation.navigate('MyEvents'),
      });
    }
    if (isStaff) {
      items.push({
        key: 'team-events',
        icon: 'people-outline',
        label: t('organize.teamEvents'),
        onPress: () => navigation.navigate('MyTeamEvents'),
      });
    }
    if (isOrganizer) {
      items.push({
        key: 'analytics',
        icon: 'stats-chart-outline',
        label: t('organize.analytics'),
        onPress: () => navigation.navigate('AnalyticsDashboard'),
      });
    }
    return items;
  }, [isOrganizer, isStaff, navigation, t]);

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <MyEventsScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>ORG</WatermarkNumeral>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          centeredContent(WIDE_MAX),
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          {t('organize.eyebrow')}
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('organize.title')}
        </Text>

        {loadFailed ? (
          <ErrorState withCard message={t('organize.loadError')} onRetry={onRefresh} />
        ) : (
          <>
            {renderActiveEvent()}

            {!active && (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
                <Ionicons name="calendar-outline" size={28} color={colors.gray400} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('organize.noActiveEvent')}
                </Text>
                <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                  {isOrganizer ? t('organize.noActiveEventHint') : t('organize.noStaffEventHint')}
                </Text>
              </View>
            )}

            {renderBalance()}
            {/* R2 O2 — ventes poussées en direct (jamais cumulées au solde). */}
            {isOrganizer && <SaleLiveCard />}

            <View style={styles.shortcuts}>
              {shortcuts.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.shortcut, { backgroundColor: colors.card, borderColor: colors.gray100 }]}
                  onPress={item.onPress}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
                  <Text style={[styles.shortcutLabel, { color: colors.text }]} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  balanceValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  milestoneChip: {
    alignSelf: 'flex-start',
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  eyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    marginBottom: Spacing.lg,
  },
  activeCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  upcomingEyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: Spacing.sm,
  },
  activeStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: Spacing.md,
  },
  activeStatValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    letterSpacing: -0.6,
  },
  activeStatLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryAction: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
  secondaryAction: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionFullWidth: {
    flex: 1,
  },
  secondaryActionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
  },
  activeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.md,
  },
  activeLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  emptyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  balanceValue: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  shortcut: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 84,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 8,
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
});
