import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { eventsAPI, categoriesAPI } from '../../api/client';
import { Event, Category, RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
  SECTION_MARGIN_TOP,
} from '../../constants/theme';
import { getApiResults } from '../../lib/utils/apiHelpers';
import { EmptyState } from '../../components/ui';
import EventCard from '../../components/events/EventCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to check if event is in the future
const isEventInFuture = (event: Event): boolean => {
  if (!event.start_date) return true; // If no date, show it
  const eventDate = new Date(event.start_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  return eventDate >= today;
};

// Map category names to icons
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'musique': 'musical-notes',
  'music': 'musical-notes',
  'concert': 'musical-notes',
  'sport': 'football',
  'sports': 'football',
  'art': 'color-palette',
  'culture': 'library',
  'food': 'restaurant',
  'gastronomie': 'restaurant',
  'tech': 'hardware-chip',
  'technologie': 'hardware-chip',
  'business': 'briefcase',
  'education': 'school',
  'santé': 'fitness',
  'health': 'fitness',
  'film': 'film',
  'cinéma': 'film',
  'default': 'calendar',
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { unreadNotificationCount, unreadMessageCount } = useNotifications();
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchData();
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Erreur de localisation:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [featuredRes, categoriesRes, upcomingRes] = await Promise.all([
        eventsAPI.getFeaturedEvents(),
        categoriesAPI.getCategories(),
        eventsAPI.getEvents({ ordering: 'start_date', limit: 10 }),
      ]);

      const featuredData = getApiResults<Event>(featuredRes).filter(isEventInFuture);
      const upcomingData = getApiResults<Event>(upcomingRes).filter(isEventInFuture);

      setFeaturedEvents(featuredData);
      setCategories(getApiResults<Category>(categoriesRes));
      setUpcomingEvents(upcomingData);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
  };

  useEffect(() => {
    if (location) {
      fetchNearbyEvents();
    }
  }, [location]);

  const fetchNearbyEvents = async () => {
    if (!location) return;
    try {
      const response = await eventsAPI.getNearbyEvents(location.lat, location.lng, 50, 10);
      const nearbyData = getApiResults<Event>(response).filter(isEventInFuture);
      setNearbyEvents(nearbyData);
    } catch (error) {
      console.error('Erreur événements proches:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), location && fetchNearbyEvents()]);
    setRefreshing(false);
  };

  const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    const key = name.toLowerCase();
    return categoryIcons[key] || categoryIcons.default;
  };

  // Calculate event price from various sources
  const getEventPrice = (event: Event): number | undefined => {
    // If explicitly free
    if (event.is_free) return 0;

    // Try direct price fields
    if (typeof event.base_price === 'number' && event.base_price > 0) return event.base_price;
    if (typeof event.min_price === 'number' && event.min_price > 0) return event.min_price;

    // Calculate from ticket_types if available
    if (event.ticket_types && event.ticket_types.length > 0) {
      const prices = event.ticket_types.map(t => t.price).filter(p => typeof p === 'number');
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }

    // For inscription type without price, consider free
    if (event.event_type === 'inscription') return 0;

    return undefined;
  };

  const renderFeaturedEvent = useCallback(
    ({ item, index }: { item: Event; index: number }) => {
      const price = getEventPrice(item);
      return (
        <View style={[styles.featuredCardContainer, index === 0 && { marginLeft: Spacing.lg }]}>
          <EventCard
            id={item.id}
            title={item.title}
            date={item.start_date}
            time={item.start_time}
            location={item.location_city || item.location_address || 'Lieu à confirmer'}
            imageUrl={item.banner_image || item.category?.default_event_image || item.display_image}
            category={item.category?.name}
            price={price}
            isFree={item.is_free || price === 0}
            eventType={item.event_type}
            attendees={item.registration_count || item.registrations_count}
            variant="featured"
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          />
        </View>
      );
    },
    [navigation]
  );

  const renderEvent = useCallback(
    ({ item, index }: { item: Event; index: number }) => {
      const price = getEventPrice(item);
      return (
        <View style={[styles.cardContainer, index === 0 && { marginLeft: Spacing.lg }]}>
          <EventCard
            id={item.id}
            title={item.title}
            date={item.start_date}
            time={item.start_time}
            location={item.location_city || 'Lieu à confirmer'}
            imageUrl={item.banner_image || item.category?.default_event_image || item.display_image}
            category={item.category?.name}
            price={price}
            isFree={item.is_free || price === 0}
            eventType={item.event_type}
            attendees={item.registration_count || item.registrations_count}
            variant="default"
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          />
        </View>
      );
    },
    [navigation]
  );

  const renderCategory = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <TouchableOpacity
        style={[styles.categoryItem, index === 0 && { marginLeft: Spacing.lg }]}
        onPress={() => {
          navigation.navigate('Main', { screen: 'Explore', params: { category: item.id } } as any);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.categoryIcon}>
          <Ionicons name={getCategoryIcon(item.name)} size={24} color={Colors.primary} />
        </View>
        <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="chatbubble-outline" size={22} color={Colors.gray800} />
              {unreadMessageCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.gray800} />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color={Colors.gray400} />
          <Text style={styles.searchPlaceholder}>Rechercher un événement</Text>
        </TouchableOpacity>

        {/* Location Row */}
        <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={18} color={Colors.primary} />
          <Text style={styles.locationText}>
            {location ? 'Événements près de vous' : 'Douala, Cameroun'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.gray400} />
        </TouchableOpacity>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Catégories" />
            <FlatList
              horizontal
              data={categories.slice(0, 8)}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
        )}

        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Événements populaires"
              onSeeAll={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={featuredEvents}
              renderItem={renderFeaturedEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
              snapToInterval={SCREEN_WIDTH * 0.85 + Spacing.md}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Nearby Events */}
        {nearbyEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Près de chez vous"
              onSeeAll={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={nearbyEvents}
              renderItem={renderEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
            />
          </View>
        )}

        {/* This Weekend */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Ce week-end"
              onSeeAll={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={upcomingEvents.slice(0, 5)}
              renderItem={renderEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
            />
          </View>
        )}

        {/* Free Events */}
        {upcomingEvents.filter(e => e.is_free).length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Événements gratuits"
              onSeeAll={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={upcomingEvents.filter(e => e.is_free).slice(0, 5)}
              renderItem={renderEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
            />
          </View>
        )}

        {/* Bottom Spacing for Tab Bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  // ===== PREMIUM HEADER =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  logoImage: {
    height: 36,
    width: 120,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  // ===== SEARCH BAR =====
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
  // ===== LOCATION ROW =====
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  locationText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    flex: 1,
  },
  // ===== PREMIUM SECTIONS =====
  section: {
    marginTop: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  seeAllText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  // ===== CATEGORIES =====
  categoriesList: {
    paddingRight: Spacing.lg,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: Spacing.lg,
    width: 72,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  categoryName: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    textAlign: 'center',
  },
  // ===== EVENTS LIST =====
  eventsList: {
    paddingRight: Spacing.lg,
  },
  cardContainer: {
    marginRight: Spacing.md,
  },
  featuredCardContainer: {
    marginRight: Spacing.md,
  },
  bottomSpacing: {
    height: 100,
  },
});
