import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { MainTabParamList } from '../types';
import { Colors, Spacing } from '../constants/theme';

import HomeScreen from '../screens/events/HomeScreen';
import ExploreScreen from '../screens/events/ExploreScreen';
import MyTicketsScreen from '../screens/dashboard/MyTicketsScreen';
import FollowingEventsScreen from '../screens/dashboard/FollowingEventsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Hauteur standard de la barre de navigation 3 boutons Android
const ANDROID_3_BUTTON_NAV_HEIGHT = 48;

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  // Sur Android, forcer la barre de navigation système en mode opaque
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#FFFFFF');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  // Calcul du padding bottom :
  // - iOS : insets.bottom suffit (home indicator ou 0 sur anciens iPhones)
  // - Android gesture nav : insets.bottom ~ 24-34
  // - Android 3 boutons : insets.bottom peut être 0 si edge-to-edge mal configuré
  //   → fallback sur la hauteur standard de la nav bar 3 boutons
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
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Explore':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'MyTickets':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Following':
              iconName = focused ? 'heart' : 'heart-outline';
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
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarLabel: 'Recherche' }}
      />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{ tabBarLabel: 'Réservations' }}
      />
      <Tab.Screen
        name="Following"
        component={FollowingEventsScreen}
        options={{ tabBarLabel: 'Favoris' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
}
