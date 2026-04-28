import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, Spacing, TextStyles } from '../../constants/theme';

export type MenuItemAlertType = 'warning' | 'critical' | 'info';

export interface MenuItemAlert {
  type: MenuItemAlertType;
  /** Texte court qui remplace subtitle quand defini, ex: "Action requise" */
  label?: string;
}

export interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Stat inline a droite du titre, ex: "3 actifs" */
  stat?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  badge?: number;
  loading?: boolean;
  /** Indicateur d'alerte (point colore + override subtitle color) */
  alert?: MenuItemAlert;
  /** Premier/dernier item d'une card (controle borderBottom) */
  isLast?: boolean;
}

const ALERT_COLORS: Record<MenuItemAlertType, string> = {
  warning: '#F59E0B',
  critical: '#FF6B6B',
  info: '#0EA5E9',
};

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

export default function MenuItem({
  icon,
  title,
  subtitle,
  stat,
  onPress,
  showArrow = true,
  danger,
  badge,
  loading,
  alert,
  isLast,
}: MenuItemProps) {
  const { colors } = useTheme();
  const chevronTx = useSharedValue(0);

  const onPressIn = () => {
    chevronTx.value = withSpring(4, { damping: 14, stiffness: 220 });
  };
  const onPressOut = () => {
    chevronTx.value = withSpring(0, { damping: 14, stiffness: 220 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevronTx.value }],
  }));

  const alertColor = alert ? ALERT_COLORS[alert.type] : null;

  // Texte affiche sous le titre, par ordre de priorite : alert.label > stat > subtitle
  const subtitleText = alert?.label ?? subtitle;
  const subtitleColor = alertColor ?? colors.gray500;

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: colors.gray100 },
        isLast && { borderBottomWidth: 0 },
      ]}
      onPress={loading ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={loading ? 1 : 0.6}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={subtitleText ? `${title} - ${subtitleText}` : title}
    >
      <View
        style={[
          styles.menuIconContainer,
          { backgroundColor: colors.gray50 },
          danger && { backgroundColor: colors.errorBg },
          alertColor && { backgroundColor: `${alertColor}1A` },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={danger ? colors.error : colors.gray700} />
        ) : (
          <Ionicons
            name={icon}
            size={20}
            color={danger ? colors.error : alertColor ?? colors.gray700}
          />
        )}
        {badge != null && badge > 0 && (
          <View style={[styles.menuBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {alertColor && !badge && (
          <View style={[styles.alertDot, { backgroundColor: alertColor, borderColor: colors.surface }]} />
        )}
      </View>

      <View style={styles.menuTextContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.menuTitle,
              { color: colors.gray900 },
              danger && { color: colors.error },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {stat ? (
            <Text style={[styles.statInline, { color: colors.gray500 }]} numberOfLines={1}>
              {stat}
            </Text>
          ) : null}
        </View>
        {subtitleText ? (
          <Text style={[styles.menuSubtitle, { color: subtitleColor }]} numberOfLines={1}>
            {subtitleText}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colors.gray300} />
      ) : showArrow ? (
        <AnimatedIcon
          name="chevron-forward"
          size={20}
          color={colors.gray300}
          style={chevronStyle}
        />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  menuBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: FontFamily.bold,
    lineHeight: 14,
  },
  alertDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuTitle: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.medium,
    flexShrink: 1,
  },
  statInline: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  menuSubtitle: {
    ...TextStyles.small,
    marginTop: 2,
  },
});
