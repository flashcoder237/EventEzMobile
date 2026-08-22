import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  EditorialCanvas,
  EditorialHeader,
  WatermarkNumeral,
  editorial,
} from '../../components/ui/editorial';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ticketTransfersAPI } from '../../api';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import ErrorState from '../../components/ui/ErrorState';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import QRCodeDisplay from '../../components/common/QRCodeDisplay';
import { Colors, FontSizes, FontFamily, BorderRadius, Spacing } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { RootStackParamList } from '../../types';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'received' | 'sent';

interface Transfer {
  id: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  recipient_name: string;
  ticket_info: { ticket_type_name: string; transfer_quantity: number };
  event_info: { id: string; title: string; start_date: string; location_city: string };
  status: string;
  message: string;
  created_at: string;
  expires_at: string;
  can_accept: boolean;
  is_expired: boolean;
  transfer_token_display?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function timeRemaining(expiresAt: string): { label: string; urgent: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: 'Expiré', urgent: true };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const urgent = h < 6;
  if (h > 24) return { label: `${Math.floor(h / 24)}j restants`, urgent };
  if (h > 0) return { label: `${h}h${m > 0 ? ` ${m}m` : ''} restantes`, urgent };
  return { label: `${m}m restantes`, urgent: true };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', accepted: 'Accepté',
  declined: 'Refusé', cancelled: 'Annulé', expired: 'Expiré',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PendingTransfersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [sentTransfers, setSentTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTransferToken, setSelectedTransferToken] = useState<string | null>(null);
  const [selectedTransferTitle, setSelectedTransferTitle] = useState('');

  const fetchTransfers = useCallback(async () => {
    try {
      setLoadFailed(false);
      const [receivedRes, sentRes] = await Promise.all([
        ticketTransfersAPI.getPendingTransfers(),
        ticketTransfersAPI.getSentTransfers(),
      ]);
      setTransfers(receivedRes.data || []);
      setSentTransfers(sentRes.data?.results || sentRes.data || []);
    } catch {
      // Plus de modale bloquante : l'écran affiche désormais son propre état
      // d'erreur avec un bouton Réessayer. L'ancien état vide (« Rien pour
      // l'instant ») faisait passer une panne réseau pour une absence de
      // données — on distingue maintenant les deux.
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTransfers(); }, [fetchTransfers]));

  const handleAccept = useCallback((item: Transfer) => {
    showConfirm(
      t('pendingTransfers.acceptTitle'),
      t('pendingTransfers.acceptConfirm', {
        quantity: item.ticket_info.transfer_quantity,
        name: item.ticket_info.ticket_type_name,
        sender: item.sender_name,
      }),
      async () => {
        setActionLoading(item.id);
        try {
          await ticketTransfersAPI.acceptTransfer(item.id);
          showSuccess(t('pendingTransfers.acceptSuccessTitle'), t('pendingTransfers.acceptSuccessMsg'));
          fetchTransfers();
        } catch (err: any) {
          showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'pendingTransfers.acceptError' }).message);
        } finally { setActionLoading(null); }
      },
    );
  }, [showConfirm, showSuccess, showError, fetchTransfers, t]);

  const handleDecline = useCallback((item: Transfer) => {
    showConfirm(
      t('pendingTransfers.declineTitle'),
      t('pendingTransfers.declineConfirm', { sender: item.sender_name }),
      async () => {
        setActionLoading(item.id);
        try {
          await ticketTransfersAPI.declineTransfer(item.id);
          showSuccess(t('pendingTransfers.declineSuccessTitle'), t('pendingTransfers.declineSuccessMsg'));
          fetchTransfers();
        } catch (err: any) {
          showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'pendingTransfers.declineError' }).message);
        } finally { setActionLoading(null); }
      },
    );
  }, [showConfirm, showSuccess, showError, fetchTransfers, t]);

  const handleCancel = useCallback((item: Transfer) => {
    showConfirm(
      t('pendingTransfers.cancelTitle'),
      t('pendingTransfers.cancelConfirm', { recipient: item.recipient_name || item.recipient_email }),
      async () => {
        setActionLoading(item.id);
        try {
          await ticketTransfersAPI.cancelTransfer(item.id);
          showSuccess(t('pendingTransfers.cancelSuccessTitle'), t('pendingTransfers.cancelSuccessMsg'));
          fetchTransfers();
        } catch (err: any) {
          showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'pendingTransfers.cancelError' }).message);
        } finally { setActionLoading(null); }
      },
    );
  }, [showConfirm, showSuccess, showError, fetchTransfers, t]);

  const handleShowQR = useCallback((item: Transfer) => {
    if (item.transfer_token_display) {
      setSelectedTransferToken(item.transfer_token_display);
      setSelectedTransferTitle(item.event_info.title);
      setShowQRModal(true);
    }
  }, []);

  // ── Card — Received ───────────────────────────────────────────────────────

  const renderReceivedItem = useCallback(({ item }: { item: Transfer }) => {
    const isProcessing = actionLoading === item.id;
    const { label: expiryLabel, urgent } = timeRemaining(item.expires_at);
    const expiryColor = item.is_expired ? colors.error : urgent ? colors.warning : colors.primary;

    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: `${colors.primary}10` }]}>
        {/* Eyebrow + event title */}
        <Text style={[editorial.eyebrow, { color: colors.primary, marginBottom: 2 }]}>
          {item.ticket_info.transfer_quantity > 1
            ? `${item.ticket_info.transfer_quantity}× ${item.ticket_info.ticket_type_name}`
            : item.ticket_info.ticket_type_name}
        </Text>
        <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.event_info.title}
        </Text>

        {/* Meta row */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {fmtDate(item.event_info.start_date)}
            </Text>
          </View>
          {item.event_info.location_city ? (
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.event_info.location_city}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[s.divider, { backgroundColor: `${colors.primary}08` }]} />

        {/* Sender row */}
        <View style={s.personRow}>
          <View style={[s.avatar, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[s.avatarLetter, { color: colors.primary }]}>
              {(item.sender_name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.personLabel, { color: colors.textSecondary }]}>{t('tickets.transfers.sentBy')}</Text>
            <Text style={[s.personName, { color: colors.text }]} numberOfLines={1}>
              {item.sender_name}
            </Text>
          </View>
          {/* Expiry chip */}
          <View style={[s.chip, { backgroundColor: `${expiryColor}14` }]}>
            <Ionicons name="time-outline" size={11} color={expiryColor} />
            <Text style={[s.chipText, { color: expiryColor }]}>{expiryLabel}</Text>
          </View>
        </View>

        {/* Message */}
        {!!item.message && (
          <View style={[s.messageBox, { backgroundColor: `${colors.primary}08` }]}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text style={[s.messageText, { color: colors.textSecondary }]} numberOfLines={3}>
              "{item.message}"
            </Text>
          </View>
        )}

        {/* Actions */}
        {!item.is_expired && item.can_accept && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btnGhost, { borderColor: `${colors.error}40` }]}
              onPress={() => handleDecline(item)}
              disabled={isProcessing}
              activeOpacity={0.75}
            >
              {isProcessing
                ? <ActivityIndicator size="small" color={colors.error} />
                : <>
                    <Ionicons name="close" size={15} color={colors.error} />
                    <Text style={[s.btnGhostText, { color: colors.error }]}>{t('tickets.transfers.decline')}</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnPrimary, { backgroundColor: colors.primary, opacity: isProcessing ? 0.6 : 1 }]}
              onPress={() => handleAccept(item)}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="checkmark" size={15} color="#fff" />
                    <Text style={s.btnPrimaryText}>{t('tickets.transfers.accept')}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [actionLoading, colors, handleAccept, handleDecline]);

  // ── Card — Sent ───────────────────────────────────────────────────────────

  const renderSentItem = useCallback(({ item }: { item: Transfer }) => {
    const isProcessing = actionLoading === item.id;
    const isPending = item.status === 'pending' && !item.is_expired;
    const statusColor =
      item.status === 'accepted' ? colors.success :
      ['declined', 'cancelled', 'expired'].includes(item.status) || item.is_expired
        ? colors.error : colors.warning;

    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: `${colors.primary}10` }]}>
        {/* Eyebrow + event title */}
        <Text style={[editorial.eyebrow, { color: colors.primary, marginBottom: 2 }]}>
          {item.ticket_info.transfer_quantity > 1
            ? `${item.ticket_info.transfer_quantity}× ${item.ticket_info.ticket_type_name}`
            : item.ticket_info.ticket_type_name}
        </Text>
        <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.event_info.title}
        </Text>

        {/* Meta row */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {fmtDate(item.event_info.start_date)}
            </Text>
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: `${colors.primary}08` }]} />

        {/* Recipient row */}
        <View style={s.personRow}>
          <View style={[s.avatar, { backgroundColor: `${colors.accent}18` }]}>
            <Text style={[s.avatarLetter, { color: colors.accent }]}>
              {(item.recipient_name || item.recipient_email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.personLabel, { color: colors.textSecondary }]}>{t('tickets.transfers.sentTo')}</Text>
            <Text style={[s.personName, { color: colors.text }]} numberOfLines={1}>
              {item.recipient_name || item.recipient_email}
            </Text>
          </View>
          {/* Status chip */}
          <View style={[s.chip, { backgroundColor: `${statusColor}14` }]}>
            <Text style={[s.chipText, { color: statusColor }]}>
              {item.is_expired ? t('tickets.transfers.expired') : (STATUS_LABELS[item.status] ?? item.status)}
            </Text>
          </View>
        </View>

        {/* Pending actions */}
        {isPending && (
          <View style={s.actions}>
            {item.transfer_token_display && (
              <TouchableOpacity
                style={[s.btnGhost, { borderColor: `${colors.primary}40` }]}
                onPress={() => handleShowQR(item)}
                activeOpacity={0.75}
              >
                <Ionicons name="qr-code-outline" size={15} color={colors.primary} />
                <Text style={[s.btnGhostText, { color: colors.primary }]}>QR Code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btnGhost, { borderColor: `${colors.error}40`, flex: item.transfer_token_display ? 1 : undefined }]}
              onPress={() => handleCancel(item)}
              disabled={isProcessing}
              activeOpacity={0.75}
            >
              {isProcessing
                ? <ActivityIndicator size="small" color={colors.error} />
                : <>
                    <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                    <Text style={[s.btnGhostText, { color: colors.error }]}>{t('tickets.transfers.cancel')}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [actionLoading, colors, handleCancel, handleShowQR]);

  // ── Empty states ──────────────────────────────────────────────────────────

  const EmptyReceived = useCallback(() => (
    <View style={s.empty}>
      <View style={[s.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="gift-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[editorial.eyebrow, { color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xs }]}>
        Aucun transfert reçu
      </Text>
      <Text style={[s.emptyTitle, { color: colors.text }]}>Rien pour l'instant</Text>
      <Text style={[s.emptySub, { color: colors.textSecondary }]}>
        Quand quelqu'un vous envoie un billet, il apparaîtra ici.
      </Text>
    </View>
  ), [colors]);

  const EmptySent = useCallback(() => (
    <View style={s.empty}>
      <View style={[s.emptyIcon, { backgroundColor: `${colors.accent}10` }]}>
        <Ionicons name="send-outline" size={40} color={colors.accent} />
      </View>
      <Text style={[editorial.eyebrow, { color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xs }]}>
        Aucun envoi
      </Text>
      <Text style={[s.emptyTitle, { color: colors.text }]}>Vous n'avez rien envoyé</Text>
      <Text style={[s.emptySub, { color: colors.textSecondary }]}>
        Vos transferts envoyés à d'autres personnes apparaîtront ici.
      </Text>
    </View>
  ), [colors]);

  const currentData = activeTab === 'received' ? transfers : sentTransfers;
  const renderItem = useMemo(
    () => activeTab === 'received' ? renderReceivedItem : renderSentItem,
    [activeTab, renderReceivedItem, renderSentItem],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <EditorialCanvas edges={['top']}>
      <EditorialHeader eyebrow="MES TRANSFERTS" title="Billets reçus & envoyés" align="left" />
      <WatermarkNumeral>XFER</WatermarkNumeral>

      {/* Tab chips */}
      <View style={s.tabRow}>
        {(['received', 'sent'] as TabType[]).map((tab) => {
          const active = activeTab === tab;
          const count = tab === 'received' ? transfers.length : sentTransfers.length;
          const label = tab === 'received' ? 'Reçus' : 'Envoyés';
          return (
            <TouchableOpacity
              key={tab}
              style={[
                s.tab,
                { borderColor: active ? colors.primary : `${colors.primary}20` },
                active && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, { color: active ? '#fff' : colors.textSecondary }]}>
                {label}
              </Text>
              {count > 0 && (
                <View style={[s.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${colors.primary}18` }]}>
                  <Text style={[s.tabBadgeText, { color: active ? '#fff' : colors.primary }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            loadFailed ? (
              <ErrorState
                withCard
                message={t('pendingTransfers.loadError')}
                onRetry={fetchTransfers}
              />
            ) : activeTab === 'received' ? (
              <EmptyReceived />
            ) : (
              <EmptySent />
            )
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTransfers(); }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {selectedTransferToken && (
        <QRCodeDisplay
          visible={showQRModal}
          onClose={() => { setShowQRModal(false); setSelectedTransferToken(null); }}
          data={`EVENTEZ-TRANSFER-${selectedTransferToken}`}
          title={t('pendingTransfers.qrTitle')}
          subtitle={selectedTransferTitle}
        />
      )}
    </EditorialCanvas>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    zIndex: 1,
    ...centeredContent(CARD_MAX),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  tabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  tabBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    zIndex: 1,
    ...centeredContent(CARD_MAX),
  },
  card: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.base,
    borderWidth: 1,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.4,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.base,
  },
  personLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 1,
  },
  personName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79,70,229,0.06)',
  },
  btnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  btnGhostText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  btnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  btnPrimaryText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: '#fff',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: '82%',
  },
});
