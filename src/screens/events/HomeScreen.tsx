import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  RefreshControl,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { eventsAPI, categoriesAPI } from '../../api/client';
import { Event, Category, RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

import EventCard from '../../components/events/EventCard';
import CategoryCard from '../../components/events/CategoryCard';
import SectionHeader from '../../components/ui/SectionHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Map category names to icons
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'musique': 'musical-notes',
  'music': 'musical-notes',
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
  'default': 'calendar',
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
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

      setFeaturedEvents(featuredRes.data?.results || featuredRes.data || []);
      setCategories(categoriesRes.data?.results || categoriesRes.data || []);
      setUpcomingEvents(upcomingRes.data?.results || upcomingRes.data || []);
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
      setNearbyEvents(response.data?.results || []);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const renderFeaturedEvent = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <View style={[styles.featuredCardContainer, index === 0 && { marginLeft: Spacing.lg }]}>
        <EventCard
          id={item.id}
          title={item.title}
          date={item.start_date}
          time={item.start_time}
          location={item.location_city || item.location_address || 'Lieu à confirmer'}
          imageUrl={item.banner_image || item.display_image}
          category={item.category?.name}
          price={item.is_free ? 0 : (item.base_price || item.min_price)}
          isFree={item.is_free}
          attendees={item.registration_count || item.registrations_count}
          variant="featured"
          onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
        />
      </View>
    ),
    [navigation]
  );

  const renderUpcomingEvent = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <View style={[styles.cardContainer, index === 0 && { marginLeft: Spacing.lg }]}>
        <EventCard
          id={item.id}
          title={item.title}
          date={item.start_date}
          time={item.start_time}
          location={item.location_city || 'Lieu à confirmer'}
          imageUrl={item.banner_image || item.display_image}
          category={item.category?.name}
          price={item.is_free ? 0 : (item.base_price || item.min_price)}
          isFree={item.is_free}
          attendees={item.registration_count || item.registrations_count}
          variant="default"
          onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
        />
      </View>
    ),
    [navigation]
  );

  const renderCategory = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <View style={[styles.categoryContainer, index === 0 && { marginLeft: Spacing.lg }]}>
        <CategoryCard
          id={item.id.toString()}
          name={item.name}
          icon={getCategoryIcon(item.name)}
          eventCount={item.event_count || item.events_count}
          onPress={() => {
            navigation.navigate('Main', { screen: 'Explore', params: { category: item.id } } as any);
          }}
        />
      </View>
    ),
    []
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
          <View style={styles.headerLeft}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingSmall}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.first_name || 'Invité'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconButton}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.gray800} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
          style={styles.searchBar}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color={Colors.gray400} />
          <Text style={styles.searchPlaceholder}>Rechercher un événement...</Text>
        </TouchableOpacity>

        {/* Map Banner */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
          style={styles.mapBanner}
          activeOpacity={0.8}
        >
          <View style={styles.mapBannerContent}>
            <View style={styles.mapBannerIcon}>
              <Ionicons name="map-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.mapBannerText}>
              <Text style={styles.mapBannerTitle}>Explorer la carte</Text>
              <Text style={styles.mapBannerSubtitle}>
                Découvrez les événements autour de vous
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </TouchableOpacity>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Catégories" />
            <FlatList
              horizontal
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="En vedette"
              actionText="Voir tout"
              onActionPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={featuredEvents}
              renderItem={renderFeaturedEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={300}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Nearby Events */}
        {nearbyEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Près de vous"
              actionText="Carte"
              onActionPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={nearbyEvents}
              renderItem={renderUpcomingEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="À venir"
              actionText="Voir tout"
              onActionPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            />
            <FlatList
              horizontal
              data={upcomingEvents}
              renderItem={renderUpcomingEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={280}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Bottom Spacing */}
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
    paddingBottom: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  greetingSmall: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: 2,
  },
  userName: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.gray400,
  },
  mapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  mapBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mapBannerText: {
    flex: 1,
  },
  mapBannerTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  mapBannerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  section: {
    marginTop: Spacing.xl,
  },
  horizontalList: {
    paddingRight: Spacing.lg,
  },
  categoryContainer: {
    marginRight: Spacing.sm,
  },
  cardContainer: {
    marginRight: Spacing.md,
  },
  featuredCardContainer: {
    marginRight: Spacing.md,
  },
  bottomSpacing: {
    height: Spacing['3xl'],
  },
});
