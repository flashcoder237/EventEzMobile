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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ticketPurchasesAPI } from '../../api/client';
import { TicketPurchase, RootStackParamList } from '../../types';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

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
      activeOpacity={0.9}
    >
      <View style={styles.ticketLeft}>
        <Image
          source={{ uri: item.event?.banner_image || 'https://via.placeholder.com/100' }}
          style={styles.ticketImage}
        />
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.ticketBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.ticketBadgeText}>×{item.quantity}</Text>
        </LinearGradient>
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
      <LinearGradient
        colors={[Colors.primaryBg, Colors.white]}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="ticket-outline" size={60} color={Colors.primary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Aucun billet</Text>
      <Text style={styles.emptyText}>
        Vous n'avez pas encore acheté de billets.{'\n'}
        Explorez les événements pour commencer !
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
      >
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.emptyButtonText}>Explorer les événements</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
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
  },
  ticketBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  ticketInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  ticketTitle: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.gray900,
  },
  ticketType: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
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
    fontWeight: '600',
  },
  ticketPrice: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
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
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.violet,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
  },
  emptyButtonText: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.white,
  },
});
