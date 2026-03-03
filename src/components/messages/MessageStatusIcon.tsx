/**
 * Composant pour afficher le statut d'envoi d'un message
 * 3 etats: sent (une coche), delivered (deux coches grises), read (deux coches bleues)
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageStatus } from '../../lib/utils/messagingHelpers';

interface MessageStatusIconProps {
  status: MessageStatus;
  size?: number;
}

export default function MessageStatusIcon({ status, size = 14 }: MessageStatusIconProps) {
  const { colors, isDark } = useTheme();

  switch (status) {
    case 'sending':
      return (
        <ActivityIndicator
          size="small"
          color={colors.gray400}
          style={styles.spinner}
        />
      );

    case 'failed':
      return (
        <Ionicons
          name="alert-circle"
          size={size}
          color={colors.error}
        />
      );

    case 'sent':
      return (
        <Ionicons
          name="checkmark"
          size={size}
          color={colors.gray400}
        />
      );

    case 'delivered':
      return (
        <View style={styles.doubleCheck}>
          <Ionicons
            name="checkmark-done"
            size={size}
            color={colors.gray400}
          />
        </View>
      );

    case 'read':
      return (
        <View style={styles.doubleCheck}>
          <Ionicons
            name="checkmark-done"
            size={size}
            color={colors.primary}
          />
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  spinner: {
    width: 14,
    height: 14,
    transform: [{ scale: 0.6 }],
  },
  doubleCheck: {
    flexDirection: 'row',
  },
});
