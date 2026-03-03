import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

interface PushPermissionModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function PushPermissionModal({ visible, onAccept, onDecline }: PushPermissionModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="notifications" size={40} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.gray900 }]}>Restez informé</Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.gray600 }]}>
            Activez les notifications pour recevoir :
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.gray700 }]}>Rappels de vos événements</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="ticket-outline" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.gray700 }]}>Confirmations d'inscription</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.gray700 }]}>Nouveaux messages</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.gray700 }]}>Confirmations de paiement</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity style={[styles.acceptButton, { backgroundColor: colors.primary }]} onPress={onAccept} activeOpacity={0.8}>
            <Text style={styles.acceptButtonText}>Activer les notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.declineButton} onPress={onDecline} activeOpacity={0.8}>
            <Text style={[styles.declineButtonText, { color: colors.gray500 }]}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.xl,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  featureList: {
    width: '100%',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  featureText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    flex: 1,
  },
  acceptButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  acceptButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  declineButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
});
