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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

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
  Gradients,
  Typography,
} from '../../constants/theme';

import AnimatedPressable from '../../components/ui/AnimatedPressable';
import EventCard from '../../components/events/EventCard';
import CategoryCard from '../../components/events/CategoryCard';
import SectionHeader from '../../components/ui/SectionHeader';
import GradientButton from '../../components/ui/GradientButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

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

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [1, 0]);
    const translateY = interpolate(scrollY.value, [0, 100], [0, -20]);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

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

  const renderNearbyEvent = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <View style={[styles.horizontalCardContainer, index === 0 && { marginLeft: Spacing.lg }]}>
        <EventCard
          id={item.id}
          title={item.title}
          date={item.start_date}
          location={item.location_city || 'Lieu à confirmer'}
          imageUrl={item.banner_image || item.display_image}
          category={item.category?.name}
          price={item.is_free ? 0 : (item.base_price || item.min_price)}
          isFree={item.is_free}
          attendees={item.registration_count || item.registrations_count}
          variant="horizontal"
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
            // Navigate to filtered events by category
            navigation.navigate('Main', { screen: 'Explore', params: { category: item.id } } as any);
          }}
        />
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Animated Header Background */}
      <Animated.View style={[styles.headerBackground, headerAnimatedStyle]}>
        <LinearGradient
          colors={[Colors.primaryBg, Colors.background]}
          style={styles.headerGradient}
        />
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                {user?.profile_picture ? (
                  <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={Gradients.primary} style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(user?.first_name?.[0] || 'U').toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingSmall}>{getGreeting()}</Text>
                <Text style={styles.userName}>{user?.first_name || 'Guest'}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <AnimatedPressable
                onPress={() => navigation.navigate('Notifications')}
                style={styles.iconButton}
                animationType="scale"
              >
                <Ionicons name="notifications-outline" size={22} color={Colors.gray700} />
                <View style={styles.notificationDot} />
              </AnimatedPressable>
            </View>
          </View>

          {/* Search Bar */}
          <AnimatedPressable
            onPress={() => navigation.navigate('Main', { screen: 'Explore' } as any)}
            style={styles.searchBar}
            animationType="scale"
            scaleValue={0.99}
          >
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.searchPlaceholder}>Rechercher un événement...</Text>
            <View style={styles.searchFilterButton}>
              <Ionicons name="options-outline" size={18} color={Colors.gray500} />
            </View>
          </AnimatedPressable>
        </SafeAreaView>

        {/* Hero Banner - Map CTA */}
        <AnimatedPressable
          onPress={() => navigation.navigate('Map', {})}
          style={styles.heroBanner}
          animationType="lift"
          scaleValue={0.98}
        >
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBannerGradient}
          >
            <View style={styles.heroBannerContent}>
              <View style={styles.heroBannerIcon}>
                <Ionicons name="map" size={32} color={Colors.white} />
              </View>
              <View style={styles.heroBannerText}>
                <Text style={styles.heroBannerTitle}>Explorer la carte</Text>
                <Text style={styles.heroBannerSubtitle}>
                  Découvrez les événements autour de vous
                </Text>
              </View>
            </View>
            <View style={styles.heroBannerArrow}>
              <Ionicons name="arrow-forward" size={24} color={Colors.white} />
            </View>
            {/* Decorative circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </LinearGradient>
        </AnimatedPressable>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Catégories"
              actionText="Voir tout"
              onActionPress={() => {}}
            />
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
              subtitle="Les événements populaires"
              actionText="Voir tout"
              onActionPress={() => {}}
            />
            <FlatList
              horizontal
              data={featuredEvents}
              renderItem={renderFeaturedEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={316}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Nearby Events */}
        {nearbyEvents.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Près de vous"
              subtitle={`${nearbyEvents.length} événements trouvés`}
              actionText="Carte"
              actionIcon="map-outline"
              onActionPress={() => navigation.navigate('Map', {})}
            />
            <FlatList
              horizontal
              data={nearbyEvents}
              renderItem={renderNearbyEvent}
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
              subtitle="Ne manquez pas ces événements"
              actionText="Voir tout"
              onActionPress={() => {}}
            />
            <FlatList
              horizontal
              data={upcomingEvents}
              renderItem={renderUpcomingEvent}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={296}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: -1,
  },
  headerGradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  safeHeader: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.violet,
  },
  avatarText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
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
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.gray400,
  },
  searchFilterButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Banner
  heroBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.violetLg,
  },
  heroBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    minHeight: 100,
    overflow: 'hidden',
  },
  heroBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 1,
  },
  heroBannerIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroBannerText: {
    flex: 1,
  },
  heroBannerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  heroBannerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  heroBannerArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  horizontalList: {
    paddingRight: Spacing.lg,
  },
  categoryContainer: {
    marginRight: Spacing.md,
  },
  cardContainer: {
    marginRight: Spacing.md,
  },
  featuredCardContainer: {
    marginRight: Spacing.md,
  },
  horizontalCardContainer: {
    marginRight: Spacing.md,
    width: SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md,
  },

  bottomSpacing: {
    height: Spacing['3xl'],
  },
});
