import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineTickets, CachedTicket } from '../../hooks/useOfflineTickets';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
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

export default function OfflineTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSuccess, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const {
    isOnline,
    loading,
    cachedTicketCount,
    getAllCachedTickets,
    removeCachedTicket,
    clearCache,
    refreshCache,
  } = useOfflineTickets();

  const [tickets, setTickets] = useState<CachedTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const loadTickets = async () => {
    const cached = await getAllCachedTickets();
    setTickets(cached);
  };

  useEffect(() => {
    loadTickets();
  }, [cachedTicketCount]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCache();
    await loadTickets();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    showConfirm(
      'Vider le cache',
      'Voulez-vous vraiment supprimer tous les billets hors-ligne? Ils devront être re-téléchargés.',
      async () => {
        await clearCache();
        setTickets([]);
        showSuccess('Cache vidé', 'Tous les billets hors-ligne ont été supprimés');
      }
    );
  };

  const handleRemoveTicket = (ticketId: string) => {
    showConfirm(
      'Supprimer du cache',
      'Voulez-vous supprimer ce billet du cache hors-ligne?',
      async () => {
        await removeCachedTicket(ticketId);
        setTickets(tickets.filter(t => t.ticketId !== ticketId));
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTicketItem = ({ item }: { item: CachedTicket }) => {
    const isExpanded = expandedTicket === item.ticketId;
    const eventDate = new Date(item.eventDate);
    const isPast = eventDate < new Date();

    return (
      <TouchableOpacity
        style={[styles.ticketCard, { backgroundColor: colors.card }, isPast && styles.pastTicketCard]}
        onPress={() => setExpandedTicket(isExpanded ? null : item.ticketId)}
        activeOpacity={0.8}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketInfo}>
            <Text style={[styles.eventTitle, { color: colors.gray900 }]} numberOfLines={2}>
              {item.eventTitle}
            </Text>
            <Text style={[styles.ticketType, { color: colors.primary }]}>
              {item.quantity}x {item.ticketType}
            </Text>
            <Text style={[styles.eventDate, { color: colors.gray500 }]}>{formatDate(item.eventDate)}</Text>
          </View>
          <View style={styles.ticketActions}>
            <View style={[styles.offlineBadge, { backgroundColor: isOnline ? colors.successLight : colors.warningLight }]}>
              <Ionicons
                name={isOnline ? 'cloud-done' : 'cloud-offline'}
                size={14}
                color={isOnline ? colors.success : colors.warning}
              />
              <Text style={[styles.offlineBadgeText, { color: isOnline ? colors.success : colors.warning }]}>
                {isOnline ? 'En ligne' : 'Hors-ligne'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveTicket(item.ticketId)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.primary }]}>
              <Image
                source={item.qrCodeBase64}
                style={styles.qrImage}
                contentFit="contain"
                transition={200}
              />
            </View>
            <View style={styles.referenceContainer}>
              <Text style={[styles.referenceLabel, { color: colors.gray500 }]}>Référence</Text>
              <Text style={[styles.referenceCode, { color: colors.gray900 }]}>{item.referenceCode}</Text>
            </View>
            <Text style={[styles.qrHint, { color: colors.gray500 }]}>
              Présentez ce QR code à l'entrée de l'événement
            </Text>
          </View>
        )}

        <View style={styles.expandIndicator}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.gray400}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="cloud-download-outline" size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Aucun billet en cache</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
        Vos billets sont automatiquement mis en cache lorsque vous les consultez.
        Ils seront disponibles même sans connexion.
      </Text>
    </View>
  );

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>OFF</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Billets hors-ligne</Text>
        {tickets.length > 0 ? (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Connection Status */}
      <View style={[styles.connectionStatus, { backgroundColor: isOnline ? colors.successLight : colors.warningLight }]}>
        <Ionicons
          name={isOnline ? 'wifi' : 'wifi-outline'}
          size={18}
          color={isOnline ? colors.success : colors.warning}
        />
        <Text style={[styles.connectionText, { color: isOnline ? colors.success : colors.warning }]}>
          {isOnline
            ? 'Connecté - Vos billets sont synchronisés'
            : 'Hors-ligne - Utilisation du cache local'
          }
        </Text>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.ticketId}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
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

      {/* Info Card */}
      {tickets.length > 0 && (
        <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            {tickets.length} billet{tickets.length > 1 ? 's' : ''} disponible{tickets.length > 1 ? 's' : ''} hors-ligne.
            Les données sont conservées pendant 7 jours.
          </Text>
        </View>
      )}
      </View>
    </EditorialCanvas>
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
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successLight,
    gap: Spacing.xs,
  },
  connectionStatusOffline: {
    backgroundColor: Colors.warningLight,
  },
  connectionText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontFamily: FontFamily.medium,
  },
  connectionTextOffline: {
    color: Colors.warning,
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
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  pastTicketCard: {
    opacity: 0.7,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  ticketType: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  eventDate: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  ticketActions: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.successLight,
    gap: 4,
  },
  offlineBadgeActive: {
    backgroundColor: Colors.warningLight,
  },
  offlineBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontFamily: FontFamily.medium,
  },
  offlineBadgeTextActive: {
    color: Colors.warning,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  expandedContent: {
    padding: Spacing.md,
    paddingTop: 0,
    alignItems: 'center',
  },
  qrContainer: {
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  referenceContainer: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  referenceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  referenceCode: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    letterSpacing: 2,
  },
  qrHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  expandIndicator: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoLight,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.info,
    lineHeight: 18,
  },
});
