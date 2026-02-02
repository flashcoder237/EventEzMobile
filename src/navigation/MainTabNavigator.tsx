import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from '../types';
import { Colors, Spacing } from '../constants/theme';

import HomeScreen from '../screens/events/HomeScreen';
import ExploreScreen from '../screens/events/ExploreScreen';
import MyTicketsScreen from '../screens/dashboard/MyTicketsScreen';
import FollowingEventsScreen from '../screens/dashboard/FollowingEventsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  // Add extra padding to ensure it's above the navigation bar
  const bottomPadding = Math.max(insets.bottom, 20) + 16;
  const tabBarHeight = 60 + bottomPadding;

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
            case 'Dashboard':
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
        name="Dashboard"
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
