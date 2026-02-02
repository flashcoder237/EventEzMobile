import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { registrationsAPI } from '../../api/client';
import { Registration, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'upcoming' | 'past' | 'cancelled';
type RegistrationType = 'billetterie' | 'inscription';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MyTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await registrationsAPI.getMyRegistrations();
      const data = response.data?.results || response.data || [];
      setRegistrations(data);
    } catch (error) {
      console.error('Erreur chargement inscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegistrations();
    setRefreshing(false);
  };

  const filterRegistrations = useCallback((tab: TabType) => {
    const now = new Date();
    return registrations.filter((reg) => {
      const event = reg.event || reg.event_detail;
      const eventDate = event?.start_date ? new Date(event.start_date) : null;
      const isCancelled = reg.status === 'cancelled' || reg.status === 'rejected';
      const isPendingApproval = reg.approval_status === 'pending' || reg.status === 'pending_approval';

      switch (tab) {
        case 'upcoming':
          // Include: not cancelled AND (future date OR no date OR pending approval)
          if (isCancelled) return false;
          if (!eventDate) return true; // Show if no date (edge case)
          return eventDate >= now || isPendingApproval;
        case 'past':
          return !isCancelled && eventDate && eventDate < now && !isPendingApproval;
        case 'cancelled':
          return isCancelled;
        default:
          return true;
      }
    });
  }, [registrations]);

  const filteredRegistrations = filterRegistrations(activeTab);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
      year: date.getFullYear(),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }),
    };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return { color: Colors.success, bg: Colors.successLight, label: 'Confirmé', icon: 'checkmark-circle' };
      case 'pending':
      case 'pending_approval':
        return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Annulé', icon: 'close-circle' };
      case 'rejected':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Refusé', icon: 'close-circle' };
      case 'checked_in':
        return { color: Colors.success, bg: Colors.successLight, label: 'Validé', icon: 'checkmark-done-circle' };
      default:
        return { color: Colors.gray500, bg: Colors.gray100, label: status || 'Inconnu', icon: 'help-circle' };
    }
  };

  const getTotalPrice = (reg: Registration) => {
    if (reg.tickets && reg.tickets.length > 0) {
      return reg.tickets.reduce((sum, t) => sum + (t.total_price || 0), 0);
    }
    return 0;
  };

  const getRegistrationType = (reg: Registration): RegistrationType => {
    // Check registration_type first, then event type
    if (reg.registration_type) {
      return reg.registration_type;
    }
    const event = reg.event || reg.event_detail;
    if ((event as any)?.event_type) {
      return (event as any).event_type;
    }
    // If has tickets, it's billetterie
    if (reg.tickets && reg.tickets.length > 0) {
      return 'billetterie';
    }
    return 'inscription';
  };

  const getTicketInfo = (reg: Registration) => {
    const type = getRegistrationType(reg);

    if (type === 'billetterie' && reg.tickets && reg.tickets.length > 0) {
      const firstTicket = reg.tickets[0];
      const ticketType = typeof firstTicket.ticket_type === 'object'
        ? firstTicket.ticket_type
        : null;
      const totalQty = reg.tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
      return {
        name: ticketType?.name || firstTicket.ticket_type_name || 'Billet',
        quantity: totalQty,
        type: 'billetterie' as RegistrationType,
        icon: 'ticket-outline' as const,
      };
    }
    return {
      name: 'Inscription',
      quantity: 1,
      type: 'inscription' as RegistrationType,
      icon: 'document-text-outline' as const,
    };
  };

  const getApprovalStatusConfig = (approvalStatus?: string) => {
    switch (approvalStatus) {
      case 'pending':
        return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente de validation', icon: 'hourglass-outline' };
      case 'approved':
        return { color: Colors.success, bg: Colors.successLight, label: 'Validée', icon: 'checkmark-circle' };
      case 'rejected':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Refusée', icon: 'close-circle' };
      default:
        return null;
    }
  };

  const renderRegistration = ({ item }: { item: Registration }) => {
    const event = item.event || item.event_detail;
    const dateInfo = event?.start_date ? formatDate(event.start_date) : null;
    const statusConfig = getStatusConfig(item.status);
    const ticketInfo = getTicketInfo(item);
    const totalPrice = getTotalPrice(item);
    const isInscription = ticketInfo.type === 'inscription';
    const approvalConfig = isInscription ? getApprovalStatusConfig(item.approval_status) : null;

    // Use approval status for inscriptions if pending
    const displayStatus = isInscription && approvalConfig && item.approval_status === 'pending'
      ? approvalConfig
      : statusConfig;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (item.tickets && item.tickets.length > 0) {
            navigation.navigate('QRCode', { ticketId: item.tickets[0].id });
          } else {
            navigation.navigate('EventDetails', { eventId: (event as any)?.id || item.event as string });
          }
        }}
        activeOpacity={0.8}
      >
        {/* Image avec overlay gradient */}
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: (event as any)?.banner_image || (event as any)?.display_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400' }}
            style={styles.cardImage}
          />
          <View style={styles.cardImageOverlay} />

          {/* Type badge en haut à gauche */}
          <View style={[
            styles.cardTypeBadge,
            isInscription ? styles.cardTypeBadgeInscription : styles.cardTypeBadgeBillet,
          ]}>
            <Ionicons
              name={isInscription ? 'document-text' : 'ticket'}
              size={12}
              color={Colors.white}
            />
            <Text style={styles.cardTypeBadgeText}>
              {isInscription ? 'Inscription' : 'Billet'}
            </Text>
          </View>

          {/* Date en haut à droite */}
          <View style={styles.cardDateBadge}>
            <Text style={styles.cardDateDay}>{dateInfo?.day || '--'}</Text>
            <Text style={styles.cardDateMonth}>{dateInfo?.month || '---'}</Text>
          </View>
        </View>

        {/* Contenu de la carte */}
        <View style={styles.cardContent}>
          {/* Titre et lieu */}
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {(event as any)?.title || 'Événement'}
            </Text>

            <View style={styles.cardMeta}>
              {(event as any)?.location_city && (
                <View style={styles.cardMetaItem}>
                  <Ionicons name="location" size={14} color={Colors.gray400} />
                  <Text style={styles.cardMetaText}>{(event as any).location_city}</Text>
                </View>
              )}
              {dateInfo && (
                <View style={styles.cardMetaItem}>
                  <Ionicons name="time" size={14} color={Colors.gray400} />
                  <Text style={styles.cardMetaText}>{dateInfo.time}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Séparateur avec effet ticket */}
          <View style={styles.cardDivider}>
            <View style={styles.cardDividerCircleLeft} />
            <View style={styles.cardDividerLine} />
            <View style={styles.cardDividerCircleRight} />
          </View>

          {/* Footer avec statut et QR */}
          <View style={styles.cardFooter}>
            <View style={styles.cardFooterLeft}>
              <View style={[styles.cardStatusBadge, { backgroundColor: displayStatus.bg }]}>
                <Ionicons name={displayStatus.icon as any} size={14} color={displayStatus.color} />
                <Text style={[styles.cardStatusText, { color: displayStatus.color }]}>
                  {displayStatus.label}
                </Text>
              </View>
              {ticketInfo.quantity > 1 && (
                <Text style={styles.cardQuantity}>×{ticketInfo.quantity}</Text>
              )}
            </View>

            <View style={styles.cardFooterRight}>
              {totalPrice > 0 && (
                <Text style={styles.cardPrice}>{totalPrice.toLocaleString()} F</Text>
              )}
              <View style={[
                styles.cardQrButton,
                isInscription && styles.cardQrButtonInscription,
              ]}>
                <Ionicons name="qr-code" size={20} color={Colors.white} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={activeTab === 'cancelled' ? 'close-circle-outline' : 'calendar-outline'}
          size={48}
          color={Colors.gray300}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' && 'Aucun billet ou inscription à venir'}
        {activeTab === 'past' && 'Aucun billet ou inscription passé'}
        {activeTab === 'cancelled' && 'Aucune annulation'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming'
          ? 'Explorez les événements et inscrivez-vous ou achetez vos premiers billets !'
          : 'Les billets et inscriptions correspondants apparaîtront ici.'}
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyButtonText}>Explorer les événements</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );

  const TabButton = ({ tab, label, count }: { tab: TabType; label: string; count: number }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Billets & Inscriptions</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          tab="upcoming"
          label="À venir"
          count={filterRegistrations('upcoming').length}
        />
        <TabButton
          tab="past"
          label="Passés"
          count={filterRegistrations('past').length}
        />
        <TabButton
          tab="cancelled"
          label="Annulés"
          count={filterRegistrations('cancelled').length}
        />
      </View>

      {/* Tickets List */}
      <FlatList
        data={filteredRegistrations}
        renderItem={renderRegistration}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...TextStyles.h2,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    gap: Spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  tabButtonTextActive: {
    color: Colors.white,
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
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray600,
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 120,
  },

  // Card styles
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardImageContainer: {
    height: 120,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardTypeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cardTypeBadgeBillet: {
    backgroundColor: Colors.primary,
  },
  cardTypeBadgeInscription: {
    backgroundColor: Colors.secondary || '#8B5CF6',
  },
  cardTypeBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  cardDateBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 44,
  },
  cardDateDay: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    lineHeight: 22,
  },
  cardDateMonth: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray500,
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardMain: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontFamily: FontFamily.regular,
  },
  // Divider effet ticket
  cardDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  cardDividerCircleLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
    marginLeft: -Spacing.md - 8,
  },
  cardDividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginHorizontal: Spacing.xs,
  },
  cardDividerCircleRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
    marginRight: -Spacing.md - 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  cardStatusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
  cardQuantity: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray500,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardPrice: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray700,
  },
  cardQrButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardQrButtonInscription: {
    backgroundColor: Colors.secondary || '#8B5CF6',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h4,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    ...TextStyles.button,
  },
});
