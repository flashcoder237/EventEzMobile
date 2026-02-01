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
import { ticketPurchasesAPI } from '../../api/client';
import { TicketPurchase, RootStackParamList } from '../../types';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MyTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await ticketPurchasesAPI.getMyTickets();
      setTickets(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement billets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  const filterTickets = useCallback((tab: TabType) => {
    const now = new Date();
    return tickets.filter((ticket) => {
      const eventDate = ticket.event?.start_date ? new Date(ticket.event.start_date) : null;
      const isCancelled = ticket.status === 'cancelled' || ticket.status === 'refunded';

      switch (tab) {
        case 'upcoming':
          return !isCancelled && eventDate && eventDate >= now;
        case 'past':
          return !isCancelled && eventDate && eventDate < now;
        case 'cancelled':
          return isCancelled;
        default:
          return true;
      }
    });
  }, [tickets]);

  const filteredTickets = filterTickets(activeTab);

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
        return { color: Colors.success, bg: Colors.successLight, label: 'Confirmé', icon: 'checkmark-circle' };
      case 'pending':
        return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Annulé', icon: 'close-circle' };
      case 'refunded':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Remboursé', icon: 'refresh-circle' };
      default:
        return { color: Colors.gray500, bg: Colors.gray100, label: status, icon: 'help-circle' };
    }
  };

  const renderTicket = ({ item }: { item: TicketPurchase }) => {
    const dateInfo = item.event?.start_date ? formatDate(item.event.start_date) : null;
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('QRCode', { ticketId: item.id })}
        activeOpacity={0.7}
      >
        {/* Date Badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{dateInfo?.day || '--'}</Text>
          <Text style={styles.dateMonth}>{dateInfo?.month || '---'}</Text>
        </View>

        {/* Ticket Content */}
        <View style={styles.ticketContent}>
          {/* Event Image */}
          <Image
            source={{ uri: item.event?.banner_image || item.event?.display_image || 'https://via.placeholder.com/80' }}
            style={styles.eventImage}
          />

          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {item.event?.title || 'Événement'}
            </Text>

            <View style={styles.ticketTypeRow}>
              <Ionicons name="ticket-outline" size={14} color={Colors.primary} />
              <Text style={styles.ticketTypeName}>{item.ticket_type?.name || 'Billet'}</Text>
              <Text style={styles.ticketQuantity}>×{item.quantity}</Text>
            </View>

            <View style={styles.eventMeta}>
              {item.event?.location_city && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={Colors.gray400} />
                  <Text style={styles.metaText}>{item.event.location_city}</Text>
                </View>
              )}
              {dateInfo && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={Colors.gray400} />
                  <Text style={styles.metaText}>{dateInfo.time}</Text>
                </View>
              )}
            </View>

            <View style={styles.ticketFooter}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <Text style={styles.ticketPrice}>
                {item.total_price?.toLocaleString() || 0} FCFA
              </Text>
            </View>
          </View>

          {/* QR Icon */}
          <View style={styles.qrButton}>
            <Ionicons name="qr-code" size={22} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={activeTab === 'cancelled' ? 'close-circle-outline' : 'ticket-outline'}
          size={48}
          color={Colors.gray300}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' && 'Aucun billet à venir'}
        {activeTab === 'past' && 'Aucun billet passé'}
        {activeTab === 'cancelled' && 'Aucun billet annulé'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming'
          ? 'Explorez les événements et achetez vos premiers billets !'
          : 'Les billets correspondants apparaîtront ici.'}
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
        <Text style={styles.headerTitle}>Mes Billets</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          tab="upcoming"
          label="À venir"
          count={filterTickets('upcoming').length}
        />
        <TabButton
          tab="past"
          label="Passés"
          count={filterTickets('past').length}
        />
        <TabButton
          tab="cancelled"
          label="Annulés"
          count={filterTickets('cancelled').length}
        />
      </View>

      {/* Tickets List */}
      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
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

  // Ticket Card
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: 'hidden',
  },
  dateBadge: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  dateDay: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
  },
  dateMonth: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  ticketContent: {
    flexDirection: 'row',
    padding: Spacing.md,
  },
  eventImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  eventInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  eventTitle: {
    ...TextStyles.bodyBold,
    marginBottom: Spacing.xs,
  },
  ticketTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  ticketTypeName: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  ticketQuantity: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    fontFamily: FontFamily.semiBold,
  },
  eventMeta: {
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
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
  ticketPrice: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  qrButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: Spacing.md,
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
