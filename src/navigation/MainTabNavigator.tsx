import React, { useEffect, useRef, memo, useCallback } from 'react';
import { View, StyleSheet, Platform, Pressable, Text, useWindowDimensions } from 'react-native';
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
import MessagesScreen from '../screens/messages/MessagesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Auth-guarded tab wrappers — title/subtitle viennent désormais d'i18n
// (authGuard.* dans fr.json/en.json), il suffit de passer `illustration`.
function SavedTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <AuthGuardScreen illustration="bookmark" />;
  }
  return <FollowingEventsScreen />;
}

function MessagesTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <AuthGuardScreen illustration="message" />;
  }
  return <MessagesScreen />;
}

function TicketsTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <AuthGuardScreen illustration="ticket" />;
  }
  return <MyTicketsScreen />;
}

function ProfileTabScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <AuthGuardScreen illustration="profile" />;
  }
  return <ProfileScreen />;
}

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Variant 03 — Dock flottante (actif élargi + inactifs compactés) ────
// Refonte 2026-05-05 v2 : on conserve la pilule active qui s'étend avec son
// label inline, mais on serre les inactifs (36px au lieu de 48) + gap réduit
// (2px) + dock 94% (au lieu de 92%) pour que les 5 tabs rentrent sur écrans
// étroits (≥ 320px).
//
// Calcul worst-case (320px) :
//   dock 94% × 320 = 301px - padding 16 - gap 8 = 277 utilisables
//   4 inactifs × 36 = 144 → reste 133px pour l'actif
//   actif : icon 22 + gap 6 + label uppercase 9 chars × 7.5px ≈ 68 + padding 24 = 120px ✅
const DOCK_HEIGHT = 64;
const ACTIVE_PILL_HEIGHT = 50;
const INACTIVE_TAB_HEIGHT = 44;
const DOCK_HORIZONTAL_PADDING = 8;
const FADE_HEIGHT = 80;

// === Layout responsif ===
// La dock était figée à `maxWidth: 380px` + width:auto, ce qui produisait :
//   - sur iPhone SE (320px) : dock de ~290px, marges 15px de chaque côté → trop serré
//   - sur tablette (768px+) : dock de 380px perdue au milieu d'une mer de vide
//
// computeDockLayout() prend la largeur d'écran courante et renvoie 4 valeurs :
//   - dockWidth         : largeur effective de la pilule globale
//   - activePillMaxWidth : cap horizontal du slot actif (label inclus)
//   - inactiveTabWidth  : largeur des slots non-actifs (icon-only)
//   - slotGap           : espace inter-slots
//
// Breakpoints :
//   - compact (<360px)  : dock 92% écran, slots resserrés (32px), label cappé 110px
//   - standard          : dock min(92%, 380px), valeurs par défaut
//   - tablette (≥600px) : dock min(60%, 480px), label étendu (180px) → respiration
function computeDockLayout(screenWidth: number) {
  const isTablet = Math.min(screenWidth, 800) >= 600; // borne haute évite faux positifs landscape
  const isCompact = screenWidth < 360;

  if (isTablet) {
    return {
      dockWidth: Math.min(screenWidth * 0.6, 480),
      activePillMaxWidth: 180,
      inactiveTabWidth: 40,
      slotGap: 4,
    };
  }
  if (isCompact) {
    return {
      dockWidth: screenWidth * 0.92,
      activePillMaxWidth: 110,
      inactiveTabWidth: 32,
      slotGap: 2,
    };
  }
  // Phone standard
  return {
    dockWidth: Math.min(screenWidth * 0.92, 380),
    activePillMaxWidth: 150,
    inactiveTabWidth: 36,
    slotGap: 2,
  };
}

type TabName = 'Discover' | 'Saved' | 'MessagesTab' | 'MyTickets' | 'Profile';

// Tabs ordonnées — sert au calcul du gradient (couleur courante → suivante)
const TAB_ORDER: TabName[] = ['Discover', 'Saved', 'MessagesTab', 'MyTickets', 'Profile'];

// Icônes : on utilise UNIQUEMENT la version filled (pas d'outline) pour un
// rendu plus bold et solide. La distinction actif/inactif passe par la
// couleur (blanc sur gradient vs couleur de marque sur transparent).
const tabConfig: Record<TabName, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Discover: { icon: 'compass', label: 'Découvrir' },
  Saved: { icon: 'bookmark', label: 'Favoris' },
  MessagesTab: { icon: 'chatbubble', label: 'Messages' },
  MyTickets: { icon: 'ticket', label: 'Billets' },
  Profile: { icon: 'person', label: 'Profil' },
};

// Couleur de la pilule active par onglet — interprétation éditoriale (palette
// indigo/corail/violet/ambre + cyan messages). Le mockup AIDesigner utilisait
// indigo partout ; la variation par tab garde la personnalité existante.
const TAB_PILL_COLORS_LIGHT: Record<TabName, string> = {
  Discover: '#4F46E5', // indigo
  Saved: '#FF6B6B',    // corail
  MessagesTab: '#06B6D4', // cyan
  MyTickets: '#A855F7', // violet
  Profile: '#F59E0B',   // ambre
};
const TAB_PILL_COLORS_DARK: Record<TabName, string> = {
  Discover: '#818CF8',
  Saved: '#FCA5A5',
  MessagesTab: '#67E8F9',
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
  /** Nombre de messages non lus, pour le badge sur le tab Messages. */
  unreadMessageCount: number;
  isDark: boolean;
  cardColor: string;
  /** ID enregistre dans le FeatureTourContext pour le spotlight */
  tourId?: string;
  /** Largeur du slot inactif (responsive). */
  inactiveTabWidth: number;
  /** Cap de largeur du slot actif (responsive, accommode le label). */
  activePillMaxWidth: number;
}

const TabSlot = memo(function TabSlot({
  routeName,
  isFocused,
  pillColor,
  nextTabColor,
  onPress,
  user,
  totalPendingCount,
  unreadMessageCount,
  isDark,
  cardColor,
  tourId,
  inactiveTabWidth,
  activePillMaxWidth,
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

  // Animation : seul le slot actif s'étend en largeur via flexGrow.
  // Les inactifs gardent leur largeur fixe (INACTIVE_TAB_WIDTH).
  const wrapperStyle = useAnimatedStyle(() => ({
    flexGrow: widthValue.value,
  }));

  // Stripe shimmer qui balaye la pilule active. Position de départ -50 (hors
  // écran à gauche), arrivée à 250 (largement après la fin de la pilule).
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerValue.value, [0, 1], [-50, 250]) },
      { rotate: '15deg' },
    ],
  }));

  const activeColor = '#FFFFFF';
  const inactiveColor = isDark ? '#94A3B8' : '#64748B';
  const showAvatar = routeName === 'Profile' && user;

  // Décomposition wrapper externe / pilule interne :
  // - tabSlotBox (Pressable extérieur) : overflow:visible → laisse le badge
  //   dépasser. Reçoit le tap, l'animation flexGrow et le ref pour le tour.
  // - tabSlotPill (View intérieur) : overflow:hidden → clip le gradient et
  //   le shimmer dans la forme arrondie de la pilule.
  // - Badge : sibling de tabSlotPill, absolute positioned, hors clip.
  // Avant ce refactor, le badge était enfant du tabSlot avec overflow:hidden
  // et son `top:-4 right:-7` était tronqué (problème visible sur Messages
  // et Profile).
  const showMessagesBadge = routeName === 'MessagesTab' && unreadMessageCount > 0;
  const showProfileBadge = routeName === 'Profile' && totalPendingCount > 0;
  const badgeCount = showMessagesBadge ? unreadMessageCount : totalPendingCount;
  const showAnyBadge = showMessagesBadge || showProfileBadge;

  return (
    <AnimatedPressable
      ref={slotRef}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={config.label}
      android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }}
      style={[
        styles.tabSlotBox,
        isFocused
          ? {
              minWidth: ACTIVE_PILL_HEIGHT,
              maxWidth: activePillMaxWidth,
              height: ACTIVE_PILL_HEIGHT,
            }
          : {
              width: inactiveTabWidth,
              height: INACTIVE_TAB_HEIGHT,
            },
        wrapperStyle,
      ]}
    >
      <View
        style={[
          styles.tabSlotPill,
          isFocused
            ? {
                flexDirection: 'row',
                borderColor: cardColor,
                paddingHorizontal: 12,
                height: ACTIVE_PILL_HEIGHT,
              }
            : {
                flexDirection: 'row',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                width: inactiveTabWidth,
                height: INACTIVE_TAB_HEIGHT,
              },
        ]}
      >
        {/* Gradient de fond UNIQUEMENT pour l'actif — couleur courante vers
            couleur de la tab suivante (wrap-around sur Profile→Discover). */}
        {isFocused && (
          <>
            <LinearGradient
              colors={[pillColor, nextTabColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Shimmer : stripe diagonale blanche translucide qui balaye la pilule
                toutes les ~15s. Effet "lumière qui passe" subtil. */}
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

        {/* Icône / avatar — sans le badge (déplacé hors du clip) */}
        {showAvatar ? (
          user!.profile_picture || user!.image ? (
            <Image
              source={user!.profile_picture || user!.image}
              style={[
                styles.tabAvatar,
                {
                  borderColor: isFocused ? activeColor : 'transparent',
                  width: isFocused ? 28 : 26,
                  height: isFocused ? 28 : 26,
                  borderRadius: isFocused ? 14 : 13,
                },
              ]}
              cachePolicy="memory-disk"
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.tabAvatarInitial,
                {
                  backgroundColor: isFocused ? 'rgba(255,255,255,0.2)' : (isDark ? '#1E293B' : '#E2E8F0'),
                  borderColor: isFocused ? activeColor : 'transparent',
                  width: isFocused ? 28 : 26,
                  height: isFocused ? 28 : 26,
                  borderRadius: isFocused ? 14 : 13,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabAvatarInitialText,
                  { color: isFocused ? activeColor : inactiveColor, fontSize: isFocused ? 13 : 11 },
                ]}
              >
                {(user!.first_name?.[0] || user!.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
          )
        ) : (
          <Ionicons
            name={config.icon}
            size={isFocused ? 22 : 24}
            color={isFocused ? activeColor : inactiveColor}
          />
        )}

        {/* Label uppercase visible UNIQUEMENT sur le tab actif, inline à droite
            de l'icône dans la pilule. Inactifs = icon-only. */}
        {isFocused && (
          <Text
            numberOfLines={1}
            style={[styles.tabLabelActive, { color: activeColor }]}
          >
            {config.label.toUpperCase()}
          </Text>
        )}
      </View>

      {/* Badge — rendu HORS du tabSlotPill pour échapper à son overflow:hidden.
          pointerEvents:none → le tap traverse jusqu'au Pressable extérieur. */}
      {showAnyBadge && (
        <View
          style={[
            styles.profileBadge,
            {
              backgroundColor: '#FF6B6B',
              borderColor: isFocused ? pillColor : (isDark ? '#0F172A' : '#FFFFFF'),
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.profileBadgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
});

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { totalPendingCount, unreadMessageCount } = useUnreadCounts();
  // useWindowDimensions est réactif aux rotations / split-screen / iPad
  // multitasking, contrairement à Dimensions.get() qui ne se met pas à jour.
  const { width: screenWidth } = useWindowDimensions();
  const layout = computeDockLayout(screenWidth);

  const bottomPadding = Math.max(insets.bottom, 12);
  const palette = isDark ? TAB_PILL_COLORS_DARK : TAB_PILL_COLORS_LIGHT;

  // Stabilise le handler par routeKey : sans ça, chaque render du tab bar
  // crée 5 nouvelles closures → React.memo(TabSlot) ne sert à rien car la
  // prop `onPress` change toujours d'identité.
  const navigateToTab = useCallback(
    (routeKey: string, routeName: string, currentlyFocused: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });
      if (!currentlyFocused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        navigation.navigate(routeName as never);
      }
    },
    [navigation],
  );

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
        style={[styles.dock, { width: layout.dockWidth, gap: layout.slotGap }]}
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

          // Closure stable par index — recréée seulement si l'index focused change.
          // (On ne peut pas useCallback ici car on est dans un map ; mais comme
          // le seul ref qui change vraiment c'est navigation, et qu'on l'a
          // capturé via navigateToTab, l'identité de cette closure ne casse
          // pas la React.memo si on garde une routeKey stable côté TabSlot.)
          const onPress = () => navigateToTab(route.key, route.name, isFocused);

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
              unreadMessageCount={unreadMessageCount}
              isDark={isDark}
              cardColor={isDark ? '#0F172A' : '#FFFFFF'}
              tourId={`tab-${routeName.toLowerCase()}`}
              inactiveTabWidth={layout.inactiveTabWidth}
              activePillMaxWidth={layout.activePillMaxWidth}
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
      <Tab.Screen name="MessagesTab" component={MessagesTabScreen} options={{ tabBarLabel: 'Messages' }} />
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
    // Width est maintenant injectée inline depuis FloatingTabBar via
    // `computeDockLayout(screenWidth).dockWidth`. Compact <360px : 92% écran ;
    // standard : min(92%, 380) ; tablette ≥600px : min(60%, 480). Idem pour
    // `gap` qui s'adapte aux slots resserrés/relâchés selon le breakpoint.
    height: DOCK_HEIGHT,
    borderRadius: DOCK_HEIGHT / 2,
    // overflow:visible → laisse les badges des tabs dépasser de la dock.
    // Le clip du BlurView et du dockBg est garanti par leurs propres
    // borderRadius internes (cf. styles.dockBg).
    overflow: 'visible',
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    ...Shadows.dramatic,
  },
  dockBg: {
    ...StyleSheet.absoluteFillObject,
    // borderRadius pour que le bg respecte la forme arrondie de la dock
    // même si la dock elle-même est en overflow:visible (pour les badges).
    borderRadius: DOCK_HEIGHT / 2,
  },
  // Wrapper externe : reçoit le tap et l'animation flexGrow. Pas de clip
  // → laisse le badge dépasser. Pas de border ni borderRadius — c'est la
  // pilule interne qui dessine la forme.
  tabSlotBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  // Pilule interne : clip strict pour le gradient et le shimmer dans la
  // forme arrondie. Inactifs = largeur fixe INACTIVE_TAB_WIDTH (36px).
  // Actif = stretch sur tabSlotBox.
  tabSlotPill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ACTIVE_PILL_HEIGHT / 2,
    borderWidth: 2,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  // Label uppercase de l'actif — inline à droite de l'icône dans la pilule.
  // 9.5px font + letter-spacing 1.1 → "DÉCOUVRIR" (9 chars) ≈ 68px width.
  tabLabelActive: {
    fontSize: 9.5,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.1,
    marginLeft: 6,
  },
  // Stripe diagonale du shimmer — width 50px (largeur de la lumière), légèrement
  // plus haute que la pilule pour qu'avec la rotation 15deg elle reste pleine
  // hauteur sur toute la course du sweep.
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
