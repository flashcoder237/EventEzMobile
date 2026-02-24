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
import GradientButton from '../../components/ui/GradientButton';
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

interface Transfer {
  id: string;
  sender_name: string;
  sender_email: string;
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
}

export default function PendingTransfersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSuccess, showError, showConfirm } = useAlert();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      const response = await ticketTransfersAPI.getPendingTransfers();
      setTransfers(response.data || []);
    } catch (error) {
      console.error('Erreur chargement transferts:', error);
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

  const renderTransferItem = ({ item }: { item: Transfer }) => {
    const isProcessing = actionLoading === item.id;

    return (
      <View style={styles.transferCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.senderInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {item.sender_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.senderName}>{item.sender_name}</Text>
              <Text style={styles.senderEmail}>{item.sender_email}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, item.is_expired && styles.expiredBadge]}>
            <Text style={[styles.statusText, item.is_expired && styles.expiredText]}>
              {item.is_expired ? 'Expiré' : getTimeRemaining(item.expires_at)}
            </Text>
          </View>
        </View>

        {/* Ticket Info */}
        <View style={styles.ticketSection}>
          <Ionicons name="ticket-outline" size={20} color={Colors.primary} />
          <View style={styles.ticketDetails}>
            <Text style={styles.ticketName}>
              {item.ticket_info.transfer_quantity}x {item.ticket_info.ticket_type_name}
            </Text>
            <Text style={styles.eventTitle}>{item.event_info.title}</Text>
            <Text style={styles.eventDate}>
              {formatDate(item.event_info.start_date)} - {item.event_info.location_city || 'En ligne'}
            </Text>
          </View>
        </View>

        {/* Message */}
        {item.message && (
          <View style={styles.messageSection}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.gray500} />
            <Text style={styles.messageText}>"{item.message}"</Text>
          </View>
        )}

        {/* Actions */}
        {!item.is_expired && item.can_accept && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDecline(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="close" size={18} color={Colors.error} />
                  <Text style={styles.declineText}>Refuser</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="gift-outline" size={48} color={Colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Aucun transfert en attente</Text>
      <Text style={styles.emptySubtitle}>
        Lorsque quelqu'un vous transfère un billet, il apparaitra ici.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transferts reçus</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item) => item.id}
          renderItem={renderTransferItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
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
