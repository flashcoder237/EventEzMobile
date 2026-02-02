import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { registrationsAPI } from '../../api/client';
import { Registration, RootStackParamList, Event } from '../../types';
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
type FilterType = 'all' | 'billetterie' | 'inscription';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MyTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await registrationsAPI.getMyRegistrations();
      const data = response.data?.results || response.data || [];
      // Debug: log data structure
      if (__DEV__ && data.length > 0) {
        console.log('[MyTickets] Sample registration:', JSON.stringify(data[0], null, 2));
      }
      setRegistrations(data);
    } catch (error) {
      console.error('Erreur chargement inscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get event data from registration
  const getEventData = useCallback((reg: Registration): Partial<Event> | null => {
    // event_detail contains the full event object from the API
    if (reg.event_detail && typeof reg.event_detail === 'object') {
      return reg.event_detail;
    }
    // event might be a full object or just an ID
    if (reg.event && typeof reg.event === 'object') {
      return reg.event as Event;
    }
    return null;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegistrations();
    setRefreshing(false);
  };

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

  const getRegistrationType = useCallback((reg: Registration): RegistrationType => {
    // Check registration_type first, then event type
    if (reg.registration_type) {
      return reg.registration_type;
    }
    const event = getEventData(reg);
    if (event?.event_type) {
      return event.event_type;
    }
    // If has tickets, it's billetterie
    if (reg.tickets && reg.tickets.length > 0) {
      return 'billetterie';
    }
    return 'inscription';
  }, [getEventData]);

  const filterRegistrations = useCallback((tab: TabType, type: FilterType) => {
    const now = new Date();
    return registrations.filter((reg) => {
      const event = getEventData(reg);
      const eventDate = event?.start_date ? new Date(event.start_date) : null;
      const isCancelled = reg.status === 'cancelled' || reg.status === 'rejected';
      const isPendingApproval = reg.approval_status === 'pending' || reg.status === 'pending_approval';

      // Filter by type
      if (type !== 'all') {
        const regType = getRegistrationType(reg);
        if (regType !== type) return false;
      }

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
  }, [registrations, getEventData, getRegistrationType]);

  const filteredRegistrations = useMemo(() =>
    filterRegistrations(activeTab, typeFilter),
    [filterRegistrations, activeTab, typeFilter]
  );

  // Count by type for filter badges
  const typeCounts = useMemo(() => {
    const tabRegistrations = filterRegistrations(activeTab, 'all');
    return {
      all: tabRegistrations.length,
      billetterie: tabRegistrations.filter(r => getRegistrationType(r) === 'billetterie').length,
      inscription: tabRegistrations.filter(r => getRegistrationType(r) === 'inscription').length,
    };
  }, [filterRegistrations, activeTab, getRegistrationType]);

  const getTotalPrice = (reg: Registration) => {
    if (reg.tickets && reg.tickets.length > 0) {
      return reg.tickets.reduce((sum, t) => sum + (t.total_price || 0), 0);
    }
    return 0;
  };

  const getTicketInfo = useCallback((reg: Registration) => {
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
  }, [getRegistrationType]);

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
    const event = getEventData(item);
    const dateInfo = event?.start_date ? formatDate(event.start_date) : null;
    const statusConfig = getStatusConfig(item.status);
    const ticketInfo = getTicketInfo(item);
    const isInscription = ticketInfo.type === 'inscription';
    const approvalConfig = isInscription ? getApprovalStatusConfig(item.approval_status) : null;

    const displayStatus = isInscription && approvalConfig && item.approval_status === 'pending'
      ? approvalConfig
      : statusConfig;

    // Get event ID - handle both object and string cases
    const eventId = event?.id || (typeof item.event === 'string' ? item.event : undefined);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          // For billetterie with tickets, go to QRCode screen
          if (item.tickets && item.tickets.length > 0) {
            navigation.navigate('QRCode', { ticketId: item.tickets[0].id });
          } else {
            // For inscriptions, go to RegistrationDetails screen
            navigation.navigate('RegistrationDetails', { registrationId: item.id });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          {/* Date badge à gauche */}
          <View style={[
            styles.dateBadge,
            isInscription && styles.dateBadgeInscription,
          ]}>
            <Text style={styles.dateDay}>{dateInfo?.day || '--'}</Text>
            <Text style={styles.dateMonth}>{dateInfo?.month || '---'}</Text>
          </View>

          {/* Contenu principal */}
          <View style={styles.cardContent}>
            {/* Type + Titre */}
            <View style={styles.cardHeader}>
              <View style={[
                styles.typeBadge,
                isInscription ? styles.typeBadgeInscription : styles.typeBadgeBillet,
              ]}>
                <Ionicons
                  name={isInscription ? 'document-text' : 'ticket'}
                  size={10}
                  color={isInscription ? '#8B5CF6' : Colors.primary}
                />
                <Text style={[
                  styles.typeBadgeText,
                  isInscription ? styles.typeBadgeTextInscription : styles.typeBadgeTextBillet,
                ]}>
                  {isInscription ? 'Inscription' : 'Billet'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: displayStatus.bg }]}>
                <Ionicons name={displayStatus.icon as any} size={12} color={displayStatus.color} />
                <Text style={[styles.statusText, { color: displayStatus.color }]}>
                  {displayStatus.label}
                </Text>
              </View>
            </View>

            {/* Titre */}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {event?.title || 'Événement'}
            </Text>

            {/* Métadonnées */}
            <View style={styles.cardMeta}>
              {dateInfo && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={Colors.gray400} />
                  <Text style={styles.metaText}>{dateInfo.time}</Text>
                </View>
              )}
              {event?.location_city && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={Colors.gray400} />
                  <Text style={styles.metaText}>{event.location_city}</Text>
                </View>
              )}
              {item.reference_code && (
                <View style={styles.refCodeBadge}>
                  <Text style={styles.refCodeText}>#{item.reference_code}</Text>
                </View>
              )}
            </View>
          </View>

          {/* QR Button à droite */}
          <TouchableOpacity
            style={[
              styles.qrButton,
              isInscription && styles.qrButtonInscription,
            ]}
            onPress={() => {
              if (item.tickets && item.tickets.length > 0) {
                navigation.navigate('QRCode', { ticketId: item.tickets[0].id });
              } else {
                navigation.navigate('RegistrationDetails', { registrationId: item.id });
              }
            }}
          >
            <Ionicons name="qr-code" size={20} color={Colors.white} />
          </TouchableOpacity>
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
          count={filterRegistrations('upcoming', 'all').length}
        />
        <TabButton
          tab="past"
          label="Passés"
          count={filterRegistrations('past', 'all').length}
        />
        <TabButton
          tab="cancelled"
          label="Annulés"
          count={filterRegistrations('cancelled', 'all').length}
        />
      </View>

      {/* Type Filters */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setTypeFilter('all')}
          >
            <Ionicons
              name="apps"
              size={14}
              color={typeFilter === 'all' ? Colors.white : Colors.gray500}
            />
            <Text style={[
              styles.filterChipText,
              typeFilter === 'all' && styles.filterChipTextActive,
            ]}>
              Tous ({typeCounts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              typeFilter === 'billetterie' && styles.filterChipActiveBillet,
            ]}
            onPress={() => setTypeFilter('billetterie')}
          >
            <Ionicons
              name="ticket"
              size={14}
              color={typeFilter === 'billetterie' ? Colors.white : Colors.primary}
            />
            <Text style={[
              styles.filterChipText,
              typeFilter === 'billetterie' && styles.filterChipTextActive,
              typeFilter !== 'billetterie' && { color: Colors.primary },
            ]}>
              Billets ({typeCounts.billetterie})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              typeFilter === 'inscription' && styles.filterChipActiveInscription,
            ]}
            onPress={() => setTypeFilter('inscription')}
          >
            <Ionicons
              name="document-text"
              size={14}
              color={typeFilter === 'inscription' ? Colors.white : '#8B5CF6'}
            />
            <Text style={[
              styles.filterChipText,
              typeFilter === 'inscription' && styles.filterChipTextActive,
              typeFilter !== 'inscription' && { color: '#8B5CF6' },
            ]}>
              Inscriptions ({typeCounts.inscription})
            </Text>
          </TouchableOpacity>
        </ScrollView>
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

  // Filters
  filterContainer: {
    paddingBottom: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.gray700,
    borderColor: Colors.gray700,
  },
  filterChipActiveBillet: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipActiveInscription: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  filterChipTextActive: {
    color: Colors.white,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 120,
  },

  // Card styles - Simple list design
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Date badge
  dateBadge: {
    width: 56,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  dateBadgeInscription: {
    backgroundColor: '#8B5CF6',
  },
  dateDay: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  // Card content
  cardContent: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  // Type badge
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeBillet: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  typeBadgeInscription: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
  },
  typeBadgeTextBillet: {
    color: Colors.primary,
  },
  typeBadgeTextInscription: {
    color: '#8B5CF6',
  },
  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
  },
  // Title
  cardTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  // Meta
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    fontFamily: FontFamily.regular,
  },
  refCodeBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  refCodeText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  // QR Button
  qrButton: {
    width: 44,
    height: '100%',
    minHeight: 70,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  qrButtonInscription: {
    backgroundColor: '#8B5CF6',
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
