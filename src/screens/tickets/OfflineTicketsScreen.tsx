import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  EditorialCanvas,
  WatermarkNumeral,
  EditorialHeader,
  editorial,
} from '../../components/ui/editorial';
import { useOfflineTickets, CachedTicket } from '../../hooks/useOfflineTickets';
import { useTicketDisplayGuard } from '../../hooks/useTicketDisplayGuard';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatTimeAgo } from '../../lib/utils/dateFormatters';
import { registrationsAPI } from '../../api';
import {
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FR_MONTHS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

export default function OfflineTicketsScreen() {
  // Cet écran affiche les QR de billets scannables (hors-ligne) → on bloque la
  // capture d'écran (anti-fraude), on pousse la luminosité et on garde l'écran
  // éveillé, comme QRCodeScreen / RegistrationDetailsScreen. Restauré au blur.
  useTicketDisplayGuard();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { showSuccess, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const {
    isOnline,
    loading,
    cachedTicketCount,
    getAllCachedTickets,
    removeCachedTicket,
    clearCache,
    refreshCache,
    cacheMultipleTickets,
  } = useOfflineTickets();

  const [tickets, setTickets] = useState<CachedTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  // One-shot guard pour éviter de re-syncer à chaque focus quand on est déjà
  // synchro. On reset si l'utilisateur pull-to-refresh ou repasse online.
  const autoSyncedRef = useRef(false);

  const loadTickets = useCallback(async () => {
    const cached = await getAllCachedTickets();
    setTickets(cached);
  }, [getAllCachedTickets]);

  useEffect(() => {
    loadTickets();
  }, [cachedTicketCount, loadTickets]);

  // Auto-sync : récupère les inscriptions confirmées de l'utilisateur et met
  // en cache les QR codes de tous leurs billets, sans qu'il ait besoin
  // d'ouvrir chaque billet individuellement.
  const autoSyncFromAPI = useCallback(async (silent = false) => {
    if (!isOnline || !user?.id) return;
    try {
      if (!silent) setSyncing(true);
      const response = await registrationsAPI.getMyRegistrations();
      const data = response.data?.results || response.data || [];

      const ticketsToCache = (data as any[])
        .filter((r) => (r.status === 'confirmed' || r.status === 'completed') && r.tickets?.length > 0)
        .flatMap((r) =>
          r.tickets
            .filter((tk: any) => tk.qr_code)
            .map((tk: any) => ({
              id: tk.id,
              registration: {
                id: r.id,
                reference_code: r.reference_code,
                event: {
                  id: r.event_detail?.id || r.event?.id || r.event_id || r.event,
                  title: r.event_detail?.title || r.event?.title || t('tickets.eventFallback'),
                  start_date: r.event_detail?.start_date || r.event?.start_date || '',
                },
              },
              ticket_type_name:
                tk.ticket_type_name || tk.type_name || (typeof tk.ticket_type === 'object' ? tk.ticket_type?.name : undefined),
              quantity: tk.quantity || 1,
              qr_code: tk.qr_code,
            }))
        );

      if (ticketsToCache.length > 0) {
        const synced = await cacheMultipleTickets(ticketsToCache);
        await loadTickets();
        if (!silent && synced > 0) {
          showSuccess(t('offlineTickets.syncingTitle'), t('offlineTickets.syncedToast', { count: synced }));
        }
      }
    } catch (error) {
      if (__DEV__) console.error('[OfflineTickets] auto-sync error:', error);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, user?.id, cacheMultipleTickets, loadTickets, showSuccess, t]);

  // Auto-sync au focus de l'écran (one-shot par session online).
  useFocusEffect(
    useCallback(() => {
      if (isOnline && !autoSyncedRef.current && user?.id) {
        autoSyncedRef.current = true;
        autoSyncFromAPI(true);
      }
    }, [isOnline, user?.id, autoSyncFromAPI])
  );

  // Reset le drapeau quand on repasse online (ré-arme l'auto-sync).
  useEffect(() => {
    if (!isOnline) autoSyncedRef.current = false;
  }, [isOnline]);

  const handleRefresh = async () => {
    setRefreshing(true);
    autoSyncedRef.current = false;
    await refreshCache();
    if (isOnline) {
      await autoSyncFromAPI(false);
    } else {
      await loadTickets();
    }
    setRefreshing(false);
  };

  const handleClearAll = () => {
    showConfirm(
      t('offlineTickets.clearTitle'),
      t('offlineTickets.clearMessage'),
      async () => {
        await clearCache();
        setTickets([]);
        showSuccess(t('offlineTickets.clearedTitle'), t('offlineTickets.clearedMessage'));
      }
    );
  };

  const handleRemoveTicket = (ticketId: string) => {
    showConfirm(
      t('offlineTickets.removeTitle'),
      t('offlineTickets.removeMessage'),
      async () => {
        await removeCachedTicket(ticketId);
        setTickets(items => items.filter(item => item.ticketId !== ticketId));
      }
    );
  };

  const formatDateLong = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTile = (dateString: string) => {
    if (!dateString) return { day: '—', month: '' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { day: '—', month: '' };
    const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';
    const month = i18n.language === 'en'
      ? date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      : FR_MONTHS_SHORT[date.getMonth()];
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month,
    };
  };

  const renderTicketItem = ({ item }: { item: CachedTicket }) => {
    const isExpanded = expandedTicket === item.ticketId;
    const eventDate = item.eventDate ? new Date(item.eventDate) : null;
    const isPast = !!eventDate && eventDate < new Date();
    const tile = formatDateTile(item.eventDate);
    const eventTitle = item.eventTitle || t('tickets.eventFallback');
    const ticketType = item.ticketType || t('tickets.ticketFallback');
    const quantity = item.quantity || 1;
    const reference = item.referenceCode || '—';

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.border : 'rgba(17,17,16,0.06)',
            shadowColor: colors.primary,
            opacity: isPast ? 0.78 : 1,
          },
        ]}
      >
        {/* Top section : type pill + date tile + hero title */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.cardTop}
          onPress={() => setExpandedTicket(isExpanded ? null : item.ticketId)}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? t('offlineTickets.hideQR') : t('offlineTickets.showQR')}
        >
          <View style={styles.typeRow}>
            <View style={[styles.typePill, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="ticket" size={10} color={colors.primary} />
              <Text style={[styles.typePillText, { color: colors.primary }]} numberOfLines={1}>
                {ticketType.toUpperCase()}
              </Text>
            </View>
            {quantity > 1 && (
              <View style={[styles.qtyPill, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.qtyPillText, { color: colors.gray700 }]}>×{quantity}</Text>
              </View>
            )}
            {isPast && (
              <View style={[styles.pastPill, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.pastPillText, { color: colors.gray600 }]}>
                  {t('offlineTickets.pastBadge').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroRow}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={[styles.heroTitle, { color: colors.gray900 }]} numberOfLines={2}>
                {eventTitle}
              </Text>
              <Text style={[styles.metaLine, { color: colors.gray600 }]} numberOfLines={1}>
                <Ionicons name="calendar-outline" size={12} color={colors.accent} />
                {'  '}
                {formatDateLong(item.eventDate)}
              </Text>
            </View>
            {tile.day !== '—' && (
              <View style={[styles.dateTile, { backgroundColor: `${colors.accent}1A` }]}>
                <Text style={[styles.dateTileDay, { color: colors.accent }]}>{tile.day}</Text>
                <Text style={[styles.dateTileMonth, { color: colors.accent }]}>{tile.month}</Text>
              </View>
            )}
          </View>

          {/* Reference always visible — no need to expand to see it */}
          <View style={styles.refRow}>
            <View style={styles.refBlock}>
              <Text style={[editorial.eyebrow, { color: colors.gray500, marginBottom: 2 }]}>
                {t('offlineTickets.referenceLabel')}
              </Text>
              <Text style={[styles.refCode, { color: colors.gray900 }]}>{reference}</Text>
            </View>
            <View style={styles.refMeta}>
              <View style={[styles.syncChip, { backgroundColor: colors.gray100 }]}>
                <Ionicons
                  name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
                  size={11}
                  color={isOnline ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.syncChipText,
                    { color: isOnline ? colors.success : colors.warning },
                  ]}
                  numberOfLines={1}
                >
                  {item.cachedAt
                    ? t('offlineTickets.syncedAt', {
                        when: formatTimeAgo(new Date(item.cachedAt).toISOString()),
                      })
                    : t('offlineTickets.online')}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded section : dashed divider + QR */}
        {isExpanded && (
          <View>
            <View style={styles.divider}>
              <View style={[styles.dividerCircleLeft, { backgroundColor: colors.background }]} />
              <View style={[styles.dividerLine, { borderColor: colors.gray200 }]} />
              <View style={[styles.dividerCircleRight, { backgroundColor: colors.background }]} />
            </View>

            <View style={styles.qrSection}>
              <View style={styles.qrFrame}>
                <View style={[styles.qrContainer, { borderColor: colors.gray100 }]}>
                  <Image
                    source={item.qrCodeBase64}
                    style={styles.qrImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
                <View style={[styles.qrCorner, styles.qrCornerTL, { borderColor: colors.primary }]} />
                <View style={[styles.qrCorner, styles.qrCornerTR, { borderColor: colors.primary }]} />
                <View style={[styles.qrCorner, styles.qrCornerBL, { borderColor: colors.primary }]} />
                <View style={[styles.qrCorner, styles.qrCornerBR, { borderColor: colors.primary }]} />
              </View>
              <Text style={[styles.qrHint, { color: colors.gray500 }]}>{t('offlineTickets.qrHint')}</Text>
            </View>
          </View>
        )}

        {/* Bottom action bar */}
        <View style={[styles.cardBottom, { borderTopColor: colors.gray100 }]}>
          <TouchableOpacity
            style={styles.expandTrigger}
            onPress={() => setExpandedTicket(isExpanded ? null : item.ticketId)}
            accessibilityRole="button"
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'qr-code-outline'}
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.expandTriggerText, { color: colors.primary }]}>
              {isExpanded ? t('offlineTickets.hideQR') : t('offlineTickets.showQR')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeIcon}
            onPress={() => handleRemoveTicket(item.ticketId)}
            accessibilityRole="button"
            accessibilityLabel={t('offlineTickets.removeTitle')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons
          name={isOnline ? 'cloud-download-outline' : 'cloud-offline-outline'}
          size={40}
          color={colors.gray400}
        />
      </View>
      <Text style={[editorial.eyebrow, { color: colors.gray500, textAlign: 'center' }]}>
        {t('offlineTickets.headerEyebrow')}
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
        {isOnline ? t('offlineTickets.emptyTitle') : t('offlineTickets.emptyOfflineTitle')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        {isOnline ? t('offlineTickets.emptySubtitle') : t('offlineTickets.emptyOfflineSubtitle')}
      </Text>
    </View>
  );

  const lastSyncMs = tickets.length > 0
    ? Math.max(...tickets.map(item => item.cachedAt))
    : null;

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>OFF</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        <EditorialHeader
          eyebrow={t('offlineTickets.headerEyebrow')}
          title={t('offlineTickets.headerTitle')}
          back
          onBack={() => navigation.goBack()}
          right={
            tickets.length > 0 ? (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleClearAll}
                accessibilityLabel={t('offlineTickets.clearTitle')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Status row : connectivity + sync info */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: isOnline ? `${colors.success}15` : `${colors.warning}15` },
            ]}
          >
            <Ionicons
              name={isOnline ? 'wifi' : 'wifi-outline'}
              size={12}
              color={isOnline ? colors.success : colors.warning}
            />
            <Text
              style={[
                styles.statusChipText,
                { color: isOnline ? colors.success : colors.warning },
              ]}
              numberOfLines={1}
            >
              {isOnline ? t('offlineTickets.connectedSync') : t('offlineTickets.offlineUsingCache')}
            </Text>
          </View>
          {syncing && (
            <View style={[styles.statusChip, { backgroundColor: `${colors.primary}15` }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.statusChipText, { color: colors.primary }]} numberOfLines={1}>
                {t('offlineTickets.syncingTitle')}
              </Text>
            </View>
          )}
          {!syncing && lastSyncMs && (
            <Text style={[styles.lastSyncText, { color: colors.gray500 }]} numberOfLines={1}>
              {t('offlineTickets.lastSyncAt', {
                when: formatTimeAgo(new Date(lastSyncMs).toISOString()),
              })}
            </Text>
          )}
        </View>

        {loading && tickets.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.ticketId}
            renderItem={renderTicketItem}
            contentContainerStyle={[
              styles.listContent,
              tickets.length === 0 && { flexGrow: 1 },
            ]}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={
              tickets.length > 0 ? (
                <View style={styles.footerNote}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.gray500} />
                  <Text style={[styles.footerNoteText, { color: colors.gray600 }]}>
                    {t('offlineTickets.infoCount', { count: tickets.length })}
                  </Text>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status row under header
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.2,
  },
  lastSyncText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.2,
    marginLeft: 'auto',
  },

  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },

  // Editorial card (ticket stub)
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTop: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    maxWidth: 220,
  },
  typePillText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  qtyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  qtyPillText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.2,
  },
  pastPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  pastPillText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metaLine: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    letterSpacing: -0.1,
  },
  dateTile: {
    width: 56,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dateTileDay: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -1,
    lineHeight: 24,
  },
  dateTileMonth: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Reference row
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  refBlock: {
    flex: 1,
  },
  refCode: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: 2,
  },
  refMeta: {
    alignItems: 'flex-end',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    maxWidth: 180,
  },
  syncChipText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.2,
  },

  // Dashed divider (ticket stub)
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.6,
    marginHorizontal: 4,
  },
  dividerCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: -10,
  },

  // QR
  qrSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  qrFrame: {
    position: 'relative',
    padding: 12,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
  },
  qrCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  qrCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  qrCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  qrCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  qrHint: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    letterSpacing: -0.1,
  },

  // Card bottom action bar
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  expandTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  expandTriggerText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.2,
  },
  removeIcon: {
    padding: 6,
  },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginTop: 4,
  },

  // Footer note
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FontFamily.medium,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
});
