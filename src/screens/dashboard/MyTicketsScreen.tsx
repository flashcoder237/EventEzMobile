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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExportButton from '../../components/common/ExportButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { registrationsAPI } from '../../api/client';
import { Searching, Empty } from '../../components/illustrations';
import { Registration, RootStackParamList, Event } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../../components/ui/Badge';
import { SkeletonList, TicketCardSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem, ContentTransition } from '../../components/ui/Animations';
import { useTabletLayout } from '../../hooks/useTabletLayout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabType = 'upcoming' | 'past' | 'cancelled';
type RegistrationType = 'billetterie' | 'inscription';
type FilterType = 'all' | 'billetterie' | 'inscription';
type StatusFilterType = 'all' | 'confirmed' | 'pending' | 'checked_in';
type SortType = 'registration_date' | 'event_date' | 'name';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MyTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { isTablet, columns, padding: containerPadding, cardGap } = useTabletLayout();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  // Nouveaux filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('event_date');
  const [showFilters, setShowFilters] = useState(false);

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

  // Format date d'inscription de maniere lisible
  const formatRegistrationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadgeVariant = (status: string): { variant: 'success' | 'warning' | 'destructive' | 'info' | 'secondary'; label: string } => {
    switch (status) {
      case 'confirmed':
        return { variant: 'success', label: 'Confirme' };
      case 'completed':
        return { variant: 'info', label: 'Termine' };
      case 'pending':
      case 'pending_approval':
        return { variant: 'warning', label: 'En attente' };
      case 'cancelled':
        return { variant: 'destructive', label: 'Annule' };
      case 'rejected':
        return { variant: 'destructive', label: 'Refuse' };
      case 'checked_in':
        return { variant: 'success', label: 'Enregistre' };
      default:
        return { variant: 'secondary', label: status || 'Inconnu' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return { color: colors.success, bg: colors.successLight, label: 'Confirme', icon: 'checkmark-circle' };
      case 'pending':
      case 'pending_approval':
        return { color: colors.warning, bg: colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: colors.error, bg: colors.errorLight, label: 'Annule', icon: 'close-circle' };
      case 'rejected':
        return { color: colors.error, bg: colors.errorLight, label: 'Refuse', icon: 'close-circle' };
      case 'checked_in':
        return { color: colors.success, bg: colors.successLight, label: 'Valide', icon: 'checkmark-done-circle' };
      default:
        return { color: colors.gray500, bg: colors.gray100, label: status || 'Inconnu', icon: 'help-circle' };
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

  const filterRegistrations = useCallback((tab: TabType, type: FilterType, status: StatusFilterType, search: string) => {
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

      // Filter by status
      if (status !== 'all') {
        if (status === 'confirmed' && reg.status !== 'confirmed' && reg.status !== 'completed') return false;
        if (status === 'pending' && reg.status !== 'pending' && reg.status !== 'pending_approval') return false;
        if (status === 'checked_in' && reg.status !== 'checked_in') return false;
      }

      // Filter by search query
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const eventTitle = (event?.title || '').toLowerCase();
        const refCode = (reg.reference_code || '').toLowerCase();
        const location = (event?.location_city || '').toLowerCase();
        if (!eventTitle.includes(searchLower) && !refCode.includes(searchLower) && !location.includes(searchLower)) {
          return false;
        }
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

  // Fonction de tri
  const sortRegistrations = useCallback((regs: Registration[], sort: SortType) => {
    return [...regs].sort((a, b) => {
      const eventA = getEventData(a);
      const eventB = getEventData(b);

      switch (sort) {
        case 'registration_date':
          // Plus recent en premier
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'event_date':
          // Plus proche en premier
          const dateA = eventA?.start_date ? new Date(eventA.start_date).getTime() : Infinity;
          const dateB = eventB?.start_date ? new Date(eventB.start_date).getTime() : Infinity;
          return dateA - dateB;
        case 'name':
          // Alphabetique
          return (eventA?.title || '').localeCompare(eventB?.title || '');
        default:
          return 0;
      }
    });
  }, [getEventData]);

  const filteredRegistrations = useMemo(() => {
    const filtered = filterRegistrations(activeTab, typeFilter, statusFilter, searchQuery);
    return sortRegistrations(filtered, sortBy);
  }, [filterRegistrations, sortRegistrations, activeTab, typeFilter, statusFilter, searchQuery, sortBy]);

  // Count by type for filter badges
  const typeCounts = useMemo(() => {
    const tabRegistrations = filterRegistrations(activeTab, 'all', 'all', '');
    return {
      all: tabRegistrations.length,
      billetterie: tabRegistrations.filter(r => getRegistrationType(r) === 'billetterie').length,
      inscription: tabRegistrations.filter(r => getRegistrationType(r) === 'inscription').length,
    };
  }, [filterRegistrations, activeTab, getRegistrationType]);

  // Count by status for status filter badges
  const statusCounts = useMemo(() => {
    const tabRegistrations = filterRegistrations(activeTab, typeFilter, 'all', searchQuery);
    return {
      all: tabRegistrations.length,
      confirmed: tabRegistrations.filter(r => r.status === 'confirmed' || r.status === 'completed').length,
      pending: tabRegistrations.filter(r => r.status === 'pending' || r.status === 'pending_approval').length,
      checked_in: tabRegistrations.filter(r => r.status === 'checked_in').length,
    };
  }, [filterRegistrations, activeTab, typeFilter, searchQuery]);

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

  const getApprovalBadgeVariant = (approvalStatus?: string): { variant: 'warning' | 'success' | 'destructive'; label: string } | null => {
    switch (approvalStatus) {
      case 'pending':
        return { variant: 'warning', label: 'En attente de validation' };
      case 'approved':
        return { variant: 'success', label: 'Validee' };
      case 'rejected':
        return { variant: 'destructive', label: 'Refusee' };
      default:
        return null;
    }
  };

  const renderRegistration = ({ item, index }: { item: Registration; index: number }) => {
    const event = getEventData(item);
    const dateInfo = event?.start_date ? formatDate(event.start_date) : null;
    const ticketInfo = getTicketInfo(item);
    const isInscription = ticketInfo.type === 'inscription';
    const approvalBadge = isInscription ? getApprovalBadgeVariant(item.approval_status) : null;

    // Determine which badge to show
    const displayBadge = isInscription && approvalBadge && item.approval_status === 'pending'
      ? approvalBadge
      : getStatusBadgeVariant(item.status);

    // Get event ID - handle both object and string cases
    const eventId = event?.id || (typeof item.event === 'string' ? item.event : undefined);

    const inscriptionColor = isDark ? '#A78BFA' : '#8B5CF6';

    return (
      <StaggeredItem index={index} staggerDelay={50}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          // Navigate to RegistrationDetails to see all tickets/inscription details
          navigation.navigate('RegistrationDetails', { registrationId: item.id });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          {/* Date badge a gauche */}
          <View style={[
            styles.dateBadge,
            { backgroundColor: isInscription ? inscriptionColor : colors.primary },
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
                isInscription
                  ? { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(139, 92, 246, 0.1)' }
                  : { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.1)' },
              ]}>
                <Ionicons
                  name={isInscription ? 'document-text' : 'ticket'}
                  size={10}
                  color={isInscription ? inscriptionColor : colors.primary}
                />
                <Text style={[
                  styles.typeBadgeText,
                  { color: isInscription ? inscriptionColor : colors.primary },
                ]}>
                  {isInscription
                    ? 'Inscription'
                    : `${ticketInfo.quantity} Billet${ticketInfo.quantity > 1 ? 's' : ''}`}
                </Text>
              </View>
              <Badge
                label={displayBadge.label}
                variant={displayBadge.variant}
                size="sm"
              />
            </View>

            {/* Titre */}
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {event?.title || 'Evenement'}
            </Text>

            {/* Metadonnees */}
            <View style={styles.cardMeta}>
              {dateInfo && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.gray400} />
                  <Text style={[styles.metaText, { color: colors.gray500 }]}>{dateInfo.time}</Text>
                </View>
              )}
              {event?.location_city && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.gray400} />
                  <Text style={[styles.metaText, { color: colors.gray500 }]}>{event.location_city}</Text>
                </View>
              )}
              {item.reference_code && (
                <View style={[styles.refCodeBadge, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.refCodeText, { color: colors.gray500 }]}>#{item.reference_code}</Text>
                </View>
              )}
            </View>

            {/* Date d'inscription */}
            {item.created_at && (
              <View style={styles.registrationDateContainer}>
                <Ionicons name="calendar-outline" size={10} color={colors.gray400} />
                <Text style={[styles.registrationDateText, { color: colors.gray400 }]}>
                  Inscrit {formatRegistrationDate(item.created_at)}
                </Text>
              </View>
            )}
          </View>

          {/* QR/View Button a droite */}
          <TouchableOpacity
            style={[
              styles.qrButton,
              { backgroundColor: isInscription ? inscriptionColor : colors.primary },
            ]}
            onPress={() => {
              // Navigate to RegistrationDetails to see all tickets/details
              navigation.navigate('RegistrationDetails', { registrationId: item.id });
            }}
          >
            <Ionicons name={isInscription ? "document-text" : "ticket"} size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {activeTab === 'cancelled' ? (
        <Empty color={colors.primary} size={160} />
      ) : (
        <Searching color={colors.primary} size={160} />
      )}
      <Text style={[styles.emptyTitle, { color: colors.gray700 }]}>
        {activeTab === 'upcoming' && 'Aucun billet ou inscription a venir'}
        {activeTab === 'past' && 'Aucun billet ou inscription passe'}
        {activeTab === 'cancelled' && 'Aucune annulation'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {activeTab === 'upcoming'
          ? 'Explorez les evenements et inscrivez-vous ou achetez vos premiers billets !'
          : 'Les billets et inscriptions correspondants apparaitront ici.'}
      </Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' } as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyButtonText}>Explorer les evenements</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );

  const TabButton = ({ tab, label, count }: { tab: TabType; label: string; count: number }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { backgroundColor: activeTab === tab ? colors.primary : colors.gray100 },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === tab ? Colors.white : colors.gray600 },
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.tabBadge,
          { backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : colors.gray200 },
        ]}>
          <Text style={[
            styles.tabBadgeText,
            { color: activeTab === tab ? Colors.white : colors.gray600 },
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.loadingContainer}>
          <SkeletonList count={4} Component={TicketCardSkeleton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes Billets & Inscriptions</Text>
        <View style={styles.headerActions}>
          {/* Export Button */}
          <ExportButton
            endpoint="/registrations/export/"
            filename="mes-billets"
            compact
          />
          {/* Offline Tickets Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('OfflineTickets')}
          >
            <Ionicons name="cloud-offline-outline" size={22} color={colors.gray600} />
          </TouchableOpacity>
          {/* Pending Transfers Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('PendingTransfers')}
          >
            <Ionicons name="gift-outline" size={22} color={colors.gray600} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterToggleButton, { backgroundColor: colors.gray100 }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name={showFilters ? 'options' : 'options-outline'}
              size={22}
              color={showFilters ? colors.primary : colors.gray600}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <Ionicons name="search" size={18} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher par evenement, reference..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          tab="upcoming"
          label="A venir"
          count={filterRegistrations('upcoming', 'all', 'all', '').length}
        />
        <TabButton
          tab="past"
          label="Passes"
          count={filterRegistrations('past', 'all', 'all', '').length}
        />
        <TabButton
          tab="cancelled"
          label="Annules"
          count={filterRegistrations('cancelled', 'all', 'all', '').length}
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
            style={[
              styles.filterChip,
              { backgroundColor: colors.gray50, borderColor: colors.gray200 },
              typeFilter === 'all' && { backgroundColor: colors.gray700, borderColor: colors.gray700 },
            ]}
            onPress={() => setTypeFilter('all')}
          >
            <Ionicons
              name="apps"
              size={14}
              color={typeFilter === 'all' ? Colors.white : colors.gray500}
            />
            <Text style={[
              styles.filterChipText,
              { color: typeFilter === 'all' ? Colors.white : colors.gray600 },
            ]}>
              Tous ({typeCounts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.gray50, borderColor: colors.gray200 },
              typeFilter === 'billetterie' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setTypeFilter('billetterie')}
          >
            <Ionicons
              name="ticket"
              size={14}
              color={typeFilter === 'billetterie' ? Colors.white : colors.primary}
            />
            <Text style={[
              styles.filterChipText,
              { color: typeFilter === 'billetterie' ? Colors.white : colors.primary },
            ]}>
              Billets ({typeCounts.billetterie})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: colors.gray50, borderColor: colors.gray200 },
              typeFilter === 'inscription' && { backgroundColor: isDark ? '#A78BFA' : '#8B5CF6', borderColor: isDark ? '#A78BFA' : '#8B5CF6' },
            ]}
            onPress={() => setTypeFilter('inscription')}
          >
            <Ionicons
              name="document-text"
              size={14}
              color={typeFilter === 'inscription' ? Colors.white : (isDark ? '#A78BFA' : '#8B5CF6')}
            />
            <Text style={[
              styles.filterChipText,
              { color: typeFilter === 'inscription' ? Colors.white : (isDark ? '#A78BFA' : '#8B5CF6') },
            ]}>
              Inscriptions ({typeCounts.inscription})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Filtres avances (visibles si showFilters = true) */}
      {showFilters && (
        <View style={[styles.advancedFiltersContainer, { backgroundColor: colors.gray50 }]}>
          {/* Filtre par statut */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.gray500 }]}>Statut</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    { backgroundColor: colors.card, borderColor: colors.gray200 },
                    statusFilter === 'all' && { backgroundColor: colors.gray700, borderColor: colors.gray700 },
                  ]}
                  onPress={() => setStatusFilter('all')}
                >
                  <Text style={[
                    styles.statusChipText,
                    { color: statusFilter === 'all' ? Colors.white : colors.gray600 },
                  ]}>
                    Tous ({statusCounts.all})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    { backgroundColor: colors.card, borderColor: colors.gray200 },
                    statusFilter === 'confirmed' && { backgroundColor: colors.success, borderColor: colors.success },
                  ]}
                  onPress={() => setStatusFilter('confirmed')}
                >
                  <Ionicons name="checkmark-circle" size={12} color={statusFilter === 'confirmed' ? Colors.white : colors.success} />
                  <Text style={[
                    styles.statusChipText,
                    { color: statusFilter === 'confirmed' ? Colors.white : colors.success },
                  ]}>
                    Confirmes ({statusCounts.confirmed})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    { backgroundColor: colors.card, borderColor: colors.gray200 },
                    statusFilter === 'pending' && { backgroundColor: colors.warning, borderColor: colors.warning },
                  ]}
                  onPress={() => setStatusFilter('pending')}
                >
                  <Ionicons name="time" size={12} color={statusFilter === 'pending' ? Colors.white : colors.warning} />
                  <Text style={[
                    styles.statusChipText,
                    { color: statusFilter === 'pending' ? Colors.white : colors.warning },
                  ]}>
                    En attente ({statusCounts.pending})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    { backgroundColor: colors.card, borderColor: colors.gray200 },
                    statusFilter === 'checked_in' && { backgroundColor: colors.success, borderColor: colors.success },
                  ]}
                  onPress={() => setStatusFilter('checked_in')}
                >
                  <Ionicons name="checkmark-done-circle" size={12} color={statusFilter === 'checked_in' ? Colors.white : colors.success} />
                  <Text style={[
                    styles.statusChipText,
                    { color: statusFilter === 'checked_in' ? Colors.white : colors.success },
                  ]}>
                    Valides ({statusCounts.checked_in})
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Tri */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.gray500 }]}>Trier par</Text>
            <View style={styles.filterChipsRow}>
              <TouchableOpacity
                style={[
                  styles.sortChip,
                  { backgroundColor: colors.card, borderColor: colors.gray200 },
                  sortBy === 'event_date' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSortBy('event_date')}
              >
                <Ionicons name="calendar" size={12} color={sortBy === 'event_date' ? Colors.white : colors.gray600} />
                <Text style={[
                  styles.sortChipText,
                  { color: sortBy === 'event_date' ? Colors.white : colors.gray600 },
                ]}>
                  Date evenement
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortChip,
                  { backgroundColor: colors.card, borderColor: colors.gray200 },
                  sortBy === 'registration_date' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSortBy('registration_date')}
              >
                <Ionicons name="time" size={12} color={sortBy === 'registration_date' ? Colors.white : colors.gray600} />
                <Text style={[
                  styles.sortChipText,
                  { color: sortBy === 'registration_date' ? Colors.white : colors.gray600 },
                ]}>
                  Date inscription
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortChip,
                  { backgroundColor: colors.card, borderColor: colors.gray200 },
                  sortBy === 'name' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSortBy('name')}
              >
                <Ionicons name="text" size={12} color={sortBy === 'name' ? Colors.white : colors.gray600} />
                <Text style={[
                  styles.sortChipText,
                  { color: sortBy === 'name' ? Colors.white : colors.gray600 },
                ]}>
                  Nom A-Z
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Tickets List */}
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: cardGap } : undefined}
        data={filteredRegistrations}
        renderItem={({ item, index }) => (
          <View style={columns > 1 ? { flex: 1 } : undefined}>
            {renderRegistration({ item, index })}
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: containerPadding }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...TextStyles.h2,
    flex: 1,
  },
  filterToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    ...TextStyles.small,
    flex: 1,
    paddingVertical: 0,
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
    gap: Spacing.xs,
  },
  tabButtonText: {
    ...TextStyles.label,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.displayBold,
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
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
  },

  // Advanced Filters
  advancedFiltersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  filterSection: {
    gap: Spacing.xs,
  },
  filterSectionTitle: {
    ...TextStyles.eyebrow,
    color: undefined,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },

  // Status chips
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusChipText: {
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
  },

  // Sort chips
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  sortChipText: {
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 130,
  },

  // Card styles - Simple list design
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Date badge
  dateBadge: {
    width: 56,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
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
  typeBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
  },
  // Title
  cardTitle: {
    ...TextStyles.smallBold,
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
    ...TextStyles.caption,
  },
  refCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  refCodeText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
  },
  // Registration date
  registrationDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  registrationDateText: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
  },
  // QR Button
  qrButton: {
    width: 44,
    height: '100%',
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  emptyButtonText: {
    ...TextStyles.button,
  },
});
