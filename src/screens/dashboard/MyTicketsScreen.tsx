import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ticketPurchasesAPI } from '../../api/client';
import { TicketPurchase, RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyTicketsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'cancelled':
      case 'refunded':
        return Colors.error;
      default:
        return Colors.gray500;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      case 'refunded':
        return 'Remboursé';
      default:
        return status;
    }
  };

  const renderTicket = ({ item }: { item: TicketPurchase }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => navigation.navigate('QRCode', { ticketId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.ticketLeft}>
        <Image
          source={{ uri: item.event?.banner_image || 'https://via.placeholder.com/100' }}
          style={styles.ticketImage}
        />
        <View style={styles.ticketBadge}>
          <Text style={styles.ticketBadgeText}>×{item.quantity}</Text>
        </View>
      </View>

      <View style={styles.ticketInfo}>
        <Text style={styles.ticketTitle} numberOfLines={2}>
          {item.event?.title || 'Événement'}
        </Text>
        <Text style={styles.ticketType}>{item.ticket_type?.name}</Text>

        <View style={styles.ticketMeta}>
          <View style={styles.ticketMetaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gray500} />
            <Text style={styles.ticketMetaText}>
              {item.event?.start_date ? formatDate(item.event.start_date) : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.ticketFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={styles.ticketPrice}>
            {item.total_price?.toLocaleString()} FCFA
          </Text>
        </View>
      </View>

      <View style={styles.ticketRight}>
        <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="ticket-outline" size={48} color={Colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Aucun billet</Text>
      <Text style={styles.emptyText}>
        Vous n'avez pas encore acheté de billets.{'\n'}
        Explorez les événements pour commencer !
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Explorer les événements</Text>
        <Ionicons name="arrow-forward" size={18} color={Colors.white} />
      </TouchableOpacity>
    </View>
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
        <Text style={styles.headerSubtitle}>
          {tickets.length} billet{tickets.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Tickets List */}
      <FlatList
        data={tickets}
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
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  ticketLeft: {
    position: 'relative',
  },
  ticketImage: {
    width: 100,
    height: 120,
  },
  ticketBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray900,
  },
  ticketBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  ticketInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  ticketTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  ticketType: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginTop: Spacing.xs,
  },
  ticketMeta: {
    marginTop: Spacing.xs,
  },
  ticketMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  ticketPrice: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  ticketRight: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: Colors.gray100,
    borderStyle: 'dashed',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
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
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.base,
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
    borderRadius: BorderRadius.lg,
  },
  emptyButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
