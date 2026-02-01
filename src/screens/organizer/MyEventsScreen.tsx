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

import { eventsAPI } from '../../api/client';
import { Event, RootStackParamList } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      const params: Record<string, any> = { my_events: true };
      if (filter === 'published') {
        params.status = 'validated';
      } else if (filter === 'draft') {
        params.status = 'draft';
      }
      const response = await eventsAPI.getEvents(params);
      setEvents(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
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
      case 'validated':
      case 'published':
        return Colors.success;
      case 'draft':
        return Colors.gray500;
      case 'submitted':
        return Colors.warning;
      case 'rejected':
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.gray500;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Publié';
      case 'draft':
        return 'Brouillon';
      case 'submitted':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      case 'cancelled':
        return 'Annulé';
      case 'completed':
        return 'Terminé';
      default:
        return status;
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.banner_image || item.display_image || 'https://via.placeholder.com/400x200' }}
        style={styles.eventImage}
      />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => navigation.navigate('EventAnalytics', { eventId: item.id })}
          >
            <Ionicons name="stats-chart" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.eventMeta}>
          <View style={styles.eventMetaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gray500} />
            <Text style={styles.eventMetaText}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="location-outline" size={14} color={Colors.gray500} />
            <Text style={styles.eventMetaText}>
              {item.location_city || 'En ligne'}
            </Text>
          </View>
        </View>

        <View style={styles.eventStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color={Colors.gray500} />
            <Text style={styles.statValue}>
              {item.registration_count || item.registrations_count || 0}
            </Text>
            <Text style={styles.statLabel}>inscrits</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color={Colors.gray500} />
            <Text style={styles.statValue}>{item.view_count || 0}</Text>
            <Text style={styles.statLabel}>vues</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.priceValue}>
              {item.is_free ? 'Gratuit' : `${item.base_price?.toLocaleString() || 0} FCFA`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>Aucun événement</Text>
      <Text style={styles.emptyText}>
        Vous n'avez pas encore créé d'événement.{'\n'}
        Commencez à organiser !
      </Text>
      <GradientButton
        title="Créer un événement"
        onPress={() => navigation.navigate('EventCreate')}
        icon={<Ionicons name="add-circle" size={20} color={Colors.white} />}
      />
    </View>
  );

  const FilterTab = ({ label, value }: { label: string; value: typeof filter }) => (
    <TouchableOpacity
      style={[styles.filterTab, filter === value && styles.filterTabActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterTabText, filter === value && styles.filterTabTextActive]}>
        {label}
      </Text>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Événements</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('EventCreate')}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <FilterTab label="Tous" value="all" />
        <FilterTab label="Publiés" value="published" />
        <FilterTab label="Brouillons" value="draft" />
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEvent}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  filterTabActive: {
    backgroundColor: Colors.gray900,
  },
  filterTabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  eventImage: {
    width: '100%',
    height: 140,
  },
  eventContent: {
    padding: Spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  priceValue: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
