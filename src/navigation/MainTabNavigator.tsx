import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Image } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MainTabParamList } from '../types';
import { Colors, FontFamily, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

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

  return (
    <View style={[styles.floatingBarOuter, { paddingBottom: bottomPadding }]}>
      {/* Fade gradient covering from bottom of screen up past the tab bar */}
      <LinearGradient
        colors={['transparent', Colors.background]}
        style={[styles.fadeGradient, { height: FADE_HEIGHT + TAB_BAR_HEIGHT + bottomPadding }]}
        pointerEvents="none"
      />

      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 0}
        tint="light"
        style={styles.floatingBar}
      >
        {/* Android fallback bg */}
        {Platform.OS === 'android' && (
          <View style={styles.androidBg} />
        )}

        {/* Active pill background */}
        <Animated.View style={[styles.pill, pillStyle]} />

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
                    source={{ uri: user.profile_picture || user.image }}
                    style={[
                      styles.tabAvatar,
                      isFocused && styles.tabAvatarActive,
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.tabAvatarInitial,
                      isFocused && styles.tabAvatarActive,
                    ]}
                  >
                    <Text style={[styles.tabAvatarInitialText, isFocused && { color: Colors.primaryDark }]}>
                      {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </Text>
                  </View>
                )
              ) : (
                <Ionicons
                  name={isFocused ? config.iconFocused : config.icon}
                  size={isFocused ? 28 : 26}
                  color={isFocused ? Colors.primaryDark : Colors.gray400}
                />
              )}
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
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
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('transparent');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  pill: {
    position: 'absolute',
    top: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: '#EDE9FE',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    gap: 1,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 1,
  },
  tabLabelActive: {
    color: Colors.primaryDark,
    fontFamily: FontFamily.bold,
  },
  tabAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
  tabAvatarActive: {
    borderColor: Colors.primaryDark,
  },
  tabAvatarInitial: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
  tabAvatarInitialText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.gray600,
  },
});
