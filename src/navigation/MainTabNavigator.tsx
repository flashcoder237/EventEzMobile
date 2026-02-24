import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { MainTabParamList } from '../types';
import { Colors, FontFamily, Spacing } from '../constants/theme';

// Screens
import DiscoverScreen from '../screens/events/DiscoverScreen';
import FollowingEventsScreen from '../screens/dashboard/FollowingEventsScreen';
import MyTicketsScreen from '../screens/dashboard/MyTicketsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Hauteur standard de la barre de navigation 3 boutons Android
const ANDROID_3_BUTTON_NAV_HEIGHT = 48;

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#FFFFFF');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  const bottomPadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, ANDROID_3_BUTTON_NAV_HEIGHT)
    : insets.bottom;
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Discover':
              iconName = focused ? 'compass' : 'compass-outline';
              break;
            case 'Saved':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'MyTickets':
              iconName = focused ? 'ticket' : 'ticket-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return (
            <Ionicons
              name={iconName}
              size={24}
              color={focused ? Colors.primary : Colors.gray400}
            />
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.gray100,
          height: tabBarHeight,
          paddingTop: Spacing.sm,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.medium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      })}
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
