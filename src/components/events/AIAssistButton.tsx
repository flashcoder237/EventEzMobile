import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

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
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactButton, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size={12} color="#8B5CF6" />
        ) : (
          <Ionicons name="sparkles" size={12} color="#8B5CF6" />
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
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size={16} color="#fff" />
      ) : (
        <Ionicons name="sparkles" size={16} color="#fff" />
      )}
      <Text style={styles.fullText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F3E8FF',
    alignSelf: 'flex-start',
  },
  compactText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: '#8B5CF6',
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#8B5CF6',
  },
  fullText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});
