import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
  DISABLED_OPACITY,
} from '../../constants/theme';

interface AIAssistButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'compact' | 'full';
}

export default function AIAssistButton({
  label,
  onPress,
  isLoading = false,
  disabled = false,
  variant = 'compact',
}: AIAssistButtonProps) {
  const { colors, isDark } = useTheme();

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactButton, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={TOUCH_OPACITY}
      >
        {isLoading ? (
          <ActivityIndicator size={12} color={colors.primaryLight} />
        ) : (
          <Ionicons name="sparkles" size={12} color={colors.primaryLight} />
        )}
        <Text style={styles.compactText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.fullButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={TOUCH_OPACITY}
    >
      {isLoading ? (
        <ActivityIndicator size={16} color={Colors.white} />
      ) : (
        <Ionicons name="sparkles" size={16} color={Colors.white} />
      )}
      <Text style={styles.fullText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primaryLight,
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
  },
  fullText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
