import React , {useEffect} from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MainTabParamList } from '../types';
import { FontFamily, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Screens
import DiscoverScreen from '../screens/events/DiscoverScreen';
import FollowingEventsScreen from '../screens/dashboard/FollowingEventsScreen';
import MyTicketsScreen from '../screens/dashboard/MyTicketsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_BAR_HEIGHT = 68;
const TAB_BAR_MAX_WIDTH = 360;
const PILL_HEIGHT = 48;
const PILL_PADDING_H = 8;
const FADE_HEIGHT = 80;

type TabName = 'Discover' | 'Saved' | 'MyTickets' | 'Profile';

const tabConfig: Record<TabName, { icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap; label: string }> = {
  Discover: { icon: 'compass-outline', iconFocused: 'compass', label: 'Discover' },
  Saved: { icon: 'bookmark-outline', iconFocused: 'bookmark', label: 'Saved' },
  MyTickets: { icon: 'ticket-outline', iconFocused: 'ticket', label: 'Tickets' },
  Profile: { icon: 'person-outline', iconFocused: 'person', label: 'Profil' },
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const indicatorPosition = useSharedValue(0);
  const tabCount = state.routes.length;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    indicatorPosition.value = withSpring(state.index, {
      damping: 22,
      stiffness: 160,
      mass: 0.9,
    });
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => {
    const tabWidth = TAB_BAR_MAX_WIDTH / tabCount;
    const left = indicatorPosition.value * tabWidth + PILL_PADDING_H;
    return {
      transform: [{ translateX: left }],
      width: tabWidth - PILL_PADDING_H * 2,
    };
  });

  const bottomPadding = Math.max(insets.bottom, 16);
  const pillBg = isDark ? '#1E1B4B' : '#E0E7FF';
  const barBg = isDark ? 'rgba(26,26,46,0.95)' : 'rgba(255,255,255,0.95)';

  return (
    <View style={[styles.floatingBarOuter, { paddingBottom: bottomPadding }]}>
      {/* Fade gradient covering from bottom of screen up past the tab bar */}
      <LinearGradient
        colors={['transparent', isDark ? colors.background : colors.background]}
        style={[styles.fadeGradient, { height: FADE_HEIGHT + TAB_BAR_HEIGHT + bottomPadding }]}
        pointerEvents="none"
      />

      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 0}
        tint={isDark ? 'dark' : 'light'}
        style={styles.floatingBar}
      >
        {/* Android fallback bg */}
        {Platform.OS === 'android' && (
          <View style={[styles.androidBg, { backgroundColor: barBg }]} />
        )}

        {/* Active pill background */}
        <Animated.View style={[styles.pill, { backgroundColor: pillBg }, pillStyle]} />

        {/* Tab items */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = tabConfig[route.name as TabName];

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

          const activeColor = colors.primaryDark;
          const inactiveColor = colors.gray400;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {route.name === 'Profile' ? (
                user?.profile_picture || user?.image ? (
                  <Image
                    source={user.profile_picture || user.image}
                    style={[
                      styles.tabAvatar,
                      { borderColor: isFocused ? activeColor : colors.gray300 },
                    ]}
                    cachePolicy="disk"
                    transition={200}
                  />
                ) : (
                  <View
                    style={[
                      styles.tabAvatarInitial,
                      {
                        backgroundColor: isDark ? colors.gray200 : colors.gray200,
                        borderColor: isFocused ? activeColor : colors.gray300,
                      },
                    ]}
                  >
                    <Text style={[styles.tabAvatarInitialText, { color: isFocused ? activeColor : colors.gray600 }]}>
                      {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </Text>
                  </View>
                )
              ) : (
                <Ionicons
                  name={isFocused ? config.iconFocused : config.icon}
                  size={isFocused ? 28 : 26}
                  color={isFocused ? activeColor : inactiveColor}
                />
              )}
              <Text style={[styles.tabLabel, { color: isFocused ? activeColor : inactiveColor, fontFamily: isFocused ? FontFamily.bold : FontFamily.medium }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function MainTabNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Discover' }}
      />
      <Tab.Screen
        name="Saved"
        component={FollowingEventsScreen}
        options={{ tabBarLabel: 'Saved' }}
      />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{ tabBarLabel: 'Tickets' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingBarOuter: {
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
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: TAB_BAR_MAX_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginHorizontal: Spacing.lg,
    ...Shadows.dramatic,
  },
  androidBg: {
    ...StyleSheet.absoluteFillObject,
  },
  pill: {
    position: 'absolute',
    top: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    gap: 1,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  tabAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  tabAvatarInitial: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tabAvatarInitialText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
});
