import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  useSharedValue,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MainTabParamList } from '../types';
import { FontFamily, Spacing, Shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUnreadCounts } from '../contexts/NotificationContext';
import {
  useTour,
  MAIN_TABS_TOUR_STEPS,
  MAIN_TABS_TOUR_STORAGE_KEY,
  MAIN_TABS_TOUR_DELAY_MS,
} from '../components/tour';

import AuthGuardScreen from '../components/auth/AuthGuardScreen';

// Screens
import DiscoverScreen from '../screens/events/DiscoverScreen';
import FollowingEventsScreen from '../screens/dashboard/FollowingEventsScreen';
import MyTicketsScreen from '../screens/dashboard/MyTicketsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Auth-guarded tab wrappers
function SavedTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <AuthGuardScreen
        illustration="bookmark"
        title="Vos evenements sauvegardes"
        subtitle="Connectez-vous pour retrouver les evenements que vous suivez et ne rien manquer."
      />
    );
  }
  return <FollowingEventsScreen />;
}

function TicketsTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <AuthGuardScreen
        illustration="ticket"
        title="Vos billets"
        subtitle="Connectez-vous pour acceder a vos billets, inscriptions et QR codes."
      />
    );
  }
  return <MyTicketsScreen />;
}

function ProfileTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <AuthGuardScreen
        illustration="profile"
        title="Votre profil"
        subtitle="Connectez-vous pour gerer votre profil, vos preferences et acceder a toutes les fonctionnalites."
      />
    );
  }
  return <ProfileScreen />;
}

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Variant 01 — Dock Flottante avec labels ──────────────────────────────
// Pattern :
//   - Tab actif = pilule horizontale colorée avec icône + label uppercase
//   - Tabs inactifs = layout vertical compact, icône au-dessus + label en dessous
//   - Animation : seule la largeur du slot s'anime (l'actif s'étend), les
//     labels sont rendus directement à pleine opacité (pas de fade pour éviter
//     le bug "certains textes disparaissent seuls")
const DOCK_HEIGHT = 70;
const DOCK_MAX_WIDTH = 380;
const DOCK_HORIZONTAL_PADDING = 8;
const ACTIVE_PILL_HEIGHT = 54;
// Tabs inactifs : icône seule, format disque compact (icône 26px + padding).
const INACTIVE_TAB_WIDTH = 48;
const INACTIVE_TAB_HEIGHT = 48;
const FADE_HEIGHT = 80;

type TabName = 'Discover' | 'Saved' | 'MyTickets' | 'Profile';

// Tabs ordonnées — sert au calcul du gradient (couleur courante → suivante)
const TAB_ORDER: TabName[] = ['Discover', 'Saved', 'MyTickets', 'Profile'];

// Icônes : on utilise UNIQUEMENT la version filled (pas d'outline) pour un
// rendu plus bold et solide. La distinction actif/inactif passe par la
// couleur (blanc sur gradient vs couleur de marque sur transparent).
const tabConfig: Record<TabName, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Discover: { icon: 'compass', label: 'Découvrir' },
  Saved: { icon: 'bookmark', label: 'Favoris' },
  MyTickets: { icon: 'ticket', label: 'Billets' },
  Profile: { icon: 'person', label: 'Profil' },
};

// Couleur de la pilule active par onglet — interprétation éditoriale (palette
// indigo/corail/violet/ambre). Le mockup AIDesigner utilisait indigo partout ;
// la variation par tab garde la personnalité existante de l'app.
const TAB_PILL_COLORS_LIGHT: Record<TabName, string> = {
  Discover: '#4F46E5', // indigo
  Saved: '#FF6B6B',    // corail
  MyTickets: '#A855F7', // violet
  Profile: '#F59E0B',   // ambre
};
const TAB_PILL_COLORS_DARK: Record<TabName, string> = {
  Discover: '#818CF8',
  Saved: '#FCA5A5',
  MyTickets: '#C084FC',
  Profile: '#FBBF24',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabSlotProps {
  routeKey: string;
  routeName: TabName;
  isFocused: boolean;
  pillColor: string;
  /** Couleur de fin du gradient — couleur de la tab suivante (wrap-around) */
  nextTabColor: string;
  onPress: () => void;
  user: ReturnType<typeof useAuth>['user'];
  totalPendingCount: number;
  isDark: boolean;
  cardColor: string;
  /** ID enregistre dans le FeatureTourContext pour le spotlight */
  tourId?: string;
}

function TabSlot({
  routeName,
  isFocused,
  pillColor,
  nextTabColor,
  onPress,
  user,
  totalPendingCount,
  isDark,
  cardColor,
  tourId,
}: TabSlotProps) {
  const config = tabConfig[routeName];
  const widthValue = useSharedValue(isFocused ? 1 : 0);
  const slotRef = useRef<any>(null);
  const tourCtx = useTour();

  // Register this tab as a tour target. Registered once per id; unregistered
  // when the slot unmounts (rare — tab navigator persists the dock).
  useEffect(() => {
    if (!tourId) return;
    tourCtx.__register(tourId, { ref: slotRef });
    return () => {
      tourCtx.__unregister(tourId);
    };
  }, [tourId, tourCtx]);
  // Shimmer : balaye la pilule active toutes les ~4s pour un effet "lumière"
  // discret. Reste à 0 (off-screen gauche) tant que le tab n'est pas actif.
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    widthValue.value = withTiming(isFocused ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [isFocused, widthValue]);

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(shimmerValue);
      shimmerValue.value = 0;
      return;
    }
    // Cycle ~15s : delay 13.5s (stripe off-screen gauche, invisible) →
    // sweep 1.5s → reset instant → loop. Effet "lumière qui passe" rare et
    // tranquille, pas envahissant.
    shimmerValue.value = withRepeat(
      withSequence(
        withDelay(13500, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) })),
        withTiming(0, { duration: 1 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(shimmerValue);
    };
  }, [isFocused, shimmerValue]);

  // Animation : seule la largeur du slot est interpolée (l'actif s'étend, les
  // inactifs gardent leur largeur fixe). PAS de fade sur les labels — sinon
  // ils apparaissent invisibles pendant ~120ms à chaque transition.
  const wrapperStyle = useAnimatedStyle(() => ({
    flexGrow: widthValue.value,
  }));

  // Stripe shimmer : translation horizontale de -50 (off gauche) à 250 (off droite).
  // 250 dépasse largement la largeur max d'une pilule (≈150px) → invisible
  // hors-cycle grâce à overflow:hidden du slot parent.
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerValue.value, [0, 1], [-50, 250]) },
      { rotate: '15deg' },
    ],
  }));

  const activeColor = '#FFFFFF';
  const inactiveColor = isDark ? '#94A3B8' : '#64748B';
  const showAvatar = routeName === 'Profile' && user;

  return (
    <AnimatedPressable
      ref={slotRef}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={config.label}
      android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }}
      style={[
        styles.tabSlot,
        isFocused
          ? {
              flexDirection: 'row',
              borderColor: cardColor,
              paddingHorizontal: 14,
              minWidth: ACTIVE_PILL_HEIGHT,
              height: ACTIVE_PILL_HEIGHT,
            }
          : {
              flexDirection: 'row',
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              width: INACTIVE_TAB_WIDTH,
              height: INACTIVE_TAB_HEIGHT,
            },
        wrapperStyle,
      ]}
    >
      {/* Gradient de fond UNIQUEMENT pour l'actif : de la couleur courante
          vers la couleur de la tab suivante (wrap-around sur Profile→Discover).
          Donne plus de profondeur et lie visuellement les onglets entre eux. */}
      {isFocused && (
        <>
          <LinearGradient
            colors={[pillColor, nextTabColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Shimmer : stripe diagonale blanche translucide qui balaie la pilule
              toutes les ~4s. Effet "lumière qui passe" subtil. Le slot parent
              a overflow:hidden, donc la stripe est clippée à la forme de la
              pilule. pointerEvents=none pour ne pas bloquer le tap. */}
          <Animated.View style={[styles.shimmerStripe, shimmerStyle]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              locations={[0.2, 0.5, 0.8]}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </>
      )}

      {/* Icône / avatar */}
      {showAvatar ? (
        <View>
          {user!.profile_picture || user!.image ? (
            <Image
              source={user!.profile_picture || user!.image}
              style={[
                styles.tabAvatar,
                {
                  borderColor: isFocused ? activeColor : 'transparent',
                  width: isFocused ? 30 : 28,
                  height: isFocused ? 30 : 28,
                  borderRadius: isFocused ? 15 : 14,
                },
              ]}
              cachePolicy="disk"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.tabAvatarInitial,
                {
                  backgroundColor: isFocused ? 'rgba(255,255,255,0.2)' : (isDark ? '#1E293B' : '#E2E8F0'),
                  borderColor: isFocused ? activeColor : 'transparent',
                  width: isFocused ? 30 : 28,
                  height: isFocused ? 30 : 28,
                  borderRadius: isFocused ? 15 : 14,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabAvatarInitialText,
                  { color: isFocused ? activeColor : inactiveColor, fontSize: isFocused ? 13 : 12 },
                ]}
              >
                {(user!.first_name?.[0] || user!.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
          )}
          {totalPendingCount > 0 && (
            <View
              style={[
                styles.profileBadge,
                {
                  backgroundColor: '#FF6B6B',
                  borderColor: isFocused ? pillColor : (isDark ? '#0F172A' : '#FFFFFF'),
                },
              ]}
            >
              <Text style={styles.profileBadgeText}>
                {totalPendingCount > 99 ? '99+' : totalPendingCount}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Ionicons
          name={config.icon}
          size={isFocused ? 24 : 26}
          color={isFocused ? activeColor : inactiveColor}
        />
      )}

      {/* Label uppercase visible UNIQUEMENT sur le tab actif (inline à droite
          de l'icône dans la pilule). Inactifs = icon-only. */}
      {isFocused && (
        <Text
          numberOfLines={1}
          style={[styles.tabLabelActive, { color: activeColor }]}
        >
          {config.label.toUpperCase()}
        </Text>
      )}
    </AnimatedPressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { totalPendingCount } = useUnreadCounts();

  const bottomPadding = Math.max(insets.bottom, 12);
  const palette = isDark ? TAB_PILL_COLORS_DARK : TAB_PILL_COLORS_LIGHT;

  return (
    <View style={[styles.dockOuter, { paddingBottom: bottomPadding + 8 }]}>
      {/* Fade : adoucit la jonction entre le contenu scrollable et le dock */}
      <LinearGradient
        colors={['transparent', isDark ? colors.background : colors.background]}
        style={[styles.fadeGradient, { height: FADE_HEIGHT + DOCK_HEIGHT + bottomPadding }]}
        pointerEvents="none"
      />

      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 0}
        tint={isDark ? 'dark' : 'light'}
        style={styles.dock}
      >
        {/* Fallback Android (BlurView ne fonctionne pas) + boost translucide iOS */}
        <View
          style={[
            styles.dockBg,
            {
              backgroundColor: Platform.OS === 'ios'
                ? (isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.55)')
                : (isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)'),
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const routeName = route.name as TabName;
          const pillColor = palette[routeName];
          // Couleur de fin du gradient = couleur de la tab suivante (wrap-around).
          // Indépendant de l'ordre des routes du Navigator pour rester déterministe.
          const orderIdx = TAB_ORDER.indexOf(routeName);
          const nextTabName = TAB_ORDER[(orderIdx + 1) % TAB_ORDER.length];
          const nextTabColor = palette[nextTabName];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              navigation.navigate(route.name);
            }
          };

          return (
            <TabSlot
              key={route.key}
              routeKey={route.key}
              routeName={routeName}
              isFocused={isFocused}
              pillColor={pillColor}
              nextTabColor={nextTabColor}
              onPress={onPress}
              user={user}
              totalPendingCount={totalPendingCount}
              isDark={isDark}
              cardColor={isDark ? '#0F172A' : '#FFFFFF'}
              tourId={`tab-${routeName.toLowerCase()}`}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const tour = useTour();

  // Auto-start the feature tour on the first authenticated MainTab mount.
  // The seenKey persists in AsyncStorage — won't re-trigger on subsequent boots.
  useEffect(() => {
    const timer = setTimeout(() => {
      tour.start(MAIN_TABS_TOUR_STEPS, { seenKey: MAIN_TABS_TOUR_STORAGE_KEY });
    }, MAIN_TABS_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        freezeOnBlur: true,
        lazy: true,
      }}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarLabel: 'Découvrir' }} />
      <Tab.Screen name="Saved" component={SavedTabScreen} options={{ tabBarLabel: 'Favoris' }} />
      <Tab.Screen name="MyTickets" component={TicketsTabScreen} options={{ tabBarLabel: 'Billets' }} />
      <Tab.Screen name="Profile" component={ProfileTabScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    maxWidth: DOCK_MAX_WIDTH,
    height: DOCK_HEIGHT,
    borderRadius: DOCK_HEIGHT / 2,
    overflow: 'hidden',
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    gap: 4,
    ...Shadows.dramatic,
  },
  dockBg: {
    ...StyleSheet.absoluteFillObject,
  },
  tabSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ACTIVE_PILL_HEIGHT / 2,
    borderWidth: 2,
    overflow: 'hidden',
  },
  // Label uppercase de l'actif — inline à droite de l'icône dans la pilule
  tabLabelActive: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.2,
    marginLeft: 6,
  },
  // Stripe diagonale du shimmer — width 50px (largeur de la lumière), légèrement
  // plus haute que la pilule pour qu'avec la rotation 15deg elle reste pleine
  // hauteur sur toute la course du sweep
  shimmerStripe: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 50,
    left: 0,
  },
  tabAvatar: {
    borderWidth: 2,
  },
  tabAvatarInitial: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tabAvatarInitialText: {
    fontFamily: FontFamily.bold,
  },
  profileBadge: {
    position: 'absolute',
    top: -4,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  profileBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FontFamily.bold,
    lineHeight: 11,
    letterSpacing: 0.2,
  },
});
