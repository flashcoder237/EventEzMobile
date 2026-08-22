import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { invitationsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { InvitationsScreenSkeleton } from '../../components/ui/Skeleton';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { Emails, AnimatedIllustration } from '../../components/illustrations';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Invitation {
  id: string;
  event_title?: string;
  event_name?: string;
  event?: string;
  inviter_name?: string;
  invitee_name?: string;
  invitee_email?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  message?: string;
  created_at: string;
}

export default function InvitationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { toastSuccess, showError, showConfirm } = useFeedback();
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const STATUS_CONFIG: Record<string, { label: string; eyebrow: string; color: string }> = {
    pending: { label: t('invitations.statusPendingLong'), eyebrow: 'WAIT', color: '#F59E0B' },
    accepted: { label: t('invitations.statusAcceptedLong'), eyebrow: 'OK', color: '#10B981' },
    declined: { label: t('invitations.statusDeclinedLong'), eyebrow: 'NO', color: '#EF4444' },
    cancelled: { label: t('invitations.statusCancelledLong'), eyebrow: 'CXL', color: colors.gray500 },
    expired: { label: t('invitations.statusExpiredLong'), eyebrow: 'EXP', color: colors.gray500 },
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        invitationsAPI.getMyInvitations(),
        invitationsAPI.getAll({ type: 'sent' }),
      ]);
      setReceived(receivedRes.data.results || receivedRes.data || []);
      setSent(sentRes.data.results || sentRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await invitationsAPI.accept(id);
      toastSuccess(t('invitations.acceptedSuccess'));
      fetchData();
    } catch (error) {
      if (__DEV__) console.error('Erreur accept invitation:', error);
      showError(t('common.error'), t('invitations.acceptError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string) => {
    showConfirm(
      t('invitations.declineConfirmTitle'),
      t('invitations.declineConfirmMessage'),
      async () => {
        setActionLoading(id);
        try {
          await invitationsAPI.decline(id);
          toastSuccess(t('invitations.declinedSuccess'));
          fetchData();
        } catch (error) {
          if (__DEV__) console.error('Erreur decline invitation:', error);
          showError(t('common.error'), t('invitations.declineError'));
        } finally {
          setActionLoading(null);
        }
      },
      undefined,
      { confirmText: t('invitations.decline', { defaultValue: 'Refuser' }), destructive: true },
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDay = (dateString: string) => {
    const date = new Date(dateString);
    return String(date.getDate()).padStart(2, '0');
  };

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
  };

  const stats = useMemo(() => {
    const pendingReceived = received.filter(i => i.status === 'pending').length;
    const acceptedReceived = received.filter(i => i.status === 'accepted').length;
    const totalSent = sent.length;
    return { pendingReceived, acceptedReceived, totalSent };
  }, [received, sent]);

  const renderInvitationCard = ({ item, index }: { item: Invitation; index: number }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isReceived = activeTab === 'received';
    const isPending = item.status === 'pending';
    const isProcessing = actionLoading === item.id;

    return (
      <StaggeredItem index={index}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          {/* Top row: date tile + status pill + dir icon */}
          <View style={styles.cardTopRow}>
            <View style={[styles.dateTile, { backgroundColor: `${statusCfg.color}12` }]}>
              <Text style={[styles.dateTileDay, { color: statusCfg.color }]}>
                {formatDay(item.created_at)}
              </Text>
              <Text style={[styles.dateTileMonth, { color: statusCfg.color }]}>
                {formatMonth(item.created_at)}
              </Text>
            </View>

            <View style={styles.cardHeaderCol}>
              <View style={[styles.statusPill, { backgroundColor: `${statusCfg.color}15` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
                <Text style={[styles.statusText, { color: statusCfg.color }]}>
                  {statusCfg.eyebrow}
                </Text>
              </View>
              <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={2}>
                {item.event_title || item.event_name || t('invitations.eventFallback')}
              </Text>
            </View>

            <View style={[styles.dirDisc, { backgroundColor: colors.gray100 }]}>
              <Ionicons
                name={isReceived ? 'arrow-down' : 'arrow-up'}
                size={14}
                color={colors.gray600}
              />
            </View>
          </View>

          {/* Inviter/Invitee row */}
          <View style={[styles.partyRow, { borderTopColor: hairline }]}>
            <Text style={[styles.partyEyebrow, { color: colors.gray500 }]}>
              {isReceived ? t('invitations.fromLabel') : t('invitations.toLabel')}
            </Text>
            <Text style={[styles.partyName, { color: colors.text }]} numberOfLines={1}>
              {isReceived
                ? (item.inviter_name || t('invitations.organizerFallback'))
                : (item.invitee_name || item.invitee_email || t('invitations.guestFallback'))}
            </Text>
          </View>

          {/* Message quote */}
          {item.message ? (
            <View style={[styles.quoteBlock, { borderLeftColor: statusCfg.color }]}>
              <Text style={[styles.quoteText, { color: colors.gray600 }]} numberOfLines={3}>
                {item.message}
              </Text>
            </View>
          ) : null}

          {/* Actions row */}
          <View style={styles.actionsFooter}>
            <Text style={[styles.dateFooter, { color: colors.gray400 }]}>
              <Ionicons name="time-outline" size={11} color={colors.gray400} />
              {' '}
              Reçue le {formatDate(item.created_at)}
            </Text>

            {isReceived && isPending && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.declinePill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                  onPress={() => handleDecline(item.id)}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="close" size={13} color="#DC2626" />
                      <Text style={styles.declineText}>{t('invitations.declineButton')}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acceptPill, Shadows.buttonPrimary]}
                  onPress={() => handleAccept(item.id)}
                  disabled={isProcessing}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={13} color={Colors.white} />
                      <Text style={styles.acceptText}>{t('invitations.acceptButton')}</Text>
                    </>
                  )}
                </TouchableOpacity>
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
        <WatermarkNumeral>RSVP</WatermarkNumeral>
        <InvitationsScreenSkeleton />
      </EditorialCanvas>
    );
  }

  const currentData = activeTab === 'received' ? received : sent;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>RSVP</WatermarkNumeral>

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
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('invitations.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('invitations.headerTitle')}</Text>
          </View>
          {stats.pendingReceived > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: '#FEF3C7' }]}>
              <View style={[styles.pendingBadgeDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.pendingBadgeText}>{stats.pendingReceived}</Text>
            </View>
          )}
        </View>

        {/* Stat strip */}
        <View
          style={[
            styles.statStrip,
            { backgroundColor: colors.card, borderColor: hairline },
          ]}
        >
          <View style={[styles.statCell, { borderRightColor: hairline }]}>
            <View style={styles.statValueRow}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.pendingReceived}</Text>
              {stats.pendingReceived > 0 && (
                <View style={[styles.statDotE, { backgroundColor: '#F59E0B' }]} />
              )}
            </View>
            <Text style={[styles.statEyebrow, { color: colors.gray500 }]}>{t('invitations.statEyebrowPending')}</Text>
          </View>
          <View style={[styles.statCell, { borderRightColor: hairline }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.acceptedReceived}</Text>
            <Text style={[styles.statEyebrow, { color: colors.gray500 }]}>{t('invitations.statEyebrowAccepted')}</Text>
          </View>
          <View style={styles.statCellLast}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalSent}</Text>
            <Text style={[styles.statEyebrow, { color: colors.gray500 }]}>{t('invitations.statEyebrowSent')}</Text>
          </View>
        </View>

        {/* Tab chips */}
        <View style={styles.chipsRow}>
          {(['received', 'sent'] as const).map((tab) => {
            const active = activeTab === tab;
            const count = tab === 'received' ? received.length : sent.length;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.primary, ...Shadows.buttonPrimary }
                    : { backgroundColor: colors.gray100 },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={tab === 'received' ? 'mail-outline' : 'send-outline'}
                  size={13}
                  color={active ? Colors.white : colors.gray600}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? Colors.white : colors.gray700 },
                  ]}
                >
                  {tab === 'received' ? 'Reçues' : 'Envoyées'}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.chipBadge,
                      {
                        backgroundColor: active
                          ? 'rgba(255,255,255,0.22)'
                          : colors.gray200,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipBadgeText,
                        { color: active ? Colors.white : colors.gray600 },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* === LIST === */}
      <FlatList
        data={currentData}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AnimatedIllustration entry="fadeIn" idle="float">
              <Emails color={colors.primary} size={140} />
            </AnimatedIllustration>
            <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>
              {activeTab === 'received' ? 'BOÎTE VIDE' : 'AUCUN ENVOI'}
            </Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'received' ? 'Aucune invitation' : 'Rien envoyé'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.gray500 }]}>
              {activeTab === 'received'
                ? 'Les invitations que vous recevrez\napparaîtront ici.'
                : 'Les invitations que vous envoyez\napparaîtront ici.'}
            </Text>
          </View>
        }
        renderItem={renderInvitationCard}
        showsVerticalScrollIndicator={false}
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
    gap: Spacing.md,
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
  headerTextCol: { flex: 1 },
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
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  pendingBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pendingBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#92400E',
    letterSpacing: -0.1,
  },

  // === STAT STRIP ===
  statStrip: {
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
  statNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.7,
  },
  statDotE: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // === CHIPS ===
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
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

  // === LIST ===
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 140,
    gap: Spacing.sm,
    ...centeredContent(CARD_MAX),
  },

  // === CARD ===
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateTile: {
    width: 54,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  dateTileDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: -0.7,
  },
  dateTileMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cardHeaderCol: {
    flex: 1,
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
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
  eventName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  dirDisc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: 8,
  },
  partyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  partyName: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
    textAlign: 'right',
  },

  quoteBlock: {
    marginTop: Spacing.sm,
    paddingLeft: 10,
    paddingVertical: 4,
    borderLeftWidth: 2,
  },
  quoteText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  actionsFooter: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dateFooter: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  declinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  declineText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  acceptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  acceptText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // === EMPTY ===
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
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
  emptySubtext: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});
