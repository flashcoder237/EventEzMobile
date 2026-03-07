import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ticketTransfersAPI } from '../../api/client';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import QRCodeDisplay from '../../components/common/QRCodeDisplay';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'received' | 'sent';

interface Transfer {
  id: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  recipient_name: string;
  ticket_info: {
    ticket_type_name: string;
    transfer_quantity: number;
  };
  event_info: {
    id: string;
    title: string;
    start_date: string;
    location_city: string;
  };
  status: string;
  message: string;
  created_at: string;
  expires_at: string;
  can_accept: boolean;
  is_expired: boolean;
  transfer_token_display?: string;
}

export default function PendingTransfersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [sentTransfers, setSentTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTransferToken, setSelectedTransferToken] = useState<string | null>(null);
  const [selectedTransferTitle, setSelectedTransferTitle] = useState('');

  const fetchTransfers = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        ticketTransfersAPI.getPendingTransfers(),
        ticketTransfersAPI.getSentTransfers(),
      ]);
      setTransfers(receivedRes.data || []);
      setSentTransfers(sentRes.data?.results || sentRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement transferts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTransfers();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransfers();
  };

  const handleAccept = (transfer: Transfer) => {
    showConfirm(
      'Accepter le transfert',
      `Voulez-vous accepter ${transfer.ticket_info.transfer_quantity} billet(s) "${transfer.ticket_info.ticket_type_name}" de ${transfer.sender_name}?`,
      async () => {
        setActionLoading(transfer.id);
        try {
          await ticketTransfersAPI.acceptTransfer(transfer.id);
          showSuccess('Transfert accepté', 'Le billet a été ajouté à votre compte!');
          fetchTransfers();
        } catch (error: any) {
          showError('Erreur', error.response?.data?.detail || 'Impossible d\'accepter le transfert');
        } finally {
          setActionLoading(null);
        }
      },
    );
  };

  const handleDecline = (transfer: Transfer) => {
    showConfirm(
      'Refuser le transfert',
      `Voulez-vous vraiment refuser ce transfert de ${transfer.sender_name}?`,
      async () => {
        setActionLoading(transfer.id);
        try {
          await ticketTransfersAPI.declineTransfer(transfer.id);
          showSuccess('Transfert refusé', 'L\'expéditeur a été notifié.');
          fetchTransfers();
        } catch (error: any) {
          showError('Erreur', error.response?.data?.detail || 'Impossible de refuser le transfert');
        } finally {
          setActionLoading(null);
        }
      },
    );
  };

  const handleCancelTransfer = (transfer: Transfer) => {
    showConfirm(
      'Annuler le transfert',
      `Voulez-vous annuler le transfert vers ${transfer.recipient_name || transfer.recipient_email}?`,
      async () => {
        setActionLoading(transfer.id);
        try {
          await ticketTransfersAPI.cancelTransfer(transfer.id);
          showSuccess('Transfert annulé', 'Le transfert a été annulé.');
          fetchTransfers();
        } catch (error: any) {
          showError('Erreur', error.response?.data?.detail || 'Impossible d\'annuler le transfert');
        } finally {
          setActionLoading(null);
        }
      },
    );
  };

  const handleShowQR = (transfer: Transfer) => {
    if (transfer.transfer_token_display) {
      setSelectedTransferToken(transfer.transfer_token_display);
      setSelectedTransferTitle(transfer.event_info.title);
      setShowQRModal(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expiré';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h restant`;
    }
    return `${hours}h ${minutes}min restant`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Accepté';
      case 'declined': return 'Refusé';
      case 'cancelled': return 'Annulé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'accepted': return colors.success;
      case 'declined':
      case 'cancelled':
      case 'expired': return colors.error;
      default: return colors.gray500;
    }
  };

  // ── Received transfer item ──

  const renderReceivedItem = ({ item }: { item: Transfer }) => {
    const isProcessing = actionLoading === item.id;

    return (
      <View style={[styles.transferCard, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.senderInfo}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.sender_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.senderName, { color: colors.gray900 }]}>{item.sender_name}</Text>
              <Text style={[styles.senderEmail, { color: colors.gray500 }]}>{item.sender_email}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.is_expired ? colors.errorLight : colors.warningLight }]}>
            <Text style={[styles.statusText, { color: item.is_expired ? colors.error : colors.warning }]}>
              {item.is_expired ? 'Expiré' : getTimeRemaining(item.expires_at)}
            </Text>
          </View>
        </View>

        {/* Ticket Info */}
        <View style={[styles.ticketSection, { backgroundColor: colors.gray50 }]}>
          <Ionicons name="ticket-outline" size={20} color={colors.primary} />
          <View style={styles.ticketDetails}>
            <Text style={[styles.ticketName, { color: colors.gray900 }]}>
              {item.ticket_info.transfer_quantity}x {item.ticket_info.ticket_type_name}
            </Text>
            <Text style={[styles.eventTitle, { color: colors.gray700 }]}>{item.event_info.title}</Text>
            <Text style={[styles.eventDate, { color: colors.gray500 }]}>
              {formatDate(item.event_info.start_date)} - {item.event_info.location_city || 'En ligne'}
            </Text>
          </View>
        </View>

        {/* Message */}
        {item.message && (
          <View style={styles.messageSection}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.gray500} />
            <Text style={[styles.messageText, { color: colors.gray600 }]}>"{item.message}"</Text>
          </View>
        )}

        {/* Actions */}
        {!item.is_expired && item.can_accept && (
          <View style={[styles.actions, { borderTopColor: colors.gray100 }]}>
            <TouchableOpacity
              style={[styles.declineButton, { borderColor: colors.error }]}
              onPress={() => handleDecline(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="close" size={18} color={colors.error} />
                  <Text style={[styles.declineText, { color: colors.error }]}>Refuser</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.primary }]}
              onPress={() => handleAccept(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                  <Text style={styles.acceptText}>Accepter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Sent transfer item ──

  const renderSentItem = ({ item }: { item: Transfer }) => {
    const isProcessing = actionLoading === item.id;
    const isPending = item.status === 'pending' && !item.is_expired;
    const statusColor = getStatusColor(item.is_expired ? 'expired' : item.status);

    return (
      <View style={[styles.transferCard, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.senderInfo}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {(item.recipient_name || item.recipient_email).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.senderName, { color: colors.gray900 }]}>
                {item.recipient_name || 'Destinataire'}
              </Text>
              <Text style={[styles.senderEmail, { color: colors.gray500 }]}>{item.recipient_email}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.is_expired ? 'Expiré' : getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Ticket Info */}
        <View style={[styles.ticketSection, { backgroundColor: colors.gray50 }]}>
          <Ionicons name="ticket-outline" size={20} color={colors.primary} />
          <View style={styles.ticketDetails}>
            <Text style={[styles.ticketName, { color: colors.gray900 }]}>
              {item.ticket_info.transfer_quantity}x {item.ticket_info.ticket_type_name}
            </Text>
            <Text style={[styles.eventTitle, { color: colors.gray700 }]}>{item.event_info.title}</Text>
            <Text style={[styles.eventDate, { color: colors.gray500 }]}>
              {formatDate(item.event_info.start_date)} - {item.event_info.location_city || 'En ligne'}
            </Text>
          </View>
        </View>

        {/* Expiration for pending */}
        {isPending && (
          <View style={styles.expirationRow}>
            <Ionicons name="time-outline" size={14} color={colors.gray500} />
            <Text style={[styles.expirationText, { color: colors.gray500 }]}>{getTimeRemaining(item.expires_at)}</Text>
          </View>
        )}

        {/* Actions for pending sent transfers */}
        {isPending && (
          <View style={[styles.actions, { borderTopColor: colors.gray100 }]}>
            {item.transfer_token_display && (
              <TouchableOpacity
                style={[styles.qrButton, { borderColor: colors.primary }]}
                onPress={() => handleShowQR(item)}
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                <Text style={[styles.qrButtonText, { color: colors.primary }]}>Afficher QR</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error }]}
              onPress={() => handleCancelTransfer(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.cancelText, { color: colors.error }]}>Annuler</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyReceived = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="gift-outline" size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Aucun transfert reçu</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        Lorsque quelqu'un vous transfère un billet, il apparaitra ici.
      </Text>
    </View>
  );

  const renderEmptySent = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="send-outline" size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Aucun transfert envoyé</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        Vos transferts de billets envoyés apparaîtront ici.
      </Text>
    </View>
  );

  const currentData = activeTab === 'received' ? transfers : sentTransfers;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Transferts</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: colors.gray50 }, activeTab === 'received' && { backgroundColor: colors.primary + '15' }]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={16}
            color={activeTab === 'received' ? colors.primary : colors.gray500}
          />
          <Text style={[styles.tabText, { color: colors.gray500 }, activeTab === 'received' && { color: colors.primary, fontFamily: FontFamily.semiBold }]}>
            Reçus
          </Text>
          {transfers.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.gray200 }, activeTab === 'received' && { backgroundColor: colors.primary }]}>
              <Text style={[styles.tabBadgeText, { color: colors.gray600 }, activeTab === 'received' && { color: colors.white }]}>
                {transfers.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: colors.gray50 }, activeTab === 'sent' && { backgroundColor: colors.primary + '15' }]}
          onPress={() => setActiveTab('sent')}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={16}
            color={activeTab === 'sent' ? colors.primary : colors.gray500}
          />
          <Text style={[styles.tabText, { color: colors.gray500 }, activeTab === 'sent' && { color: colors.primary, fontFamily: FontFamily.semiBold }]}>
            Envoyés
          </Text>
          {sentTransfers.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.gray200 }, activeTab === 'sent' && { backgroundColor: colors.primary }]}>
              <Text style={[styles.tabBadgeText, { color: colors.gray600 }, activeTab === 'sent' && { color: colors.white }]}>
                {sentTransfers.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'received' ? renderReceivedItem : renderSentItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={activeTab === 'received' ? renderEmptyReceived : renderEmptySent}
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

      {/* QR Code Modal */}
      {selectedTransferToken && (
        <QRCodeDisplay
          visible={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedTransferToken(null);
          }}
          data={`EVENTEZ-TRANSFER-${selectedTransferToken}`}
          title="QR du transfert"
          subtitle={selectedTransferTitle}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
  },
  tabActive: {
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary,
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray600,
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  transferCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  senderName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  senderEmail: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  statusBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  expiredBadge: {
    backgroundColor: Colors.errorLight,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.warning,
  },
  expiredText: {
    color: Colors.error,
  },
  ticketSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  ticketDetails: {
    flex: 1,
  },
  ticketName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  eventTitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginTop: 2,
  },
  eventDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  messageSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  messageText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    fontStyle: 'italic',
  },
  expirationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  expirationText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  declineText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  acceptText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  qrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  qrButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
