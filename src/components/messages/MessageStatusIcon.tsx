/**
 * Composant pour afficher le statut d'envoi d'un message
 * 3 états: sent (une coche), delivered (deux coches grises), read (deux coches bleues)
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { MessageStatus } from '../../lib/utils/messagingHelpers';

interface MessageStatusIconProps {
  status: MessageStatus;
  size?: number;
}

export default function MessageStatusIcon({ status, size = 14 }: MessageStatusIconProps) {
  switch (status) {
    case 'sending':
      return (
        <ActivityIndicator
          size="small"
          color={Colors.gray400}
          style={styles.spinner}
        />
      );

    case 'failed':
      return (
        <Ionicons
          name="alert-circle"
          size={size}
          color={Colors.error}
        />
      );

    case 'sent':
      return (
        <Ionicons
          name="checkmark"
          size={size}
          color={Colors.gray400}
        />
      );

    case 'delivered':
      return (
        <View style={styles.doubleCheck}>
          <Ionicons
            name="checkmark-done"
            size={size}
            color={Colors.gray400}
          />
        </View>
      );

    case 'read':
      return (
        <View style={styles.doubleCheck}>
          <Ionicons
            name="checkmark-done"
            size={size}
            color={Colors.primary}
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
