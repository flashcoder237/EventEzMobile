/**
 * IncidentBanner — bandeau global d'incident système
 *
 * S'affiche en overlay top quand un 503 est intercepté par axios
 * (`StatusContext.lastServiceIncident`). Permet à l'utilisateur :
 *   - de voir QUEL service est down et pourquoi (titre + dernier update)
 *   - de cliquer "Voir l'évolution" → navigue vers IncidentDetails
 *   - de fermer le banner s'il a compris
 *
 * Auto-dismiss après 45s si pas interagi.
 *
 * Coexiste avec MaintenanceGate :
 *   - MaintenanceGate masque toute l'app si incident BLOQUANT GLOBAL.
 *   - IncidentBanner reste pour les incidents non-bloquants ou scope=service.
 *     L'utilisateur peut continuer à utiliser le reste de l'app.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../contexts/StatusContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrentRoute } from '../../contexts/CurrentRouteContext';
import { FontFamily, Spacing } from '../../constants/theme';
import { RootStackParamList } from '../../types';
import { shouldShowIncidentForRoute } from '../../lib/incidentScope';

const AUTO_DISMISS_MS = 45_000;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IncidentBanner() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { lastServiceIncident, blockingIncident, clearServiceIncident } = useStatus();

  // Si MaintenanceGate prend le dessus (incident bloquant global), on
  // n'affiche pas le banner — la full screen le couvre déjà.
  // Filtrage contextuel : si l'incident est sur un service précis, on n'affiche
  // QUE sur les écrans qui utilisent ce service. Sinon le user sur la page
  // paiement n'a pas à voir un incident messagerie.
  const currentRoute = useCurrentRoute();
  const rawIncident = !blockingIncident ? lastServiceIncident : null;
  const incident = shouldShowIncidentForRoute(rawIncident as any, currentRoute)
    ? rawIncident
    : null;

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (incident) {
      // Slide in
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 220 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

      // Auto-dismiss
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        clearServiceIncident();
      }, AUTO_DISMISS_MS);
    } else {
      // Slide out
      translateY.value = withTiming(-200, { duration: 220 });
      opacity.value = withTiming(0, { duration: 180 });
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!incident) return null;

  // Couleur selon severity — warning/critical/major mappés à orange/rouge.
  const severityColor =
    incident.severity === 'critical' || incident.severity === 'major'
      ? '#EF4444'
      : incident.severity === 'minor'
        ? '#F59E0B'
        : '#F97316';

  const handleViewDetails = () => {
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate('IncidentDetails', { incidentId: incident.id });
    // On ne clear pas tout de suite — l'utilisateur revient peut-être.
    // Le banner se cachera après 45s ou s'il clique X.
  };

  const handleDismiss = () => {
    Haptics.selectionAsync().catch(() => {});
    clearServiceIncident();
  };

  // Service touché (ex. "messaging", "payments") — affiché si scope=service
  const affectedLabel =
    incident.scope === 'service' && incident.affected_services?.length
      ? incident.affected_services.join(', ')
      : null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        { paddingTop: insets.top + 4 },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: isDark ? '#1E1B16' : '#FFFFFF',
            borderColor: severityColor,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${severityColor}20` }]}>
          <Ionicons name="warning" size={18} color={severityColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {incident.title}
            </Text>
            {affectedLabel && (
              <Text style={[styles.servicePill, { color: severityColor, borderColor: severityColor }]}>
                {affectedLabel}
              </Text>
            )}
          </View>
          <Text
            style={[styles.message, { color: colors.gray600 }]}
            numberOfLines={2}
          >
            {incident.latest_update?.message ||
              incident.public_message ||
              t('componentsCommon.incidentDefaultMessage')}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={handleViewDetails}
              style={({ pressed }) => [
                styles.viewButton,
                { backgroundColor: severityColor, opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('componentsCommon.incidentViewDetailsA11y')}
            >
              <Text style={styles.viewButtonText}>{t('componentsCommon.incidentViewDetails')}</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('componentsCommon.incidentClose')}
        >
          <Ionicons name="close" size={20} color={colors.gray500} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: Spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    // Ombre pour faire ressortir au-dessus du contenu de l'écran
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  servicePill: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  viewButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  closeButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});
